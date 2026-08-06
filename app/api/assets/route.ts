/* ==================================================================
 *  /api/assets — Registre des actifs (module GRC).
 *  op=create / update / delete. Édition par tout utilisateur non
 *  lecture-seule ; suppression réservée aux manager/directeur/admin.
 * ================================================================== */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { denyReadOnly } from "@/lib/auth/guards";
import { assetExists, createAsset, deleteAsset, getAsset, listAssets, updateAsset } from "@/lib/db/assets";
import { logActivity } from "@/lib/db/admin";

const toIso = (d?: string | null) => (d ? new Date(`${d}T00:00:00`).toISOString() : null);
const canDelete = (role: string) => ["manager", "directeur", "admin"].includes(role);

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const ro = denyReadOnly(user); if (ro) return ro;

  const body = await request.json().catch(() => ({}));
  const op: string = body?.op;

  if (op === "create") {
    const name = String(body?.name || "").trim();
    if (!name) return NextResponse.json({ error: "Nom de l'actif requis." }, { status: 400 });
    const id = createAsset({
      name,
      type: String(body?.type || ""),
      description: String(body?.description || ""),
      ownerId: typeof body?.ownerId === "string" && body.ownerId ? body.ownerId : user.id,
      service: String(body?.service || ""),
      confidentiality: Number(body?.confidentiality),
      integrity: Number(body?.integrity),
      availability: Number(body?.availability),
      status: typeof body?.status === "string" ? body.status : undefined,
      reviewDate: toIso(body?.reviewDate),
      createdBy: user.id,
    });
    logActivity(user.id, "actif.creation", name);
    return NextResponse.json({ assets: listAssets(), asset: getAsset(id) });
  }

  const id: string = body?.id;
  if (!id || !assetExists(id)) return NextResponse.json({ error: "Actif introuvable." }, { status: 404 });

  if (op === "update") {
    updateAsset(id, {
      name: typeof body?.name === "string" ? body.name.trim() : undefined,
      type: typeof body?.type === "string" ? body.type : undefined,
      description: typeof body?.description === "string" ? body.description : undefined,
      ownerId: typeof body?.ownerId === "string" ? body.ownerId : undefined,
      service: typeof body?.service === "string" ? body.service : undefined,
      confidentiality: body?.confidentiality !== undefined ? Number(body.confidentiality) : undefined,
      integrity: body?.integrity !== undefined ? Number(body.integrity) : undefined,
      availability: body?.availability !== undefined ? Number(body.availability) : undefined,
      status: typeof body?.status === "string" ? body.status : undefined,
      reviewDate: body?.reviewDate !== undefined ? toIso(body.reviewDate) : undefined,
    });
  } else if (op === "delete") {
    if (!canDelete(user.role)) return NextResponse.json({ error: "Suppression réservée aux manager/directeur/admin." }, { status: 403 });
    deleteAsset(id);
    return NextResponse.json({ assets: listAssets() });
  } else {
    return NextResponse.json({ error: "Opération inconnue." }, { status: 400 });
  }

  return NextResponse.json({ assets: listAssets(), asset: getAsset(id) });
}

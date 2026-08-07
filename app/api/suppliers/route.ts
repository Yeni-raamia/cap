/* ==================================================================
 *  /api/suppliers — Fournisseurs & prestataires (tiers, GRC).
 *  op=create / update / delete. Édition hors lecture seule ;
 *  suppression réservée aux manager/directeur/admin.
 * ================================================================== */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { denyReadOnly } from "@/lib/auth/guards";
import { createSupplier, deleteSupplier, getSupplier, listSuppliers, supplierExists, updateSupplier } from "@/lib/db/suppliers";
import { logActivity } from "@/lib/db/admin";

const canDelete = (role: string) => ["manager", "directeur", "admin"].includes(role);
const toIso = (d?: string | null) => (d ? new Date(`${d}T00:00:00`).toISOString() : null);
const strArr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x) => typeof x === "string") : []);

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const ro = denyReadOnly(user); if (ro) return ro;

  const body = await request.json().catch(() => ({}));
  const op: string = body?.op;

  if (op === "create") {
    const name = String(body?.name || "").trim();
    if (!name) return NextResponse.json({ error: "Nom du fournisseur requis." }, { status: 400 });
    const id = createSupplier({
      name,
      type: typeof body?.type === "string" ? body.type : undefined,
      criticality: typeof body?.criticality === "string" ? body.criticality : undefined,
      service: String(body?.service || ""),
      dataAccess: typeof body?.dataAccess === "string" ? body.dataAccess : undefined,
      ownerId: typeof body?.ownerId === "string" ? body.ownerId : "",
      status: typeof body?.status === "string" ? body.status : undefined,
      contractEnd: toIso(body?.contractEnd),
      reviewDate: toIso(body?.reviewDate),
      assetIds: strArr(body?.assetIds),
      notes: String(body?.notes || ""),
      createdBy: user.id,
    });
    logActivity(user.id, "supplier.creation", name);
    return NextResponse.json({ suppliers: listSuppliers(), supplier: getSupplier(id) });
  }

  const id: string = body?.id;
  if (!id || !supplierExists(id)) return NextResponse.json({ error: "Fournisseur introuvable." }, { status: 404 });

  if (op === "update") {
    updateSupplier(id, {
      name: typeof body?.name === "string" ? body.name.trim() : undefined,
      type: typeof body?.type === "string" ? body.type : undefined,
      criticality: typeof body?.criticality === "string" ? body.criticality : undefined,
      service: typeof body?.service === "string" ? body.service : undefined,
      dataAccess: typeof body?.dataAccess === "string" ? body.dataAccess : undefined,
      ownerId: body?.ownerId !== undefined ? String(body.ownerId || "") : undefined,
      status: typeof body?.status === "string" ? body.status : undefined,
      contractEnd: body?.contractEnd !== undefined ? toIso(body.contractEnd) : undefined,
      reviewDate: body?.reviewDate !== undefined ? toIso(body.reviewDate) : undefined,
      assetIds: body?.assetIds !== undefined ? strArr(body.assetIds) : undefined,
      notes: typeof body?.notes === "string" ? body.notes : undefined,
    });
  } else if (op === "delete") {
    if (!canDelete(user.role)) return NextResponse.json({ error: "Suppression réservée aux manager/directeur/admin." }, { status: 403 });
    deleteSupplier(id);
    return NextResponse.json({ suppliers: listSuppliers() });
  } else {
    return NextResponse.json({ error: "Opération inconnue." }, { status: 400 });
  }

  return NextResponse.json({ suppliers: listSuppliers(), supplier: getSupplier(id) });
}

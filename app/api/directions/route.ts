/* ==================================================================
 *  /api/directions — Organigramme GRC (Directions → Services).
 *  op=create / update / delete. Édition par tout utilisateur non
 *  lecture-seule ; suppression réservée aux manager/directeur/admin.
 * ================================================================== */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { denyReadOnly } from "@/lib/auth/guards";
import { createDirection, deleteDirection, directionExists, getDirection, listDirections, updateDirection } from "@/lib/db/directions";
import { logActivity } from "@/lib/db/admin";

const canDelete = (role: string) => ["manager", "directeur", "admin"].includes(role);

const parseServices = (v: unknown) =>
  Array.isArray(v)
    ? v.map((s) => ({ name: String((s as { name?: unknown })?.name || ""), headId: String((s as { headId?: unknown })?.headId || "") })).filter((s) => s.name.trim())
    : [];

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const ro = denyReadOnly(user); if (ro) return ro;

  const body = await request.json().catch(() => ({}));
  const op: string = body?.op;

  if (op === "create") {
    const name = String(body?.name || "").trim();
    if (!name) return NextResponse.json({ error: "Nom de la direction requis." }, { status: 400 });
    const id = createDirection({
      name,
      code: String(body?.code || ""),
      headId: typeof body?.headId === "string" ? body.headId : "",
      description: String(body?.description || ""),
      services: parseServices(body?.services),
      createdBy: user.id,
    });
    logActivity(user.id, "direction.creation", name);
    return NextResponse.json({ directions: listDirections(), direction: getDirection(id) });
  }

  const id: string = body?.id;
  if (!id || !directionExists(id)) return NextResponse.json({ error: "Direction introuvable." }, { status: 404 });

  if (op === "update") {
    updateDirection(id, {
      name: typeof body?.name === "string" ? body.name.trim() : undefined,
      code: typeof body?.code === "string" ? body.code : undefined,
      headId: body?.headId !== undefined ? String(body.headId || "") : undefined,
      description: typeof body?.description === "string" ? body.description : undefined,
      services: body?.services !== undefined ? parseServices(body.services) : undefined,
    });
  } else if (op === "delete") {
    if (!canDelete(user.role)) return NextResponse.json({ error: "Suppression réservée aux manager/directeur/admin." }, { status: 403 });
    deleteDirection(id);
    return NextResponse.json({ directions: listDirections() });
  } else {
    return NextResponse.json({ error: "Opération inconnue." }, { status: 400 });
  }

  return NextResponse.json({ directions: listDirections(), direction: getDirection(id) });
}

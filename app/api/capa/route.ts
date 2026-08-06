/* ==================================================================
 *  /api/capa — Plan d'actions correctives / préventives (module GRC).
 *  op=create / update / status / delete. Édition par tout utilisateur
 *  non lecture-seule ; suppression réservée aux manager/directeur/admin.
 * ================================================================== */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { denyReadOnly } from "@/lib/auth/guards";
import { capaExists, createCapa, deleteCapa, getCapa, listCapaActions, updateCapa } from "@/lib/db/capa";
import { logActivity } from "@/lib/db/admin";
import { CAPA_STATUS } from "@/lib/domain";

const toIso = (d?: string | null) => (d ? new Date(`${d}T00:00:00`).toISOString() : null);
const canDelete = (role: string) => ["manager", "directeur", "admin"].includes(role);

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const ro = denyReadOnly(user); if (ro) return ro;

  const body = await request.json().catch(() => ({}));
  const op: string = body?.op;

  if (op === "create") {
    const title = String(body?.title || "").trim();
    if (!title) return NextResponse.json({ error: "Intitulé de l'action requis." }, { status: 400 });
    const id = createCapa({
      title,
      description: String(body?.description || ""),
      type: typeof body?.type === "string" ? body.type : undefined,
      priority: typeof body?.priority === "string" ? body.priority : undefined,
      sourceType: typeof body?.sourceType === "string" ? body.sourceType : undefined,
      sourceId: typeof body?.sourceId === "string" && body.sourceId ? body.sourceId : null,
      ownerId: typeof body?.ownerId === "string" && body.ownerId ? body.ownerId : user.id,
      dueDate: toIso(body?.dueDate),
      status: typeof body?.status === "string" ? body.status : undefined,
      verification: String(body?.verification || ""),
      createdBy: user.id,
    });
    logActivity(user.id, "capa.creation", title);
    return NextResponse.json({ capaActions: listCapaActions(), capa: getCapa(id) });
  }

  const id: string = body?.id;
  if (!id || !capaExists(id)) return NextResponse.json({ error: "Action introuvable." }, { status: 404 });

  if (op === "update") {
    updateCapa(id, {
      title: typeof body?.title === "string" ? body.title.trim() : undefined,
      description: typeof body?.description === "string" ? body.description : undefined,
      type: typeof body?.type === "string" ? body.type : undefined,
      priority: typeof body?.priority === "string" ? body.priority : undefined,
      ownerId: typeof body?.ownerId === "string" ? body.ownerId : undefined,
      dueDate: body?.dueDate !== undefined ? toIso(body.dueDate) : undefined,
      status: typeof body?.status === "string" ? body.status : undefined,
      verification: typeof body?.verification === "string" ? body.verification : undefined,
    });
  } else if (op === "status") {
    if (!CAPA_STATUS.includes(body?.status)) return NextResponse.json({ error: "Statut invalide." }, { status: 400 });
    updateCapa(id, { status: body.status });
  } else if (op === "delete") {
    if (!canDelete(user.role)) return NextResponse.json({ error: "Suppression réservée aux manager/directeur/admin." }, { status: 403 });
    deleteCapa(id);
    return NextResponse.json({ capaActions: listCapaActions() });
  } else {
    return NextResponse.json({ error: "Opération inconnue." }, { status: 400 });
  }

  return NextResponse.json({ capaActions: listCapaActions(), capa: getCapa(id) });
}

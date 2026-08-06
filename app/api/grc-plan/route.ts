/* ==================================================================
 *  /api/grc-plan — Plan de travail GRC (chantiers de l'équipe).
 *  op=create / update / status / delete. Édition par tout utilisateur
 *  non lecture-seule ; suppression réservée aux manager/directeur/admin.
 * ================================================================== */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { denyReadOnly } from "@/lib/auth/guards";
import { createPlanItem, deletePlanItem, getPlanItem, listPlanItems, planItemExists, updatePlanItem } from "@/lib/db/grcplan";
import { logActivity } from "@/lib/db/admin";
import { PLAN_STATUS } from "@/lib/domain";

const toIso = (d?: string | null) => (d ? new Date(`${d}T00:00:00`).toISOString() : null);
const canDelete = (role: string) => ["manager", "directeur", "admin"].includes(role);
const toYear = (v: unknown): number | undefined => {
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) && n >= 2000 && n <= 2100 ? n : undefined;
};
const toProgress = (v: unknown): number | undefined => (v === undefined || v === null ? undefined : Number(v));

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const ro = denyReadOnly(user); if (ro) return ro;

  const body = await request.json().catch(() => ({}));
  const op: string = body?.op;

  if (op === "create") {
    const title = String(body?.title || "").trim();
    if (!title) return NextResponse.json({ error: "Intitulé du chantier requis." }, { status: 400 });
    const id = createPlanItem({
      title,
      category: typeof body?.category === "string" ? body.category : undefined,
      year: toYear(body?.year),
      quarter: typeof body?.quarter === "string" ? body.quarter : undefined,
      ownerId: typeof body?.ownerId === "string" && body.ownerId ? body.ownerId : user.id,
      priority: typeof body?.priority === "string" ? body.priority : undefined,
      status: typeof body?.status === "string" ? body.status : undefined,
      progress: toProgress(body?.progress),
      dueDate: toIso(body?.dueDate),
      description: String(body?.description || ""),
      createdBy: user.id,
    });
    logActivity(user.id, "grcplan.creation", title);
    return NextResponse.json({ planItems: listPlanItems(), planItem: getPlanItem(id) });
  }

  const id: string = body?.id;
  if (!id || !planItemExists(id)) return NextResponse.json({ error: "Chantier introuvable." }, { status: 404 });

  if (op === "update") {
    updatePlanItem(id, {
      title: typeof body?.title === "string" ? body.title.trim() : undefined,
      category: typeof body?.category === "string" ? body.category : undefined,
      year: toYear(body?.year),
      quarter: typeof body?.quarter === "string" ? body.quarter : undefined,
      ownerId: typeof body?.ownerId === "string" ? body.ownerId : undefined,
      priority: typeof body?.priority === "string" ? body.priority : undefined,
      status: typeof body?.status === "string" ? body.status : undefined,
      progress: toProgress(body?.progress),
      dueDate: body?.dueDate !== undefined ? toIso(body.dueDate) : undefined,
      description: typeof body?.description === "string" ? body.description : undefined,
    });
  } else if (op === "status") {
    if (!PLAN_STATUS.includes(body?.status)) return NextResponse.json({ error: "Statut invalide." }, { status: 400 });
    updatePlanItem(id, { status: body.status });
  } else if (op === "delete") {
    if (!canDelete(user.role)) return NextResponse.json({ error: "Suppression réservée aux manager/directeur/admin." }, { status: 403 });
    deletePlanItem(id);
    return NextResponse.json({ planItems: listPlanItems() });
  } else {
    return NextResponse.json({ error: "Opération inconnue." }, { status: 400 });
  }

  return NextResponse.json({ planItems: listPlanItems(), planItem: getPlanItem(id) });
}

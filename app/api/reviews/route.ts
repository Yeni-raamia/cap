/* ==================================================================
 *  /api/reviews — Revue de direction (ISO 27001 §9.3, GRC).
 *  op=create / update / delete. Édition hors lecture seule ;
 *  suppression réservée aux manager/directeur/admin.
 * ================================================================== */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { denyReadOnly } from "@/lib/auth/guards";
import { createReview, deleteReview, getReview, listReviews, reviewExists, updateReview } from "@/lib/db/reviews";
import { logActivity } from "@/lib/db/admin";

const canDelete = (role: string) => ["manager", "directeur", "admin"].includes(role);
const toIso = (d?: string | null) => (d ? new Date(`${d}T00:00:00`).toISOString() : null);
const strArr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x) => typeof x === "string") : []);
const numMap = (v: unknown): Record<string, number> => {
  if (!v || typeof v !== "object") return {};
  const o: Record<string, number> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) if (typeof val === "number") o[k] = val;
  return o;
};
const S = (v: unknown) => (typeof v === "string" ? v : undefined);

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const ro = denyReadOnly(user); if (ro) return ro;

  const body = await request.json().catch(() => ({}));
  const op: string = body?.op;

  if (op === "create") {
    const title = String(body?.title || "").trim();
    if (!title) return NextResponse.json({ error: "Titre de la revue requis." }, { status: 400 });
    const id = createReview({
      title, date: toIso(body?.date), period: String(body?.period || ""), participantIds: strArr(body?.participantIds),
      contextChanges: String(body?.contextChanges || ""), riskReview: String(body?.riskReview || ""), complianceReview: String(body?.complianceReview || ""),
      incidentsReview: String(body?.incidentsReview || ""), objectivesReview: String(body?.objectivesReview || ""), feedback: String(body?.feedback || ""),
      decisions: String(body?.decisions || ""), actions: String(body?.actions || ""), kpiSnapshot: numMap(body?.kpiSnapshot),
      nextReviewDate: toIso(body?.nextReviewDate), status: S(body?.status), createdBy: user.id,
    });
    logActivity(user.id, "review.creation", title);
    return NextResponse.json({ reviews: listReviews(), review: getReview(id) });
  }

  const id: string = body?.id;
  if (!id || !reviewExists(id)) return NextResponse.json({ error: "Revue introuvable." }, { status: 404 });

  if (op === "update") {
    updateReview(id, {
      title: typeof body?.title === "string" ? body.title.trim() : undefined,
      date: body?.date !== undefined ? toIso(body.date) : undefined,
      period: S(body?.period), participantIds: body?.participantIds !== undefined ? strArr(body.participantIds) : undefined,
      contextChanges: S(body?.contextChanges), riskReview: S(body?.riskReview), complianceReview: S(body?.complianceReview),
      incidentsReview: S(body?.incidentsReview), objectivesReview: S(body?.objectivesReview), feedback: S(body?.feedback),
      decisions: S(body?.decisions), actions: S(body?.actions),
      kpiSnapshot: body?.kpiSnapshot !== undefined ? numMap(body.kpiSnapshot) : undefined,
      nextReviewDate: body?.nextReviewDate !== undefined ? toIso(body.nextReviewDate) : undefined,
      status: S(body?.status),
    });
  } else if (op === "delete") {
    if (!canDelete(user.role)) return NextResponse.json({ error: "Suppression réservée aux manager/directeur/admin." }, { status: 403 });
    deleteReview(id);
    return NextResponse.json({ reviews: listReviews() });
  } else {
    return NextResponse.json({ error: "Opération inconnue." }, { status: 400 });
  }

  return NextResponse.json({ reviews: listReviews(), review: getReview(id) });
}

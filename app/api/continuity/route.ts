/* ==================================================================
 *  /api/continuity — Continuité d'activité (BIA + PCA/PRA, GRC).
 *  op=create / update / delete. Édition hors lecture seule ;
 *  suppression réservée aux manager/directeur/admin.
 * ================================================================== */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { denyReadOnly } from "@/lib/auth/guards";
import { continuityPlanExists, createContinuityPlan, deleteContinuityPlan, getContinuityPlan, listContinuityPlans, updateContinuityPlan } from "@/lib/db/continuity";
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
    const activity = String(body?.activity || "").trim();
    if (!activity) return NextResponse.json({ error: "Activité / processus requis." }, { status: 400 });
    const id = createContinuityPlan({
      activity,
      missionId: typeof body?.missionId === "string" ? body.missionId : "",
      ownerId: typeof body?.ownerId === "string" ? body.ownerId : "",
      criticality: typeof body?.criticality === "string" ? body.criticality : undefined,
      mtpd: typeof body?.mtpd === "string" ? body.mtpd : undefined,
      rto: typeof body?.rto === "string" ? body.rto : undefined,
      rpo: typeof body?.rpo === "string" ? body.rpo : undefined,
      impacts: strArr(body?.impacts),
      strategy: String(body?.strategy || ""),
      resources: String(body?.resources || ""),
      procedure: String(body?.procedure || ""),
      assetIds: strArr(body?.assetIds),
      lastTestDate: toIso(body?.lastTestDate),
      reviewDate: toIso(body?.reviewDate),
      status: typeof body?.status === "string" ? body.status : undefined,
      createdBy: user.id,
    });
    logActivity(user.id, "continuity.creation", activity);
    return NextResponse.json({ continuityPlans: listContinuityPlans(), plan: getContinuityPlan(id) });
  }

  const id: string = body?.id;
  if (!id || !continuityPlanExists(id)) return NextResponse.json({ error: "Plan introuvable." }, { status: 404 });

  if (op === "update") {
    updateContinuityPlan(id, {
      activity: typeof body?.activity === "string" ? body.activity.trim() : undefined,
      missionId: typeof body?.missionId === "string" ? body.missionId : undefined,
      ownerId: body?.ownerId !== undefined ? String(body.ownerId || "") : undefined,
      criticality: typeof body?.criticality === "string" ? body.criticality : undefined,
      mtpd: typeof body?.mtpd === "string" ? body.mtpd : undefined,
      rto: typeof body?.rto === "string" ? body.rto : undefined,
      rpo: typeof body?.rpo === "string" ? body.rpo : undefined,
      impacts: body?.impacts !== undefined ? strArr(body.impacts) : undefined,
      strategy: typeof body?.strategy === "string" ? body.strategy : undefined,
      resources: typeof body?.resources === "string" ? body.resources : undefined,
      procedure: typeof body?.procedure === "string" ? body.procedure : undefined,
      assetIds: body?.assetIds !== undefined ? strArr(body.assetIds) : undefined,
      lastTestDate: body?.lastTestDate !== undefined ? toIso(body.lastTestDate) : undefined,
      reviewDate: body?.reviewDate !== undefined ? toIso(body.reviewDate) : undefined,
      status: typeof body?.status === "string" ? body.status : undefined,
    });
  } else if (op === "delete") {
    if (!canDelete(user.role)) return NextResponse.json({ error: "Suppression réservée aux manager/directeur/admin." }, { status: 403 });
    deleteContinuityPlan(id);
    return NextResponse.json({ continuityPlans: listContinuityPlans() });
  } else {
    return NextResponse.json({ error: "Opération inconnue." }, { status: 400 });
  }

  return NextResponse.json({ continuityPlans: listContinuityPlans(), plan: getContinuityPlan(id) });
}

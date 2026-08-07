/* ==================================================================
 *  /api/incidents — Gestion des incidents (cycle ISO 27035, GRC).
 *  op=create / update / status / delete. Édition hors lecture seule ;
 *  suppression réservée aux manager/directeur/admin.
 * ================================================================== */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { denyReadOnly } from "@/lib/auth/guards";
import { createIncident, deleteIncident, getIncident, incidentExists, listIncidents, updateIncident } from "@/lib/db/incidents";
import { logActivity } from "@/lib/db/admin";
import { INCIDENT_STATUS } from "@/lib/domain";

const canDelete = (role: string) => ["manager", "directeur", "admin"].includes(role);
const toIso = (d?: string | null) => (d ? new Date(d).toISOString() : null);
const strArr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x) => typeof x === "string") : []);

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const ro = denyReadOnly(user); if (ro) return ro;

  const body = await request.json().catch(() => ({}));
  const op: string = body?.op;

  if (op === "create") {
    const title = String(body?.title || "").trim();
    if (!title) return NextResponse.json({ error: "Intitulé de l'incident requis." }, { status: 400 });
    const id = createIncident({
      title,
      type: typeof body?.type === "string" ? body.type : undefined,
      severity: typeof body?.severity === "string" ? body.severity : undefined,
      status: typeof body?.status === "string" ? body.status : undefined,
      dataBreach: Boolean(body?.dataBreach),
      detectedAt: toIso(body?.detectedAt),
      declaredBy: typeof body?.declaredBy === "string" ? body.declaredBy : "",
      ownerId: typeof body?.ownerId === "string" ? body.ownerId : "",
      missionId: typeof body?.missionId === "string" ? body.missionId : "",
      assetIds: strArr(body?.assetIds),
      description: String(body?.description || ""),
      impact: String(body?.impact || ""),
      actionsTaken: String(body?.actionsTaken || ""),
      rootCause: String(body?.rootCause || ""),
      lessons: String(body?.lessons || ""),
      createdBy: user.id,
    });
    logActivity(user.id, "incident.creation", title);
    return NextResponse.json({ incidents: listIncidents(), incident: getIncident(id) });
  }

  const id: string = body?.id;
  if (!id || !incidentExists(id)) return NextResponse.json({ error: "Incident introuvable." }, { status: 404 });

  if (op === "update") {
    updateIncident(id, {
      title: typeof body?.title === "string" ? body.title.trim() : undefined,
      type: typeof body?.type === "string" ? body.type : undefined,
      severity: typeof body?.severity === "string" ? body.severity : undefined,
      status: typeof body?.status === "string" ? body.status : undefined,
      dataBreach: typeof body?.dataBreach === "boolean" ? body.dataBreach : undefined,
      detectedAt: body?.detectedAt !== undefined ? toIso(body.detectedAt) : undefined,
      declaredBy: typeof body?.declaredBy === "string" ? body.declaredBy : undefined,
      ownerId: typeof body?.ownerId === "string" ? body.ownerId : undefined,
      missionId: typeof body?.missionId === "string" ? body.missionId : undefined,
      assetIds: body?.assetIds !== undefined ? strArr(body.assetIds) : undefined,
      description: typeof body?.description === "string" ? body.description : undefined,
      impact: typeof body?.impact === "string" ? body.impact : undefined,
      actionsTaken: typeof body?.actionsTaken === "string" ? body.actionsTaken : undefined,
      resolvedAt: body?.resolvedAt !== undefined ? toIso(body.resolvedAt) : undefined,
      rootCause: typeof body?.rootCause === "string" ? body.rootCause : undefined,
      lessons: typeof body?.lessons === "string" ? body.lessons : undefined,
    });
  } else if (op === "status") {
    if (!INCIDENT_STATUS.includes(body?.status)) return NextResponse.json({ error: "Statut invalide." }, { status: 400 });
    updateIncident(id, { status: body.status });
  } else if (op === "delete") {
    if (!canDelete(user.role)) return NextResponse.json({ error: "Suppression réservée aux manager/directeur/admin." }, { status: 403 });
    deleteIncident(id);
    return NextResponse.json({ incidents: listIncidents() });
  } else {
    return NextResponse.json({ error: "Opération inconnue." }, { status: 400 });
  }

  return NextResponse.json({ incidents: listIncidents(), incident: getIncident(id) });
}

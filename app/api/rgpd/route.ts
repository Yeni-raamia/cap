/* ==================================================================
 *  /api/rgpd — RGPD : registre des traitements + AIPD (GRC).
 *  op=create / update / delete. Édition hors lecture seule ;
 *  suppression réservée aux manager/directeur/admin.
 * ================================================================== */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { denyReadOnly } from "@/lib/auth/guards";
import { createProcessing, deleteProcessing, getProcessing, listProcessing, processingExists, updateProcessing } from "@/lib/db/rgpd";
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
    if (!name) return NextResponse.json({ error: "Nom du traitement requis." }, { status: 400 });
    const id = createProcessing({
      name,
      purpose: String(body?.purpose || ""),
      legalBasis: typeof body?.legalBasis === "string" ? body.legalBasis : "",
      dataCategories: strArr(body?.dataCategories),
      sensitiveData: Boolean(body?.sensitiveData),
      dataSubjects: String(body?.dataSubjects || ""),
      recipients: String(body?.recipients || ""),
      retention: String(body?.retention || ""),
      transfersOutsideEU: Boolean(body?.transfersOutsideEU),
      transferDetails: String(body?.transferDetails || ""),
      ownerId: typeof body?.ownerId === "string" ? body.ownerId : "",
      service: String(body?.service || ""),
      securityMeasures: String(body?.securityMeasures || ""),
      assetIds: strArr(body?.assetIds),
      piaRequired: Boolean(body?.piaRequired),
      piaStatus: typeof body?.piaStatus === "string" ? body.piaStatus : undefined,
      piaRisk: typeof body?.piaRisk === "string" ? body.piaRisk : undefined,
      piaNotes: String(body?.piaNotes || ""),
      status: typeof body?.status === "string" ? body.status : undefined,
      reviewDate: toIso(body?.reviewDate),
      createdBy: user.id,
    });
    logActivity(user.id, "rgpd.creation", name);
    return NextResponse.json({ processing: listProcessing(), item: getProcessing(id) });
  }

  const id: string = body?.id;
  if (!id || !processingExists(id)) return NextResponse.json({ error: "Traitement introuvable." }, { status: 404 });

  if (op === "update") {
    updateProcessing(id, {
      name: typeof body?.name === "string" ? body.name.trim() : undefined,
      purpose: typeof body?.purpose === "string" ? body.purpose : undefined,
      legalBasis: typeof body?.legalBasis === "string" ? body.legalBasis : undefined,
      dataCategories: body?.dataCategories !== undefined ? strArr(body.dataCategories) : undefined,
      sensitiveData: typeof body?.sensitiveData === "boolean" ? body.sensitiveData : undefined,
      dataSubjects: typeof body?.dataSubjects === "string" ? body.dataSubjects : undefined,
      recipients: typeof body?.recipients === "string" ? body.recipients : undefined,
      retention: typeof body?.retention === "string" ? body.retention : undefined,
      transfersOutsideEU: typeof body?.transfersOutsideEU === "boolean" ? body.transfersOutsideEU : undefined,
      transferDetails: typeof body?.transferDetails === "string" ? body.transferDetails : undefined,
      ownerId: body?.ownerId !== undefined ? String(body.ownerId || "") : undefined,
      service: typeof body?.service === "string" ? body.service : undefined,
      securityMeasures: typeof body?.securityMeasures === "string" ? body.securityMeasures : undefined,
      assetIds: body?.assetIds !== undefined ? strArr(body.assetIds) : undefined,
      piaRequired: typeof body?.piaRequired === "boolean" ? body.piaRequired : undefined,
      piaStatus: typeof body?.piaStatus === "string" ? body.piaStatus : undefined,
      piaRisk: typeof body?.piaRisk === "string" ? body.piaRisk : undefined,
      piaNotes: typeof body?.piaNotes === "string" ? body.piaNotes : undefined,
      status: typeof body?.status === "string" ? body.status : undefined,
      reviewDate: body?.reviewDate !== undefined ? toIso(body.reviewDate) : undefined,
    });
  } else if (op === "delete") {
    if (!canDelete(user.role)) return NextResponse.json({ error: "Suppression réservée aux manager/directeur/admin." }, { status: 403 });
    deleteProcessing(id);
    return NextResponse.json({ processing: listProcessing() });
  } else {
    return NextResponse.json({ error: "Opération inconnue." }, { status: 400 });
  }

  return NextResponse.json({ processing: listProcessing(), item: getProcessing(id) });
}

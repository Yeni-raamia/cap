/* ==================================================================
 *  /api/audit-plan — Programme d'audit annuel (ISO 19011 §5).
 *  op=create / update / delete. Édition hors lecture seule ;
 *  suppression réservée aux manager/directeur/admin.
 * ================================================================== */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { denyReadOnly } from "@/lib/auth/guards";
import { createAuditPlanItem, deleteAuditPlanItem, getAuditPlanItem, listAuditPlanItems, auditPlanExists, updateAuditPlanItem } from "@/lib/db/auditplan";
import { logActivity } from "@/lib/db/admin";

const canDelete = (role: string) => ["manager", "directeur", "admin"].includes(role);
const toIso = (d?: string | null) => (d ? new Date(`${d}T00:00:00`).toISOString() : null);
const S = (v: unknown) => (typeof v === "string" ? v : undefined);
const N = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const ro = denyReadOnly(user); if (ro) return ro;

  const body = await request.json().catch(() => ({}));
  const op: string = body?.op;

  if (op === "create") {
    const title = String(body?.title || "").trim();
    if (!title) return NextResponse.json({ error: "Périmètre à auditer requis." }, { status: 400 });
    const id = createAuditPlanItem({
      title,
      category: S(body?.category),
      riskLevel: S(body?.riskLevel),
      year: N(body?.year),
      quarter: S(body?.quarter),
      ownerId: S(body?.ownerId),
      targetAssetId: S(body?.targetAssetId) || null,
      targetLabel: String(body?.targetLabel || ""),
      gridId: String(body?.gridId || ""),
      auditId: String(body?.auditId || ""),
      plannedDate: toIso(body?.plannedDate),
      status: S(body?.status),
      objective: String(body?.objective || ""),
      createdBy: user.id,
    });
    logActivity(user.id, "auditplan.creation", title);
    return NextResponse.json({ auditPlanItems: listAuditPlanItems(), auditPlanItem: getAuditPlanItem(id) });
  }

  const id: string = body?.id;
  if (!id || !auditPlanExists(id)) return NextResponse.json({ error: "Item introuvable." }, { status: 404 });

  if (op === "update") {
    updateAuditPlanItem(id, {
      title: typeof body?.title === "string" ? body.title.trim() : undefined,
      category: S(body?.category), riskLevel: S(body?.riskLevel), year: N(body?.year), quarter: S(body?.quarter),
      ownerId: S(body?.ownerId),
      targetAssetId: body?.targetAssetId !== undefined ? (S(body.targetAssetId) || null) : undefined,
      targetLabel: S(body?.targetLabel), gridId: S(body?.gridId), auditId: S(body?.auditId),
      plannedDate: body?.plannedDate !== undefined ? toIso(body.plannedDate) : undefined,
      status: S(body?.status), objective: S(body?.objective),
    });
  } else if (op === "delete") {
    if (!canDelete(user.role)) return NextResponse.json({ error: "Suppression réservée aux manager/directeur/admin." }, { status: 403 });
    deleteAuditPlanItem(id);
    return NextResponse.json({ auditPlanItems: listAuditPlanItems() });
  } else {
    return NextResponse.json({ error: "Opération inconnue." }, { status: 400 });
  }

  return NextResponse.json({ auditPlanItems: listAuditPlanItems(), auditPlanItem: getAuditPlanItem(id) });
}

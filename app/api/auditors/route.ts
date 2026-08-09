/* ==================================================================
 *  /api/auditors — Registre des auditeurs (ISO 19011 §7, module Audit).
 *  op=create / update / delete. Édition hors lecture seule ;
 *  suppression réservée aux manager/directeur/admin.
 * ================================================================== */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { denyReadOnly } from "@/lib/auth/guards";
import { createAuditor, deleteAuditor, getAuditor, listAuditors, auditorExists, updateAuditor } from "@/lib/db/auditors";
import { logActivity } from "@/lib/db/admin";

const canDelete = (role: string) => ["manager", "directeur", "admin"].includes(role);
const S = (v: unknown) => (typeof v === "string" ? v : undefined);
const strArr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x) => typeof x === "string") : []);

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const ro = denyReadOnly(user); if (ro) return ro;

  const body = await request.json().catch(() => ({}));
  const op: string = body?.op;

  if (op === "create") {
    const name = String(body?.name || "").trim();
    if (!name) return NextResponse.json({ error: "Nom de l'auditeur requis." }, { status: 400 });
    const id = createAuditor({
      name,
      profileId: String(body?.profileId || ""),
      role: S(body?.role),
      competencies: strArr(body?.competencies),
      certifications: String(body?.certifications || ""),
      independence: String(body?.independence || ""),
      status: S(body?.status),
      notes: String(body?.notes || ""),
      createdBy: user.id,
    });
    logActivity(user.id, "auditor.creation", name);
    return NextResponse.json({ auditors: listAuditors(), auditor: getAuditor(id) });
  }

  const id: string = body?.id;
  if (!id || !auditorExists(id)) return NextResponse.json({ error: "Auditeur introuvable." }, { status: 404 });

  if (op === "update") {
    updateAuditor(id, {
      name: typeof body?.name === "string" ? body.name.trim() : undefined,
      profileId: S(body?.profileId), role: S(body?.role),
      competencies: body?.competencies !== undefined ? strArr(body.competencies) : undefined,
      certifications: S(body?.certifications), independence: S(body?.independence),
      status: S(body?.status), notes: S(body?.notes),
    });
  } else if (op === "delete") {
    if (!canDelete(user.role)) return NextResponse.json({ error: "Suppression réservée aux manager/directeur/admin." }, { status: 403 });
    deleteAuditor(id);
    return NextResponse.json({ auditors: listAuditors() });
  } else {
    return NextResponse.json({ error: "Opération inconnue." }, { status: 400 });
  }

  return NextResponse.json({ auditors: listAuditors(), auditor: getAuditor(id) });
}

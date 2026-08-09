/* ==================================================================
 *  /api/audits — Audits techniques réalisés (module Audit).
 *  op=create / update / delete. Édition hors lecture seule ;
 *  suppression réservée aux manager/directeur/admin.
 * ================================================================== */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { denyReadOnly } from "@/lib/auth/guards";
import { createAudit, deleteAudit, getAudit, listAudits, auditExists, updateAudit } from "@/lib/db/audits";
import { getAuditGrid } from "@/lib/db/auditgrids";
import { logActivity } from "@/lib/db/admin";
import { AUDIT_ANSWERS, type AuditResponse } from "@/lib/domain";

const canDelete = (role: string) => ["manager", "directeur", "admin"].includes(role);
const toIso = (d?: string | null) => (d ? new Date(`${d}T00:00:00`).toISOString() : null);
const S = (v: unknown) => (typeof v === "string" ? v : undefined);

function parseResponses(v: unknown): AuditResponse[] {
  if (!Array.isArray(v)) return [];
  return v.map((r) => {
    const o = (r ?? {}) as Record<string, unknown>;
    const answer = String(o.answer ?? "");
    return {
      questionId: String(o.questionId ?? ""),
      answer: (AUDIT_ANSWERS as readonly string[]).includes(answer) ? answer : "À vérifier",
      note: String(o.note ?? ""),
      evidence: String(o.evidence ?? ""),
    };
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const ro = denyReadOnly(user); if (ro) return ro;

  const body = await request.json().catch(() => ({}));
  const op: string = body?.op;

  if (op === "create") {
    const gridId = String(body?.gridId || "");
    const grid = gridId ? getAuditGrid(gridId) : null;
    if (!grid) return NextResponse.json({ error: "Grille d'audit introuvable." }, { status: 400 });
    // La grille est figée dans l'audit à sa création (score stable même si la grille évolue).
    const title = String(body?.title || "").trim() || `Audit — ${grid.name}`;
    const id = createAudit({
      title, gridId: grid.id, gridName: grid.name, category: grid.category, questions: grid.questions,
      targetAssetId: S(body?.targetAssetId) || null,
      targetLabel: String(body?.targetLabel || ""),
      auditorId: S(body?.auditorId) || user.id,
      date: toIso(body?.date),
      status: S(body?.status),
      responses: parseResponses(body?.responses),
      summary: String(body?.summary || ""),
      createdBy: user.id,
    });
    logActivity(user.id, "audit.creation", title);
    return NextResponse.json({ audits: listAudits(), audit: getAudit(id) });
  }

  const id: string = body?.id;
  if (!id || !auditExists(id)) return NextResponse.json({ error: "Audit introuvable." }, { status: 404 });

  if (op === "update") {
    updateAudit(id, {
      title: typeof body?.title === "string" ? body.title.trim() : undefined,
      targetAssetId: body?.targetAssetId !== undefined ? (S(body.targetAssetId) || null) : undefined,
      targetLabel: S(body?.targetLabel),
      auditorId: S(body?.auditorId),
      date: body?.date !== undefined ? toIso(body.date) : undefined,
      status: S(body?.status),
      responses: body?.responses !== undefined ? parseResponses(body.responses) : undefined,
      summary: S(body?.summary),
    });
  } else if (op === "delete") {
    if (!canDelete(user.role)) return NextResponse.json({ error: "Suppression réservée aux manager/directeur/admin." }, { status: 403 });
    deleteAudit(id);
    return NextResponse.json({ audits: listAudits() });
  } else {
    return NextResponse.json({ error: "Opération inconnue." }, { status: 400 });
  }

  return NextResponse.json({ audits: listAudits(), audit: getAudit(id) });
}

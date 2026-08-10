/* ==================================================================
 *  /api/audit-grids — Grilles d'audit technique (module Audit).
 *  op=create / update / delete. Édition hors lecture seule ;
 *  suppression réservée aux manager/directeur/admin.
 * ================================================================== */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { denyReadOnly } from "@/lib/auth/guards";
import { createAuditGrid, deleteAuditGrid, getAuditGrid, listAuditGrids, auditGridExists, updateAuditGrid } from "@/lib/db/auditgrids";
import { auditsUseGrid } from "@/lib/db/audits";
import { logActivity } from "@/lib/db/admin";
import type { AuditQuestion } from "@/lib/domain";

const canDelete = (role: string) => ["manager", "directeur", "admin"].includes(role);

/** Normalise les questions reçues du client (validation légère ; nettoyage complet côté DB). */
function parseQuestions(v: unknown): AuditQuestion[] {
  if (!Array.isArray(v)) return [];
  return v.map((q) => {
    const o = (q ?? {}) as Record<string, unknown>;
    return {
      id: typeof o.id === "string" ? o.id : "",
      domain: String(o.domain ?? ""),
      text: String(o.text ?? ""),
      guidance: String(o.guidance ?? ""),
      weight: Number(o.weight) || 1,
      critical: Boolean(o.critical),
      frameworkId: String(o.frameworkId ?? ""),
      controlCode: String(o.controlCode ?? ""),
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
    const name = String(body?.name || "").trim();
    if (!name) return NextResponse.json({ error: "Nom de la grille requis." }, { status: 400 });
    const id = createAuditGrid({
      name,
      category: typeof body?.category === "string" ? body.category : undefined,
      source: typeof body?.source === "string" ? body.source : undefined,
      description: String(body?.description || ""),
      questions: parseQuestions(body?.questions),
      createdBy: user.id,
    });
    logActivity(user.id, "auditgrid.creation", name);
    return NextResponse.json({ auditGrids: listAuditGrids(), auditGrid: getAuditGrid(id) });
  }

  const id: string = body?.id;
  if (!id || !auditGridExists(id)) return NextResponse.json({ error: "Grille introuvable." }, { status: 404 });

  if (op === "update") {
    updateAuditGrid(id, {
      name: typeof body?.name === "string" ? body.name.trim() : undefined,
      category: typeof body?.category === "string" ? body.category : undefined,
      source: typeof body?.source === "string" ? body.source : undefined,
      description: typeof body?.description === "string" ? body.description : undefined,
      questions: body?.questions !== undefined ? parseQuestions(body.questions) : undefined,
    });
  } else if (op === "delete") {
    if (!canDelete(user.role)) return NextResponse.json({ error: "Suppression réservée aux manager/directeur/admin." }, { status: 403 });
    if (auditsUseGrid(id)) return NextResponse.json({ error: "Grille utilisée par un ou plusieurs audits — suppression impossible." }, { status: 409 });
    deleteAuditGrid(id);
    return NextResponse.json({ auditGrids: listAuditGrids() });
  } else {
    return NextResponse.json({ error: "Opération inconnue." }, { status: 400 });
  }

  return NextResponse.json({ auditGrids: listAuditGrids(), auditGrid: getAuditGrid(id) });
}

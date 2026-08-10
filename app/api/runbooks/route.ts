/* ==================================================================
 *  /api/runbooks — Runbooks de réponse (module SOC).
 *  op=create / update / delete. Édition hors lecture seule ;
 *  suppression réservée aux manager/directeur/admin.
 * ================================================================== */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { denyReadOnly } from "@/lib/auth/guards";
import { createRunbook, deleteRunbook, getRunbook, listRunbooks, runbookExists, updateRunbook } from "@/lib/db/runbooks";
import { logActivity } from "@/lib/db/admin";
import { RUNBOOK_PHASES, type RunbookStep } from "@/lib/domain";

const canDelete = (role: string) => ["manager", "directeur", "admin"].includes(role);
const S = (v: unknown) => (typeof v === "string" ? v : undefined);
// Codes ATT&CK : normalisés en majuscules et sans doublon (ex. « t1566 » → « T1566 »).
const techniques = (v: unknown): string[] =>
  Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === "string").map((s) => s.trim().toUpperCase()).filter(Boolean))] : [];

function parseSteps(v: unknown): RunbookStep[] {
  if (!Array.isArray(v)) return [];
  return v.map((s) => {
    const o = (s ?? {}) as Record<string, unknown>;
    const phase = String(o.phase ?? "");
    return {
      id: typeof o.id === "string" ? o.id : "",
      phase: RUNBOOK_PHASES.includes(phase) ? phase : RUNBOOK_PHASES[0],
      title: String(o.title ?? ""),
      detail: String(o.detail ?? ""),
      decision: Boolean(o.decision),
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
    const title = String(body?.title || "").trim();
    if (!title) return NextResponse.json({ error: "Titre du runbook requis." }, { status: 400 });
    const id = createRunbook({
      title,
      category: S(body?.category), severity: S(body?.severity),
      trigger: String(body?.trigger || ""), objective: String(body?.objective || ""),
      attackTechniques: techniques(body?.attackTechniques), steps: parseSteps(body?.steps),
      escalation: String(body?.escalation || ""), references: String(body?.references || ""),
      status: S(body?.status), ownerId: S(body?.ownerId), createdBy: user.id,
    });
    logActivity(user.id, "runbook.creation", title);
    return NextResponse.json({ runbooks: listRunbooks(), runbook: getRunbook(id) });
  }

  const id: string = body?.id;
  if (!id || !runbookExists(id)) return NextResponse.json({ error: "Runbook introuvable." }, { status: 404 });

  if (op === "update") {
    updateRunbook(id, {
      title: typeof body?.title === "string" ? body.title.trim() : undefined,
      category: S(body?.category), severity: S(body?.severity),
      trigger: S(body?.trigger), objective: S(body?.objective),
      attackTechniques: body?.attackTechniques !== undefined ? techniques(body.attackTechniques) : undefined,
      steps: body?.steps !== undefined ? parseSteps(body.steps) : undefined,
      escalation: S(body?.escalation), references: S(body?.references),
      status: S(body?.status), ownerId: S(body?.ownerId),
    });
  } else if (op === "delete") {
    if (!canDelete(user.role)) return NextResponse.json({ error: "Suppression réservée aux manager/directeur/admin." }, { status: 403 });
    deleteRunbook(id);
    return NextResponse.json({ runbooks: listRunbooks() });
  } else {
    return NextResponse.json({ error: "Opération inconnue." }, { status: 400 });
  }

  return NextResponse.json({ runbooks: listRunbooks(), runbook: getRunbook(id) });
}

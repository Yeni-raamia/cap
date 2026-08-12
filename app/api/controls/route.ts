/* ==================================================================
 *  /api/controls — Évaluation des mesures (conformité, module GRC).
 *  op=assess (crée/màj l'évaluation d'une mesure) / reset.
 *  Édition par tout utilisateur non lecture-seule.
 * ================================================================== */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { denyReadOnly } from "@/lib/auth/guards";
import { listControlAssessments, resetAssessment, upsertAssessment } from "@/lib/db/controls";
import { logActivity } from "@/lib/db/admin";
import { allFrameworks } from "@/lib/grc/frameworks";
import { listLegalTexts } from "@/lib/db/legaltexts";

const toIso = (d?: string | null) => (d ? new Date(`${d}T00:00:00`).toISOString() : null);

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const ro = denyReadOnly(user); if (ro) return ro;

  const body = await request.json().catch(() => ({}));
  const op: string = body?.op;
  const frameworkId = String(body?.frameworkId || "");
  const controlCode = String(body?.controlCode || "");
  // Les textes légaux saisis par l'organisation sont des référentiels à part
  // entière : sans eux ici, l'évaluation de leurs articles serait rejetée.
  const fw = allFrameworks(listLegalTexts()).find((f) => f.id === frameworkId);
  if (!fw || !fw.controls.some((c) => c.code === controlCode)) {
    return NextResponse.json({ error: "Mesure inconnue." }, { status: 404 });
  }

  if (op === "assess") {
    upsertAssessment(frameworkId, controlCode, {
      applicable: typeof body?.applicable === "boolean" ? body.applicable : undefined,
      justification: typeof body?.justification === "string" ? body.justification : undefined,
      status: typeof body?.status === "string" ? body.status : undefined,
      maturity: body?.maturity !== undefined ? Number(body.maturity) : undefined,
      responsibleId: typeof body?.responsibleId === "string" ? body.responsibleId : undefined,
      evidence: typeof body?.evidence === "string" ? body.evidence : undefined,
      note: typeof body?.note === "string" ? body.note : undefined,
      lastAssessedAt: body?.lastAssessedAt !== undefined ? toIso(body.lastAssessedAt) : undefined,
      nextReviewAt: body?.nextReviewAt !== undefined ? toIso(body.nextReviewAt) : undefined,
    });
    logActivity(user.id, "conformite.evaluation", `${fw.short} · ${controlCode}`);
  } else if (op === "reset") {
    resetAssessment(frameworkId, controlCode);
  } else {
    return NextResponse.json({ error: "Opération inconnue." }, { status: 400 });
  }

  return NextResponse.json({ controlAssessments: listControlAssessments() });
}

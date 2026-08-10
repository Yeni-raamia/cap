/* ==================================================================
 *  /api/attack-coverage — Couverture MITRE ATT&CK (auto-évaluation, SOC).
 *  op=assess (crée/màj) / reset. Édition par tout utilisateur non lecture-seule.
 * ================================================================== */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { denyReadOnly } from "@/lib/auth/guards";
import { listAttackCoverage, resetAttackCoverage, upsertAttackCoverage } from "@/lib/db/attackcoverage";
import { logActivity } from "@/lib/db/admin";
import { attackTechniqueById } from "@/lib/data/attack";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const ro = denyReadOnly(user); if (ro) return ro;

  const body = await request.json().catch(() => ({}));
  const op: string = body?.op;
  const techniqueId = String(body?.techniqueId || "").trim().toUpperCase();
  if (!attackTechniqueById(techniqueId)) {
    return NextResponse.json({ error: "Technique ATT&CK inconnue." }, { status: 404 });
  }

  if (op === "assess") {
    upsertAttackCoverage(techniqueId, {
      status: typeof body?.status === "string" ? body.status : undefined,
      detectionNote: typeof body?.detectionNote === "string" ? body.detectionNote : undefined,
      updatedBy: user.id,
    });
    logActivity(user.id, "attack.coverage", techniqueId);
  } else if (op === "reset") {
    resetAttackCoverage(techniqueId);
  } else {
    return NextResponse.json({ error: "Opération inconnue." }, { status: 400 });
  }

  return NextResponse.json({ attackCoverage: listAttackCoverage() });
}

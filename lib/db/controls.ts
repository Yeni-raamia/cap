/* ==================================================================
 *  lib/db/controls.ts — Évaluation des mesures (posture de conformité).
 *  Le catalogue des référentiels vit en code (lib/grc/frameworks.ts) ;
 *  seule l'évaluation de l'organisation est stockée ici.
 * ================================================================== */
import { randomUUID } from "node:crypto";
import { getDb } from "./index";
import { CONTROL_STATUS, type ControlAssessment } from "@/lib/domain";

const now = () => new Date().toISOString();
const clampMaturity = (v: unknown): number => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(5, Math.max(0, n)) : 0;
};

interface AssessRow {
  id: string;
  framework_id: string;
  control_code: string;
  applicable: number;
  justification: string;
  status: string;
  maturity: number;
  responsible_id: string | null;
  evidence: string;
  note: string;
  last_assessed_at: string | null;
  next_review_at: string | null;
  updated_at: string;
}

function mapAssess(r: AssessRow): ControlAssessment {
  return {
    id: r.id,
    frameworkId: r.framework_id,
    controlCode: r.control_code,
    applicable: r.applicable !== 0,
    justification: r.justification,
    status: r.status,
    maturity: r.maturity,
    responsibleId: r.responsible_id ?? "",
    evidence: r.evidence,
    note: r.note,
    lastAssessedAt: r.last_assessed_at ? new Date(r.last_assessed_at) : null,
    nextReviewAt: r.next_review_at ? new Date(r.next_review_at) : null,
    updatedAt: new Date(r.updated_at),
  };
}

export function listControlAssessments(): ControlAssessment[] {
  return (getDb().prepare("select * from control_assessments").all() as AssessRow[]).map(mapAssess);
}

/** Crée ou met à jour l'évaluation d'une mesure (clé : référentiel + code). */
export function upsertAssessment(
  frameworkId: string,
  controlCode: string,
  fields: {
    applicable?: boolean;
    justification?: string;
    status?: string;
    maturity?: number;
    responsibleId?: string | null;
    evidence?: string;
    note?: string;
    lastAssessedAt?: string | null;
    nextReviewAt?: string | null;
  }
): void {
  const db = getDb();
  const cur = db.prepare("select * from control_assessments where framework_id=? and control_code=?").get(frameworkId, controlCode) as AssessRow | undefined;
  const status = fields.status !== undefined && CONTROL_STATUS.includes(fields.status) ? fields.status : cur?.status ?? "Non évalué";
  if (cur) {
    db.prepare(
      "update control_assessments set applicable=?, justification=?, status=?, maturity=?, responsible_id=?, evidence=?, note=?, last_assessed_at=?, next_review_at=?, updated_at=? where id=?"
    ).run(
      fields.applicable !== undefined ? (fields.applicable ? 1 : 0) : cur.applicable,
      fields.justification !== undefined ? fields.justification : cur.justification,
      status,
      fields.maturity !== undefined ? clampMaturity(fields.maturity) : cur.maturity,
      fields.responsibleId !== undefined ? fields.responsibleId : cur.responsible_id,
      fields.evidence !== undefined ? fields.evidence : cur.evidence,
      fields.note !== undefined ? fields.note : cur.note,
      fields.lastAssessedAt !== undefined ? fields.lastAssessedAt : cur.last_assessed_at,
      fields.nextReviewAt !== undefined ? fields.nextReviewAt : cur.next_review_at,
      now(),
      cur.id
    );
  } else {
    db.prepare(
      "insert into control_assessments (id, framework_id, control_code, applicable, justification, status, maturity, responsible_id, evidence, note, last_assessed_at, next_review_at, updated_at) values (?,?,?,?,?,?,?,?,?,?,?,?,?)"
    ).run(
      randomUUID(),
      frameworkId,
      controlCode,
      fields.applicable === false ? 0 : 1,
      fields.justification ?? "",
      status,
      clampMaturity(fields.maturity),
      fields.responsibleId ?? null,
      fields.evidence ?? "",
      fields.note ?? "",
      fields.lastAssessedAt ?? null,
      fields.nextReviewAt ?? null,
      now()
    );
  }
}

/** Réinitialise une mesure (retour à l'état « non évalué » par défaut). */
export function resetAssessment(frameworkId: string, controlCode: string): void {
  getDb().prepare("delete from control_assessments where framework_id=? and control_code=?").run(frameworkId, controlCode);
}

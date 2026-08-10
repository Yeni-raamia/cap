/* ==================================================================
 *  lib/db/attackcoverage.ts — Couverture MITRE ATT&CK (auto-évaluation).
 *  Le catalogue ATT&CK vit en code (lib/data/attack.ts) ; seule
 *  l'auto-évaluation de détection de l'organisation est stockée ici.
 * ================================================================== */
import { getDb } from "./index";
import { ATTACK_COVERAGE_STATUS, type AttackCoverage } from "@/lib/domain";

const now = () => new Date().toISOString();

interface Row { technique_id: string; status: string; detection_note: string; updated_by: string | null; updated_at: string }

function mapRow(r: Row): AttackCoverage {
  return { techniqueId: r.technique_id, status: r.status, detectionNote: r.detection_note, updatedBy: r.updated_by, updatedAt: new Date(r.updated_at) };
}

export function listAttackCoverage(): AttackCoverage[] {
  return (getDb().prepare("select * from attack_coverage").all() as Row[]).map(mapRow);
}

/** Crée ou met à jour l'auto-évaluation d'une technique (clé : technique). */
export function upsertAttackCoverage(techniqueId: string, fields: { status?: string; detectionNote?: string; updatedBy?: string | null }): void {
  const db = getDb();
  const cur = db.prepare("select * from attack_coverage where technique_id=?").get(techniqueId) as Row | undefined;
  const status = fields.status !== undefined && ATTACK_COVERAGE_STATUS.includes(fields.status) ? fields.status : cur?.status ?? "Non couverte";
  if (cur) {
    db.prepare("update attack_coverage set status=?, detection_note=?, updated_by=?, updated_at=? where technique_id=?").run(
      status,
      fields.detectionNote !== undefined ? fields.detectionNote : cur.detection_note,
      fields.updatedBy !== undefined ? fields.updatedBy : cur.updated_by,
      now(), techniqueId
    );
  } else {
    db.prepare("insert into attack_coverage (technique_id, status, detection_note, updated_by, updated_at) values (?,?,?,?,?)").run(
      techniqueId, status, fields.detectionNote ?? "", fields.updatedBy ?? null, now()
    );
  }
}

export function resetAttackCoverage(techniqueId: string): void {
  getDb().prepare("delete from attack_coverage where technique_id=?").run(techniqueId);
}

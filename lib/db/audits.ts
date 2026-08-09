/* ==================================================================
 *  lib/db/audits.ts — Audits techniques réalisés (grille × cible).
 * ================================================================== */
import { randomUUID } from "node:crypto";
import { getDb } from "./index";
import { AUDIT_ANSWERS, AUDIT_STATUS, type Audit, type AuditQuestion, type AuditResponse } from "@/lib/domain";
import { reviveQuestions } from "./auditgrids";

const now = () => new Date().toISOString();

interface Row {
  id: string; ref: string; title: string; grid_id: string; grid_name: string; category: string;
  questions: string; target_asset_id: string | null; target_label: string; auditor_id: string | null;
  date: string | null; status: string; responses: string; summary: string;
  created_by: string | null; created_at: string; updated_at: string;
}

function reviveResponses(raw: unknown): AuditResponse[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((r) => {
      const o = (r ?? {}) as Record<string, unknown>;
      const answer = String(o.answer ?? "");
      return {
        questionId: String(o.questionId ?? ""),
        answer: (AUDIT_ANSWERS as readonly string[]).includes(answer) ? answer : "À vérifier",
        note: String(o.note ?? ""),
        evidence: String(o.evidence ?? ""),
        severity: String(o.severity ?? ""),
        recommendation: String(o.recommendation ?? ""),
        mgmtResponse: String(o.mgmtResponse ?? ""),
      };
    })
    .filter((r) => r.questionId);
}

function mapRow(r: Row): Audit {
  let questions: AuditQuestion[] = [];
  let responses: AuditResponse[] = [];
  try { questions = reviveQuestions(JSON.parse(r.questions)); } catch { questions = []; }
  try { responses = reviveResponses(JSON.parse(r.responses)); } catch { responses = []; }
  return {
    id: r.id, ref: r.ref, title: r.title, gridId: r.grid_id, gridName: r.grid_name, category: r.category,
    questions, targetAssetId: r.target_asset_id, targetLabel: r.target_label, auditorId: r.auditor_id ?? "",
    date: r.date ? new Date(r.date) : null, status: r.status, responses, summary: r.summary,
    createdBy: r.created_by, createdAt: new Date(r.created_at), updatedAt: new Date(r.updated_at),
  };
}

export function listAudits(): Audit[] {
  return (getDb().prepare("select * from audits order by coalesce(date, created_at) desc").all() as Row[]).map(mapRow);
}
export function getAudit(id: string): Audit | null {
  const r = getDb().prepare("select * from audits where id=?").get(id) as Row | undefined;
  return r ? mapRow(r) : null;
}
export const auditExists = (id: string) => Boolean(getDb().prepare("select 1 from audits where id=?").get(id));
/** Une grille est-elle référencée par au moins un audit ? (garde de suppression) */
export const auditsUseGrid = (gridId: string) => Boolean(getDb().prepare("select 1 from audits where grid_id=?").get(gridId));

function nextRef(db = getDb()): string {
  const prefix = `AUD-${new Date().getFullYear()}-`;
  const rows = db.prepare("select ref from audits where ref like ?").all(`${prefix}%`) as { ref: string }[];
  let max = 0;
  rows.forEach((r) => { const n = parseInt(r.ref.slice(prefix.length), 10); if (Number.isFinite(n) && n > max) max = n; });
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

interface CreateFields {
  title: string; gridId: string; gridName: string; category: string; questions: AuditQuestion[];
  targetAssetId?: string | null; targetLabel?: string; auditorId?: string; date?: string | null;
  status?: string; responses?: AuditResponse[]; summary?: string; createdBy: string | null;
}
export function createAudit(input: CreateFields): string {
  const id = randomUUID();
  const db = getDb();
  db.prepare("insert into audits (id, ref, title, grid_id, grid_name, category, questions, target_asset_id, target_label, auditor_id, date, status, responses, summary, created_by) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").run(
    id, nextRef(db), input.title, input.gridId, input.gridName, input.category,
    JSON.stringify(reviveQuestions(input.questions)),
    input.targetAssetId || null, input.targetLabel ?? "", input.auditorId || input.createdBy,
    input.date ?? null,
    AUDIT_STATUS.includes(input.status ?? "") ? input.status : "En cours",
    JSON.stringify(reviveResponses(input.responses ?? [])), input.summary ?? "", input.createdBy
  );
  return id;
}

interface UpdateFields {
  title?: string; targetAssetId?: string | null; targetLabel?: string; auditorId?: string;
  date?: string | null; status?: string; responses?: AuditResponse[]; summary?: string;
}
export function updateAudit(id: string, f: UpdateFields): void {
  const db = getDb();
  const cur = db.prepare("select * from audits where id=?").get(id) as Row | undefined;
  if (!cur) return;
  db.prepare("update audits set title=?, target_asset_id=?, target_label=?, auditor_id=?, date=?, status=?, responses=?, summary=?, updated_at=? where id=?").run(
    f.title ?? cur.title,
    f.targetAssetId !== undefined ? (f.targetAssetId || null) : cur.target_asset_id,
    f.targetLabel !== undefined ? f.targetLabel : cur.target_label,
    f.auditorId !== undefined ? (f.auditorId || null) : cur.auditor_id,
    f.date !== undefined ? f.date : cur.date,
    f.status !== undefined && AUDIT_STATUS.includes(f.status) ? f.status : cur.status,
    f.responses !== undefined ? JSON.stringify(reviveResponses(f.responses)) : cur.responses,
    f.summary !== undefined ? f.summary : cur.summary,
    now(), id
  );
}
export function deleteAudit(id: string): void {
  getDb().prepare("delete from audits where id=?").run(id);
}

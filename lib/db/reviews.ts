/* ==================================================================
 *  lib/db/reviews.ts — Revue de direction (ISO 27001 §9.3, GRC).
 * ================================================================== */
import { randomUUID } from "node:crypto";
import { getDb } from "./index";
import { REVIEW_STATUS, type DirectionReview } from "@/lib/domain";

const now = () => new Date().toISOString();
const parseArr = (s: string): string[] => { try { const v = JSON.parse(s); return Array.isArray(v) ? v.filter((x) => typeof x === "string") : []; } catch { return []; } };
const parseKpi = (s: string): Record<string, number> => {
  try { const v = JSON.parse(s); if (v && typeof v === "object") { const o: Record<string, number> = {}; for (const k of Object.keys(v)) if (typeof v[k] === "number") o[k] = v[k]; return o; } } catch { /* ignore */ }
  return {};
};

interface Row {
  id: string; ref: string; title: string; date: string | null; period: string; participant_ids: string;
  context_changes: string; risk_review: string; compliance_review: string; incidents_review: string; objectives_review: string; feedback: string;
  decisions: string; actions: string; kpi_snapshot: string; next_review_date: string | null; status: string;
  created_by: string | null; created_at: string; updated_at: string;
}
function mapRow(r: Row): DirectionReview {
  return {
    id: r.id, ref: r.ref, title: r.title, date: r.date ? new Date(r.date) : null, period: r.period, participantIds: parseArr(r.participant_ids),
    contextChanges: r.context_changes, riskReview: r.risk_review, complianceReview: r.compliance_review, incidentsReview: r.incidents_review, objectivesReview: r.objectives_review, feedback: r.feedback,
    decisions: r.decisions, actions: r.actions, kpiSnapshot: parseKpi(r.kpi_snapshot),
    nextReviewDate: r.next_review_date ? new Date(r.next_review_date) : null, status: r.status,
    createdBy: r.created_by, createdAt: new Date(r.created_at), updatedAt: new Date(r.updated_at),
  };
}

export function listReviews(): DirectionReview[] {
  return (getDb().prepare("select * from direction_reviews order by coalesce(date, created_at) desc").all() as Row[]).map(mapRow);
}
export function getReview(id: string): DirectionReview | null {
  const r = getDb().prepare("select * from direction_reviews where id=?").get(id) as Row | undefined;
  return r ? mapRow(r) : null;
}
export const reviewExists = (id: string) => Boolean(getDb().prepare("select 1 from direction_reviews where id=?").get(id));

function nextRef(db = getDb()): string {
  const prefix = `REV-${new Date().getFullYear()}-`;
  const rows = db.prepare("select ref from direction_reviews where ref like ?").all(`${prefix}%`) as { ref: string }[];
  let max = 0;
  rows.forEach((r) => { const n = parseInt(r.ref.slice(prefix.length), 10); if (Number.isFinite(n) && n > max) max = n; });
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

interface Fields {
  title?: string; date?: string | null; period?: string; participantIds?: string[];
  contextChanges?: string; riskReview?: string; complianceReview?: string; incidentsReview?: string; objectivesReview?: string; feedback?: string;
  decisions?: string; actions?: string; kpiSnapshot?: Record<string, number>; nextReviewDate?: string | null; status?: string;
}
const kpiJson = (k?: Record<string, number>) => JSON.stringify(k && typeof k === "object" ? Object.fromEntries(Object.entries(k).filter(([, v]) => typeof v === "number")) : {});

export function createReview(input: Fields & { title: string; createdBy: string }): string {
  const id = randomUUID();
  const db = getDb();
  db.prepare("insert into direction_reviews (id, ref, title, date, period, participant_ids, context_changes, risk_review, compliance_review, incidents_review, objectives_review, feedback, decisions, actions, kpi_snapshot, next_review_date, status, created_by) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").run(
    id, nextRef(db), input.title, input.date ?? null, input.period ?? "", JSON.stringify(input.participantIds ?? []),
    input.contextChanges ?? "", input.riskReview ?? "", input.complianceReview ?? "", input.incidentsReview ?? "", input.objectivesReview ?? "", input.feedback ?? "",
    input.decisions ?? "", input.actions ?? "", kpiJson(input.kpiSnapshot), input.nextReviewDate ?? null,
    REVIEW_STATUS.includes(input.status ?? "") ? input.status : "Préparée", input.createdBy
  );
  return id;
}

export function updateReview(id: string, f: Fields): void {
  const db = getDb();
  const cur = db.prepare("select * from direction_reviews where id=?").get(id) as Row | undefined;
  if (!cur) return;
  db.prepare("update direction_reviews set title=?, date=?, period=?, participant_ids=?, context_changes=?, risk_review=?, compliance_review=?, incidents_review=?, objectives_review=?, feedback=?, decisions=?, actions=?, kpi_snapshot=?, next_review_date=?, status=?, updated_at=? where id=?").run(
    f.title ?? cur.title, f.date !== undefined ? f.date : cur.date, f.period !== undefined ? f.period : cur.period,
    f.participantIds !== undefined ? JSON.stringify(f.participantIds) : cur.participant_ids,
    f.contextChanges !== undefined ? f.contextChanges : cur.context_changes,
    f.riskReview !== undefined ? f.riskReview : cur.risk_review,
    f.complianceReview !== undefined ? f.complianceReview : cur.compliance_review,
    f.incidentsReview !== undefined ? f.incidentsReview : cur.incidents_review,
    f.objectivesReview !== undefined ? f.objectivesReview : cur.objectives_review,
    f.feedback !== undefined ? f.feedback : cur.feedback,
    f.decisions !== undefined ? f.decisions : cur.decisions,
    f.actions !== undefined ? f.actions : cur.actions,
    f.kpiSnapshot !== undefined ? kpiJson(f.kpiSnapshot) : cur.kpi_snapshot,
    f.nextReviewDate !== undefined ? f.nextReviewDate : cur.next_review_date,
    f.status !== undefined && REVIEW_STATUS.includes(f.status) ? f.status : cur.status,
    now(), id
  );
}
export function deleteReview(id: string): void {
  getDb().prepare("delete from direction_reviews where id=?").run(id);
}

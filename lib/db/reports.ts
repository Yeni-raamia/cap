/* ==================================================================
 *  lib/db/reports.ts — Comptes rendus de tâches et de projets (serveur).
 * ================================================================== */
import { randomUUID } from "node:crypto";
import { getDb } from "./index";
import { REPORT_KINDS, type Report, type ReportKind, type ReportRefType } from "@/lib/domain";

interface ReportRow {
  id: string;
  ref_type: ReportRefType;
  ref_id: string;
  kind: ReportKind;
  title: string;
  period_start: string | null;
  period_end: string | null;
  progress: number;
  done: string;
  difficulties: string;
  next_steps: string;
  author_id: string | null;
  created_at: string;
  updated_at: string;
}

const mapReport = (r: ReportRow): Report => ({
  id: r.id,
  refType: r.ref_type,
  refId: r.ref_id,
  kind: r.kind,
  title: r.title,
  periodStart: r.period_start ? new Date(r.period_start) : null,
  periodEnd: r.period_end ? new Date(r.period_end) : null,
  progress: r.progress,
  done: r.done,
  difficulties: r.difficulties,
  nextSteps: r.next_steps,
  authorId: r.author_id,
  createdAt: new Date(r.created_at),
  updatedAt: new Date(r.updated_at),
});

const isKind = (v: unknown): v is ReportKind => REPORT_KINDS.some((k) => k.key === v);
const clampProgress = (v: unknown, fallback = 0): number => {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(100, Math.max(0, n));
};

export function listReports(): Report[] {
  const rows = getDb().prepare("select * from reports order by created_at desc").all() as ReportRow[];
  return rows.map(mapReport);
}

export function listReportsFor(refType: ReportRefType, refId: string): Report[] {
  const rows = getDb()
    .prepare("select * from reports where ref_type=? and ref_id=? order by created_at desc")
    .all(refType, refId) as ReportRow[];
  return rows.map(mapReport);
}

export function getReport(id: string): Report | null {
  const r = getDb().prepare("select * from reports where id=?").get(id) as ReportRow | undefined;
  return r ? mapReport(r) : null;
}

export interface ReportInput {
  title?: string;
  kind?: unknown;
  periodStart?: string | null;
  periodEnd?: string | null;
  progress?: unknown;
  done?: string;
  difficulties?: string;
  nextSteps?: string;
}

export function createReport(input: ReportInput & { refType: ReportRefType; refId: string; authorId: string }): string {
  const id = randomUUID();
  getDb()
    .prepare(
      "insert into reports (id, ref_type, ref_id, kind, title, period_start, period_end, progress, done, " +
        "difficulties, next_steps, author_id) values (?,?,?,?,?,?,?,?,?,?,?,?)"
    )
    .run(
      id,
      input.refType,
      input.refId,
      isKind(input.kind) ? input.kind : "periodique",
      (input.title ?? "").trim(),
      input.periodStart ?? null,
      input.periodEnd ?? null,
      clampProgress(input.progress),
      input.done ?? "",
      input.difficulties ?? "",
      input.nextSteps ?? "",
      input.authorId
    );
  return id;
}

export function updateReport(id: string, input: ReportInput): void {
  const cur = getDb().prepare("select * from reports where id=?").get(id) as ReportRow | undefined;
  if (!cur) return;
  getDb()
    .prepare(
      "update reports set kind=?, title=?, period_start=?, period_end=?, progress=?, done=?, difficulties=?, " +
        "next_steps=?, updated_at=? where id=?"
    )
    .run(
      isKind(input.kind) ? input.kind : cur.kind,
      input.title !== undefined ? input.title.trim() : cur.title,
      input.periodStart !== undefined ? input.periodStart : cur.period_start,
      input.periodEnd !== undefined ? input.periodEnd : cur.period_end,
      input.progress !== undefined ? clampProgress(input.progress, cur.progress) : cur.progress,
      input.done !== undefined ? input.done : cur.done,
      input.difficulties !== undefined ? input.difficulties : cur.difficulties,
      input.nextSteps !== undefined ? input.nextSteps : cur.next_steps,
      new Date().toISOString(),
      id
    );
}

export function deleteReport(id: string): void {
  getDb().prepare("delete from reports where id=?").run(id);
}

/** Supprime les comptes rendus rattachés à un objet disparu. */
export function deleteReportsFor(refType: ReportRefType, refId: string): void {
  getDb().prepare("delete from reports where ref_type=? and ref_id=?").run(refType, refId);
}

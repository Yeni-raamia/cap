/* ==================================================================
 *  lib/db/risks.ts — Registre des risques (module GRC).
 * ================================================================== */
import { randomUUID } from "node:crypto";
import { getDb } from "./index";
import { RISK_STATUTS, RISK_TREATMENTS, type Risk, type RiskLink, type RiskLinkKind } from "@/lib/domain";

const now = () => new Date().toISOString();
const LINK_KINDS: RiskLinkKind[] = ["item", "project", "negligence", "nonconformite", "objective"];

interface RiskRow {
  id: string;
  ref: string;
  title: string;
  description: string;
  category: string;
  probability: number;
  impact: number;
  treatment: string;
  treatment_plan: string;
  status: string;
  owner_id: string | null;
  review_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
interface LinkRow {
  risk_id: string;
  kind: string;
  ref_id: string;
}

const clampScale = (v: unknown): number => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(5, Math.max(1, n)) : 3;
};

function mapRisk(r: RiskRow, links: RiskLink[]): Risk {
  return {
    id: r.id,
    ref: r.ref,
    title: r.title,
    description: r.description,
    category: r.category,
    probability: r.probability,
    impact: r.impact,
    treatment: r.treatment,
    treatmentPlan: r.treatment_plan,
    status: r.status,
    ownerId: r.owner_id ?? "",
    reviewDate: r.review_date ? new Date(r.review_date) : null,
    links,
    createdBy: r.created_by,
    createdAt: new Date(r.created_at),
    updatedAt: new Date(r.updated_at),
  };
}

export function listRisks(): Risk[] {
  const db = getDb();
  const rows = db.prepare("select * from risks order by probability * impact desc, updated_at desc").all() as RiskRow[];
  const links = db.prepare("select * from risk_links").all() as LinkRow[];
  const byRisk = new Map<string, RiskLink[]>();
  links.forEach((l) => {
    if (!LINK_KINDS.includes(l.kind as RiskLinkKind)) return;
    byRisk.set(l.risk_id, [...(byRisk.get(l.risk_id) ?? []), { kind: l.kind as RiskLinkKind, refId: l.ref_id }]);
  });
  return rows.map((r) => mapRisk(r, byRisk.get(r.id) ?? []));
}

export function getRisk(id: string): Risk | null {
  const db = getDb();
  const r = db.prepare("select * from risks where id=?").get(id) as RiskRow | undefined;
  if (!r) return null;
  const links = (db.prepare("select * from risk_links where risk_id=?").all(id) as LinkRow[])
    .filter((l) => LINK_KINDS.includes(l.kind as RiskLinkKind))
    .map((l) => ({ kind: l.kind as RiskLinkKind, refId: l.ref_id }));
  return mapRisk(r, links);
}

export function riskExists(id: string): boolean {
  return Boolean(getDb().prepare("select 1 from risks where id=?").get(id));
}

/** Référence auto : RISK-<année>-NNNN, unique. */
function nextRiskRef(db = getDb()): string {
  const year = new Date().getFullYear();
  const prefix = `RISK-${year}-`;
  const rows = db.prepare("select ref from risks where ref like ?").all(`${prefix}%`) as { ref: string }[];
  let max = 0;
  rows.forEach((r) => {
    const n = parseInt(r.ref.slice(prefix.length), 10);
    if (Number.isFinite(n) && n > max) max = n;
  });
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

function setLinks(riskId: string, links: RiskLink[]): void {
  const db = getDb();
  db.prepare("delete from risk_links where risk_id=?").run(riskId);
  const ins = db.prepare("insert into risk_links (risk_id, kind, ref_id) values (?,?,?)");
  const seen = new Set<string>();
  links
    .filter((l) => LINK_KINDS.includes(l.kind) && l.refId)
    .forEach((l) => {
      const key = `${l.kind}:${l.refId}`;
      if (seen.has(key)) return;
      seen.add(key);
      ins.run(riskId, l.kind, l.refId);
    });
}

export function createRisk(input: {
  title: string;
  description?: string;
  category?: string;
  probability?: number;
  impact?: number;
  treatment?: string;
  treatmentPlan?: string;
  status?: string;
  ownerId?: string | null;
  reviewDate?: string | null;
  links?: RiskLink[];
  createdBy: string;
}): string {
  const id = randomUUID();
  const db = getDb();
  db.prepare(
    "insert into risks (id, ref, title, description, category, probability, impact, treatment, treatment_plan, status, owner_id, review_date, created_by) values (?,?,?,?,?,?,?,?,?,?,?,?,?)"
  ).run(
    id,
    nextRiskRef(db),
    input.title,
    input.description ?? "",
    input.category ?? "",
    clampScale(input.probability),
    clampScale(input.impact),
    RISK_TREATMENTS.includes(input.treatment ?? "") ? input.treatment : "Réduire",
    input.treatmentPlan ?? "",
    RISK_STATUTS.includes(input.status ?? "") ? input.status : "Identifié",
    input.ownerId ?? input.createdBy,
    input.reviewDate ?? null,
    input.createdBy
  );
  setLinks(id, input.links ?? []);
  return id;
}

export function updateRisk(
  id: string,
  fields: {
    title?: string;
    description?: string;
    category?: string;
    probability?: number;
    impact?: number;
    treatment?: string;
    treatmentPlan?: string;
    status?: string;
    ownerId?: string | null;
    reviewDate?: string | null;
    links?: RiskLink[];
  }
): void {
  const db = getDb();
  const cur = db.prepare("select * from risks where id=?").get(id) as RiskRow | undefined;
  if (!cur) return;
  db.prepare(
    "update risks set title=?, description=?, category=?, probability=?, impact=?, treatment=?, treatment_plan=?, status=?, owner_id=?, review_date=?, updated_at=? where id=?"
  ).run(
    fields.title ?? cur.title,
    fields.description !== undefined ? fields.description : cur.description,
    fields.category !== undefined ? fields.category : cur.category,
    fields.probability !== undefined ? clampScale(fields.probability) : cur.probability,
    fields.impact !== undefined ? clampScale(fields.impact) : cur.impact,
    fields.treatment !== undefined && RISK_TREATMENTS.includes(fields.treatment) ? fields.treatment : cur.treatment,
    fields.treatmentPlan !== undefined ? fields.treatmentPlan : cur.treatment_plan,
    fields.status !== undefined && RISK_STATUTS.includes(fields.status) ? fields.status : cur.status,
    fields.ownerId !== undefined ? fields.ownerId : cur.owner_id,
    fields.reviewDate !== undefined ? fields.reviewDate : cur.review_date,
    now(),
    id
  );
  if (fields.links) setLinks(id, fields.links);
}

export function setRiskStatus(id: string, status: string): void {
  if (!RISK_STATUTS.includes(status)) return;
  getDb().prepare("update risks set status=?, updated_at=? where id=?").run(status, now(), id);
}

export function deleteRisk(id: string): void {
  const db = getDb();
  db.prepare("delete from risk_links where risk_id=?").run(id);
  db.prepare("delete from risks where id=?").run(id);
}

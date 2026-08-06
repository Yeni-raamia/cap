/* ==================================================================
 *  lib/db/risks.ts — Registre des risques (module GRC).
 * ================================================================== */
import { randomUUID } from "node:crypto";
import { getDb } from "./index";
import { RISK_STATUTS, RISK_TREATMENTS, type Risk, type RiskControlRef, type RiskLink, type RiskLinkKind, type RiskReview } from "@/lib/domain";

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
  residual_probability: number;
  residual_impact: number;
  asset_id: string | null;
  threat: string;
  vulnerability: string;
  treatment: string;
  treatment_plan: string;
  status: string;
  owner_id: string | null;
  review_date: string | null;
  created_by: string | null;
  accepted_by: string | null;
  accepted_at: string | null;
  accept_until: string | null;
  acceptance_justification: string;
  created_at: string;
  updated_at: string;
}
interface LinkRow {
  risk_id: string;
  kind: string;
  ref_id: string;
}
interface CtrlRow {
  risk_id: string;
  framework_id: string;
  control_code: string;
}
interface ReviewRow {
  id: string;
  risk_id: string;
  reviewed_by: string | null;
  reviewed_at: string;
  inherent_p: number;
  inherent_i: number;
  residual_p: number;
  residual_i: number;
  note: string;
}

const clampScale = (v: unknown): number => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(5, Math.max(1, n)) : 3;
};

function mapRisk(r: RiskRow, links: RiskLink[], controls: RiskControlRef[], reviews: RiskReview[]): Risk {
  return {
    id: r.id,
    ref: r.ref,
    title: r.title,
    description: r.description,
    category: r.category,
    probability: r.probability,
    impact: r.impact,
    residualProbability: r.residual_probability,
    residualImpact: r.residual_impact,
    assetId: r.asset_id ?? null,
    threat: r.threat,
    vulnerability: r.vulnerability,
    treatment: r.treatment,
    treatmentPlan: r.treatment_plan,
    controls,
    status: r.status,
    ownerId: r.owner_id ?? "",
    reviewDate: r.review_date ? new Date(r.review_date) : null,
    acceptedBy: r.accepted_by,
    acceptedAt: r.accepted_at ? new Date(r.accepted_at) : null,
    acceptUntil: r.accept_until ? new Date(r.accept_until) : null,
    acceptanceJustification: r.acceptance_justification,
    reviews,
    links,
    createdBy: r.created_by,
    createdAt: new Date(r.created_at),
    updatedAt: new Date(r.updated_at),
  };
}

export function listRisks(): Risk[] {
  const db = getDb();
  const rows = db.prepare("select * from risks order by residual_probability * residual_impact desc, updated_at desc").all() as RiskRow[];
  const links = db.prepare("select * from risk_links").all() as LinkRow[];
  const ctrls = db.prepare("select * from risk_controls").all() as CtrlRow[];
  const reviews = db.prepare("select * from risk_reviews order by reviewed_at desc").all() as ReviewRow[];
  const linkBy = new Map<string, RiskLink[]>();
  links.forEach((l) => {
    if (!LINK_KINDS.includes(l.kind as RiskLinkKind)) return;
    linkBy.set(l.risk_id, [...(linkBy.get(l.risk_id) ?? []), { kind: l.kind as RiskLinkKind, refId: l.ref_id }]);
  });
  const ctrlBy = new Map<string, RiskControlRef[]>();
  ctrls.forEach((c) => ctrlBy.set(c.risk_id, [...(ctrlBy.get(c.risk_id) ?? []), { frameworkId: c.framework_id, controlCode: c.control_code }]));
  const revBy = new Map<string, RiskReview[]>();
  reviews.forEach((v) => revBy.set(v.risk_id, [...(revBy.get(v.risk_id) ?? []), mapReview(v)]));
  return rows.map((r) => mapRisk(r, linkBy.get(r.id) ?? [], ctrlBy.get(r.id) ?? [], revBy.get(r.id) ?? []));
}

const mapReview = (v: ReviewRow): RiskReview => ({
  id: v.id,
  reviewedBy: v.reviewed_by ?? "",
  reviewedAt: new Date(v.reviewed_at),
  inherentP: v.inherent_p,
  inherentI: v.inherent_i,
  residualP: v.residual_p,
  residualI: v.residual_i,
  note: v.note,
});

export function getRisk(id: string): Risk | null {
  const db = getDb();
  const r = db.prepare("select * from risks where id=?").get(id) as RiskRow | undefined;
  if (!r) return null;
  const links = (db.prepare("select * from risk_links where risk_id=?").all(id) as LinkRow[])
    .filter((l) => LINK_KINDS.includes(l.kind as RiskLinkKind))
    .map((l) => ({ kind: l.kind as RiskLinkKind, refId: l.ref_id }));
  const controls = (db.prepare("select * from risk_controls where risk_id=?").all(id) as CtrlRow[]).map((c) => ({ frameworkId: c.framework_id, controlCode: c.control_code }));
  const reviews = (db.prepare("select * from risk_reviews where risk_id=? order by reviewed_at desc").all(id) as ReviewRow[]).map(mapReview);
  return mapRisk(r, links, controls, reviews);
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

function setControls(riskId: string, controls: RiskControlRef[]): void {
  const db = getDb();
  db.prepare("delete from risk_controls where risk_id=?").run(riskId);
  const ins = db.prepare("insert into risk_controls (risk_id, framework_id, control_code) values (?,?,?)");
  const seen = new Set<string>();
  controls
    .filter((c) => c.frameworkId && c.controlCode)
    .forEach((c) => {
      const key = `${c.frameworkId}:${c.controlCode}`;
      if (seen.has(key)) return;
      seen.add(key);
      ins.run(riskId, c.frameworkId, c.controlCode);
    });
}

interface RiskFields {
  title?: string;
  description?: string;
  category?: string;
  probability?: number;
  impact?: number;
  residualProbability?: number;
  residualImpact?: number;
  assetId?: string | null;
  threat?: string;
  vulnerability?: string;
  treatment?: string;
  treatmentPlan?: string;
  status?: string;
  ownerId?: string | null;
  reviewDate?: string | null;
  links?: RiskLink[];
  controls?: RiskControlRef[];
}

export function createRisk(input: RiskFields & { title: string; createdBy: string }): string {
  const id = randomUUID();
  const db = getDb();
  const p = clampScale(input.probability);
  const i = clampScale(input.impact);
  const rp = input.residualProbability !== undefined ? clampScale(input.residualProbability) : p;
  const ri = input.residualImpact !== undefined ? clampScale(input.residualImpact) : i;
  db.prepare(
    "insert into risks (id, ref, title, description, category, probability, impact, residual_probability, residual_impact, asset_id, threat, vulnerability, treatment, treatment_plan, status, owner_id, review_date, created_by) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
  ).run(
    id,
    nextRiskRef(db),
    input.title,
    input.description ?? "",
    input.category ?? "",
    p,
    i,
    rp,
    ri,
    input.assetId ?? null,
    input.threat ?? "",
    input.vulnerability ?? "",
    RISK_TREATMENTS.includes(input.treatment ?? "") ? input.treatment : "Réduire",
    input.treatmentPlan ?? "",
    RISK_STATUTS.includes(input.status ?? "") ? input.status : "Identifié",
    input.ownerId ?? input.createdBy,
    input.reviewDate ?? null,
    input.createdBy
  );
  setLinks(id, input.links ?? []);
  setControls(id, input.controls ?? []);
  // Première entrée d'historique (constitution du risque).
  addRiskReview(id, input.createdBy, "Création du risque");
  return id;
}

export function updateRisk(id: string, fields: RiskFields): void {
  const db = getDb();
  const cur = db.prepare("select * from risks where id=?").get(id) as RiskRow | undefined;
  if (!cur) return;
  db.prepare(
    "update risks set title=?, description=?, category=?, probability=?, impact=?, residual_probability=?, residual_impact=?, asset_id=?, threat=?, vulnerability=?, treatment=?, treatment_plan=?, status=?, owner_id=?, review_date=?, updated_at=? where id=?"
  ).run(
    fields.title ?? cur.title,
    fields.description !== undefined ? fields.description : cur.description,
    fields.category !== undefined ? fields.category : cur.category,
    fields.probability !== undefined ? clampScale(fields.probability) : cur.probability,
    fields.impact !== undefined ? clampScale(fields.impact) : cur.impact,
    fields.residualProbability !== undefined ? clampScale(fields.residualProbability) : cur.residual_probability,
    fields.residualImpact !== undefined ? clampScale(fields.residualImpact) : cur.residual_impact,
    fields.assetId !== undefined ? fields.assetId : cur.asset_id,
    fields.threat !== undefined ? fields.threat : cur.threat,
    fields.vulnerability !== undefined ? fields.vulnerability : cur.vulnerability,
    fields.treatment !== undefined && RISK_TREATMENTS.includes(fields.treatment) ? fields.treatment : cur.treatment,
    fields.treatmentPlan !== undefined ? fields.treatmentPlan : cur.treatment_plan,
    fields.status !== undefined && RISK_STATUTS.includes(fields.status) ? fields.status : cur.status,
    fields.ownerId !== undefined ? fields.ownerId : cur.owner_id,
    fields.reviewDate !== undefined ? fields.reviewDate : cur.review_date,
    now(),
    id
  );
  if (fields.links) setLinks(id, fields.links);
  if (fields.controls) setControls(id, fields.controls);
}

export function setRiskStatus(id: string, status: string): void {
  if (!RISK_STATUTS.includes(status)) return;
  getDb().prepare("update risks set status=?, updated_at=? where id=?").run(status, now(), id);
}

/** Accepte formellement le risque (passe en statut « Accepté »). */
export function acceptRisk(id: string, acceptedBy: string, until: string | null, justification: string): void {
  const db = getDb();
  db.prepare("update risks set status='Accepté', accepted_by=?, accepted_at=?, accept_until=?, acceptance_justification=?, updated_at=? where id=?").run(
    acceptedBy,
    now(),
    until,
    justification,
    now(),
    id
  );
  addRiskReview(id, acceptedBy, `Risque accepté${justification ? ` : ${justification}` : ""}`);
}

/** Ajoute une entrée à l'historique de réévaluation (snapshot des niveaux). */
export function addRiskReview(id: string, reviewedBy: string, note: string): void {
  const db = getDb();
  const r = db.prepare("select probability, impact, residual_probability, residual_impact from risks where id=?").get(id) as
    | { probability: number; impact: number; residual_probability: number; residual_impact: number }
    | undefined;
  if (!r) return;
  db.prepare(
    "insert into risk_reviews (id, risk_id, reviewed_by, reviewed_at, inherent_p, inherent_i, residual_p, residual_i, note) values (?,?,?,?,?,?,?,?,?)"
  ).run(randomUUID(), id, reviewedBy, now(), r.probability, r.impact, r.residual_probability, r.residual_impact, note);
  db.prepare("update risks set updated_at=? where id=?").run(now(), id);
}

export function deleteRisk(id: string): void {
  const db = getDb();
  db.prepare("delete from risk_links where risk_id=?").run(id);
  db.prepare("delete from risk_controls where risk_id=?").run(id);
  db.prepare("delete from risk_reviews where risk_id=?").run(id);
  db.prepare("delete from risks where id=?").run(id);
}

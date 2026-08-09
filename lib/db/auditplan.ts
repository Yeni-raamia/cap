/* ==================================================================
 *  lib/db/auditplan.ts — Programme d'audit annuel (ISO 19011 §5).
 * ================================================================== */
import { randomUUID } from "node:crypto";
import { getDb } from "./index";
import { AUDIT_CATEGORIES, AUDIT_PLAN_STATUS, AUDIT_RISK_LEVELS, PLAN_QUARTERS, type AuditPlanItem } from "@/lib/domain";

const now = () => new Date().toISOString();

interface Row {
  id: string; ref: string; title: string; category: string; risk_level: string; year: number; quarter: string;
  owner_id: string | null; target_asset_id: string | null; target_label: string; grid_id: string; audit_id: string;
  planned_date: string | null; status: string; objective: string;
  created_by: string | null; created_at: string; updated_at: string;
}

function mapRow(r: Row): AuditPlanItem {
  return {
    id: r.id, ref: r.ref, title: r.title, category: r.category, riskLevel: r.risk_level, year: r.year, quarter: r.quarter,
    ownerId: r.owner_id ?? "", targetAssetId: r.target_asset_id, targetLabel: r.target_label, gridId: r.grid_id, auditId: r.audit_id,
    plannedDate: r.planned_date ? new Date(r.planned_date) : null, status: r.status, objective: r.objective,
    createdBy: r.created_by, createdAt: new Date(r.created_at), updatedAt: new Date(r.updated_at),
  };
}

const RISK_ORDER = "case risk_level when 'Élevé' then 0 when 'Moyen' then 1 else 2 end";
export function listAuditPlanItems(): AuditPlanItem[] {
  return (getDb().prepare(`select * from audit_plan_items order by year desc, quarter, ${RISK_ORDER}`).all() as Row[]).map(mapRow);
}
export function getAuditPlanItem(id: string): AuditPlanItem | null {
  const r = getDb().prepare("select * from audit_plan_items where id=?").get(id) as Row | undefined;
  return r ? mapRow(r) : null;
}
export const auditPlanExists = (id: string) => Boolean(getDb().prepare("select 1 from audit_plan_items where id=?").get(id));

function nextRef(db = getDb()): string {
  const prefix = `PROG-${new Date().getFullYear()}-`;
  const rows = db.prepare("select ref from audit_plan_items where ref like ?").all(`${prefix}%`) as { ref: string }[];
  let max = 0;
  rows.forEach((r) => { const n = parseInt(r.ref.slice(prefix.length), 10); if (Number.isFinite(n) && n > max) max = n; });
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

interface Fields {
  title?: string; category?: string; riskLevel?: string; year?: number; quarter?: string; ownerId?: string;
  targetAssetId?: string | null; targetLabel?: string; gridId?: string; auditId?: string;
  plannedDate?: string | null; status?: string; objective?: string;
}
const vCat = (c?: string) => (AUDIT_CATEGORIES.includes(c ?? "") ? c! : "Autre");
const vRisk = (r?: string) => (AUDIT_RISK_LEVELS.includes(r ?? "") ? r! : "Moyen");
const vQ = (q?: string) => (PLAN_QUARTERS.includes(q ?? "") ? q! : "T1");
const vStatus = (s?: string) => (AUDIT_PLAN_STATUS.includes(s ?? "") ? s! : "Planifié");

export function createAuditPlanItem(input: Fields & { title: string; createdBy: string | null }): string {
  const id = randomUUID();
  const db = getDb();
  db.prepare("insert into audit_plan_items (id, ref, title, category, risk_level, year, quarter, owner_id, target_asset_id, target_label, grid_id, audit_id, planned_date, status, objective, created_by) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").run(
    id, nextRef(db), input.title, vCat(input.category), vRisk(input.riskLevel),
    input.year ?? new Date().getFullYear(), vQ(input.quarter), input.ownerId || input.createdBy,
    input.targetAssetId || null, input.targetLabel ?? "", input.gridId ?? "", input.auditId ?? "",
    input.plannedDate ?? null, vStatus(input.status), input.objective ?? "", input.createdBy
  );
  return id;
}
export function updateAuditPlanItem(id: string, f: Fields): void {
  const db = getDb();
  const cur = db.prepare("select * from audit_plan_items where id=?").get(id) as Row | undefined;
  if (!cur) return;
  db.prepare("update audit_plan_items set title=?, category=?, risk_level=?, year=?, quarter=?, owner_id=?, target_asset_id=?, target_label=?, grid_id=?, audit_id=?, planned_date=?, status=?, objective=?, updated_at=? where id=?").run(
    f.title ?? cur.title,
    f.category !== undefined ? vCat(f.category) : cur.category,
    f.riskLevel !== undefined ? vRisk(f.riskLevel) : cur.risk_level,
    f.year ?? cur.year,
    f.quarter !== undefined ? vQ(f.quarter) : cur.quarter,
    f.ownerId !== undefined ? (f.ownerId || null) : cur.owner_id,
    f.targetAssetId !== undefined ? (f.targetAssetId || null) : cur.target_asset_id,
    f.targetLabel !== undefined ? f.targetLabel : cur.target_label,
    f.gridId !== undefined ? f.gridId : cur.grid_id,
    f.auditId !== undefined ? f.auditId : cur.audit_id,
    f.plannedDate !== undefined ? f.plannedDate : cur.planned_date,
    f.status !== undefined ? vStatus(f.status) : cur.status,
    f.objective !== undefined ? f.objective : cur.objective,
    now(), id
  );
}
export function deleteAuditPlanItem(id: string): void {
  getDb().prepare("delete from audit_plan_items where id=?").run(id);
}

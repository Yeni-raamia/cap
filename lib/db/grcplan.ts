/* ==================================================================
 *  lib/db/grcplan.ts — Plan de travail GRC (chantiers de l'équipe).
 * ================================================================== */
import { randomUUID } from "node:crypto";
import { getDb } from "./index";
import { PLAN_CATEGORIES, PLAN_PRIORITIES, PLAN_QUARTERS, PLAN_STATUS, type GrcPlanItem } from "@/lib/domain";

const now = () => new Date().toISOString();
const clampPct = (n: unknown): number => {
  const v = Math.round(Number(n));
  return Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 0;
};

interface PlanRow {
  id: string;
  ref: string;
  title: string;
  category: string;
  year: number;
  quarter: string;
  owner_id: string | null;
  priority: string;
  status: string;
  progress: number;
  due_date: string | null;
  description: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

function mapPlan(r: PlanRow): GrcPlanItem {
  return {
    id: r.id,
    ref: r.ref,
    title: r.title,
    category: r.category,
    year: r.year,
    quarter: r.quarter,
    ownerId: r.owner_id ?? "",
    priority: r.priority,
    status: r.status,
    progress: r.progress,
    dueDate: r.due_date ? new Date(r.due_date) : null,
    description: r.description,
    createdBy: r.created_by,
    createdAt: new Date(r.created_at),
    updatedAt: new Date(r.updated_at),
  };
}

export function listPlanItems(): GrcPlanItem[] {
  return (getDb().prepare("select * from grc_plan_items order by year desc, quarter asc, created_at desc").all() as PlanRow[]).map(mapPlan);
}
export function getPlanItem(id: string): GrcPlanItem | null {
  const r = getDb().prepare("select * from grc_plan_items where id=?").get(id) as PlanRow | undefined;
  return r ? mapPlan(r) : null;
}
export function planItemExists(id: string): boolean {
  return Boolean(getDb().prepare("select 1 from grc_plan_items where id=?").get(id));
}

function nextRef(db = getDb()): string {
  const year = new Date().getFullYear();
  const prefix = `PLAN-${year}-`;
  const rows = db.prepare("select ref from grc_plan_items where ref like ?").all(`${prefix}%`) as { ref: string }[];
  let max = 0;
  rows.forEach((r) => {
    const n = parseInt(r.ref.slice(prefix.length), 10);
    if (Number.isFinite(n) && n > max) max = n;
  });
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

interface PlanFields {
  title?: string;
  category?: string;
  year?: number;
  quarter?: string;
  ownerId?: string | null;
  priority?: string;
  status?: string;
  progress?: number;
  dueDate?: string | null;
  description?: string;
}

export function createPlanItem(input: PlanFields & { title: string; createdBy: string }): string {
  const id = randomUUID();
  const db = getDb();
  db.prepare(
    "insert into grc_plan_items (id, ref, title, category, year, quarter, owner_id, priority, status, progress, due_date, description, created_by) values (?,?,?,?,?,?,?,?,?,?,?,?,?)"
  ).run(
    id,
    nextRef(db),
    input.title,
    PLAN_CATEGORIES.includes(input.category ?? "") ? input.category : "Autre",
    Number.isFinite(input.year) ? input.year : new Date().getFullYear(),
    PLAN_QUARTERS.includes(input.quarter ?? "") ? input.quarter : "T1",
    input.ownerId ?? input.createdBy,
    PLAN_PRIORITIES.includes(input.priority ?? "") ? input.priority : "Normale",
    PLAN_STATUS.includes(input.status ?? "") ? input.status : "À planifier",
    clampPct(input.progress ?? 0),
    input.dueDate ?? null,
    input.description ?? "",
    input.createdBy
  );
  return id;
}

export function updatePlanItem(id: string, fields: PlanFields): void {
  const db = getDb();
  const cur = db.prepare("select * from grc_plan_items where id=?").get(id) as PlanRow | undefined;
  if (!cur) return;
  // Un chantier terminé passe automatiquement à 100 % ; à défaut on garde l'avancement fourni/courant.
  const status = fields.status !== undefined && PLAN_STATUS.includes(fields.status) ? fields.status : cur.status;
  let progress = fields.progress !== undefined ? clampPct(fields.progress) : cur.progress;
  if (status === "Terminé") progress = 100;
  db.prepare(
    "update grc_plan_items set title=?, category=?, year=?, quarter=?, owner_id=?, priority=?, status=?, progress=?, due_date=?, description=?, updated_at=? where id=?"
  ).run(
    fields.title ?? cur.title,
    fields.category !== undefined && PLAN_CATEGORIES.includes(fields.category) ? fields.category : cur.category,
    fields.year !== undefined && Number.isFinite(fields.year) ? fields.year : cur.year,
    fields.quarter !== undefined && PLAN_QUARTERS.includes(fields.quarter) ? fields.quarter : cur.quarter,
    fields.ownerId !== undefined ? fields.ownerId : cur.owner_id,
    fields.priority !== undefined && PLAN_PRIORITIES.includes(fields.priority) ? fields.priority : cur.priority,
    status,
    progress,
    fields.dueDate !== undefined ? fields.dueDate : cur.due_date,
    fields.description !== undefined ? fields.description : cur.description,
    now(),
    id
  );
}

export function deletePlanItem(id: string): void {
  getDb().prepare("delete from grc_plan_items where id=?").run(id);
}

/* ==================================================================
 *  lib/db/objectives.ts — Plan de l'année (objectifs annuels).
 * ================================================================== */
import { randomUUID } from "node:crypto";
import { getDb } from "./index";
import type { Milestone, Objective, ObjectiveStatus } from "@/lib/domain";

export interface MilestoneInput { label: string; date: string; done?: boolean }

const now = () => new Date().toISOString();

interface ObjRow {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  owner_id: string | null;
  color: string;
  status: ObjectiveStatus;
  downgrade_reason: string;
  downgraded_by: string | null;
  downgraded_at: string | null;
  created_by: string | null;
  created_at: string;
}

export function listObjectives(): Objective[] {
  const db = getDb();
  const rows = db.prepare("select * from objectives order by start_date").all() as ObjRow[];
  const projs = db.prepare("select * from objective_projects").all() as { objective_id: string; project_id: string }[];
  const tks = db.prepare("select * from objective_tasks").all() as { objective_id: string; task_id: string }[];
  const mems = db.prepare("select * from objective_members").all() as { objective_id: string; profile_id: string }[];
  const miles = db.prepare("select * from objective_milestones order by date").all() as { id: string; objective_id: string; label: string; date: string; done: number }[];
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    startDate: new Date(r.start_date),
    endDate: new Date(r.end_date),
    ownerId: r.owner_id ?? "",
    color: r.color,
    status: r.status,
    projectIds: projs.filter((x) => x.objective_id === r.id).map((x) => x.project_id),
    taskIds: tks.filter((x) => x.objective_id === r.id).map((x) => x.task_id),
    memberIds: mems.filter((x) => x.objective_id === r.id).map((x) => x.profile_id),
    milestones: miles
      .filter((x) => x.objective_id === r.id)
      .map((x): Milestone => ({ id: x.id, label: x.label, date: new Date(x.date), done: x.done === 1 })),
    downgradeReason: r.downgrade_reason,
    downgradedBy: r.downgraded_by,
    downgradedAt: r.downgraded_at ? new Date(r.downgraded_at) : null,
    createdBy: r.created_by,
    createdAt: new Date(r.created_at),
  }));
}

export function objectiveExists(id: string): boolean {
  return Boolean(getDb().prepare("select 1 from objectives where id=?").get(id));
}

export function createObjective(input: {
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  ownerId: string;
  color?: string;
  createdBy: string;
  projectIds?: string[];
  taskIds?: string[];
  memberIds?: string[];
  milestones?: MilestoneInput[];
}): string {
  const id = randomUUID();
  const db = getDb();
  db.prepare(
    "insert into objectives (id, title, description, start_date, end_date, owner_id, color, status, created_by) values (?,?,?,?,?,?,?, 'planifie', ?)"
  ).run(id, input.title, input.description ?? "", input.startDate, input.endDate, input.ownerId, input.color ?? "#10b981", input.createdBy);
  setLinks(id, "objective_projects", "project_id", input.projectIds ?? []);
  setLinks(id, "objective_tasks", "task_id", input.taskIds ?? []);
  setLinks(id, "objective_members", "profile_id", input.memberIds ?? []);
  setMilestones(id, input.milestones ?? []);
  return id;
}

function setLinks(objId: string, table: string, col: string, ids: string[]): void {
  const db = getDb();
  db.prepare(`delete from ${table} where objective_id=?`).run(objId);
  const ins = db.prepare(`insert into ${table} (objective_id, ${col}) values (?,?)`);
  [...new Set(ids)].filter(Boolean).forEach((v) => ins.run(objId, v));
}

function setMilestones(objId: string, ms: MilestoneInput[]): void {
  const db = getDb();
  db.prepare("delete from objective_milestones where objective_id=?").run(objId);
  const ins = db.prepare("insert into objective_milestones (id, objective_id, label, date, done) values (?,?,?,?,?)");
  ms.filter((m) => m.label?.trim() && m.date).forEach((m) => ins.run(randomUUID(), objId, m.label.trim(), m.date, m.done ? 1 : 0));
}

export function updateObjective(
  id: string,
  fields: {
    title?: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    ownerId?: string;
    color?: string;
    status?: ObjectiveStatus;
    projectIds?: string[];
    taskIds?: string[];
    memberIds?: string[];
    milestones?: MilestoneInput[];
  }
): void {
  const db = getDb();
  const cur = db.prepare("select * from objectives where id=?").get(id) as ObjRow | undefined;
  if (!cur) return;
  db.prepare(
    "update objectives set title=?, description=?, start_date=?, end_date=?, owner_id=?, color=?, status=? where id=?"
  ).run(
    fields.title ?? cur.title,
    fields.description ?? cur.description,
    fields.startDate ?? cur.start_date,
    fields.endDate ?? cur.end_date,
    fields.ownerId ?? cur.owner_id,
    fields.color ?? cur.color,
    fields.status ?? cur.status,
    id
  );
  if (fields.projectIds) setLinks(id, "objective_projects", "project_id", fields.projectIds);
  if (fields.taskIds) setLinks(id, "objective_tasks", "task_id", fields.taskIds);
  if (fields.memberIds) setLinks(id, "objective_members", "profile_id", fields.memberIds);
  if (fields.milestones) setMilestones(id, fields.milestones);
}

/** Déclasse un objectif avec un motif (ou annule le déclassement si reason vide). */
export function downgradeObjective(id: string, reason: string, by: string): void {
  getDb()
    .prepare("update objectives set status='declasse', downgrade_reason=?, downgraded_by=?, downgraded_at=? where id=?")
    .run(reason, by, now(), id);
}

/** Marque un objectif comme atteint. */
export function achieveObjective(id: string): void {
  getDb().prepare("update objectives set status='atteint' where id=?").run(id);
}

export function deleteObjective(id: string): void {
  const db = getDb();
  db.prepare("delete from objective_projects where objective_id=?").run(id);
  db.prepare("delete from objective_tasks where objective_id=?").run(id);
  db.prepare("delete from objective_members where objective_id=?").run(id);
  db.prepare("delete from objective_milestones where objective_id=?").run(id);
  db.prepare("delete from objectives where id=?").run(id);
}

/* ==================================================================
 *  lib/db/tasks.ts — Tâches assignables (module Productivité).
 * ================================================================== */
import { randomUUID } from "node:crypto";
import { getDb } from "./index";
import type { Task, TaskPriority, TaskStatus } from "@/lib/domain";

const now = () => new Date().toISOString();

interface TaskRow {
  id: string;
  title: string;
  description: string;
  assignee_id: string | null;
  created_by: string | null;
  project_id: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
}

function mapTask(r: TaskRow): Task {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    assigneeId: r.assignee_id,
    createdBy: r.created_by,
    projectId: r.project_id,
    status: r.status,
    priority: r.priority,
    dueDate: r.due_date ? new Date(r.due_date) : null,
    completedAt: r.completed_at ? new Date(r.completed_at) : null,
    createdAt: new Date(r.created_at),
  };
}

export function listTasks(): Task[] {
  return (getDb().prepare("select * from tasks order by created_at desc").all() as TaskRow[]).map(mapTask);
}

export function getTask(id: string): Task | null {
  const r = getDb().prepare("select * from tasks where id=?").get(id) as TaskRow | undefined;
  return r ? mapTask(r) : null;
}

export function createTask(input: {
  title: string;
  description?: string;
  assigneeId?: string | null;
  createdBy: string;
  projectId?: string | null;
  priority?: TaskPriority;
  dueDate?: string | null;
}): string {
  const id = randomUUID();
  getDb()
    .prepare(
      "insert into tasks (id, title, description, assignee_id, created_by, project_id, status, priority, due_date) " +
        "values (?,?,?,?,?,?,?,?,?)"
    )
    .run(
      id,
      input.title,
      input.description ?? "",
      input.assigneeId ?? null,
      input.createdBy,
      input.projectId ?? null,
      "à faire",
      input.priority ?? "Normale",
      input.dueDate ?? null
    );
  return id;
}

export function updateTask(
  id: string,
  fields: {
    title?: string;
    description?: string;
    assigneeId?: string | null;
    projectId?: string | null;
    status?: TaskStatus;
    priority?: TaskPriority;
    dueDate?: string | null;
  }
): void {
  const cur = getDb().prepare("select * from tasks where id=?").get(id) as TaskRow | undefined;
  if (!cur) return;
  const status = fields.status ?? cur.status;
  // Horodatage d'achèvement : posé quand la tâche passe à « fait », effacé sinon.
  let completedAt = cur.completed_at;
  if (status === "fait" && cur.status !== "fait") completedAt = now();
  if (status !== "fait") completedAt = null;
  getDb()
    .prepare(
      "update tasks set title=?, description=?, assignee_id=?, project_id=?, status=?, priority=?, due_date=?, completed_at=? where id=?"
    )
    .run(
      fields.title ?? cur.title,
      fields.description ?? cur.description,
      fields.assigneeId !== undefined ? fields.assigneeId : cur.assignee_id,
      fields.projectId !== undefined ? fields.projectId : cur.project_id,
      status,
      fields.priority ?? cur.priority,
      fields.dueDate !== undefined ? fields.dueDate : cur.due_date,
      completedAt,
      id
    );
}

export function deleteTask(id: string): void {
  getDb().prepare("delete from tasks where id=?").run(id);
}

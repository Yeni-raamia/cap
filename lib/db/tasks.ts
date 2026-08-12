/* ==================================================================
 *  lib/db/tasks.ts — Tâches assignables (module Productivité).
 * ================================================================== */
import { randomUUID } from "node:crypto";
import { getDb } from "./index";
import {
  PRIVATE_SPACE_ENABLED,
  type Subtask,
  type Task,
  type TaskEvent,
  type TaskEventKind,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/domain";

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
  start_date: string | null;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  published: number;
  recurrence_id: string | null;
  occurrence_date: string | null;
  blocked_reason: string | null;
}
interface EventRow {
  id: string;
  task_id: string;
  kind: TaskEventKind;
  label: string;
  author_id: string | null;
  created_at: string;
}
const mapEvent = (r: EventRow): TaskEvent => ({
  id: r.id,
  taskId: r.task_id,
  kind: r.kind,
  label: r.label,
  authorId: r.author_id,
  createdAt: new Date(r.created_at),
});

/** Consigne un changement dans le journal de la tâche. */
export function logTaskEvent(taskId: string, kind: TaskEventKind, label: string, authorId: string | null): void {
  getDb()
    .prepare("insert into task_events (id, task_id, kind, label, author_id) values (?,?,?,?,?)")
    .run(randomUUID(), taskId, kind, label, authorId);
}

export function listTaskEvents(taskId: string): TaskEvent[] {
  const rows = getDb()
    .prepare("select * from task_events where task_id=? order by created_at desc, rowid desc")
    .all(taskId) as EventRow[];
  return rows.map(mapEvent);
}
interface SubtaskRow {
  id: string;
  task_id: string;
  title: string;
  done: number;
  ordre: number;
}
const mapSubtask = (r: SubtaskRow): Subtask => ({
  id: r.id,
  taskId: r.task_id,
  title: r.title,
  done: r.done === 1,
  ordre: r.ordre,
});

function mapTask(r: TaskRow, subs: SubtaskRow[], events: EventRow[] = []): Task {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    assigneeId: r.assignee_id,
    createdBy: r.created_by,
    projectId: r.project_id,
    status: r.status,
    priority: r.priority,
    startDate: r.start_date ? new Date(r.start_date) : null,
    dueDate: r.due_date ? new Date(r.due_date) : null,
    completedAt: r.completed_at ? new Date(r.completed_at) : null,
    createdAt: new Date(r.created_at),
    subtasks: subs.filter((s) => s.task_id === r.id).map(mapSubtask),
    published: r.published !== 0,
    recurrenceId: r.recurrence_id ?? null,
    occurrenceDate: r.occurrence_date ?? null,
    blockedReason: r.blocked_reason ?? null,
    events: events.filter((e) => e.task_id === r.id).map(mapEvent),
  };
}

// `viewerId` fourni → ne renvoie que les tâches publiées, créées par le demandeur,
// ou qui lui sont assignées. Sans `viewerId` : tout (moteur de rappels, admin).
export function listTasks(viewerId?: string): Task[] {
  const rows = getDb().prepare("select * from tasks order by created_at desc").all() as TaskRow[];
  const subs = getDb().prepare("select * from task_subtasks order by ordre, created_at").all() as SubtaskRow[];
  const evts = getDb().prepare("select * from task_events order by created_at desc, rowid desc").all() as EventRow[];
  const mapped = rows.map((r) => mapTask(r, subs, evts));
  if (!viewerId) return mapped;
  return mapped.filter((t) => t.published !== false || t.createdBy === viewerId || t.assigneeId === viewerId);
}

export function getTask(id: string): Task | null {
  const r = getDb().prepare("select * from tasks where id=?").get(id) as TaskRow | undefined;
  if (!r) return null;
  const subs = getDb().prepare("select * from task_subtasks where task_id=? order by ordre, created_at").all(id) as SubtaskRow[];
  const evts = getDb().prepare("select * from task_events where task_id=? order by created_at desc, rowid desc").all(id) as EventRow[];
  return mapTask(r, subs, evts);
}

export function createTask(input: {
  title: string;
  description?: string;
  assigneeId?: string | null;
  createdBy: string;
  projectId?: string | null;
  priority?: TaskPriority;
  startDate?: string | null;
  dueDate?: string | null;
  /** Publier immédiatement (visible par l'équipe). Défaut : privé (créateur seul). */
  published?: boolean;
}): string {
  const id = randomUUID();
  getDb()
    .prepare(
      "insert into tasks (id, title, description, assignee_id, created_by, project_id, status, priority, start_date, due_date, published) " +
        "values (?,?,?,?,?,?,?,?,?,?,?)"
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
      input.startDate ?? null,
      input.dueDate ?? null,
      // Espace privé désactivé → toujours publié (comportement d'avant le Lot 2).
      (PRIVATE_SPACE_ENABLED ? !!input.published : true) ? 1 : 0
    );
  return id;
}

/** Publie une tâche (irréversible) : la rend visible par toute l'équipe. */
export function publishTask(id: string): void {
  getDb().prepare("update tasks set published = 1 where id = ? and published = 0").run(id);
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
    startDate?: string | null;
    dueDate?: string | null;
    blockedReason?: string | null;
  }
): void {
  const cur = getDb().prepare("select * from tasks where id=?").get(id) as TaskRow | undefined;
  if (!cur) return;
  const status = fields.status ?? cur.status;
  // Horodatage d'achèvement : posé quand la tâche passe à « fait », effacé sinon.
  let completedAt = cur.completed_at;
  if (status === "fait" && cur.status !== "fait") completedAt = now();
  if (status !== "fait") completedAt = null;
  // Le motif ne vit que le temps du blocage : on l'efface en sortant du statut.
  const blockedReason =
    status !== "bloqué" ? null : fields.blockedReason !== undefined ? fields.blockedReason : cur.blocked_reason;
  getDb()
    .prepare(
      "update tasks set title=?, description=?, assignee_id=?, project_id=?, status=?, priority=?, start_date=?, due_date=?, completed_at=?, blocked_reason=? where id=?"
    )
    .run(
      fields.title ?? cur.title,
      fields.description ?? cur.description,
      fields.assigneeId !== undefined ? fields.assigneeId : cur.assignee_id,
      fields.projectId !== undefined ? fields.projectId : cur.project_id,
      status,
      fields.priority ?? cur.priority,
      fields.startDate !== undefined ? fields.startDate : cur.start_date,
      fields.dueDate !== undefined ? fields.dueDate : cur.due_date,
      completedAt,
      blockedReason,
      id
    );
}

export function deleteTask(id: string): void {
  const db = getDb();
  db.prepare("delete from task_subtasks where task_id=?").run(id);
  db.prepare("delete from task_events where task_id=?").run(id);
  db.prepare("delete from reports where ref_type='task' and ref_id=?").run(id);
  db.prepare("delete from tasks where id=?").run(id);
}

/* ---------- Sous-tâches (checklist) ---------- */
export function subtaskTaskId(subtaskId: string): string | null {
  const r = getDb().prepare("select task_id from task_subtasks where id=?").get(subtaskId) as { task_id: string } | undefined;
  return r?.task_id ?? null;
}

export function addSubtask(taskId: string, title: string): void {
  const max = getDb().prepare("select coalesce(max(ordre),0)+1 as n from task_subtasks where task_id=?").get(taskId) as { n: number };
  getDb()
    .prepare("insert into task_subtasks (id, task_id, title, done, ordre) values (?,?,?,0,?)")
    .run(randomUUID(), taskId, title, max.n);
}

export function updateSubtask(subtaskId: string, fields: { title?: string; done?: boolean }): void {
  const cur = getDb().prepare("select * from task_subtasks where id=?").get(subtaskId) as SubtaskRow | undefined;
  if (!cur) return;
  getDb()
    .prepare("update task_subtasks set title=?, done=? where id=?")
    .run(fields.title ?? cur.title, fields.done !== undefined ? (fields.done ? 1 : 0) : cur.done, subtaskId);
}

export function deleteSubtask(subtaskId: string): void {
  getDb().prepare("delete from task_subtasks where id=?").run(subtaskId);
}

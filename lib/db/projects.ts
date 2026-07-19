/* ==================================================================
 *  lib/db/projects.ts — Dépôt du module Projet (serveur).
 * ================================================================== */
import { randomUUID } from "node:crypto";
import { getDb } from "./index";
import type {
  Project,
  ProjectNote,
  ProjectStatus,
  ProjectTask,
  TaskStatus,
} from "@/lib/domain";

interface ProjectRow {
  id: string;
  name: string;
  description: string;
  owner_id: string;
  status: ProjectStatus;
  deadline: string | null;
  source_item_id: string | null;
  created_at: string;
}
interface TaskRow {
  id: string;
  project_id: string;
  title: string;
  assignee_id: string | null;
  status: TaskStatus;
  due_date: string | null;
  ordre: number;
  created_at: string;
}
interface MemberRow {
  project_id: string;
  profile_id: string;
}
interface NoteRow {
  id: string;
  project_id: string;
  author_id: string | null;
  body: string;
  created_at: string;
}

function mapTask(r: TaskRow): ProjectTask {
  return {
    id: r.id,
    projectId: r.project_id,
    title: r.title,
    assigneeId: r.assignee_id,
    status: r.status,
    dueDate: r.due_date ? new Date(r.due_date) : null,
    ordre: r.ordre,
    createdAt: new Date(r.created_at),
  };
}
function mapNote(r: NoteRow): ProjectNote {
  return {
    id: r.id,
    projectId: r.project_id,
    authorId: r.author_id ?? "",
    body: r.body,
    createdAt: new Date(r.created_at),
  };
}

export function listProjects(): Project[] {
  const db = getDb();
  const projects = db.prepare("select * from projects order by created_at desc").all() as ProjectRow[];
  const tasks = db.prepare("select * from project_tasks order by ordre, created_at").all() as TaskRow[];
  const members = db.prepare("select * from project_members").all() as MemberRow[];
  const notes = db.prepare("select * from project_notes order by created_at desc").all() as NoteRow[];

  const tByP = new Map<string, TaskRow[]>();
  tasks.forEach((t) => tByP.set(t.project_id, [...(tByP.get(t.project_id) ?? []), t]));
  const mByP = new Map<string, string[]>();
  members.forEach((m) => mByP.set(m.project_id, [...(mByP.get(m.project_id) ?? []), m.profile_id]));
  const nByP = new Map<string, NoteRow[]>();
  notes.forEach((n) => nByP.set(n.project_id, [...(nByP.get(n.project_id) ?? []), n]));

  return projects.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    ownerId: p.owner_id,
    status: p.status,
    deadline: p.deadline ? new Date(p.deadline) : null,
    sourceItemId: p.source_item_id,
    createdAt: new Date(p.created_at),
    tasks: (tByP.get(p.id) ?? []).map(mapTask),
    memberIds: mByP.get(p.id) ?? [],
    notes: (nByP.get(p.id) ?? []).map(mapNote),
  }));
}

export function getProjectOwner(projectId: string): string | null {
  const r = getDb().prepare("select owner_id from projects where id = ?").get(projectId) as
    | { owner_id: string }
    | undefined;
  return r?.owner_id ?? null;
}

export function isProjectMember(projectId: string, profileId: string): boolean {
  const r = getDb()
    .prepare("select 1 from project_members where project_id = ? and profile_id = ?")
    .get(projectId, profileId);
  return Boolean(r);
}

/** Crée un projet et renvoie son id. */
export function createProject(input: {
  name: string;
  description?: string;
  ownerId: string;
  sourceItemId?: string | null;
  deadline?: string | null;
}): string {
  const id = randomUUID();
  getDb()
    .prepare(
      "insert into projects (id, name, description, owner_id, status, deadline, source_item_id) values (?,?,?,?,?,?,?)"
    )
    .run(
      id,
      input.name,
      input.description ?? "",
      input.ownerId,
      "En cours",
      input.deadline ?? null,
      input.sourceItemId ?? null
    );
  // Le propriétaire est membre par défaut.
  getDb()
    .prepare("insert into project_members (id, project_id, profile_id) values (?,?,?)")
    .run(randomUUID(), id, input.ownerId);
  return id;
}

/** Crée automatiquement un projet à partir d'un suivi de métier PRJ. */
export function createProjectForItem(itemId: string, name: string, ownerId: string): string {
  const pid = createProject({ name, ownerId, sourceItemId: itemId });
  getDb().prepare("update items set project_id = ? where id = ?").run(pid, itemId);
  return pid;
}

export function updateProject(
  id: string,
  fields: { name?: string; description?: string; status?: ProjectStatus; deadline?: string | null }
): void {
  const cur = getDb().prepare("select * from projects where id = ?").get(id) as ProjectRow | undefined;
  if (!cur) return;
  getDb()
    .prepare("update projects set name=?, description=?, status=?, deadline=? where id=?")
    .run(
      fields.name ?? cur.name,
      fields.description ?? cur.description,
      fields.status ?? cur.status,
      fields.deadline !== undefined ? fields.deadline : cur.deadline,
      id
    );
}

/* ---------- Tâches ---------- */
export function addTask(input: {
  projectId: string;
  title: string;
  assigneeId?: string | null;
  dueDate?: string | null;
}): void {
  const db = getDb();
  const max = db
    .prepare("select coalesce(max(ordre),0)+1 as n from project_tasks where project_id = ?")
    .get(input.projectId) as { n: number };
  db.prepare(
    "insert into project_tasks (id, project_id, title, assignee_id, status, due_date, ordre) values (?,?,?,?,?,?,?)"
  ).run(randomUUID(), input.projectId, input.title, input.assigneeId ?? null, "à faire", input.dueDate ?? null, max.n);
}

export function updateTask(
  taskId: string,
  fields: { title?: string; assigneeId?: string | null; status?: TaskStatus; dueDate?: string | null }
): void {
  const cur = getDb().prepare("select * from project_tasks where id = ?").get(taskId) as TaskRow | undefined;
  if (!cur) return;
  getDb()
    .prepare("update project_tasks set title=?, assignee_id=?, status=?, due_date=? where id=?")
    .run(
      fields.title ?? cur.title,
      fields.assigneeId !== undefined ? fields.assigneeId : cur.assignee_id,
      fields.status ?? cur.status,
      fields.dueDate !== undefined ? fields.dueDate : cur.due_date,
      taskId
    );
}

export function deleteTask(taskId: string): void {
  getDb().prepare("delete from project_tasks where id = ?").run(taskId);
}

export function taskProjectId(taskId: string): string | null {
  const r = getDb().prepare("select project_id from project_tasks where id = ?").get(taskId) as
    | { project_id: string }
    | undefined;
  return r?.project_id ?? null;
}

/* ---------- Membres ---------- */
export function addMember(projectId: string, profileId: string): void {
  if (isProjectMember(projectId, profileId)) return;
  getDb()
    .prepare("insert into project_members (id, project_id, profile_id) values (?,?,?)")
    .run(randomUUID(), projectId, profileId);
}
export function removeMember(projectId: string, profileId: string): void {
  getDb()
    .prepare("delete from project_members where project_id = ? and profile_id = ?")
    .run(projectId, profileId);
}

/* ---------- Notes ---------- */
export function addNote(projectId: string, authorId: string, body: string): void {
  getDb()
    .prepare("insert into project_notes (id, project_id, author_id, body) values (?,?,?,?)")
    .run(randomUUID(), projectId, authorId, body);
}

/* ---------- Rattachement d'un suivi ---------- */
export function attachItem(itemId: string, projectId: string | null): void {
  getDb().prepare("update items set project_id = ? where id = ?").run(projectId, itemId);
}

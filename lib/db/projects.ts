/* ==================================================================
 *  lib/db/projects.ts — Dépôt du module Projet (serveur).
 * ================================================================== */
import { randomUUID } from "node:crypto";
import { getDb } from "./index";
import { PRIVATE_SPACE_ENABLED } from "@/lib/domain";
import type {
  ClosureRequest,
  ClosureStatus,
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
  pending_status: string | null;
  pending_by: string | null;
  archived: number;
  del_requested_by: string | null;
  del_reason: string | null;
  del_requested_at: string | null;
  published: number;
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

interface ClosureRow {
  id: string;
  project_id: string;
  requested_by: string | null;
  summary: string;
  deliverables: string;
  status: ClosureStatus;
  decided_by: string | null;
  decision_note: string;
  created_at: string;
  decided_at: string | null;
}
function mapClosure(r: ClosureRow): ClosureRequest {
  let deliverables: string[] = [];
  try {
    deliverables = JSON.parse(r.deliverables || "[]");
  } catch {
    deliverables = [];
  }
  return {
    id: r.id,
    projectId: r.project_id,
    requestedBy: r.requested_by ?? "",
    summary: r.summary,
    deliverables,
    status: r.status,
    decidedBy: r.decided_by,
    decisionNote: r.decision_note,
    createdAt: new Date(r.created_at),
    decidedAt: r.decided_at ? new Date(r.decided_at) : null,
  };
}

// `viewerId` fourni → ne renvoie que les projets publiés, ceux du demandeur, ou
// ceux dont il est membre (collaborateur explicite). Sans `viewerId` : tout.
export function listProjects(viewerId?: string): Project[] {
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
  // Dernière demande de clôture par projet.
  const closures = db.prepare("select * from project_closure_requests order by created_at desc").all() as ClosureRow[];
  const cByP = new Map<string, ClosureRow>();
  closures.forEach((c) => {
    if (!cByP.has(c.project_id)) cByP.set(c.project_id, c);
  });

  const mapped = projects.map((p) => ({
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
    pendingStatus: p.pending_status,
    pendingBy: p.pending_by,
    closure: cByP.has(p.id) ? mapClosure(cByP.get(p.id)!) : null,
    archived: p.archived === 1,
    deletionRequest: p.del_requested_by
      ? {
          requestedBy: p.del_requested_by,
          reason: p.del_reason ?? "",
          requestedAt: new Date(p.del_requested_at ?? p.created_at),
        }
      : null,
    published: p.published !== 0,
  }));
  if (!viewerId) return mapped;
  return mapped.filter((p) => p.published || p.ownerId === viewerId || p.memberIds.includes(viewerId));
}

/* ---------- Archivage & suppression ---------- */

/** Archive (ou désarchive) un projet — masqué des vues actives, conservé. */
export function setProjectArchived(projectId: string, archived: boolean): void {
  getDb().prepare("update projects set archived=? where id=?").run(archived ? 1 : 0, projectId);
}

/** Enregistre une demande de suppression, en attente d'approbation. */
export function requestProjectDeletion(projectId: string, byId: string, reason: string): void {
  getDb()
    .prepare("update projects set del_requested_by=?, del_reason=?, del_requested_at=? where id=?")
    .run(byId, reason, new Date().toISOString(), projectId);
}

/** Retire la demande de suppression en attente (rejet ou annulation). */
export function clearProjectDeletion(projectId: string): void {
  getDb()
    .prepare("update projects set del_requested_by=null, del_reason=null, del_requested_at=null where id=?")
    .run(projectId);
}

/** Demandeur de la suppression en attente, le cas échéant. */
export function getProjectDeletionRequester(projectId: string): string | null {
  const r = getDb().prepare("select del_requested_by from projects where id=?").get(projectId) as
    | { del_requested_by: string | null }
    | undefined;
  return r?.del_requested_by ?? null;
}

/**
 * Supprime définitivement un projet et ses dépendances (tâches, membres, notes,
 * demandes de clôture, liens objectifs) ; les suivis liés sont détachés.
 */
export function deleteProject(projectId: string): void {
  const db = getDb();
  const tx = db.transaction(() => {
    db.prepare("update items set project_id=null where project_id=?").run(projectId);
    db.prepare("delete from project_tasks where project_id=?").run(projectId);
    db.prepare("delete from project_members where project_id=?").run(projectId);
    db.prepare("delete from project_notes where project_id=?").run(projectId);
    db.prepare("delete from project_closure_requests where project_id=?").run(projectId);
    db.prepare("delete from objective_projects where project_id=?").run(projectId);
    db.prepare("delete from projects where id=?").run(projectId);
  });
  tx();
}

/* ---------- Workflow de validation du statut ----------
 * Un manager (ou le responsable) propose un nouveau statut ; le
 * changement reste « en attente » jusqu'à validation du directeur. */
export function requestStatusChange(projectId: string, status: string, byId: string): void {
  getDb().prepare("update projects set pending_status=?, pending_by=? where id=?").run(status, byId, projectId);
}

/** Valide (approve=true) ou rejette la proposition de statut. */
export function decideStatusChange(projectId: string, approve: boolean): string | null {
  const cur = getDb().prepare("select * from projects where id=?").get(projectId) as ProjectRow | undefined;
  if (!cur || !cur.pending_status) return null;
  const target = cur.pending_status;
  if (approve) {
    getDb().prepare("update projects set status=?, pending_status=null, pending_by=null where id=?").run(target, projectId);
  } else {
    getDb().prepare("update projects set pending_status=null, pending_by=null where id=?").run(projectId);
  }
  return approve ? target : null;
}

export function getProjectPending(projectId: string): { pendingStatus: string | null; pendingBy: string | null; ownerId: string } | null {
  const r = getDb().prepare("select pending_status, pending_by, owner_id from projects where id=?").get(projectId) as
    | { pending_status: string | null; pending_by: string | null; owner_id: string }
    | undefined;
  return r ? { pendingStatus: r.pending_status, pendingBy: r.pending_by, ownerId: r.owner_id } : null;
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
  memberIds?: string[];
  /** Publier immédiatement (visible par l'équipe). Défaut : privé (créateur seul). */
  published?: boolean;
}): string {
  const id = randomUUID();
  getDb()
    .prepare(
      "insert into projects (id, name, description, owner_id, status, deadline, source_item_id, published) values (?,?,?,?,?,?,?,?)"
    )
    .run(
      id,
      input.name,
      input.description ?? "",
      input.ownerId,
      "En cours",
      input.deadline ?? null,
      input.sourceItemId ?? null,
      // Espace privé désactivé → toujours publié (comportement d'avant le Lot 2).
      (PRIVATE_SPACE_ENABLED ? !!input.published : true) ? 1 : 0
    );
  // Le propriétaire + les personnes assignées sont membres.
  const ins = getDb().prepare("insert into project_members (id, project_id, profile_id) values (?,?,?)");
  const all = [...new Set([input.ownerId, ...(input.memberIds ?? [])])];
  all.forEach((pid) => ins.run(randomUUID(), id, pid));
  return id;
}

/** Crée automatiquement un projet à partir d'un suivi de métier PRJ (même visibilité que le suivi). */
export function createProjectForItem(itemId: string, name: string, ownerId: string, published = false): string {
  const pid = createProject({ name, ownerId, sourceItemId: itemId, published });
  getDb().prepare("update items set project_id = ? where id = ?").run(pid, itemId);
  return pid;
}

/** Publie un projet (irréversible) : le rend visible par toute l'équipe. */
export function publishProject(id: string): void {
  getDb().prepare("update projects set published = 1 where id = ? and published = 0").run(id);
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

/* ---------- Demande de clôture ----------
 * L'agent soumet un récapitulatif + livrables ; le manager/directeur
 * valide (→ Terminé) ou rejette. */
export function requestClosure(input: {
  projectId: string;
  requestedBy: string;
  summary: string;
  deliverables: string[];
}): string {
  const id = randomUUID();
  getDb()
    .prepare(
      "insert into project_closure_requests (id, project_id, requested_by, summary, deliverables, status) values (?,?,?,?,?, 'en_attente')"
    )
    .run(id, input.projectId, input.requestedBy, input.summary, JSON.stringify(input.deliverables ?? []));
  return id;
}

export function getPendingClosure(projectId: string): { id: string; requestedBy: string | null } | null {
  const r = getDb()
    .prepare("select id, requested_by from project_closure_requests where project_id=? and status='en_attente' order by created_at desc limit 1")
    .get(projectId) as { id: string; requested_by: string | null } | undefined;
  return r ? { id: r.id, requestedBy: r.requested_by } : null;
}

/** Valide (approve) ou rejette la demande de clôture en attente. */
export function decideClosure(projectId: string, approve: boolean, decidedBy: string, note: string): boolean {
  const pending = getPendingClosure(projectId);
  if (!pending) return false;
  getDb()
    .prepare("update project_closure_requests set status=?, decided_by=?, decision_note=?, decided_at=? where id=?")
    .run(approve ? "validee" : "rejetee", decidedBy, note, new Date().toISOString(), pending.id);
  if (approve) {
    // La clôture validée passe le projet en « Terminé » (100 % + archivage).
    getDb().prepare("update projects set status='Terminé', pending_status=null, pending_by=null where id=?").run(projectId);
  }
  return true;
}

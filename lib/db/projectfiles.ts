/* ==================================================================
 *  lib/db/projectfiles.ts — Fichiers partagés d'un projet (BLOB SQLite).
 *  Même mécanisme que les pièces jointes de suivi (lib/db/repo.ts).
 * ================================================================== */
import { randomUUID } from "node:crypto";
import { getDb } from "./index";
import type { ProjectAttachment } from "@/lib/domain";

interface Row {
  id: string;
  project_id: string;
  filename: string;
  mime: string;
  size: number;
  uploaded_by: string | null;
  created_at: string;
}

function mapRow(r: Row): ProjectAttachment {
  return {
    id: r.id,
    projectId: r.project_id,
    filename: r.filename,
    mime: r.mime,
    size: r.size,
    uploadedBy: r.uploaded_by ?? "",
    createdAt: new Date(r.created_at),
  };
}

export function listProjectFiles(projectId: string): ProjectAttachment[] {
  return (getDb()
    .prepare("select id, project_id, filename, mime, size, uploaded_by, created_at from project_attachments where project_id = ? order by created_at desc")
    .all(projectId) as Row[]).map(mapRow);
}

export function createProjectFile(input: { projectId: string; filename: string; mime: string; size: number; data: Buffer; uploadedBy: string }): string {
  const id = randomUUID();
  getDb()
    .prepare("insert into project_attachments (id, project_id, filename, mime, size, data, uploaded_by) values (?,?,?,?,?,?,?)")
    .run(id, input.projectId, input.filename, input.mime, input.size, input.data, input.uploadedBy);
  return id;
}

export function getProjectFileData(id: string): { filename: string; mime: string; data: Buffer } | null {
  const r = getDb().prepare("select filename, mime, data from project_attachments where id = ?").get(id) as { filename: string; mime: string; data: Buffer } | undefined;
  return r ? { filename: r.filename, mime: r.mime, data: r.data } : null;
}

export function getProjectFileMeta(id: string): ProjectAttachment | null {
  const r = getDb().prepare("select id, project_id, filename, mime, size, uploaded_by, created_at from project_attachments where id = ?").get(id) as Row | undefined;
  return r ? mapRow(r) : null;
}

export function deleteProjectFile(id: string): void {
  getDb().prepare("delete from project_attachments where id = ?").run(id);
}

/** Accès à un projet : existe-t-il, et l'utilisateur en est-il propriétaire/membre ? */
export function projectAccess(projectId: string, userId: string): { exists: boolean; isMember: boolean } {
  const p = getDb().prepare("select owner_id from projects where id = ?").get(projectId) as { owner_id: string } | undefined;
  if (!p) return { exists: false, isMember: false };
  if (p.owner_id === userId) return { exists: true, isMember: true };
  const m = getDb().prepare("select 1 from project_members where project_id = ? and profile_id = ?").get(projectId, userId);
  return { exists: true, isMember: Boolean(m) };
}

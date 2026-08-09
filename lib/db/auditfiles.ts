/* ==================================================================
 *  lib/db/auditfiles.ts — Preuves / pièces jointes d'un audit (BLOB).
 *  Même mécanisme que les pièces jointes de projet (projectfiles.ts).
 * ================================================================== */
import { randomUUID } from "node:crypto";
import { getDb } from "./index";
import type { AuditAttachment } from "@/lib/domain";

interface Row {
  id: string; audit_id: string; question_id: string; filename: string; mime: string; size: number;
  uploaded_by: string | null; created_at: string;
}

function mapRow(r: Row): AuditAttachment {
  return {
    id: r.id, auditId: r.audit_id, questionId: r.question_id, filename: r.filename, mime: r.mime, size: r.size,
    uploadedBy: r.uploaded_by ?? "", createdAt: new Date(r.created_at),
  };
}

export function listAuditFiles(auditId: string): AuditAttachment[] {
  return (getDb()
    .prepare("select id, audit_id, question_id, filename, mime, size, uploaded_by, created_at from audit_attachments where audit_id = ? order by created_at desc")
    .all(auditId) as Row[]).map(mapRow);
}

export function createAuditFile(input: { auditId: string; questionId: string; filename: string; mime: string; size: number; data: Buffer; uploadedBy: string }): string {
  const id = randomUUID();
  getDb()
    .prepare("insert into audit_attachments (id, audit_id, question_id, filename, mime, size, data, uploaded_by) values (?,?,?,?,?,?,?,?)")
    .run(id, input.auditId, input.questionId, input.filename, input.mime, input.size, input.data, input.uploadedBy);
  return id;
}

export function getAuditFileData(id: string): { filename: string; mime: string; data: Buffer } | null {
  const r = getDb().prepare("select filename, mime, data from audit_attachments where id = ?").get(id) as { filename: string; mime: string; data: Buffer } | undefined;
  return r ? { filename: r.filename, mime: r.mime, data: r.data } : null;
}

export function getAuditFileMeta(id: string): AuditAttachment | null {
  const r = getDb().prepare("select id, audit_id, question_id, filename, mime, size, uploaded_by, created_at from audit_attachments where id = ?").get(id) as Row | undefined;
  return r ? mapRow(r) : null;
}

export function deleteAuditFile(id: string): void {
  getDb().prepare("delete from audit_attachments where id = ?").run(id);
}

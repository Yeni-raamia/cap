/* ==================================================================
 *  lib/db/messagefiles.ts — Pièces jointes des messages (BLOB).
 *  Même mécanisme que les pièces jointes de projet/audit. Chaque
 *  pièce est rattachée à un message ET à sa conversation (liste rapide).
 * ================================================================== */
import { randomUUID } from "node:crypto";
import { getDb } from "./index";
import type { MessageAttachment } from "@/lib/domain";

interface Row {
  id: string; message_id: string; filename: string; mime: string; size: number;
  uploaded_by: string | null; created_at: string;
}

function mapRow(r: Row): MessageAttachment {
  return {
    id: r.id, messageId: r.message_id, filename: r.filename, mime: r.mime, size: r.size,
    uploadedBy: r.uploaded_by ?? "", createdAt: new Date(r.created_at),
  };
}

/** Pièces jointes de tous les messages d'une conversation (pour listMessages). */
export function attachmentsByConversation(convId: string): MessageAttachment[] {
  return (getDb()
    .prepare("select id, message_id, filename, mime, size, uploaded_by, created_at from message_attachments where conversation_id = ? order by created_at")
    .all(convId) as Row[]).map(mapRow);
}

export function createMessageFile(input: { messageId: string; conversationId: string; filename: string; mime: string; size: number; data: Buffer; uploadedBy: string }): string {
  const id = randomUUID();
  getDb()
    .prepare("insert into message_attachments (id, message_id, conversation_id, filename, mime, size, data, uploaded_by) values (?,?,?,?,?,?,?,?)")
    .run(id, input.messageId, input.conversationId, input.filename, input.mime, input.size, input.data, input.uploadedBy);
  return id;
}

export function getMessageFileData(id: string): { filename: string; mime: string; data: Buffer; conversationId: string } | null {
  const r = getDb().prepare("select filename, mime, data, conversation_id from message_attachments where id = ?").get(id) as
    | { filename: string; mime: string; data: Buffer; conversation_id: string }
    | undefined;
  return r ? { filename: r.filename, mime: r.mime, data: r.data, conversationId: r.conversation_id } : null;
}

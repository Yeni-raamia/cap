/* ==================================================================
 *  lib/db/messaging.ts — Messagerie interne (serveur).
 *  Conversations : groupes explicites, ou fils liés à un suivi /
 *  une négligence / un projet (ouverts à toute l'équipe).
 * ================================================================== */
import { randomUUID } from "node:crypto";
import { getDb } from "./index";
import type { ConversationSummary, ConvKind, Message } from "@/lib/domain";

const now = () => new Date().toISOString();

interface ConvRow {
  id: string;
  title: string;
  kind: ConvKind;
  ref_type: string | null;
  ref_id: string | null;
  created_by: string | null;
  created_at: string;
}

/** Titre lisible d'un fil lié à une entité. */
function entityTitle(refType: string, refId: string): string {
  const db = getDb();
  if (refType === "item") {
    const r = db.prepare("select ref, objet from items where id=?").get(refId) as { ref: string; objet: string } | undefined;
    return r ? `${r.ref} — ${r.objet}` : "Suivi";
  }
  if (refType === "project") {
    const r = db.prepare("select name from projects where id=?").get(refId) as { name: string } | undefined;
    return r ? r.name : "Projet";
  }
  if (refType === "negligence") {
    const r = db.prepare("select objet from negligences where id=?").get(refId) as { objet: string } | undefined;
    return r ? `Négligence — ${r.objet || "sans objet"}` : "Négligence";
  }
  return "Discussion";
}

export function memberIds(convId: string): string[] {
  return (getDb().prepare("select profile_id from conversation_members where conversation_id=?").all(convId) as { profile_id: string }[]).map((r) => r.profile_id);
}

export function getConvRow(id: string): ConvRow | null {
  return (getDb().prepare("select * from conversations where id=?").get(id) as ConvRow | undefined) ?? null;
}

/** Un utilisateur peut-il voir/écrire dans cette conversation ? */
export function canAccessConversation(convId: string, userId: string): boolean {
  const c = getConvRow(convId);
  if (!c) return false;
  if (c.kind !== "group") return true; // fils d'entité : ouverts à l'équipe
  return memberIds(convId).includes(userId);
}

/** Récupère (ou crée) le fil lié à une entité. */
export function ensureEntityConversation(refType: string, refId: string, createdBy: string): string {
  const existing = getDb().prepare("select id from conversations where ref_type=? and ref_id=?").get(refType, refId) as { id: string } | undefined;
  if (existing) return existing.id;
  const id = randomUUID();
  getDb()
    .prepare("insert into conversations (id, title, kind, ref_type, ref_id, created_by) values (?,?,?,?,?,?)")
    .run(id, entityTitle(refType, refId), refType, refType, refId, createdBy);
  return id;
}

export function findEntityConversation(refType: string, refId: string): string | null {
  const r = getDb().prepare("select id from conversations where ref_type=? and ref_id=?").get(refType, refId) as { id: string } | undefined;
  return r?.id ?? null;
}

export function createGroup(title: string, memberList: string[], createdBy: string): string {
  const id = randomUUID();
  const db = getDb();
  db.prepare("insert into conversations (id, title, kind, created_by) values (?,?,?,?)").run(id, title, "group", createdBy);
  const ins = db.prepare("insert into conversation_members (id, conversation_id, profile_id) values (?,?,?)");
  const all = [...new Set([createdBy, ...memberList])];
  all.forEach((pid) => ins.run(randomUUID(), id, pid));
  return id;
}

export function listMessages(convId: string): Message[] {
  const rows = getDb().prepare("select * from messages where conversation_id=? order by created_at").all(convId) as {
    id: string; conversation_id: string; author_id: string | null; body: string; created_at: string;
  }[];
  return rows.map((r) => ({ id: r.id, conversationId: r.conversation_id, authorId: r.author_id ?? "", body: r.body, createdAt: new Date(r.created_at) }));
}

export function postMessage(convId: string, authorId: string, body: string): string {
  const id = randomUUID();
  // created_at en ISO (cohérent avec last_read_at) pour un calcul des non-lus correct.
  getDb().prepare("insert into messages (id, conversation_id, author_id, body, created_at) values (?,?,?,?,?)").run(id, convId, authorId, body, now());
  markRead(convId, authorId);
  return id;
}

export function markRead(convId: string, userId: string): void {
  getDb()
    .prepare("insert into conversation_reads (conversation_id, profile_id, last_read_at) values (?,?,?) on conflict(conversation_id, profile_id) do update set last_read_at=excluded.last_read_at")
    .run(convId, userId, now());
}

/** Destinataires d'une notification de message (hors auteur). */
export function messageRecipients(convId: string, authorId: string): string[] {
  const c = getConvRow(convId);
  if (!c) return [];
  let ids: string[];
  if (c.kind === "group") {
    ids = memberIds(convId);
  } else {
    // Fil d'entité : les personnes ayant déjà écrit + le propriétaire de l'entité.
    const authors = (getDb().prepare("select distinct author_id from messages where conversation_id=?").all(convId) as { author_id: string | null }[]).map((r) => r.author_id).filter(Boolean) as string[];
    ids = [...authors];
    if (c.ref_type === "item") {
      const r = getDb().prepare("select owner_id from items where id=?").get(c.ref_id) as { owner_id: string } | undefined;
      if (r) ids.push(r.owner_id);
    } else if (c.ref_type === "project") {
      const r = getDb().prepare("select owner_id from projects where id=?").get(c.ref_id) as { owner_id: string } | undefined;
      if (r) ids.push(r.owner_id);
    }
  }
  return [...new Set(ids)].filter((id) => id !== authorId);
}

/** Notifie les destinataires d'un nouveau message (in-app). */
export function notifyMessage(convId: string, authorId: string, authorName: string): void {
  const db = getDb();
  const c = getConvRow(convId);
  if (!c) return;
  const title = c.kind === "group" ? c.title : entityTitle(c.ref_type!, c.ref_id!);
  const msg = `${authorName} a écrit dans « ${title} »`;
  const ins = db.prepare(
    "insert into notifications (id, user_id, kind, message, channel, conversation_id) values (?,?,?,?,?,?)"
  );
  messageRecipients(convId, authorId).forEach((uid) => ins.run(randomUUID(), uid, "message", msg, "in-app", convId));
}

/** Marque comme lues les notifications de message d'une conversation. */
export function markConvNotificationsRead(userId: string, convId: string): void {
  getDb().prepare("update notifications set read=1 where user_id=? and conversation_id=? and read=0").run(userId, convId);
}

export function listConversationsFor(userId: string): ConversationSummary[] {
  const db = getDb();
  const groupIds = (db.prepare("select conversation_id from conversation_members where profile_id=?").all(userId) as { conversation_id: string }[]).map((r) => r.conversation_id);
  const convs = db.prepare("select * from conversations").all() as ConvRow[];

  // Propriétaire de l'entité liée à un fil (pour la visibilité).
  const entityOwner = (refType: string | null, refId: string | null): string | null => {
    if (refType === "item") return (db.prepare("select owner_id from items where id=?").get(refId) as { owner_id: string } | undefined)?.owner_id ?? null;
    if (refType === "project") return (db.prepare("select owner_id from projects where id=?").get(refId) as { owner_id: string } | undefined)?.owner_id ?? null;
    if (refType === "negligence") return (db.prepare("select created_by from negligences where id=?").get(refId) as { created_by: string } | undefined)?.created_by ?? null;
    return null;
  };

  const summaries: ConversationSummary[] = [];
  for (const c of convs) {
    const isGroup = c.kind === "group";
    if (isGroup && !groupIds.includes(c.id)) continue;
    const last = db.prepare("select author_id, body, created_at from messages where conversation_id=? order by created_at desc limit 1").get(c.id) as { author_id: string | null; body: string; created_at: string } | undefined;
    if (!isGroup && !last) continue; // fil d'entité vide : on n'affiche pas
    if (!isGroup) {
      // Visibilité d'un fil d'entité : propriétaire de l'entité OU personne ayant déjà écrit.
      const isOwner = entityOwner(c.ref_type, c.ref_id) === userId;
      const hasPosted = Boolean(db.prepare("select 1 from messages where conversation_id=? and author_id=? limit 1").get(c.id, userId));
      if (!isOwner && !hasPosted) continue;
    }
    const read = db.prepare("select last_read_at from conversation_reads where conversation_id=? and profile_id=?").get(c.id, userId) as { last_read_at: string } | undefined;
    const unread = (db.prepare("select count(*) as n from messages where conversation_id=? and author_id != ? and created_at > ?").get(c.id, userId, read?.last_read_at ?? "0") as { n: number }).n;
    summaries.push({
      id: c.id,
      title: isGroup ? c.title : entityTitle(c.ref_type!, c.ref_id!),
      kind: c.kind,
      refType: c.ref_type,
      refId: c.ref_id,
      memberIds: isGroup ? memberIds(c.id) : [],
      lastAt: last ? new Date(last.created_at) : null,
      lastPreview: last ? last.body.slice(0, 80) : "",
      lastAuthor: last?.author_id ?? null,
      unread,
    });
  }
  return summaries.sort((a, b) => (b.lastAt?.getTime() ?? 0) - (a.lastAt?.getTime() ?? 0));
}

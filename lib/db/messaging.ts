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
  // Groupes et messages privés : réservés aux membres.
  if (c.kind === "group" || c.kind === "direct") return memberIds(convId).includes(userId);
  return true; // fils d'entité (suivi/négligence/projet) : ouverts à l'équipe
}

/** Récupère (ou crée) la conversation privée entre deux personnes. */
export function ensureDirectConversation(userA: string, userB: string): string {
  const db = getDb();
  // Cherche une conversation directe dont les membres sont exactement {A, B}.
  const existing = db
    .prepare(
      `select c.id from conversations c
       where c.kind='direct'
         and (select count(*) from conversation_members m where m.conversation_id=c.id)=2
         and exists (select 1 from conversation_members m where m.conversation_id=c.id and m.profile_id=?)
         and exists (select 1 from conversation_members m where m.conversation_id=c.id and m.profile_id=?)
       limit 1`
    )
    .get(userA, userB) as { id: string } | undefined;
  if (existing) return existing.id;
  const id = randomUUID();
  db.prepare("insert into conversations (id, title, kind, created_by) values (?,?,?,?)").run(id, "", "direct", userA);
  const ins = db.prepare("insert into conversation_members (id, conversation_id, profile_id) values (?,?,?)");
  [...new Set([userA, userB])].forEach((pid) => ins.run(randomUUID(), id, pid));
  return id;
}

/** Auteur d'un message (pour la vérification de suppression). */
export function messageAuthor(messageId: string): string | null {
  const r = getDb().prepare("select author_id from messages where id=?").get(messageId) as { author_id: string | null } | undefined;
  return r ? r.author_id : null;
}

/** Supprime un message et ses réactions. */
export function deleteMessage(messageId: string): void {
  const db = getDb();
  db.prepare("delete from message_reactions where message_id=?").run(messageId);
  db.prepare("delete from messages where id=?").run(messageId);
}

/** Créateur et type d'une conversation (pour la suppression d'un groupe). */
export function conversationMeta(convId: string): { createdBy: string | null; kind: ConvKind } | null {
  const c = getConvRow(convId);
  return c ? { createdBy: c.created_by, kind: c.kind } : null;
}

/** Supprime une conversation entière (messages, réactions, membres, lectures, notifs). */
export function deleteConversation(convId: string): void {
  const db = getDb();
  db.prepare("delete from message_reactions where message_id in (select id from messages where conversation_id=?)").run(convId);
  db.prepare("delete from messages where conversation_id=?").run(convId);
  db.prepare("delete from conversation_members where conversation_id=?").run(convId);
  db.prepare("delete from conversation_reads where conversation_id=?").run(convId);
  db.prepare("delete from notifications where conversation_id=?").run(convId);
  db.prepare("delete from conversations where id=?").run(convId);
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
  const db = getDb();
  const rows = db.prepare("select * from messages where conversation_id=? order by created_at").all(convId) as {
    id: string; conversation_id: string; author_id: string | null; body: string; reply_to: string | null; created_at: string;
  }[];
  const reacts = db
    .prepare("select r.emoji, r.profile_id, r.message_id from message_reactions r join messages m on m.id=r.message_id where m.conversation_id=?")
    .all(convId) as { emoji: string; profile_id: string; message_id: string }[];
  return rows.map((r) => ({
    id: r.id,
    conversationId: r.conversation_id,
    authorId: r.author_id ?? "",
    body: r.body,
    createdAt: new Date(r.created_at),
    replyTo: r.reply_to,
    reactions: reacts.filter((x) => x.message_id === r.id).map((x) => ({ emoji: x.emoji, profileId: x.profile_id })),
  }));
}

export function postMessage(convId: string, authorId: string, body: string, replyTo?: string | null): string {
  const id = randomUUID();
  // Ne garder le lien de réponse que s'il vise un message de cette conversation.
  let parent: string | null = null;
  if (replyTo) {
    const ok = getDb().prepare("select 1 from messages where id=? and conversation_id=?").get(replyTo, convId);
    if (ok) parent = replyTo;
  }
  // created_at en ISO (cohérent avec last_read_at) pour un calcul des non-lus correct.
  getDb()
    .prepare("insert into messages (id, conversation_id, author_id, body, reply_to, created_at) values (?,?,?,?,?,?)")
    .run(id, convId, authorId, body, parent, now());
  markRead(convId, authorId);
  return id;
}

/** Conversation d'un message (pour vérifier l'accès avant réaction). */
export function messageConversation(messageId: string): string | null {
  const r = getDb().prepare("select conversation_id from messages where id=?").get(messageId) as { conversation_id: string } | undefined;
  return r?.conversation_id ?? null;
}

/** Ajoute ou retire (bascule) la réaction d'un utilisateur sur un message. */
export function toggleReaction(messageId: string, profileId: string, emoji: string): void {
  const db = getDb();
  const existing = db
    .prepare("select id from message_reactions where message_id=? and profile_id=? and emoji=?")
    .get(messageId, profileId, emoji) as { id: string } | undefined;
  if (existing) {
    db.prepare("delete from message_reactions where id=?").run(existing.id);
  } else {
    db.prepare("insert into message_reactions (id, message_id, profile_id, emoji) values (?,?,?,?)").run(randomUUID(), messageId, profileId, emoji);
  }
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
  if (c.kind === "group" || c.kind === "direct") {
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
  const msg =
    c.kind === "direct"
      ? `${authorName} vous a envoyé un message privé`
      : `${authorName} a écrit dans « ${c.kind === "group" ? c.title : entityTitle(c.ref_type!, c.ref_id!)} »`;
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

  // Nom d'une personne (pour le titre d'une conversation privée).
  const nameOf = (pid: string) =>
    (db.prepare("select full_name from profiles where id=?").get(pid) as { full_name: string } | undefined)?.full_name ?? "Utilisateur";

  const summaries: ConversationSummary[] = [];
  for (const c of convs) {
    const memberBased = c.kind === "group" || c.kind === "direct";
    if (memberBased && !groupIds.includes(c.id)) continue;
    const last = db.prepare("select author_id, body, created_at from messages where conversation_id=? order by created_at desc limit 1").get(c.id) as { author_id: string | null; body: string; created_at: string } | undefined;
    if (!memberBased && !last) continue; // fil d'entité vide : on n'affiche pas
    if (!memberBased) {
      // Visibilité d'un fil d'entité : propriétaire de l'entité OU personne ayant déjà écrit.
      const isOwner = entityOwner(c.ref_type, c.ref_id) === userId;
      const hasPosted = Boolean(db.prepare("select 1 from messages where conversation_id=? and author_id=? limit 1").get(c.id, userId));
      if (!isOwner && !hasPosted) continue;
    }
    // Titre selon le type.
    let title: string;
    const mIds = memberBased ? memberIds(c.id) : [];
    if (c.kind === "group") title = c.title;
    else if (c.kind === "direct") title = nameOf(mIds.find((id) => id !== userId) ?? userId);
    else title = entityTitle(c.ref_type!, c.ref_id!);

    const read = db.prepare("select last_read_at from conversation_reads where conversation_id=? and profile_id=?").get(c.id, userId) as { last_read_at: string } | undefined;
    const unread = (db.prepare("select count(*) as n from messages where conversation_id=? and author_id != ? and created_at > ?").get(c.id, userId, read?.last_read_at ?? "0") as { n: number }).n;
    summaries.push({
      id: c.id,
      title,
      kind: c.kind,
      refType: c.ref_type,
      refId: c.ref_id,
      createdBy: c.created_by,
      memberIds: mIds,
      lastAt: last ? new Date(last.created_at) : null,
      lastPreview: last ? last.body.slice(0, 80) : "",
      lastAuthor: last?.author_id ?? null,
      unread,
    });
  }
  return summaries.sort((a, b) => (b.lastAt?.getTime() ?? 0) - (a.lastAt?.getTime() ?? 0));
}

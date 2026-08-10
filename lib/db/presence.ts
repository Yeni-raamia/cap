/* ==================================================================
 *  lib/db/presence.ts — Présence & saisie (façon messagerie temps réel,
 *  mais par SONDAGE : pas de WebSocket sur le serveur local).
 *  - presence : dernier battement de cœur de chaque membre (en ligne).
 *  - typing_status : qui est en train d'écrire dans quelle conversation.
 *  Les accusés de lecture réutilisent conversation_reads (messaging.ts).
 * ================================================================== */
import { getDb } from "./index";

const nowIso = () => new Date().toISOString();
const cutoff = (sec: number) => new Date(Date.now() - sec * 1000).toISOString();

/** Battement de cœur : marque l'utilisateur comme actif « maintenant ». */
export function touchPresence(userId: string): void {
  getDb()
    .prepare("insert into presence (profile_id, last_seen_at) values (?,?) on conflict(profile_id) do update set last_seen_at=excluded.last_seen_at")
    .run(userId, nowIso());
}

/** Ids des membres vus récemment (par défaut < 45 s) = « en ligne ». */
export function onlineUserIds(sinceSec = 45): string[] {
  return (getDb()
    .prepare("select profile_id from presence where last_seen_at >= ?")
    .all(cutoff(sinceSec)) as { profile_id: string }[]).map((r) => r.profile_id);
}

/** Déclare (ou retire) l'état « en train d'écrire » de l'utilisateur dans un fil. */
export function setTyping(convId: string, userId: string, typing: boolean): void {
  const db = getDb();
  if (typing) {
    db.prepare("insert into typing_status (conversation_id, profile_id, updated_at) values (?,?,?) on conflict(conversation_id, profile_id) do update set updated_at=excluded.updated_at")
      .run(convId, userId, nowIso());
  } else {
    db.prepare("delete from typing_status where conversation_id=? and profile_id=?").run(convId, userId);
  }
}

/** Ids des membres en train d'écrire dans un fil (récents < 6 s), hors soi. */
export function typingUserIds(convId: string, excludeUserId: string, withinSec = 6): string[] {
  return (getDb()
    .prepare("select profile_id from typing_status where conversation_id=? and profile_id<>? and updated_at >= ?")
    .all(convId, excludeUserId, cutoff(withinSec)) as { profile_id: string }[]).map((r) => r.profile_id);
}

/** Dernière lecture de chaque membre d'un fil (pour les accusés de lecture). */
export function conversationReadMap(convId: string): Record<string, string> {
  const rows = getDb()
    .prepare("select profile_id, last_read_at from conversation_reads where conversation_id=?")
    .all(convId) as { profile_id: string; last_read_at: string }[];
  const map: Record<string, string> = {};
  rows.forEach((r) => (map[r.profile_id] = r.last_read_at));
  return map;
}

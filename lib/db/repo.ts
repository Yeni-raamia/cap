/* ==================================================================
 *  lib/db/repo.ts — Accès aux données (serveur uniquement).
 *  Mappe les lignes SQLite vers les objets du domaine (lib/domain).
 * ================================================================== */
import { randomUUID } from "node:crypto";
import { getDb } from "./index";
import { createProjectForItem } from "./projects";
import { buildRef, PROJECT_METIER } from "@/lib/domain";
import { describeUserAgent } from "@/lib/auth/user-agent";
import type {
  BlocageAction,
  Catalogue,
  EventKind,
  Item,
  MetierDef,
  Notif,
  NotifKind,
  ParsedSubject,
  Person,
  Priorite,
  Profile,
  Role,
  SessionInfo,
  Statut,
  TimelineEvent,
  Tone,
  TypeDef,
} from "@/lib/domain";

type Action = "relance" | "reponse" | "bloque" | "cloture";

/* ---------- Profils ---------- */
interface ProfileRow {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  initials: string;
  avatar: string | null;
  poste: string | null;
  role: Role;
  active: number;
  extra_pages: string;
  denied_pages: string;
  readonly: number;
  approved: number;
  must_change_password: number;
  password_changed_at: string | null;
  totp_secret: string | null;
  totp_enabled: number;
  totp_backup: string | null;
}

export const parsePages = (csv: string | null | undefined): string[] =>
  (csv ?? "").split(",").map((s) => s.trim()).filter(Boolean);

/** Initiales dérivées d'un nom complet (deux premières lettres des mots). */
export function initialsFrom(fullName: string, fallback = "?"): string {
  return (
    fullName
      .replace(/[^A-Za-zÀ-ÿ ]/g, "")
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || fallback.slice(0, 2).toUpperCase()
  );
}

function mapProfile(r: ProfileRow): Profile {
  return {
    id: r.id,
    nom: r.full_name,
    poste: r.poste ?? "",
    role: r.role,
    init: r.initials,
    avatar: r.avatar ?? "",
    extraPages: parsePages(r.extra_pages),
    deniedPages: parsePages(r.denied_pages),
    readonly: r.readonly === 1,
    approved: r.approved === 1,
    mustChangePassword: r.must_change_password === 1,
    totpEnabled: r.totp_enabled === 1,
  };
}

export function countProfiles(): number {
  const row = getDb().prepare("select count(*) as n from profiles").get() as { n: number };
  return row.n;
}

/* ---------- Pièces jointes / preuves ---------- */
interface AttachmentRow {
  id: string;
  item_id: string;
  filename: string;
  mime: string;
  size: number;
  uploaded_by: string | null;
  created_at: string;
}

function mapAttachment(r: AttachmentRow): import("@/lib/domain").Attachment {
  return {
    id: r.id,
    itemId: r.item_id,
    filename: r.filename,
    mime: r.mime,
    size: r.size,
    uploadedBy: r.uploaded_by ?? "",
    createdAt: new Date(r.created_at),
  };
}

export function listAttachments(itemId: string): import("@/lib/domain").Attachment[] {
  const rows = getDb()
    .prepare("select id, item_id, filename, mime, size, uploaded_by, created_at from attachments where item_id = ? order by created_at")
    .all(itemId) as AttachmentRow[];
  return rows.map(mapAttachment);
}

export function createAttachment(input: {
  itemId: string;
  filename: string;
  mime: string;
  size: number;
  data: Buffer;
  uploadedBy: string;
}): import("@/lib/domain").Attachment {
  const id = randomUUID();
  getDb()
    .prepare("insert into attachments (id, item_id, filename, mime, size, data, uploaded_by) values (?,?,?,?,?,?,?)")
    .run(id, input.itemId, input.filename, input.mime, input.size, input.data, input.uploadedBy);
  return mapAttachment(
    getDb().prepare("select id, item_id, filename, mime, size, uploaded_by, created_at from attachments where id = ?").get(id) as AttachmentRow
  );
}

/** Contenu binaire d'une pièce jointe (téléchargement). */
export function getAttachmentData(id: string): { filename: string; mime: string; data: Buffer } | null {
  const r = getDb().prepare("select filename, mime, data from attachments where id = ?").get(id) as
    | { filename: string; mime: string; data: Buffer }
    | undefined;
  return r ?? null;
}

/** Métadonnées seules (contrôle d'accès avant suppression). */
export function getAttachmentMeta(id: string): import("@/lib/domain").Attachment | null {
  const r = getDb()
    .prepare("select id, item_id, filename, mime, size, uploaded_by, created_at from attachments where id = ?")
    .get(id) as AttachmentRow | undefined;
  return r ? mapAttachment(r) : null;
}

export function deleteAttachment(id: string): void {
  getDb().prepare("delete from attachments where id = ?").run(id);
}

/* ---------- Modèles de relance ---------- */
export function listTemplates(): import("@/lib/domain").EmailTemplate[] {
  const rows = getDb()
    .prepare("select id, name, category, subject, body from email_templates order by ordre, name")
    .all() as { id: string; name: string; category: string; subject: string; body: string }[];
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    category: r.category as import("@/lib/domain").TemplateCategory,
    subject: r.subject,
    body: r.body,
  }));
}

export function listProfiles(): Profile[] {
  const rows = getDb().prepare("select * from profiles order by full_name").all() as ProfileRow[];
  return rows.map(mapProfile);
}

export function getProfileById(id: string): Profile | null {
  const r = getDb().prepare("select * from profiles where id = ?").get(id) as ProfileRow | undefined;
  return r ? mapProfile(r) : null;
}

export function getProfileRowByEmail(email: string): ProfileRow | null {
  return (getDb()
    .prepare("select * from profiles where email = ?")
    .get(email.toLowerCase()) as ProfileRow | undefined) ?? null;
}

export function createProfile(input: {
  email: string;
  passwordHash: string;
  fullName: string;
  role: Role;
  approved?: boolean;
}): Profile {
  const id = randomUUID();
  const initials = initialsFrom(input.fullName, input.email);
  getDb()
    .prepare(
      "insert into profiles (id, email, password_hash, full_name, initials, role, approved, password_changed_at) values (?,?,?,?,?,?,?,datetime('now'))"
    )
    .run(id, input.email.toLowerCase(), input.passwordHash, input.fullName, initials, input.role, input.approved ? 1 : 0);
  return getProfileById(id)!;
}

/** Empreinte de mot de passe d'un compte (pour vérifier l'ancien mot de passe). */
export function getPasswordHashById(userId: string): string | null {
  const r = getDb().prepare("select password_hash from profiles where id = ?").get(userId) as { password_hash: string } | undefined;
  return r?.password_hash ?? null;
}

/** Change le mot de passe : pose la date de changement et lève l'obligation de rotation. */
export function setUserPassword(userId: string, passwordHash: string): void {
  getDb()
    .prepare("update profiles set password_hash = ?, password_changed_at = datetime('now'), must_change_password = 0 where id = ?")
    .run(passwordHash, userId);
}

/** Force (ou lève) l'obligation de renouvellement du mot de passe. */
export function setMustChangePassword(userId: string, must: boolean): void {
  getDb().prepare("update profiles set must_change_password = ? where id = ?").run(must ? 1 : 0, userId);
}

/* ---------- Double authentification (TOTP) ---------- */

/** Secret / activation / codes de secours d'un compte (lecture interne 2FA). */
export function getTotp(userId: string): { secret: string | null; enabled: boolean; backup: string | null } | null {
  const r = getDb()
    .prepare("select totp_secret, totp_enabled, totp_backup from profiles where id = ?")
    .get(userId) as { totp_secret: string | null; totp_enabled: number; totp_backup: string | null } | undefined;
  if (!r) return null;
  return { secret: r.totp_secret, enabled: r.totp_enabled === 1, backup: r.totp_backup };
}

/** Enregistre un secret TOTP en attente (2FA pas encore activée). */
export function setTotpSecret(userId: string, secret: string): void {
  getDb().prepare("update profiles set totp_secret = ?, totp_enabled = 0 where id = ?").run(secret, userId);
}

/** Active la 2FA (le secret en attente devient effectif) et stocke les codes de secours. */
export function enableTotp(userId: string, backupHash: string): void {
  getDb().prepare("update profiles set totp_enabled = 1, totp_backup = ? where id = ?").run(backupHash, userId);
}

/** Désactive la 2FA et efface secret + codes de secours. */
export function disableTotp(userId: string): void {
  getDb()
    .prepare("update profiles set totp_enabled = 0, totp_secret = null, totp_backup = null where id = ?")
    .run(userId);
}

/** Met à jour le lot de codes de secours (après consommation d'un code). */
export function setTotpBackup(userId: string, backupHash: string): void {
  getDb().prepare("update profiles set totp_backup = ? where id = ?").run(backupHash, userId);
}

export function updateRole(userId: string, role: Role): void {
  getDb().prepare("update profiles set role = ? where id = ?").run(role, userId);
}

/** Approuve un compte en attente (accès autorisé). */
export function approveProfile(userId: string): void {
  getDb().prepare("update profiles set approved = 1 where id = ?").run(userId);
}

/** Supprime définitivement un compte (refus d'inscription) et ses sessions. */
export function deleteProfileAccount(userId: string): void {
  const db = getDb();
  db.prepare("delete from sessions where user_id = ?").run(userId);
  db.prepare("delete from profiles where id = ?").run(userId);
}

/**
 * Mise à jour du profil par l'utilisateur lui-même (nom, poste, avatar).
 * Les initiales sont recalculées quand le nom change. Un avatar vide (`""`)
 * retire la photo ; `undefined` laisse le champ inchangé.
 */
export function updateOwnProfile(
  userId: string,
  fields: { fullName?: string; poste?: string; avatar?: string }
): void {
  const db = getDb();
  if (fields.fullName !== undefined) {
    const nom = fields.fullName.trim();
    if (nom) {
      db.prepare("update profiles set full_name = ?, initials = ? where id = ?").run(
        nom,
        initialsFrom(nom),
        userId
      );
    }
  }
  if (fields.poste !== undefined) {
    db.prepare("update profiles set poste = ? where id = ?").run(fields.poste.trim(), userId);
  }
  if (fields.avatar !== undefined) {
    // Chaîne vide → retrait de la photo (NULL).
    db.prepare("update profiles set avatar = ? where id = ?").run(fields.avatar || null, userId);
  }
}

/** Administrateurs actifs (pour notifier les demandes d'inscription). */
export function listAdmins(): Profile[] {
  const rows = getDb().prepare("select * from profiles where role='admin' and active=1 and approved=1").all() as ProfileRow[];
  return rows.map(mapProfile);
}

/* ---------- Sessions ---------- */
const SESSION_DAYS = 30;

export function createSession(
  userId: string,
  days: number = SESSION_DAYS,
  meta: { userAgent?: string | null; ip?: string | null } = {}
): string {
  // Jeton fort (≈ 288 bits) — rotation à chaque connexion.
  const token = randomUUID() + randomUUID().replace(/-/g, "");
  const expires = new Date(Date.now() + days * 864e5).toISOString();
  getDb()
    .prepare(
      "insert into sessions (token, id, user_id, expires_at, created_at, last_seen_at, user_agent, ip) " +
        "values (?,?,?,?,datetime('now'),datetime('now'),?,?)"
    )
    .run(token, randomUUID(), userId, expires, meta.userAgent ?? null, meta.ip ?? null);
  // Purge opportuniste des sessions expirées.
  getDb().prepare("delete from sessions where expires_at < ?").run(new Date().toISOString());
  return token;
}

export function getSessionUser(token: string): Profile | null {
  const row = getDb()
    .prepare("select user_id, expires_at, last_seen_at from sessions where token = ?")
    .get(token) as { user_id: string; expires_at: string; last_seen_at: string | null } | undefined;
  if (!row) return null;
  const now = Date.now();
  if (new Date(row.expires_at).getTime() < now) {
    deleteSession(token);
    return null;
  }
  // Un membre désactivé n'a plus de session valide.
  const act = getDb().prepare("select active from profiles where id = ?").get(row.user_id) as
    | { active: number }
    | undefined;
  if (!act || act.active !== 1) return null;
  // Expiration glissante : on prolonge si la dernière prolongation date de > 1 jour
  // (écriture limitée à ~1×/jour/session). Un compte inactif finit par expirer.
  const remaining = new Date(row.expires_at).getTime() - now;
  if (remaining < (SESSION_DAYS - 1) * 864e5) {
    const expires = new Date(now + SESSION_DAYS * 864e5).toISOString();
    getDb().prepare("update sessions set expires_at = ? where token = ?").run(expires, token);
  }
  // Dernière activité : mise à jour throttlée (~toutes les 2 min) pour limiter les écritures.
  const lastSeen = row.last_seen_at ? new Date(row.last_seen_at).getTime() : 0;
  if (now - lastSeen > 120_000) {
    getDb().prepare("update sessions set last_seen_at = datetime('now') where token = ?").run(token);
  }
  return getProfileById(row.user_id);
}

export function deleteSession(token: string): void {
  getDb().prepare("delete from sessions where token = ?").run(token);
}

interface SessionRow {
  id: string | null;
  user_id: string;
  created_at: string;
  last_seen_at: string | null;
  user_agent: string | null;
  ip: string | null;
}

/** Sessions actives (non expirées) d'un compte, la plus récemment vue en tête.
 *  `currentToken` permet de marquer la session courante. */
export function listSessionsForUser(userId: string, currentToken?: string): SessionInfo[] {
  const rows = getDb()
    .prepare(
      "select id, token, user_id, created_at, last_seen_at, user_agent, ip from sessions " +
        "where user_id = ? and expires_at >= ? order by last_seen_at desc"
    )
    .all(userId, new Date().toISOString()) as (SessionRow & { token: string })[];
  return rows.map((r) => ({
    id: r.id ?? r.token,
    current: !!currentToken && r.token === currentToken,
    device: describeUserAgent(r.user_agent),
    ip: r.ip,
    createdAt: new Date(r.created_at),
    lastSeenAt: new Date(r.last_seen_at ?? r.created_at),
  }));
}

/** Révoque une session d'un compte par son handle public (scopé à l'utilisateur). */
export function revokeSession(userId: string, sessionId: string): boolean {
  const res = getDb().prepare("delete from sessions where user_id = ? and id = ?").run(userId, sessionId);
  return res.changes > 0;
}

/** Révoque toutes les sessions du compte SAUF la session courante. */
export function revokeOtherSessions(userId: string, currentToken: string): number {
  const res = getDb()
    .prepare("delete from sessions where user_id = ? and token <> ?")
    .run(userId, currentToken);
  return res.changes;
}

/* ---------- Objets de suivi ---------- */
interface ItemRow {
  id: string;
  ref: string;
  metier_code: string;
  type_code: string;
  objet: string;
  priorite: Priorite;
  statut: Statut;
  owner_id: string;
  points_cles: string;
  blocage_cause: string | null;
  relances_count: number;
  date_creation: string;
  date_maj: string;
  date_relance_prevue: string | null;
  project_id: string | null;
  appreciation: string | null;
  due_duration_days: number | null;
  marked_late: number;
}
interface BlocageActionRow {
  id: string;
  item_id: string;
  kind: string;
  concerne: string;
  note: string;
  author_id: string | null;
  created_at: string;
}
interface EventRow {
  item_id: string;
  kind: EventKind;
  label: string;
  author_id: string | null;
  created_at: string;
}
interface PersonRow {
  item_id: string;
  name: string;
  kind: "destinataire" | "copie" | "impliqué";
  service: string | null;
}

export function listItems(): Item[] {
  const db = getDb();
  const items = db.prepare("select * from items order by date_maj desc").all() as ItemRow[];
  const events = db.prepare("select * from events").all() as EventRow[];
  const people = db.prepare("select * from item_people").all() as PersonRow[];
  const actions = db.prepare("select * from blocage_actions").all() as BlocageActionRow[];
  const atts = db.prepare("select item_id, count(*) as n from attachments group by item_id").all() as {
    item_id: string;
    n: number;
  }[];

  const evByItem = new Map<string, EventRow[]>();
  events.forEach((e) => evByItem.set(e.item_id, [...(evByItem.get(e.item_id) ?? []), e]));
  const pByItem = new Map<string, PersonRow[]>();
  people.forEach((p) => pByItem.set(p.item_id, [...(pByItem.get(p.item_id) ?? []), p]));
  const aByItem = new Map<string, BlocageActionRow[]>();
  actions.forEach((a) => aByItem.set(a.item_id, [...(aByItem.get(a.item_id) ?? []), a]));
  const attByItem = new Map<string, number>();
  atts.forEach((a) => attByItem.set(a.item_id, a.n));

  return items.map((r) =>
    mapItem(r, evByItem.get(r.id) ?? [], pByItem.get(r.id) ?? [], aByItem.get(r.id) ?? [], attByItem.get(r.id) ?? 0)
  );
}

export function getItem(id: string): Item | null {
  const db = getDb();
  const r = db.prepare("select * from items where id = ?").get(id) as ItemRow | undefined;
  if (!r) return null;
  const events = db.prepare("select * from events where item_id = ?").all(id) as EventRow[];
  const people = db.prepare("select * from item_people where item_id = ?").all(id) as PersonRow[];
  const actions = db.prepare("select * from blocage_actions where item_id = ?").all(id) as BlocageActionRow[];
  const att = db.prepare("select count(*) as n from attachments where item_id = ?").get(id) as { n: number };
  return mapItem(r, events, people, actions, att.n);
}

function mapItem(
  r: ItemRow,
  events: EventRow[],
  people: PersonRow[],
  actions: BlocageActionRow[],
  attachmentsCount = 0
): Item {
  const timeline: TimelineEvent[] = events
    .map((e) => ({
      date: new Date(e.created_at),
      kind: e.kind,
      label: e.label,
      author: e.author_id ?? "",
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  const blocageActions: BlocageAction[] = actions
    .map((a) => ({
      id: a.id,
      itemId: a.item_id,
      kind: a.kind,
      concerne: a.concerne,
      note: a.note,
      authorId: a.author_id ?? "",
      createdAt: new Date(a.created_at),
    }))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return {
    id: r.id,
    ref: r.ref,
    metier: r.metier_code,
    type: r.type_code,
    objet: r.objet,
    ownerId: r.owner_id,
    statut: r.statut,
    priorite: r.priorite,
    personnes: people.map((p) => ({ name: p.name, kind: p.kind, service: p.service ?? null })),
    pointsCles: JSON.parse(r.points_cles || "[]"),
    blocageCause: r.blocage_cause,
    relancesCount: r.relances_count,
    dateCreation: new Date(r.date_creation),
    dateMaj: new Date(r.date_maj),
    dateRelancePrevue: r.date_relance_prevue ? new Date(r.date_relance_prevue) : null,
    projectId: r.project_id ?? null,
    appreciation: r.appreciation ?? null,
    blocageActions,
    timeline,
    attachmentsCount,
    dueDurationDays: r.due_duration_days ?? null,
    markedLate: r.marked_late === 1,
  };
}

/* ---------- Déblocage : démarches & appréciation ---------- */
export function addBlocageAction(input: {
  itemId: string;
  kind: string;
  concerne: string;
  note: string;
  authorId: string;
}): void {
  getDb()
    .prepare(
      "insert into blocage_actions (id, item_id, kind, concerne, note, author_id) values (?,?,?,?,?,?)"
    )
    .run(randomUUID(), input.itemId, input.kind, input.concerne, input.note, input.authorId);
}

export function setAppreciation(itemId: string, appreciation: string | null): void {
  getDb().prepare("update items set appreciation = ? where id = ?").run(appreciation, itemId);
}

/** Planifie (ou efface avec null) la date de relance d'un objet. */
export function setRelanceDate(itemId: string, dateISO: string | null): void {
  getDb().prepare("update items set date_relance_prevue = ? where id = ?").run(dateISO, itemId);
}

/**
 * Prochaine référence pour un métier, attribuée CÔTÉ SERVEUR (anti-collision).
 * SQLite sérialise les écritures : lire max(numéro)+1 ici est fiable même en
 * création simultanée, contrairement au calcul côté client sur un instantané.
 * Une garde d'unicité couvre d'éventuels doublons hérités.
 */
function nextItemRef(db: ReturnType<typeof getDb>, metier: string): string {
  const rows = db.prepare("select ref from items where metier_code = ?").all(metier) as { ref: string }[];
  let max = 0;
  for (const { ref } of rows) {
    const m = ref.match(/(\d+)\s*$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  const exists = db.prepare("select 1 from items where ref = ?");
  let num = max + 1;
  let ref = buildRef(metier, num);
  while (exists.get(ref)) ref = buildRef(metier, ++num);
  return ref;
}

export function createItem(input: {
  parsed: ParsedSubject;
  prio: Priorite;
  dest: string;
  destService?: string | null;
  pointsRaw: string;
  ownerId: string;
  dueDurationDays?: number | null;
}): Item {
  const db = getDb();
  const now = new Date().toISOString();
  const id = randomUUID();
  const points = input.pointsRaw
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);

  const tx = db.transaction(() => {
    // CASE : le numéro (TheHive) est fourni par l'utilisateur ; sinon, numéro
    // auto attribué côté serveur pour éviter toute collision de référence.
    const ref = input.parsed.metier === "CASE" ? input.parsed.ref : nextItemRef(db, input.parsed.metier);
    db.prepare(
      "insert into items (id, ref, metier_code, type_code, objet, priorite, statut, owner_id, points_cles, date_creation, date_maj, due_duration_days) " +
        "values (?,?,?,?,?,?,?,?,?,?,?,?)"
    ).run(
      id,
      ref,
      input.parsed.metier,
      input.parsed.type,
      input.parsed.objet,
      input.prio,
      "Envoyé",
      input.ownerId,
      JSON.stringify(points.length ? points : ["—"]),
      now,
      now,
      input.dueDurationDays ?? null
    );
    if (input.dest.trim()) {
      db.prepare("insert into item_people (id, item_id, name, kind, service) values (?,?,?,?,?)").run(
        randomUUID(),
        id,
        input.dest.trim(),
        "destinataire",
        input.destService?.trim() || null
      );
    }
    const insEv = db.prepare(
      "insert into events (id, item_id, kind, label, author_id, created_at) values (?,?,?,?,?,?)"
    );
    insEv.run(randomUUID(), id, "creation", "Objet créé", input.ownerId, now);
    insEv.run(randomUUID(), id, "envoi", "Envoyé", input.ownerId, now);
  });
  tx();
  // Suivi de métier PRJ : créer automatiquement le projet lié.
  if (input.parsed.metier === PROJECT_METIER) {
    createProjectForItem(id, input.parsed.objet, input.ownerId);
  }
  return getItem(id)!;
}

export function applyAction(itemId: string, action: Action, cause: string | undefined, meId: string): void {
  const db = getDb();
  const current = db.prepare("select * from items where id = ?").get(itemId) as ItemRow | undefined;
  if (!current) return;
  const now = new Date().toISOString();

  const tx = db.transaction(() => {
    const insEv = db.prepare(
      "insert into events (id, item_id, kind, label, author_id, created_at) values (?,?,?,?,?,?)"
    );
    if (action === "relance") {
      const count = current.relances_count + 1;
      db.prepare("update items set statut='Relancé', relances_count=?, date_maj=? where id=?").run(count, now, itemId);
      insEv.run(randomUUID(), itemId, "relance", `Relance ${count}`, meId, now);
    } else if (action === "reponse") {
      db.prepare("update items set statut='En traitement', date_maj=? where id=?").run(now, itemId);
      insEv.run(randomUUID(), itemId, "reponse", "Réponse reçue", meId, now);
    } else if (action === "bloque") {
      db.prepare("update items set statut='Bloqué', blocage_cause=?, date_maj=? where id=?").run(cause ?? null, now, itemId);
      insEv.run(randomUUID(), itemId, "statut", `→ Bloqué : ${cause}`, meId, now);
    } else if (action === "cloture") {
      db.prepare("update items set statut='Clôturé', closed_at=?, date_maj=? where id=?").run(now, now, itemId);
      insEv.run(randomUUID(), itemId, "cloture", "Clôturé", meId, now);
    }
  });
  tx();
}

/**
 * Édition des métadonnées d'un suivi après création : objet, priorité, points
 * clés et personnes. NB : on ne touche PAS à `date_maj` — corriger un libellé
 * ne doit pas réinitialiser l'horloge SLA (relance/escalade). La modification
 * est tracée dans la timeline (« Aucun mail sans trace »).
 */
export function updateItem(
  itemId: string,
  meId: string,
  fields: { objet?: string; priorite?: Priorite; pointsCles?: string[]; personnes?: Person[]; dueDurationDays?: number | null }
): void {
  const db = getDb();
  const current = db.prepare("select objet, priorite from items where id = ?").get(itemId) as
    | { objet: string; priorite: Priorite }
    | undefined;
  if (!current) return;

  const changes: string[] = [];
  const tx = db.transaction(() => {
    if (fields.dueDurationDays !== undefined) {
      const d = fields.dueDurationDays && fields.dueDurationDays > 0 ? Math.floor(fields.dueDurationDays) : null;
      db.prepare("update items set due_duration_days = ? where id = ?").run(d, itemId);
      changes.push("durée de traitement");
    }
    if (fields.objet !== undefined) {
      const objet = fields.objet.trim();
      if (objet && objet !== current.objet) {
        db.prepare("update items set objet = ? where id = ?").run(objet, itemId);
        changes.push("objet");
      }
    }
    if (fields.priorite !== undefined && fields.priorite !== current.priorite) {
      db.prepare("update items set priorite = ? where id = ?").run(fields.priorite, itemId);
      changes.push("priorité");
    }
    if (fields.pointsCles !== undefined) {
      const pts = fields.pointsCles.map((x) => x.trim()).filter(Boolean);
      db.prepare("update items set points_cles = ? where id = ?").run(
        JSON.stringify(pts.length ? pts : ["—"]),
        itemId
      );
      changes.push("points clés");
    }
    if (fields.personnes !== undefined) {
      db.prepare("delete from item_people where item_id = ?").run(itemId);
      const ins = db.prepare("insert into item_people (id, item_id, name, kind, service) values (?,?,?,?,?)");
      for (const p of fields.personnes) {
        if (!p.name?.trim()) continue;
        ins.run(randomUUID(), itemId, p.name.trim(), p.kind, p.service?.trim() || null);
      }
      changes.push("personnes");
    }
    if (changes.length) {
      db.prepare(
        "insert into events (id, item_id, kind, label, author_id, created_at) values (?,?,?,?,?,?)"
      ).run(randomUUID(), itemId, "note", `Modification : ${changes.join(", ")}`, meId, new Date().toISOString());
    }
  });
  tx();
}

/** Marque (ou lève) l'état « En retard » d'un suivi, et trace l'action. */
export function setItemMarkedLate(itemId: string, meId: string, late: boolean): void {
  const db = getDb();
  db.prepare("update items set marked_late = ? where id = ?").run(late ? 1 : 0, itemId);
  db.prepare("insert into events (id, item_id, kind, label, author_id, created_at) values (?,?,?,?,?,?)").run(
    randomUUID(),
    itemId,
    "statut",
    late ? "Marqué « En retard »" : "Retard levé",
    meId,
    new Date().toISOString()
  );
}

/** Droit d'édition d'un objet : propriétaire, ou directeur/admin. */
export function canEditItem(itemId: string, user: Profile): boolean {
  if (user.role === "directeur" || user.role === "admin") return true;
  const r = getDb().prepare("select owner_id from items where id = ?").get(itemId) as
    | { owner_id: string }
    | undefined;
  return r ? r.owner_id === user.id : false;
}

/* ---------- Destinataires des escalades / digest ---------- */
/** Les directeurs ; à défaut (aucun), les admins — pour ne perdre aucune escalade. */
export function listEscalationTargets(): Profile[] {
  const dirs = getDb()
    .prepare("select * from profiles where role = 'directeur' and active = 1")
    .all() as ProfileRow[];
  if (dirs.length) return dirs.map(mapProfile);
  const admins = getDb()
    .prepare("select * from profiles where role = 'admin' and active = 1")
    .all() as ProfileRow[];
  return admins.map(mapProfile);
}

export function getEmailById(id: string): string | null {
  const r = getDb().prepare("select email from profiles where id = ?").get(id) as
    | { email: string }
    | undefined;
  return r?.email ?? null;
}

/* ---------- Notifications ---------- */
interface NotifRow {
  id: string;
  user_id: string;
  item_id: string | null;
  kind: NotifKind;
  message: string;
  channel: string;
  read: number;
  created_at: string;
}

function mapNotif(r: NotifRow): Notif {
  return {
    id: r.id,
    userId: r.user_id,
    itemId: r.item_id,
    kind: r.kind,
    message: r.message,
    channel: r.channel.split(",").filter(Boolean),
    read: r.read === 1,
    createdAt: new Date(r.created_at),
  };
}

/** Idempotence : une notif identique non lue existe-t-elle déjà aujourd'hui ? */
export function notifExistsToday(userId: string, itemId: string | null, kind: NotifKind): boolean {
  const r = getDb()
    .prepare(
      "select 1 from notifications where user_id = ? and coalesce(item_id,'') = ? and kind = ? " +
        "and read = 0 and date(created_at) = date('now') limit 1"
    )
    .get(userId, itemId ?? "", kind);
  return Boolean(r);
}

export function insertNotification(input: {
  userId: string;
  itemId: string | null;
  kind: NotifKind;
  message: string;
  channel: string[];
}): void {
  getDb()
    .prepare(
      "insert into notifications (id, user_id, item_id, kind, message, channel) values (?,?,?,?,?,?)"
    )
    .run(
      randomUUID(),
      input.userId,
      input.itemId,
      input.kind,
      input.message,
      input.channel.join(",")
    );
}

export function listNotificationsFor(userId: string, limit = 50): Notif[] {
  const rows = getDb()
    .prepare("select * from notifications where user_id = ? order by created_at desc limit ?")
    .all(userId, limit) as NotifRow[];
  return rows.map(mapNotif);
}

export function countUnreadFor(userId: string): number {
  const r = getDb()
    .prepare("select count(*) as n from notifications where user_id = ? and read = 0")
    .get(userId) as { n: number };
  return r.n;
}

export function markAllReadFor(userId: string): void {
  getDb().prepare("update notifications set read = 1 where user_id = ? and read = 0").run(userId);
}

/** Marque une notification précise comme lue (= archivée) pour ce compte. */
export function markNotificationRead(userId: string, id: string): void {
  getDb().prepare("update notifications set read = 1 where user_id = ? and id = ?").run(userId, id);
}

/* ---------- Catalogue (métiers / types) — éditable en administration ---------- */
interface MetierRow {
  code: string;
  label: string;
  tone: string;
  ordre: number;
}
interface TypeRow {
  code: string;
  label: string;
  sla_relance: number | null;
  sla_escalade: number | null;
  urgent: number;
  ordre: number;
}

export function getCatalogue(): Catalogue {
  const db = getDb();
  const metiers: Record<string, MetierDef> = {};
  (db.prepare("select * from ref_metiers order by ordre").all() as MetierRow[]).forEach((m) => {
    metiers[m.code] = { label: m.label, tone: m.tone as Tone };
  });
  const types: Record<string, TypeDef> = {};
  (db.prepare("select * from ref_types order by ordre").all() as TypeRow[]).forEach((t) => {
    types[t.code] = {
      sla:
        t.sla_relance != null && t.sla_escalade != null
          ? { relance: t.sla_relance, escalade: t.sla_escalade }
          : null,
      urgent: t.urgent === 1,
    };
  });
  return { metiers, types };
}

function nextOrdre(table: "ref_metiers" | "ref_types"): number {
  const r = getDb().prepare(`select coalesce(max(ordre),0)+1 as n from ${table}`).get() as {
    n: number;
  };
  return r.n;
}

export function addMetier(code: string, label: string, tone: Tone): void {
  getDb()
    .prepare(
      "insert into ref_metiers (code, label, tone, ordre) values (?,?,?,?) " +
        "on conflict(code) do update set label=excluded.label, tone=excluded.tone"
    )
    .run(code, label, tone, nextOrdre("ref_metiers"));
}

export function addType(
  code: string,
  label: string,
  slaRelance: number | null,
  slaEscalade: number | null,
  urgent: boolean
): void {
  getDb()
    .prepare(
      "insert into ref_types (code, label, sla_relance, sla_escalade, urgent, ordre) values (?,?,?,?,?,?) " +
        "on conflict(code) do update set label=excluded.label, sla_relance=excluded.sla_relance, " +
        "sla_escalade=excluded.sla_escalade, urgent=excluded.urgent"
    )
    .run(code, label, slaRelance, slaEscalade, urgent ? 1 : 0, nextOrdre("ref_types"));
}

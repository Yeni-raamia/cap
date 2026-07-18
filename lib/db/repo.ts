/* ==================================================================
 *  lib/db/repo.ts — Accès aux données (serveur uniquement).
 *  Mappe les lignes SQLite vers les objets du domaine (lib/domain).
 * ================================================================== */
import { randomUUID } from "node:crypto";
import { getDb } from "./index";
import type {
  EventKind,
  Item,
  ParsedSubject,
  Priorite,
  Profile,
  Role,
  Statut,
  TimelineEvent,
} from "@/lib/domain";

type Action = "relance" | "reponse" | "bloque" | "cloture";

/* ---------- Profils ---------- */
interface ProfileRow {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  initials: string;
  poste: string | null;
  role: Role;
}

function mapProfile(r: ProfileRow): Profile {
  return { id: r.id, nom: r.full_name, poste: r.poste ?? "", role: r.role, init: r.initials };
}

export function countProfiles(): number {
  const row = getDb().prepare("select count(*) as n from profiles").get() as { n: number };
  return row.n;
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
}): Profile {
  const id = randomUUID();
  const initials =
    input.fullName
      .replace(/[^A-Za-zÀ-ÿ ]/g, "")
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || input.email.slice(0, 2).toUpperCase();
  getDb()
    .prepare(
      "insert into profiles (id, email, password_hash, full_name, initials, role) values (?,?,?,?,?,?)"
    )
    .run(id, input.email.toLowerCase(), input.passwordHash, input.fullName, initials, input.role);
  return getProfileById(id)!;
}

export function updateRole(userId: string, role: Role): void {
  getDb().prepare("update profiles set role = ? where id = ?").run(role, userId);
}

/* ---------- Sessions ---------- */
const SESSION_DAYS = 30;

export function createSession(userId: string): string {
  const token = randomUUID() + randomUUID().replace(/-/g, "");
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5).toISOString();
  getDb()
    .prepare("insert into sessions (token, user_id, expires_at) values (?,?,?)")
    .run(token, userId, expires);
  return token;
}

export function getSessionUser(token: string): Profile | null {
  const row = getDb()
    .prepare("select user_id, expires_at from sessions where token = ?")
    .get(token) as { user_id: string; expires_at: string } | undefined;
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    deleteSession(token);
    return null;
  }
  return getProfileById(row.user_id);
}

export function deleteSession(token: string): void {
  getDb().prepare("delete from sessions where token = ?").run(token);
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
}

export function listItems(): Item[] {
  const db = getDb();
  const items = db.prepare("select * from items order by date_maj desc").all() as ItemRow[];
  const events = db.prepare("select * from events").all() as EventRow[];
  const people = db.prepare("select * from item_people").all() as PersonRow[];

  const evByItem = new Map<string, EventRow[]>();
  events.forEach((e) => {
    const list = evByItem.get(e.item_id) ?? [];
    list.push(e);
    evByItem.set(e.item_id, list);
  });
  const pByItem = new Map<string, PersonRow[]>();
  people.forEach((p) => {
    const list = pByItem.get(p.item_id) ?? [];
    list.push(p);
    pByItem.set(p.item_id, list);
  });

  return items.map((r) => mapItem(r, evByItem.get(r.id) ?? [], pByItem.get(r.id) ?? []));
}

export function getItem(id: string): Item | null {
  const db = getDb();
  const r = db.prepare("select * from items where id = ?").get(id) as ItemRow | undefined;
  if (!r) return null;
  const events = db.prepare("select * from events where item_id = ?").all(id) as EventRow[];
  const people = db.prepare("select * from item_people where item_id = ?").all(id) as PersonRow[];
  return mapItem(r, events, people);
}

function mapItem(r: ItemRow, events: EventRow[], people: PersonRow[]): Item {
  const timeline: TimelineEvent[] = events
    .map((e) => ({
      date: new Date(e.created_at),
      kind: e.kind,
      label: e.label,
      author: e.author_id ?? "",
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  return {
    id: r.id,
    ref: r.ref,
    metier: r.metier_code,
    type: r.type_code,
    objet: r.objet,
    ownerId: r.owner_id,
    statut: r.statut,
    priorite: r.priorite,
    personnes: people.map((p) => ({ name: p.name, kind: p.kind })),
    pointsCles: JSON.parse(r.points_cles || "[]"),
    blocageCause: r.blocage_cause,
    relancesCount: r.relances_count,
    dateCreation: new Date(r.date_creation),
    dateMaj: new Date(r.date_maj),
    timeline,
  };
}

export function createItem(input: {
  parsed: ParsedSubject;
  prio: Priorite;
  dest: string;
  pointsRaw: string;
  ownerId: string;
}): Item {
  const db = getDb();
  const now = new Date().toISOString();
  const id = randomUUID();
  const points = input.pointsRaw
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);

  const tx = db.transaction(() => {
    db.prepare(
      "insert into items (id, ref, metier_code, type_code, objet, priorite, statut, owner_id, points_cles, date_creation, date_maj) " +
        "values (?,?,?,?,?,?,?,?,?,?,?)"
    ).run(
      id,
      input.parsed.ref,
      input.parsed.metier,
      input.parsed.type,
      input.parsed.objet,
      input.prio,
      "Envoyé",
      input.ownerId,
      JSON.stringify(points.length ? points : ["—"]),
      now,
      now
    );
    if (input.dest.trim()) {
      db.prepare("insert into item_people (id, item_id, name, kind) values (?,?,?,?)").run(
        randomUUID(),
        id,
        input.dest.trim(),
        "destinataire"
      );
    }
    const insEv = db.prepare(
      "insert into events (id, item_id, kind, label, author_id, created_at) values (?,?,?,?,?,?)"
    );
    insEv.run(randomUUID(), id, "creation", "Objet créé", input.ownerId, now);
    insEv.run(randomUUID(), id, "envoi", "Envoyé", input.ownerId, now);
  });
  tx();
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

/** Droit d'édition d'un objet : propriétaire, ou directeur/admin. */
export function canEditItem(itemId: string, user: Profile): boolean {
  if (user.role === "directeur" || user.role === "admin") return true;
  const r = getDb().prepare("select owner_id from items where id = ?").get(itemId) as
    | { owner_id: string }
    | undefined;
  return r ? r.owner_id === user.id : false;
}

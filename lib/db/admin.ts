/* ==================================================================
 *  lib/db/admin.ts — Administration (serveur) : paramètres, membres,
 *  catalogue (édition/suppression), journal d'activité, compteurs.
 * ================================================================== */
import { randomUUID } from "node:crypto";
import { getDb } from "./index";
import { createProfile } from "./repo";
import { hashPassword } from "@/lib/auth/password";
import type {
  ActivityEntry,
  AdminCounts,
  AdminMember,
  AppSettings,
  Role,
  Tone,
} from "@/lib/domain";

/* ---------- Paramètres ---------- */
export function getSetting(key: string): string | null {
  const r = getDb().prepare("select value from settings where key = ?").get(key) as
    | { value: string }
    | undefined;
  return r?.value ?? null;
}
export function setSetting(key: string, value: string): void {
  getDb()
    .prepare("insert into settings (key, value) values (?,?) on conflict(key) do update set value=excluded.value")
    .run(key, value);
}
export function getSettings(): AppSettings {
  return {
    orgName: getSetting("org_name") || process.env.NEXT_PUBLIC_ORG_NAME?.trim() || "Équipe sécurité",
    emailEnabled: (getSetting("email_enabled") ?? "1") === "1",
    digestHour: getSetting("digest_hour") || "08:00",
  };
}

/* ---------- Membres ---------- */
interface MemberRow {
  id: string;
  email: string;
  full_name: string;
  initials: string;
  poste: string | null;
  role: Role;
  active: number;
}
function mapMember(r: MemberRow): AdminMember {
  return {
    id: r.id,
    nom: r.full_name,
    email: r.email,
    poste: r.poste ?? "",
    role: r.role,
    init: r.initials,
    active: r.active === 1,
  };
}

export function listMembers(): AdminMember[] {
  const rows = getDb().prepare("select * from profiles order by active desc, full_name").all() as MemberRow[];
  return rows.map(mapMember);
}

export function emailExists(email: string): boolean {
  return Boolean(getDb().prepare("select 1 from profiles where email = ?").get(email.toLowerCase()));
}

export function createMember(input: { email: string; fullName: string; role: Role; password: string }) {
  return createProfile({
    email: input.email,
    fullName: input.fullName,
    role: input.role,
    passwordHash: hashPassword(input.password),
  });
}

export function setMemberActive(id: string, active: boolean): void {
  getDb().prepare("update profiles set active = ? where id = ?").run(active ? 1 : 0, id);
  if (!active) deleteSessionsForUser(id);
}
export function setMemberRole(id: string, role: Role): void {
  getDb().prepare("update profiles set role = ? where id = ?").run(role, id);
}
export function setMemberPoste(id: string, poste: string): void {
  getDb().prepare("update profiles set poste = ? where id = ?").run(poste, id);
}
export function resetMemberPassword(id: string, password: string): void {
  getDb().prepare("update profiles set password_hash = ? where id = ?").run(hashPassword(password), id);
  deleteSessionsForUser(id);
}
export function deleteSessionsForUser(id: string): void {
  getDb().prepare("delete from sessions where user_id = ?").run(id);
}
export function countAdmins(): number {
  const r = getDb().prepare("select count(*) as n from profiles where role='admin' and active=1").get() as { n: number };
  return r.n;
}

/* ---------- Catalogue : édition / suppression ---------- */
export function updateMetier(code: string, label: string, tone: Tone): void {
  getDb().prepare("update ref_metiers set label=?, tone=? where code=?").run(label, tone, code);
}
export function updateType(
  code: string,
  label: string,
  slaRelance: number | null,
  slaEscalade: number | null,
  urgent: boolean
): void {
  getDb()
    .prepare("update ref_types set label=?, sla_relance=?, sla_escalade=?, urgent=? where code=?")
    .run(label, slaRelance, slaEscalade, urgent ? 1 : 0, code);
}
export function metierInUse(code: string): number {
  return (getDb().prepare("select count(*) as n from items where metier_code=?").get(code) as { n: number }).n;
}
export function typeInUse(code: string): number {
  return (getDb().prepare("select count(*) as n from items where type_code=?").get(code) as { n: number }).n;
}
export function deleteMetier(code: string): void {
  getDb().prepare("delete from ref_metiers where code=?").run(code);
}
export function deleteType(code: string): void {
  getDb().prepare("delete from ref_types where code=?").run(code);
}

/* ---------- Journal d'activité ---------- */
export function logActivity(actorId: string | null, action: string, detail = ""): void {
  getDb()
    .prepare("insert into activity_log (id, actor_id, action, detail) values (?,?,?,?)")
    .run(randomUUID(), actorId, action, detail);
}

interface ActivityRow {
  id: string;
  actor_id: string | null;
  action: string;
  detail: string;
  created_at: string;
  actor_nom: string | null;
}
export function listActivity(limit = 50): ActivityEntry[] {
  const rows = getDb()
    .prepare(
      "select a.*, p.full_name as actor_nom from activity_log a " +
        "left join profiles p on p.id = a.actor_id order by a.created_at desc limit ?"
    )
    .all(limit) as ActivityRow[];
  return rows.map((r) => ({
    id: r.id,
    actorNom: r.actor_nom ?? "Système",
    action: r.action,
    detail: r.detail,
    createdAt: new Date(r.created_at),
  }));
}

/* ---------- Compteurs ---------- */
export function adminCounts(): AdminCounts {
  const db = getDb();
  const one = (sql: string) => (db.prepare(sql).get() as { n: number }).n;
  return {
    members: one("select count(*) as n from profiles"),
    activeMembers: one("select count(*) as n from profiles where active=1"),
    items: one("select count(*) as n from items"),
    projects: one("select count(*) as n from projects"),
    notifications: one("select count(*) as n from notifications"),
  };
}

export function lastReminderRun(): ActivityEntry | null {
  const list = getDb()
    .prepare("select a.*, p.full_name as actor_nom from activity_log a left join profiles p on p.id=a.actor_id where a.action='reminders_run' order by a.created_at desc limit 1")
    .all() as ActivityRow[];
  if (!list.length) return null;
  const r = list[0];
  return { id: r.id, actorNom: r.actor_nom ?? "Système", action: r.action, detail: r.detail, createdAt: new Date(r.created_at) };
}

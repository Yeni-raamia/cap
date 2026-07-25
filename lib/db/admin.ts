/* ==================================================================
 *  lib/db/admin.ts — Administration (serveur) : paramètres, membres,
 *  catalogue (édition/suppression), journal d'activité, compteurs.
 * ================================================================== */
import { randomUUID } from "node:crypto";
import { getDb } from "./index";
import { createProfile, setMustChangePassword, setUserPassword } from "./repo";
import { hashPassword } from "@/lib/auth/password";
import { SECURITY_ACTIONS } from "@/lib/audit-labels";
import { DEFAULT_BACKUP, DEFAULT_SECURITY, type BackupSettings, type SecuritySettings } from "@/lib/domain";
import type {
  ActivityEntry,
  AdminCounts,
  AdminMember,
  AppSettings,
  RefAction,
  RefLists,
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

/* ---------- Paramètres de sauvegarde planifiée ---------- */
export function getBackupSettings(): BackupSettings {
  const d = DEFAULT_BACKUP;
  const freq = getSetting("backup_freq");
  const ret = Number(getSetting("backup_retention"));
  return {
    autoEnabled: (getSetting("backup_auto") ?? (d.autoEnabled ? "1" : "0")) === "1",
    frequency: freq === "weekly" ? "weekly" : "daily",
    retention: Number.isFinite(ret) && ret > 0 ? Math.min(90, Math.floor(ret)) : d.retention,
    lastRunAt: getSetting("backup_last_run"),
  };
}
export function setBackupSettings(p: Partial<BackupSettings>): void {
  if (p.autoEnabled !== undefined) setSetting("backup_auto", p.autoEnabled ? "1" : "0");
  if (p.frequency !== undefined) setSetting("backup_freq", p.frequency === "weekly" ? "weekly" : "daily");
  if (p.retention !== undefined) setSetting("backup_retention", String(Math.max(1, Math.min(90, Math.floor(p.retention)))));
  if (p.lastRunAt !== undefined && p.lastRunAt !== null) setSetting("backup_last_run", p.lastRunAt);
}

/* ---------- Paramètres de sécurité (configurables) ---------- */
const numSetting = (key: string, fallback: number) => {
  const v = getSetting(key);
  const n = v == null ? NaN : Number(v);
  return Number.isFinite(n) ? n : fallback;
};
export function getSecuritySettings(): SecuritySettings {
  const d = DEFAULT_SECURITY;
  return {
    approvalRequired: (getSetting("sec_approval_required") ?? (d.approvalRequired ? "1" : "0")) === "1",
    passwordMinLength: Math.max(6, Math.min(64, numSetting("sec_pw_min", d.passwordMinLength))),
    loginMaxAttempts: Math.max(1, Math.min(50, numSetting("sec_login_max", d.loginMaxAttempts))),
    loginWindowMin: Math.max(1, Math.min(240, numSetting("sec_login_window", d.loginWindowMin))),
    sessionDays: Math.max(1, Math.min(365, numSetting("sec_session_days", d.sessionDays))),
    passwordMaxAgeDays: Math.max(0, Math.min(3650, numSetting("sec_pw_max_age", d.passwordMaxAgeDays))),
    hstsEnabled: (getSetting("sec_hsts") ?? (d.hstsEnabled ? "1" : "0")) === "1",
    twofaRequired: (getSetting("sec_2fa_required") ?? (d.twofaRequired ? "1" : "0")) === "1",
  };
}
export function setSecuritySettings(p: Partial<SecuritySettings>): void {
  if (p.approvalRequired !== undefined) setSetting("sec_approval_required", p.approvalRequired ? "1" : "0");
  if (p.passwordMinLength !== undefined) setSetting("sec_pw_min", String(p.passwordMinLength));
  if (p.loginMaxAttempts !== undefined) setSetting("sec_login_max", String(p.loginMaxAttempts));
  if (p.loginWindowMin !== undefined) setSetting("sec_login_window", String(p.loginWindowMin));
  if (p.sessionDays !== undefined) setSetting("sec_session_days", String(p.sessionDays));
  if (p.passwordMaxAgeDays !== undefined) setSetting("sec_pw_max_age", String(p.passwordMaxAgeDays));
  if (p.hstsEnabled !== undefined) setSetting("sec_hsts", p.hstsEnabled ? "1" : "0");
  if (p.twofaRequired !== undefined) setSetting("sec_2fa_required", p.twofaRequired ? "1" : "0");
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
  extra_pages: string;
  denied_pages: string;
  readonly: number;
  approved: number;
  must_change_password: number;
  password_changed_at: string | null;
  totp_enabled: number;
}
const csv = (s: string | null | undefined) => (s ?? "").split(",").map((x) => x.trim()).filter(Boolean);
function mapMember(r: MemberRow): AdminMember {
  const changed = r.password_changed_at ? new Date(r.password_changed_at).getTime() : null;
  const passwordAgeDays = changed != null ? Math.floor((Date.now() - changed) / 864e5) : null;
  return {
    id: r.id,
    nom: r.full_name,
    email: r.email,
    poste: r.poste ?? "",
    role: r.role,
    init: r.initials,
    active: r.active === 1,
    extraPages: csv(r.extra_pages),
    deniedPages: csv(r.denied_pages),
    readonly: r.readonly === 1,
    approved: r.approved === 1,
    mustChangePassword: r.must_change_password === 1,
    totpEnabled: r.totp_enabled === 1,
    passwordAgeDays,
  };
}

/** Réinitialise (désactive) la 2FA d'un membre : déblocage en cas de perte du
 *  téléphone et des codes de secours. Efface secret et codes. */
export function resetMemberTotp(id: string): void {
  getDb()
    .prepare("update profiles set totp_enabled = 0, totp_secret = null, totp_backup = null where id = ?")
    .run(id);
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
    approved: true, // un compte créé par l'admin est directement autorisé
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
export function setMemberPages(id: string, extraPages: string[], deniedPages: string[]): void {
  getDb()
    .prepare("update profiles set extra_pages = ?, denied_pages = ? where id = ?")
    .run(extraPages.join(","), deniedPages.join(","), id);
}
export function setMemberReadonly(id: string, readonly: boolean): void {
  getDb().prepare("update profiles set readonly = ? where id = ?").run(readonly ? 1 : 0, id);
}
export function resetMemberPassword(id: string, password: string): void {
  setUserPassword(id, hashPassword(password)); // pose la date de changement + lève l'obligation
  deleteSessionsForUser(id); // déconnexion des sessions existantes
}
/** Force l'utilisateur à renouveler son mot de passe (rotation à la demande de l'admin). */
export function forceMemberPasswordChange(id: string): void {
  setMustChangePassword(id, true);
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

/* ---------- Listes de référence (appréciations, causes, actions) ---------- */
interface RefListRow {
  value: string;
  label: string;
  icon: string | null;
}
export function getRefLists(): RefLists {
  const db = getDb();
  const rows = (key: string) =>
    db.prepare("select value, label, icon from ref_lists where list_key=? order by ordre, value").all(key) as RefListRow[];
  return {
    appreciations: rows("appreciation").map((r) => r.value),
    causes: rows("cause").map((r) => r.value),
    actions: rows("action").map((r): RefAction => ({ kind: r.value, label: r.label || r.value, icon: r.icon || "Flag" })),
    decisions: rows("decision").map((r) => r.value),
    services: rows("service").map((r) => r.value),
    policies: rows("policy").map((r) => r.value),
  };
}
export function addRefItem(listKey: string, value: string, label: string, icon: string | null): void {
  const db = getDb();
  const exists = db.prepare("select 1 from ref_lists where list_key=? and value=?").get(listKey, value);
  if (exists) {
    db.prepare("update ref_lists set label=?, icon=? where list_key=? and value=?").run(label, icon, listKey, value);
    return;
  }
  const n = (db.prepare("select coalesce(max(ordre),0)+1 as n from ref_lists where list_key=?").get(listKey) as { n: number }).n;
  db.prepare("insert into ref_lists (id, list_key, value, label, icon, ordre) values (?,?,?,?,?,?)").run(
    randomUUID(),
    listKey,
    value,
    label,
    icon,
    n
  );
}
export function deleteRefItem(listKey: string, value: string): void {
  getDb().prepare("delete from ref_lists where list_key=? and value=?").run(listKey, value);
}

/* ---------- Modèles de relance (CRUD admin) ---------- */
export function createTemplate(input: { name: string; category: string; subject: string; body: string }): void {
  const db = getDb();
  const ordre = (db.prepare("select coalesce(max(ordre),0)+1 as n from email_templates").get() as { n: number }).n;
  db.prepare(
    "insert into email_templates (id, name, category, subject, body, ordre) values (?,?,?,?,?,?)"
  ).run(randomUUID(), input.name, input.category, input.subject, input.body, ordre);
}

export function updateTemplate(id: string, input: { name: string; category: string; subject: string; body: string }): void {
  getDb()
    .prepare("update email_templates set name=?, category=?, subject=?, body=? where id=?")
    .run(input.name, input.category, input.subject, input.body, id);
}

export function deleteTemplate(id: string): void {
  getDb().prepare("delete from email_templates where id=?").run(id);
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
const mapActivity = (r: ActivityRow): ActivityEntry => ({
  id: r.id,
  actorId: r.actor_id,
  actorNom: r.actor_nom ?? "Système",
  action: r.action,
  detail: r.detail,
  createdAt: new Date(r.created_at),
});

export function listActivity(limit = 50): ActivityEntry[] {
  const rows = getDb()
    .prepare(
      "select a.*, p.full_name as actor_nom from activity_log a " +
        "left join profiles p on p.id = a.actor_id order by a.created_at desc limit ?"
    )
    .all(limit) as ActivityRow[];
  return rows.map(mapActivity);
}

/**
 * Journal d'audit filtré : par type d'événement (`action`), par acteur
 * (`actorId`), par périmètre sécurité (`securityOnly`) et/ou par recherche
 * texte (`q`, sur le détail et le code d'action). Trié du plus récent au plus
 * ancien, borné par `limit`.
 */
export function queryActivity(filters: {
  action?: string;
  actorId?: string;
  securityOnly?: boolean;
  q?: string;
  limit?: number;
} = {}): ActivityEntry[] {
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (filters.action) { where.push("a.action = ?"); params.push(filters.action); }
  if (filters.actorId) { where.push("a.actor_id = ?"); params.push(filters.actorId); }
  if (filters.securityOnly && SECURITY_ACTIONS.length) {
    where.push(`a.action in (${SECURITY_ACTIONS.map(() => "?").join(",")})`);
    params.push(...SECURITY_ACTIONS);
  }
  if (filters.q?.trim()) {
    const like = `%${filters.q.trim()}%`;
    where.push("(a.detail like ? or a.action like ?)");
    params.push(like, like);
  }
  const limit = Math.max(1, Math.min(10000, filters.limit ?? 100));
  const sql =
    "select a.*, p.full_name as actor_nom from activity_log a " +
    "left join profiles p on p.id = a.actor_id" +
    (where.length ? ` where ${where.join(" and ")}` : "") +
    " order by a.created_at desc limit ?";
  params.push(limit);
  return (getDb().prepare(sql).all(...params) as ActivityRow[]).map(mapActivity);
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
  return mapActivity(list[0]);
}

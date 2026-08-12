/* ==================================================================
 *  lib/db/usage.ts — Mesure d'adoption de l'application.
 *
 *  Volontairement NON NOMINATIVE en sortie : on ne publie que des
 *  comptages de personnes distinctes. L'identifiant n'est conservé que
 *  le temps de dédoublonner, puis effacé par la purge.
 *
 *  Ne compte que l'activité RÉELLE : le client ne marque l'usage que si
 *  la personne a interagi récemment. Un onglet laissé ouvert ne compte pas.
 * ================================================================== */
import { getDb } from "./index";

/** Durée de conservation des marques brutes, en jours. */
export const USAGE_RETENTION_DAYS = 90;

const pad = (n: number) => String(n).padStart(2, "0");
const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Enregistre une marque d'usage (idempotente pour l'heure et la page en cours). */
export function markUsage(profileId: string, page: string, now = new Date()): void {
  getDb()
    .prepare("insert or ignore into usage_marks (day, hour, profile_id, page) values (?,?,?,?)")
    .run(dayKey(now), now.getHours(), profileId, page.slice(0, 60));
}

export interface UsageDay {
  day: string;
  users: number;
}
export interface UsageHour {
  /** 0 = lundi … 6 = dimanche. */
  weekday: number;
  hour: number;
  users: number;
}
export interface UsagePage {
  page: string;
  users: number;
}

/** Personnes distinctes actives par jour, sur les `days` derniers jours. */
export function activeUsersPerDay(days: number, now = new Date()): UsageDay[] {
  const from = new Date(now);
  from.setDate(from.getDate() - (days - 1));
  const rows = getDb()
    .prepare(
      "select day, count(distinct profile_id) as users from usage_marks where day >= ? group by day order by day"
    )
    .all(dayKey(from)) as UsageDay[];
  const byDay = new Map(rows.map((r) => [r.day, r.users]));
  // Série continue : un jour sans usage doit apparaître à zéro, pas disparaître.
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(from);
    d.setDate(from.getDate() + i);
    const key = dayKey(d);
    return { day: key, users: byDay.get(key) ?? 0 };
  });
}

/** Répartition jour de semaine × heure, pour repérer les heures de pointe. */
export function usageHeatmap(days: number, now = new Date()): UsageHour[] {
  const from = new Date(now);
  from.setDate(from.getDate() - (days - 1));
  const rows = getDb()
    .prepare("select day, hour, count(distinct profile_id) as users from usage_marks where day >= ? group by day, hour")
    .all(dayKey(from)) as { day: string; hour: number; users: number }[];
  const acc = new Map<string, number>();
  rows.forEach((r) => {
    const [y, m, d] = r.day.split("-").map(Number);
    // getDay() : 0 = dimanche ; on ramène le lundi en tête.
    const weekday = (new Date(y, m - 1, d).getDay() + 6) % 7;
    const k = `${weekday}:${r.hour}`;
    acc.set(k, (acc.get(k) ?? 0) + r.users);
  });
  return [...acc.entries()].map(([k, users]) => {
    const [weekday, hour] = k.split(":").map(Number);
    return { weekday, hour, users };
  });
}

/** Pages les plus fréquentées, en nombre de personnes distinctes. */
export function topPages(days: number, limit = 10, now = new Date()): UsagePage[] {
  const from = new Date(now);
  from.setDate(from.getDate() - (days - 1));
  return getDb()
    .prepare(
      "select page, count(distinct profile_id) as users from usage_marks where day >= ? and page <> '' " +
        "group by page order by users desc, page limit ?"
    )
    .all(dayKey(from), limit) as UsagePage[];
}

/** Personnes distinctes ayant utilisé l'application sur les `days` derniers jours. */
export function activeUserCount(days: number, now = new Date()): number {
  const from = new Date(now);
  from.setDate(from.getDate() - (days - 1));
  const r = getDb()
    .prepare("select count(distinct profile_id) as n from usage_marks where day >= ?")
    .get(dayKey(from)) as { n: number };
  return r?.n ?? 0;
}

/**
 * Efface les marques au-delà de la durée de conservation.
 * Appelée par le moteur de rappels ; renvoie le nombre de lignes effacées.
 */
export function purgeUsageMarks(now = new Date(), retentionDays = USAGE_RETENTION_DAYS): number {
  const limit = new Date(now);
  limit.setDate(limit.getDate() - retentionDays);
  const info = getDb().prepare("delete from usage_marks where day < ?").run(dayKey(limit));
  return info.changes ?? 0;
}

/* ---------- Journal de connexion, nominatif ----------
 * Vue distincte de l'adoption : ici on nomme les personnes, pour repérer un
 * compte inutilisé ou quelqu'un qui décroche de l'outil. Volontairement
 * SANS durée cumulée — un onglet ouvert ne mesure pas du travail, et un
 * total d'heures par personne se lirait comme une note. */

export interface AccountActivity {
  profileId: string;
  /** Dernier battement de cœur connu, ou null si jamais vu. */
  lastSeenAt: string | null;
  /** Nombre de jours distincts avec activité réelle sur la période. */
  activeDays: number;
  /** Dernier jour d'activité (`yyyy-mm-dd`), ou null. */
  lastActiveDay: string | null;
  /** Première et dernière heure d'activité ce jour-là (granularité : l'heure). */
  firstHour: number | null;
  lastHour: number | null;
  /** Actions enregistrées au journal sur la période — signal d'usage effectif. */
  actions: number;
}

/**
 * Activité par compte sur les `days` derniers jours.
 *
 * Renvoie une ligne par profil, y compris ceux sans aucune activité : ce sont
 * précisément eux qu'on cherche.
 */
export function accountActivity(days: number, now = new Date()): AccountActivity[] {
  const db = getDb();
  const from = new Date(now);
  from.setDate(from.getDate() - (days - 1));
  const since = dayKey(from);

  const profiles = db.prepare("select id from profiles order by full_name").all() as { id: string }[];

  const jours = db
    .prepare(
      "select profile_id, count(distinct day) as n, max(day) as dernier from usage_marks where day >= ? group by profile_id"
    )
    .all(since) as { profile_id: string; n: number; dernier: string }[];
  const parProfil = new Map(jours.map((r) => [r.profile_id, r]));

  const bornes = db
    .prepare("select profile_id, day, min(hour) as h1, max(hour) as h2 from usage_marks where day >= ? group by profile_id, day")
    .all(since) as { profile_id: string; day: string; h1: number; h2: number }[];

  const presences = db.prepare("select profile_id, last_seen_at from presence").all() as {
    profile_id: string;
    last_seen_at: string;
  }[];
  const vus = new Map(presences.map((r) => [r.profile_id, r.last_seen_at]));

  const actions = db
    .prepare("select actor_id, count(*) as n from activity_log where created_at >= ? group by actor_id")
    .all(`${since} 00:00:00`) as { actor_id: string | null; n: number }[];
  const parActeur = new Map(actions.filter((a) => a.actor_id).map((a) => [a.actor_id as string, a.n]));

  return profiles.map((p) => {
    const j = parProfil.get(p.id);
    const dernier = j?.dernier ?? null;
    const borne = dernier ? bornes.find((b) => b.profile_id === p.id && b.day === dernier) : undefined;
    return {
      profileId: p.id,
      lastSeenAt: vus.get(p.id) ?? null,
      activeDays: j?.n ?? 0,
      lastActiveDay: dernier,
      firstHour: borne?.h1 ?? null,
      lastHour: borne?.h2 ?? null,
      actions: parActeur.get(p.id) ?? 0,
    };
  });
}

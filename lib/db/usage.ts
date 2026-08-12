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

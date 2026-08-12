/* ==================================================================
 *  lib/recurrence.ts — Calendrier des tâches récurrentes.
 *
 *  Fonctions pures, sans accès base : elles disent quels jours une série
 *  doit produire une occurrence. Le dépôt (lib/db/recurrences.ts) se
 *  contente de créer les tâches correspondantes.
 * ================================================================== */
import type { RecurrenceAssignMode, TaskRecurrence } from "./domain";
import { startOfDay, toDayInput } from "./period";

/**
 * Rattrapage maximal, en jours.
 *
 * Si personne n'a ouvert l'application (ni lancé le cron) depuis longtemps,
 * on ne recrée pas des semaines de tâches quotidiennes périmées : ce serait
 * du bruit, pas du travail. Au-delà de cette fenêtre, les occurrences
 * manquées sont considérées comme passées et ignorées.
 */
export const MAX_CATCHUP_DAYS = 14;

/** Jour de la semaine au format ISO : 1 = lundi … 7 = dimanche. */
export const isoWeekday = (d: Date): number => ((d.getDay() + 6) % 7) + 1;

/** Nombre de jours du mois de `d`. */
const daysInMonth = (d: Date): number => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();

/** Écart en jours civils entre deux dates (b - a), en ignorant l'heure. */
const dayDiff = (a: Date, b: Date): number =>
  Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86400000);

const addDays = (d: Date, n: number): Date => {
  const x = startOfDay(d);
  x.setDate(x.getDate() + n);
  return x;
};

/**
 * La série produit-elle une occurrence ce jour-là ?
 *
 * Ne tient compte que du rythme et des bornes de la série — ni de ce qui a
 * déjà été engendré, ni du plafond d'occurrences (voir `dueOccurrences`).
 */
export function occursOn(rec: TaskRecurrence, day: Date): boolean {
  const d = startOfDay(day);
  if (d.getTime() < startOfDay(rec.startDate).getTime()) return false;
  if (rec.endDate && d.getTime() > startOfDay(rec.endDate).getTime()) return false;

  switch (rec.frequency) {
    case "quotidien":
      return true;
    case "jours_ouvres":
      return isoWeekday(d) <= 5;
    case "hebdomadaire":
      return rec.weekdays.includes(isoWeekday(d));
    case "mensuel": {
      // Le 31 d'un mois de 30 jours (ou février) tombe sur le dernier jour du mois.
      const target = Math.min(Math.max(rec.monthDay, 1), daysInMonth(d));
      return d.getDate() === target;
    }
    case "personnalise": {
      const step = Math.max(1, Math.floor(rec.intervalDays));
      return dayDiff(rec.startDate, d) % step === 0;
    }
    default:
      return false;
  }
}

/**
 * Les jours d'occurrence restant à engendrer, du plus ancien au plus récent.
 *
 * Bornes appliquées, dans cet ordre :
 *  - on repart du lendemain de la dernière occurrence engendrée (ou du début
 *    de la série si aucune ne l'a encore été) ;
 *  - on ne dépasse jamais aujourd'hui : une tâche apparaît le jour où elle
 *    est due, pas des semaines à l'avance ;
 *  - le rattrapage est plafonné à `MAX_CATCHUP_DAYS` ;
 *  - la série s'arrête à `endDate` et à `maxOccurrences`.
 *
 * Une série inactive ne produit rien.
 */
export function dueOccurrences(rec: TaskRecurrence, now: Date): Date[] {
  if (!rec.active) return [];

  const today = startOfDay(now);
  const remaining =
    rec.maxOccurrences === null ? Infinity : Math.max(0, rec.maxOccurrences - rec.occurrencesCount);
  if (remaining === 0) return [];

  const lastRun = rec.lastRunOn ? parseDayKey(rec.lastRunOn) : null;
  // Point de départ du balayage : le lendemain de la dernière occurrence,
  // ou le début de la série si elle n'a jamais tourné.
  const rawFrom = lastRun ? addDays(lastRun, 1) : startOfDay(rec.startDate);
  const floor = addDays(today, -MAX_CATCHUP_DAYS);
  const from = rawFrom.getTime() < floor.getTime() ? floor : rawFrom;
  if (from.getTime() > today.getTime()) return [];

  const out: Date[] = [];
  for (let d = from; d.getTime() <= today.getTime(); d = addDays(d, 1)) {
    if (out.length >= remaining) break;
    if (occursOn(rec, d)) out.push(d);
  }
  return out;
}

/**
 * Prochain jour d'occurrence à partir de `from` (inclus), ou null si la série
 * est achevée. Sert à afficher « prochaine : … » sans rien engendrer.
 */
export function nextOccurrence(rec: TaskRecurrence, from: Date): Date | null {
  if (!rec.active) return null;
  if (rec.maxOccurrences !== null && rec.occurrencesCount >= rec.maxOccurrences) return null;
  const start = startOfDay(from);
  const limit = rec.endDate ? startOfDay(rec.endDate) : addDays(start, 366);
  for (let d = start; d.getTime() <= limit.getTime(); d = addDays(d, 1)) {
    if (occursOn(rec, d)) return d;
  }
  return null;
}

/**
 * Responsable d'une occurrence, selon le mode d'attribution du gabarit.
 *
 * `index` est la position dans le roulement (mode rotation) ; les autres
 * modes l'ignorent. Un roulement vide se comporte comme « à prendre ».
 */
export function assigneeFor(
  mode: RecurrenceAssignMode,
  opts: { assigneeId: string | null; rotationIds: string[]; index: number }
): string | null {
  if (mode === "fixe") return opts.assigneeId;
  if (mode === "rotation") {
    const ids = opts.rotationIds.filter(Boolean);
    if (ids.length === 0) return null;
    // Modulo positif : l'index reste valide même si le roulement a rétréci.
    const i = ((opts.index % ids.length) + ids.length) % ids.length;
    return ids[i];
  }
  return null; // libre
}

/** Échéance d'une occurrence = jour d'occurrence + décalage du gabarit. */
export const dueDateFor = (occurrence: Date, dueOffsetDays: number): Date =>
  addDays(occurrence, Math.max(0, Math.floor(dueOffsetDays)));

/** Parse une clé `yyyy-mm-dd` en date locale (les clés viennent de `toDayInput`). */
export function parseDayKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export { toDayInput };

/**
 * Résumé lisible du rythme, pour les listes et les fiches.
 *
 * Ne demande que les champs de rythme : un formulaire peut donc décrire un
 * gabarit en cours de saisie, avant qu'il n'existe.
 */
export function describeFrequency(
  rec: Pick<TaskRecurrence, "frequency" | "weekdays" | "monthDay" | "intervalDays">
): string {
  switch (rec.frequency) {
    case "quotidien":
      return "Chaque jour";
    case "jours_ouvres":
      return "Du lundi au vendredi";
    case "hebdomadaire": {
      if (rec.weekdays.length === 0) return "Aucun jour sélectionné";
      const names = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
      const picked = [...rec.weekdays].sort((a, b) => a - b).map((w) => names[w - 1]);
      return picked.length === 1 ? `Chaque ${picked[0]}` : `Chaque ${picked.join(", ")}`;
    }
    case "mensuel":
      return rec.monthDay === 1 ? "Le 1er de chaque mois" : `Le ${rec.monthDay} de chaque mois`;
    case "personnalise": {
      const n = Math.max(1, Math.floor(rec.intervalDays));
      return n === 1 ? "Chaque jour" : `Tous les ${n} jours`;
    }
    default:
      return "—";
  }
}

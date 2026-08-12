/* ==================================================================
 *  lib/period.ts — Filtrage temporel partagé (jour / semaine / mois /
 *  période personnalisée), utilisé par les tâches, les tâches de projet,
 *  les projets et la vue Planning.
 *
 *  Toutes les bornes sont calculées en heure locale : « aujourd'hui »
 *  doit désigner la journée de la personne qui regarde l'écran, pas une
 *  journée UTC décalée.
 * ================================================================== */

export type PeriodKey =
  | "tous" // aucune contrainte
  | "jour" // aujourd'hui
  | "semaine" // semaine en cours (lundi → dimanche)
  | "mois" // mois en cours
  | "perso" // période personnalisée (from / to)
  | "retard" // en retard uniquement
  | "sans"; // sans date

export interface PeriodFilter {
  key: PeriodKey;
  /** Bornes de la période personnalisée, au format `yyyy-mm-dd` (incluses). */
  from?: string;
  to?: string;
}

export interface DateRange {
  from: Date;
  to: Date;
}

export const DEFAULT_PERIOD: PeriodFilter = { key: "tous" };

/** Les choix proposés dans la barre de filtres, dans l'ordre d'affichage. */
export const PERIOD_OPTIONS: { key: PeriodKey; label: string; title: string }[] = [
  { key: "tous", label: "Tout", title: "Aucun filtre de date" },
  { key: "jour", label: "Aujourd'hui", title: "Échéance aujourd'hui" },
  { key: "semaine", label: "Cette semaine", title: "Échéance dans la semaine en cours (lundi → dimanche)" },
  { key: "mois", label: "Ce mois", title: "Échéance dans le mois en cours" },
  { key: "perso", label: "Période…", title: "Choisir une période personnalisée" },
  { key: "retard", label: "En retard", title: "Échéance dépassée et pas encore terminé" },
  { key: "sans", label: "Sans date", title: "Aucune échéance renseignée" },
];

/* ---------- Bornes de jour / semaine / mois (heure locale) ---------- */

export const startOfDay = (d: Date): Date => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

export const endOfDay = (d: Date): Date => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};

/** Lundi de la semaine de `d` (convention française). */
export const startOfWeek = (d: Date): Date => {
  const x = startOfDay(d);
  // getDay() : 0 = dimanche … 6 = samedi. Le lundi est le début de semaine.
  const shift = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - shift);
  return x;
};

export const endOfWeek = (d: Date): Date => {
  const x = startOfWeek(d);
  x.setDate(x.getDate() + 6);
  return endOfDay(x);
};

export const startOfMonth = (d: Date): Date => {
  const x = startOfDay(d);
  x.setDate(1);
  return x;
};

export const endOfMonth = (d: Date): Date => {
  const x = startOfDay(d);
  // Jour 0 du mois suivant = dernier jour du mois courant.
  x.setMonth(x.getMonth() + 1, 0);
  return endOfDay(x);
};

/** Parse une date `yyyy-mm-dd` en date locale, ou null si invalide. */
export const parseDay = (s?: string | null): Date | null => {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
};

/** Format `yyyy-mm-dd` d'une date locale (pour les `<input type="date">`). */
export const toDayInput = (d: Date | null | undefined): string => {
  if (!d) return "";
  const x = new Date(d);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}`;
};

/** Vrai si les deux dates tombent le même jour civil. */
export const sameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/**
 * Intervalle couvert par le filtre, ou `null` quand le filtre ne définit
 * pas d'intervalle (« tous », « en retard », « sans date »).
 *
 * Pour une période personnalisée dont une seule borne est saisie, l'autre
 * est laissée ouverte (bornes très larges) — filtrer « à partir du 1er mars »
 * est un usage courant.
 */
export function periodRange(f: PeriodFilter, now: Date): DateRange | null {
  switch (f.key) {
    case "jour":
      return { from: startOfDay(now), to: endOfDay(now) };
    case "semaine":
      return { from: startOfWeek(now), to: endOfWeek(now) };
    case "mois":
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case "perso": {
      const from = parseDay(f.from);
      const to = parseDay(f.to);
      if (!from && !to) return null; // période non encore renseignée → ne filtre rien
      return {
        from: from ? startOfDay(from) : new Date(-8640000000000000),
        to: to ? endOfDay(to) : new Date(8640000000000000),
      };
    }
    default:
      return null;
  }
}

/**
 * Le filtre laisse-t-il passer cet élément ?
 *
 * @param date   échéance de l'élément (ou null s'il n'en a pas)
 * @param isLate l'élément est-il en retard — notion propre à chaque objet
 *               (une tâche « faite » n'est jamais en retard, un projet
 *               « Terminé » non plus), donc calculée par l'appelant
 */
export function matchesPeriod(date: Date | null, isLate: boolean, f: PeriodFilter, now: Date): boolean {
  if (f.key === "tous") return true;
  if (f.key === "retard") return isLate;
  if (f.key === "sans") return !date;
  const range = periodRange(f, now);
  if (!range) return true;
  if (!date) return false;
  const t = date.getTime();
  return t >= range.from.getTime() && t <= range.to.getTime();
}

/** Libellé lisible de la période active (en-têtes, exports, impressions). */
export function periodLabel(f: PeriodFilter, now: Date): string {
  const day = (d: Date) => d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  switch (f.key) {
    case "jour":
      return `Aujourd'hui (${day(now)})`;
    case "semaine": {
      const r = periodRange(f, now)!;
      return `Semaine du ${day(r.from)} au ${day(r.to)}`;
    }
    case "mois":
      return now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    case "perso": {
      const from = parseDay(f.from);
      const to = parseDay(f.to);
      if (from && to) return `Du ${day(from)} au ${day(to)}`;
      if (from) return `À partir du ${day(from)}`;
      if (to) return `Jusqu'au ${day(to)}`;
      return "Période personnalisée";
    }
    case "retard":
      return "En retard";
    case "sans":
      return "Sans échéance";
    default:
      return "Toutes périodes";
  }
}

/** Vrai si le filtre restreint effectivement l'affichage (pour un badge « filtré »). */
export const isPeriodActive = (f: PeriodFilter): boolean =>
  f.key !== "tous" && !(f.key === "perso" && !f.from && !f.to);

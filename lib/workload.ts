/* ==================================================================
 *  lib/workload.ts — Charge prévisionnelle par personne et par semaine.
 *
 *  On additionne les estimations des travaux non terminés, rangés dans la
 *  semaine de leur échéance. Les tâches sans estimation sont comptées à
 *  part : les ignorer donnerait une charge faussement rassurante, et leur
 *  inventer une durée serait pire.
 * ================================================================== */
import { WORK_DAY_MINUTES, type Project, type Task } from "./domain";
import { endOfWeek, startOfWeek, toDayInput } from "./period";

/** Capacité hebdomadaire d'une personne : 5 journées de 7 heures. */
export const WEEK_CAPACITY_MINUTES = WORK_DAY_MINUTES * 5;

export interface WeekBucket {
  key: string;
  start: Date;
  end: Date;
  /** « 9 – 15 mars » */
  label: string;
  /** Numéro de semaine ISO, pour l'en-tête de colonne. */
  weekNumber: number;
  isCurrent: boolean;
}

export interface LoadItem {
  id: string;
  title: string;
  kind: "tache" | "tache-projet";
  /** Estimation en minutes, ou null si la tâche n'a pas été estimée. */
  minutes: number | null;
  dueDate: Date | null;
  context: string;
  late: boolean;
}

export interface CellLoad {
  /** Somme des estimations connues. */
  minutes: number;
  /** Nombre de travaux estimés / non estimés — la seconde valeur qualifie la première. */
  estimated: number;
  unestimated: number;
  late: number;
  items: LoadItem[];
}

export const emptyCell = (): CellLoad => ({ minutes: 0, estimated: 0, unestimated: 0, late: 0, items: [] });

/** Numéro de semaine ISO 8601. */
export function isoWeekNumber(d: Date): number {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  // Jeudi de la même semaine : c'est lui qui porte l'année ISO.
  x.setDate(x.getDate() + 3 - ((x.getDay() + 6) % 7));
  const premierJeudi = new Date(x.getFullYear(), 0, 4);
  premierJeudi.setDate(premierJeudi.getDate() + 3 - ((premierJeudi.getDay() + 6) % 7));
  return 1 + Math.round((x.getTime() - premierJeudi.getTime()) / (7 * 86400000));
}

/** `count` semaines consécutives à partir de celle de `anchor`. */
export function weeksFrom(anchor: Date, count: number, now: Date): WeekBucket[] {
  const first = startOfWeek(anchor);
  const courante = toDayInput(startOfWeek(now));
  return Array.from({ length: Math.max(1, count) }, (_, i) => {
    const start = new Date(first);
    start.setDate(first.getDate() + i * 7);
    const end = endOfWeek(start);
    const opts = { day: "numeric", month: "short" } as const;
    return {
      key: toDayInput(start),
      start,
      end,
      label: `${start.toLocaleDateString("fr-FR", opts)} – ${end.toLocaleDateString("fr-FR", opts)}`,
      weekNumber: isoWeekNumber(start),
      isCurrent: toDayInput(start) === courante,
    };
  });
}

/** Rassemble en une liste unique les travaux non terminés attribués à quelqu'un. */
export function collectLoadItems(tasks: Task[], projects: Project[], now: Date): Map<string, LoadItem[]> {
  const byPerson = new Map<string, LoadItem[]>();
  const push = (personId: string | null, item: LoadItem) => {
    if (!personId) return; // une tâche sans responsable ne charge personne
    byPerson.set(personId, [...(byPerson.get(personId) ?? []), item]);
  };

  tasks.forEach((t) => {
    if (t.status === "fait") return;
    push(t.assigneeId, {
      id: t.id,
      title: t.title,
      kind: "tache",
      minutes: t.estimatedMinutes ?? null,
      dueDate: t.dueDate,
      context: "",
      late: Boolean(t.dueDate && t.dueDate.getTime() < now.getTime()),
    });
  });

  projects.forEach((p) =>
    p.tasks.forEach((t) => {
      if (t.status === "fait") return;
      push(t.assigneeId, {
        id: t.id,
        title: t.title,
        kind: "tache-projet",
        minutes: t.estimatedMinutes ?? null,
        dueDate: t.dueDate,
        context: p.name,
        late: Boolean(t.dueDate && t.dueDate.getTime() < now.getTime()),
      });
    })
  );

  return byPerson;
}

export interface PersonLoad {
  personId: string;
  /** Une case par semaine, dans l'ordre de `weeks`. */
  cells: CellLoad[];
  /** Travaux sans échéance : ils n'appartiennent à aucune semaine. */
  undated: CellLoad;
  /** Travaux dont l'échéance est antérieure à la première semaine affichée. */
  overdue: CellLoad;
}

/**
 * Répartit les travaux de chaque personne dans les semaines demandées.
 *
 * Trois cases hors grille évitent de faire disparaître du travail : ce qui
 * n'a pas d'échéance, ce qui est déjà en retard avant la première semaine,
 * et — dans chaque case — le nombre de tâches non estimées.
 */
export function buildWorkload(input: {
  people: string[];
  tasks: Task[];
  projects: Project[];
  weeks: WeekBucket[];
  now: Date;
}): PersonLoad[] {
  const { people, tasks, projects, weeks, now } = input;
  const items = collectLoadItems(tasks, projects, now);
  const debut = weeks[0]?.start.getTime() ?? 0;

  const add = (cell: CellLoad, it: LoadItem) => {
    if (it.minutes === null) cell.unestimated += 1;
    else {
      cell.minutes += it.minutes;
      cell.estimated += 1;
    }
    if (it.late) cell.late += 1;
    cell.items.push(it);
  };

  return people.map((personId) => {
    const cells = weeks.map(() => emptyCell());
    const undated = emptyCell();
    const overdue = emptyCell();

    (items.get(personId) ?? []).forEach((it) => {
      if (!it.dueDate) return add(undated, it);
      const t = it.dueDate.getTime();
      if (t < debut) return add(overdue, it);
      const i = weeks.findIndex((w) => t >= w.start.getTime() && t <= w.end.getTime());
      if (i === -1) return; // au-delà de l'horizon affiché
      add(cells[i], it);
    });

    return { personId, cells, undated, overdue };
  });
}

/** Taux d'occupation d'une semaine (1 = capacité atteinte). */
export const loadRatio = (minutes: number): number => minutes / WEEK_CAPACITY_MINUTES;

export type LoadLevel = "vide" | "normal" | "charge" | "surcharge";

/**
 * Niveau d'alerte d'une case.
 *
 * On ne crie pas au-dessus de 100 % pour rien : la surcharge commence quand
 * la semaine ne tient plus, soit au-delà de la capacité.
 */
export function loadLevel(cell: CellLoad): LoadLevel {
  if (cell.estimated === 0 && cell.unestimated === 0) return "vide";
  const r = loadRatio(cell.minutes);
  if (r > 1) return "surcharge";
  if (r >= 0.8) return "charge";
  return "normal";
}

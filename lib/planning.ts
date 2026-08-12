/* ==================================================================
 *  lib/planning.ts — Agrégation des échéances de l'application en une
 *  liste d'événements datés, consommée par la vue Planning.
 *
 *  Le planning ne stocke rien : il relit les objets existants (tâches,
 *  tâches de projet, projets, réunions) pour les poser sur un calendrier.
 * ================================================================== */
import { isProjectLate, isProjectTaskLate, isTaskLate, type Meeting, type Project, type Task } from "./domain";
import { sameDay, startOfDay } from "./period";

export type PlanEventKind = "tache" | "tache-projet" | "projet" | "reunion";

export interface PlanEvent {
  /** Identifiant d'affichage, préfixé par type (unique dans le calendrier). */
  id: string;
  /** Identifiant de l'objet sous-jacent — c'est lui qu'on met à jour au déplacement. */
  refId: string;
  kind: PlanEventKind;
  title: string;
  date: Date;
  /** L'objet porte-t-il une heure significative ? (réunions seulement) */
  timed: boolean;
  /** Personne concernée (assignée / responsable), pour le filtre par personne. */
  personId: string | null;
  /** Contexte affiché en second ligne (nom du projet, lieu…). */
  context: string;
  late: boolean;
  done: boolean;
  /** Route de destination au clic, ou null si l'événement ouvre une fiche modale. */
  href: string | null;
  /** Identifiant de la tâche à ouvrir en modale (kind === "tache"). */
  taskId: string | null;
}

export const EVENT_KINDS: { key: PlanEventKind; label: string; dot: string; chip: string }[] = [
  { key: "tache", label: "Tâches", dot: "bg-violet-500", chip: "bg-violet-100 text-violet-700 border-violet-200" },
  { key: "tache-projet", label: "Tâches de projet", dot: "bg-sky-500", chip: "bg-sky-100 text-sky-700 border-sky-200" },
  { key: "projet", label: "Échéances de projet", dot: "bg-emerald-500", chip: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { key: "reunion", label: "Réunions", dot: "bg-amber-500", chip: "bg-amber-100 text-amber-700 border-amber-200" },
];

/**
 * Construit la liste des événements datés à partir des objets du domaine.
 * Les éléments sans date sont ignorés : ils n'ont pas de place sur un calendrier.
 */
export function buildPlanEvents(input: {
  tasks: Task[];
  projects: Project[];
  meetings: Meeting[];
  now: Date;
}): PlanEvent[] {
  const { tasks, projects, meetings, now } = input;
  const events: PlanEvent[] = [];

  tasks.forEach((t) => {
    if (!t.dueDate) return;
    const proj = t.projectId ? projects.find((p) => p.id === t.projectId) : null;
    events.push({
      id: `tache-${t.id}`,
      refId: t.id,
      kind: "tache",
      timed: false,
      title: t.title,
      date: t.dueDate,
      personId: t.assigneeId,
      context: proj?.name ?? "",
      late: isTaskLate(t, now),
      done: t.status === "fait",
      href: null,
      taskId: t.id,
    });
  });

  projects.forEach((p) => {
    p.tasks.forEach((t) => {
      if (!t.dueDate) return;
      events.push({
        id: `ptache-${t.id}`,
        refId: t.id,
        kind: "tache-projet",
        timed: false,
        title: t.title,
        date: t.dueDate,
        personId: t.assigneeId,
        context: p.name,
        late: isProjectTaskLate(t, now),
        done: t.status === "fait",
        href: `/projets/${p.id}`,
        taskId: null,
      });
    });
    if (p.deadline) {
      events.push({
        id: `projet-${p.id}`,
        refId: p.id,
        kind: "projet",
        timed: false,
        title: p.name,
        date: p.deadline,
        personId: p.ownerId,
        context: "Échéance du projet",
        late: isProjectLate(p, now),
        done: p.status === "Terminé",
        href: `/projets/${p.id}`,
        taskId: null,
      });
    }
  });

  meetings.forEach((m) => {
    if (!m.date) return;
    events.push({
      id: `reunion-${m.id}`,
      refId: m.id,
      kind: "reunion",
      timed: true,
      title: m.title || "Réunion",
      date: m.date,
      personId: m.createdBy ?? null,
      context: m.location || "",
      late: false,
      done: m.status === "tenue" || m.status === "annulée",
      href: `/reunions/${m.id}`,
      taskId: null,
    });
  });

  return events.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/** Regroupe les événements par jour civil (clé `yyyy-mm-dd` locale). */
export function groupByDay(events: PlanEvent[]): Map<string, PlanEvent[]> {
  const map = new Map<string, PlanEvent[]>();
  events.forEach((e) => {
    const d = startOfDay(e.date);
    const p = (n: number) => String(n).padStart(2, "0");
    const key = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    map.set(key, [...(map.get(key) ?? []), e]);
  });
  return map;
}

/**
 * Les 42 jours (6 semaines) d'une grille mensuelle commençant un lundi —
 * une taille fixe évite que la hauteur du calendrier saute d'un mois à l'autre.
 */
export function monthGrid(anchor: Date): Date[] {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const shift = (first.getDay() + 6) % 7; // lundi = 0
  const start = new Date(first);
  start.setDate(first.getDate() - shift);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return startOfDay(d);
  });
}

/** Les 7 jours de la semaine (lundi → dimanche) contenant `anchor`. */
export function weekGrid(anchor: Date): Date[] {
  const start = startOfDay(anchor);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

/** Vrai si `d` appartient au mois de `anchor` (pour griser les jours débordants). */
export const inMonth = (d: Date, anchor: Date): boolean =>
  d.getMonth() === anchor.getMonth() && d.getFullYear() === anchor.getFullYear();

/* ---------- Créneaux horaires (vue semaine) ---------- */

/** Amplitude affichée : une journée de bureau, pas 24 h de lignes vides. */
export const DAY_START_HOUR = 7;
export const DAY_END_HOUR = 20;

export const HOUR_SLOTS: number[] = Array.from(
  { length: DAY_END_HOUR - DAY_START_HOUR },
  (_, i) => DAY_START_HOUR + i
);

const pad = (n: number) => String(n).padStart(2, "0");

/** Clé `yyyy-mm-dd` d'un jour (identifiant de zone de dépôt « journée »). */
export const dayKey = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Identifiant de zone de dépôt d'un créneau horaire. */
export const slotId = (d: Date, hour: number): string => `slot:${dayKey(d)}:${hour}`;
/** Identifiant de zone de dépôt d'une journée entière (bandeau « toute la journée »). */
export const dayDropId = (d: Date): string => `day:${dayKey(d)}`;

export interface DropTarget {
  day: Date;
  /** Heure visée, ou null pour un dépôt « toute la journée ». */
  hour: number | null;
}

/** Décode l'identifiant d'une zone de dépôt, ou null s'il n'en est pas une. */
export function parseDropId(id: string): DropTarget | null {
  const m = /^(slot|day):(\d{4})-(\d{2})-(\d{2})(?::(\d{1,2}))?$/.exec(id);
  if (!m) return null;
  const day = new Date(Number(m[2]), Number(m[3]) - 1, Number(m[4]));
  if (Number.isNaN(day.getTime())) return null;
  return { day, hour: m[1] === "slot" && m[5] !== undefined ? Number(m[5]) : null };
}

/**
 * Nouvelle date d'un événement déplacé.
 *
 * Un dépôt sur un créneau impose l'heure (minutes remises à zéro : le geste
 * doit être prévisible). Un dépôt « toute la journée » ne change que le jour
 * et conserve l'heure d'origine, pour ne pas décaler une réunion à minuit.
 */
export function movedDate(event: PlanEvent, target: DropTarget): Date {
  const d = new Date(target.day);
  if (target.hour === null) {
    d.setHours(event.date.getHours(), event.date.getMinutes(), 0, 0);
  } else {
    d.setHours(target.hour, 0, 0, 0);
  }
  return d;
}

/** L'événement est-il déjà exactement à cette place ? (évite un appel réseau inutile) */
export function isSamePlacement(event: PlanEvent, target: DropTarget): boolean {
  const next = movedDate(event, target);
  return next.getTime() === event.date.getTime();
}

export { sameDay };

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
  /** Durée en minutes pour un événement horaire ; ignorée sinon. */
  durationMinutes: number;
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
      durationMinutes: 0,
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
        durationMinutes: 0,
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
        durationMinutes: 0,
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
      durationMinutes: m.durationMinutes ?? 60,
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

/**
 * Amplitude affichée par défaut : large, sans aller jusqu'aux 24 h qui
 * noieraient la journée de travail sous des lignes vides.
 */
export const DEFAULT_START_HOUR = 6;
export const DEFAULT_END_HOUR = 22;
/** Pas de la grille, en minutes : les demi-heures sont l'unité usuelle. */
export const SLOT_MINUTES = 30;

/** Minutes depuis minuit de chaque créneau d'une amplitude donnée. */
export const slotsFor = (startHour: number, endHour: number): number[] =>
  Array.from(
    { length: Math.max(1, ((endHour - startHour) * 60) / SLOT_MINUTES) },
    (_, i) => startHour * 60 + i * SLOT_MINUTES
  );

export interface HourRange {
  startHour: number;
  endHour: number;
}

/**
 * Amplitude réellement nécessaire pour la semaine affichée.
 *
 * On part de l'amplitude par défaut, puis on l'élargit si un événement tombe
 * en dehors : une réunion à 5 h ou à 23 h doit rester visible, sinon elle
 * n'existe tout simplement plus dans cette vue. On ne rétrécit jamais
 * en deçà du défaut, pour que la grille ne saute pas d'une semaine à l'autre.
 */
export function visibleHourRange(events: PlanEvent[]): HourRange {
  let startHour = DEFAULT_START_HOUR;
  let endHour = DEFAULT_END_HOUR;
  for (const e of events) {
    if (!e.timed) continue;
    const debut = e.date.getHours();
    // Fin arrondie à l'heure supérieure, pour ne pas couper le dernier bloc.
    const fin = Math.ceil((eventStartMinutes(e) + Math.max(SLOT_MINUTES, e.durationMinutes)) / 60);
    if (debut < startHour) startHour = Math.max(0, debut);
    if (fin > endHour) endHour = Math.min(24, fin);
  }
  return { startHour, endHour };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** « 14:30 » à partir de minutes depuis minuit. */
export const slotLabel = (minutes: number): string => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

/** Clé `yyyy-mm-dd` d'un jour (identifiant de zone de dépôt « journée »). */
export const dayKey = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Identifiant de zone de dépôt d'un créneau (minutes depuis minuit). */
export const slotId = (d: Date, minutes: number): string => `slot:${dayKey(d)}:${minutes}`;
/** Identifiant de zone de dépôt d'une journée entière (bandeau « toute la journée »). */
export const dayDropId = (d: Date): string => `day:${dayKey(d)}`;

export interface DropTarget {
  day: Date;
  /** Minutes depuis minuit, ou null pour un dépôt « toute la journée ». */
  minutes: number | null;
}

/** Décode l'identifiant d'une zone de dépôt, ou null s'il n'en est pas une. */
export function parseDropId(id: string): DropTarget | null {
  const m = /^(slot|day):(\d{4})-(\d{2})-(\d{2})(?::(\d{1,4}))?$/.exec(id);
  if (!m) return null;
  const day = new Date(Number(m[2]), Number(m[3]) - 1, Number(m[4]));
  if (Number.isNaN(day.getTime())) return null;
  return { day, minutes: m[1] === "slot" && m[5] !== undefined ? Number(m[5]) : null };
}

/**
 * Nouvelle date d'un événement déplacé.
 *
 * Un dépôt sur un créneau impose l'heure de début. Un dépôt « toute la
 * journée » ne change que le jour et conserve l'heure d'origine, pour ne pas
 * décaler une réunion à minuit quand on la fait simplement glisser d'un jour
 * à l'autre.
 */
export function movedDate(event: PlanEvent, target: DropTarget): Date {
  const d = new Date(target.day);
  if (target.minutes === null) {
    d.setHours(event.date.getHours(), event.date.getMinutes(), 0, 0);
  } else {
    d.setHours(Math.floor(target.minutes / 60), target.minutes % 60, 0, 0);
  }
  return d;
}

/** L'événement est-il déjà exactement à cette place ? (évite un appel réseau inutile) */
export function isSamePlacement(event: PlanEvent, target: DropTarget): boolean {
  return movedDate(event, target).getTime() === event.date.getTime();
}

/* ---------- Redimensionnement à la souris ---------- */

/**
 * Pas du redimensionnement, en minutes.
 *
 * Plus fin que la grille (30 min) : on veut pouvoir régler un point à
 * 15 ou 45 minutes en tirant, sans passer par le formulaire.
 */
export const RESIZE_STEP = 15;
export const MIN_DURATION = 15;

/**
 * Durée obtenue en tirant le bas d'un bloc.
 *
 * `deltaMinutes` est l'équivalent en minutes du déplacement vertical. Le
 * résultat est calé sur le pas, ne descend jamais sous une durée utilisable,
 * et ne déborde pas de la journée affichée — un bloc qui dépasserait la
 * grille deviendrait invisible en bas.
 */
export function resizedDuration(
  current: number,
  deltaMinutes: number,
  startAtMinutes: number,
  endHour: number = DEFAULT_END_HOUR
): number {
  const snapped = Math.round((current + deltaMinutes) / RESIZE_STEP) * RESIZE_STEP;
  const maxByDay = endHour * 60 - startAtMinutes;
  return Math.min(Math.max(MIN_DURATION, snapped), Math.max(MIN_DURATION, maxByDay));
}

/** Minutes depuis minuit du début d'un événement. */
export const eventStartMinutes = (e: PlanEvent): number => e.date.getHours() * 60 + e.date.getMinutes();

/* ---------- Placement des blocs horaires ---------- */

export interface PositionedEvent {
  event: PlanEvent;
  /** Décalage depuis le haut de la grille, en nombre de créneaux (peut être fractionnaire). */
  offset: number;
  /** Hauteur du bloc, en nombre de créneaux (au moins un demi-créneau visible). */
  span: number;
  /** Colonne occupée quand plusieurs réunions se chevauchent. */
  lane: number;
  /** Nombre total de colonnes sur ce groupe de chevauchement. */
  lanes: number;
}

const startMinutes = (e: PlanEvent) => e.date.getHours() * 60 + e.date.getMinutes();
const endMinutes = (e: PlanEvent) => startMinutes(e) + Math.max(SLOT_MINUTES / 2, e.durationMinutes ?? SLOT_MINUTES);

/**
 * Positionne les événements horaires d'une journée.
 *
 * Les réunions qui se chevauchent se partagent la largeur au lieu de se
 * recouvrir : sans cela, une réunion courte disparaîtrait derrière une longue.
 * L'attribution des colonnes est gloutonne — on réutilise la première colonne
 * libérée, ce qui suffit pour un agenda d'équipe.
 */
export function positionEvents(events: PlanEvent[], startHour: number = DEFAULT_START_HOUR): PositionedEvent[] {
  const timed = events
    .filter((e) => e.timed)
    .slice()
    .sort((a, b) => startMinutes(a) - startMinutes(b) || endMinutes(a) - endMinutes(b));
  if (timed.length === 0) return [];

  const top = startHour * 60;
  const out: PositionedEvent[] = [];

  // Découpe en groupes de chevauchement successifs.
  let group: PlanEvent[] = [];
  let groupEnd = -Infinity;

  const flush = () => {
    if (group.length === 0) return;
    const laneEnds: number[] = [];
    const placed = group.map((e) => {
      let lane = laneEnds.findIndex((end) => end <= startMinutes(e));
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(0);
      }
      laneEnds[lane] = endMinutes(e);
      return { e, lane };
    });
    const lanes = laneEnds.length;
    placed.forEach(({ e, lane }) =>
      out.push({
        event: e,
        offset: (startMinutes(e) - top) / SLOT_MINUTES,
        span: (endMinutes(e) - startMinutes(e)) / SLOT_MINUTES,
        lane,
        lanes,
      })
    );
    group = [];
    groupEnd = -Infinity;
  };

  for (const e of timed) {
    if (group.length > 0 && startMinutes(e) >= groupEnd) flush();
    group.push(e);
    groupEnd = Math.max(groupEnd, endMinutes(e));
  }
  flush();
  return out;
}

export { sameDay };

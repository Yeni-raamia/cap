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
  id: string;
  kind: PlanEventKind;
  title: string;
  date: Date;
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
      kind: "tache",
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
        kind: "tache-projet",
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
        kind: "projet",
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
      kind: "reunion",
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

export { sameDay };

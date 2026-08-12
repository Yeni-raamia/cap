/* ==================================================================
 *  lib/db/recurrences.ts — Gabarits de tâches récurrentes (serveur).
 *
 *  Un gabarit ne se coche pas : il engendre de vraies tâches, une par
 *  jour d'occurrence. La génération est idempotente — elle s'appuie sur
 *  `last_run_on`, donc l'appeler dix fois dans la journée ne crée pas
 *  dix tâches.
 * ================================================================== */
import { randomUUID } from "node:crypto";
import { getDb } from "./index";
import { insertNotification } from "./repo";
import {
  RECURRENCE_ASSIGN_MODES,
  RECURRENCE_FREQUENCIES,
  TASK_PRIORITIES,
  type RecurrenceAssignMode,
  type RecurrenceFrequency,
  type TaskPriority,
  type TaskRecurrence,
} from "@/lib/domain";
import { toDayInput } from "@/lib/period";
import { assigneeFor, dueDateFor, dueOccurrences } from "@/lib/recurrence";

interface RecurrenceRow {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  project_id: string | null;
  frequency: RecurrenceFrequency;
  weekdays: string;
  month_day: number;
  interval_days: number;
  assign_mode: RecurrenceAssignMode;
  assignee_id: string | null;
  rotation_ids: string;
  rotation_index: number;
  due_offset_days: number;
  start_date: string;
  end_date: string | null;
  max_occurrences: number | null;
  active: number;
  last_run_on: string | null;
  occurrences_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const parseJson = <T,>(raw: string, fallback: T): T => {
  try {
    const v = JSON.parse(raw || "null");
    return v ?? fallback;
  } catch {
    return fallback;
  }
};

function mapRecurrence(r: RecurrenceRow): TaskRecurrence {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    priority: r.priority,
    projectId: r.project_id,
    frequency: r.frequency,
    weekdays: parseJson<number[]>(r.weekdays, []),
    monthDay: r.month_day,
    intervalDays: r.interval_days,
    assignMode: r.assign_mode,
    assigneeId: r.assignee_id,
    rotationIds: parseJson<string[]>(r.rotation_ids, []),
    rotationIndex: r.rotation_index,
    dueOffsetDays: r.due_offset_days,
    startDate: new Date(r.start_date),
    endDate: r.end_date ? new Date(r.end_date) : null,
    maxOccurrences: r.max_occurrences,
    active: r.active === 1,
    lastRunOn: r.last_run_on,
    occurrencesCount: r.occurrences_count,
    createdBy: r.created_by,
    createdAt: new Date(r.created_at),
    updatedAt: new Date(r.updated_at),
  };
}

/* ---------- Normalisation des entrées ----------
 * Les valeurs viennent d'un formulaire : on les ramène dans leur domaine
 * plutôt que de faire confiance au client. */

const isFrequency = (v: unknown): v is RecurrenceFrequency =>
  RECURRENCE_FREQUENCIES.some((f) => f.key === v);
const isAssignMode = (v: unknown): v is RecurrenceAssignMode =>
  RECURRENCE_ASSIGN_MODES.some((m) => m.key === v);

const cleanWeekdays = (v: unknown): number[] =>
  Array.isArray(v) ? [...new Set(v.map(Number).filter((n) => n >= 1 && n <= 7))].sort((a, b) => a - b) : [];

const clampInt = (v: unknown, min: number, max: number, fallback: number): number => {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};

export interface RecurrenceInput {
  title: string;
  description?: string;
  priority?: unknown;
  projectId?: string | null;
  frequency?: unknown;
  weekdays?: unknown;
  monthDay?: unknown;
  intervalDays?: unknown;
  assignMode?: unknown;
  assigneeId?: string | null;
  rotationIds?: unknown;
  dueOffsetDays?: unknown;
  startDate?: string | null;
  endDate?: string | null;
  maxOccurrences?: unknown;
  active?: boolean;
}

/** Champs normalisés, prêts pour l'insertion ou la mise à jour. */
function normalize(input: RecurrenceInput, previous?: RecurrenceRow) {
  const frequency = isFrequency(input.frequency) ? input.frequency : (previous?.frequency ?? "quotidien");
  const assignMode = isAssignMode(input.assignMode) ? input.assignMode : (previous?.assign_mode ?? "libre");
  const rotationIds = Array.isArray(input.rotationIds)
    ? [...new Set(input.rotationIds.filter((x): x is string => typeof x === "string" && !!x))]
    : parseJson<string[]>(previous?.rotation_ids ?? "[]", []);

  return {
    title: (input.title ?? previous?.title ?? "").trim(),
    description: input.description !== undefined ? String(input.description) : (previous?.description ?? ""),
    priority: (TASK_PRIORITIES.includes(input.priority as TaskPriority)
      ? input.priority
      : (previous?.priority ?? "Normale")) as TaskPriority,
    projectId: input.projectId !== undefined ? input.projectId || null : (previous?.project_id ?? null),
    frequency,
    weekdays: JSON.stringify(
      input.weekdays !== undefined ? cleanWeekdays(input.weekdays) : parseJson<number[]>(previous?.weekdays ?? "[]", [])
    ),
    monthDay: clampInt(input.monthDay, 1, 31, previous?.month_day ?? 1),
    intervalDays: clampInt(input.intervalDays, 1, 365, previous?.interval_days ?? 1),
    assignMode,
    // Un responsable fixe n'a de sens qu'en mode « fixe » : on efface sinon,
    // pour qu'un changement de mode ne laisse pas de valeur fantôme.
    assigneeId: assignMode === "fixe" ? (input.assigneeId !== undefined ? input.assigneeId || null : (previous?.assignee_id ?? null)) : null,
    rotationIds: JSON.stringify(assignMode === "rotation" ? rotationIds : []),
    dueOffsetDays: clampInt(input.dueOffsetDays, 0, 365, previous?.due_offset_days ?? 0),
    startDate: input.startDate ? input.startDate : (previous?.start_date ?? new Date().toISOString()),
    endDate: input.endDate !== undefined ? input.endDate || null : (previous?.end_date ?? null),
    maxOccurrences:
      input.maxOccurrences === undefined
        ? (previous?.max_occurrences ?? null)
        : input.maxOccurrences === null || input.maxOccurrences === ""
          ? null
          : clampInt(input.maxOccurrences, 1, 10000, 1),
    active: input.active !== undefined ? (input.active ? 1 : 0) : (previous?.active ?? 1),
  };
}

/* ---------- Lecture ---------- */

export function listRecurrences(): TaskRecurrence[] {
  const rows = getDb()
    .prepare("select * from task_recurrences order by active desc, title collate nocase")
    .all() as RecurrenceRow[];
  return rows.map(mapRecurrence);
}

export function getRecurrence(id: string): TaskRecurrence | null {
  const r = getDb().prepare("select * from task_recurrences where id=?").get(id) as RecurrenceRow | undefined;
  return r ? mapRecurrence(r) : null;
}

/* ---------- Écriture ---------- */

export function createRecurrence(input: RecurrenceInput & { createdBy: string }): string {
  const id = randomUUID();
  const f = normalize(input);
  getDb()
    .prepare(
      "insert into task_recurrences (id, title, description, priority, project_id, frequency, weekdays, month_day, " +
        "interval_days, assign_mode, assignee_id, rotation_ids, rotation_index, due_offset_days, start_date, end_date, " +
        "max_occurrences, active, created_by) values (?,?,?,?,?,?,?,?,?,?,?,?,0,?,?,?,?,?,?)"
    )
    .run(
      id,
      f.title,
      f.description,
      f.priority,
      f.projectId,
      f.frequency,
      f.weekdays,
      f.monthDay,
      f.intervalDays,
      f.assignMode,
      f.assigneeId,
      f.rotationIds,
      f.dueOffsetDays,
      f.startDate,
      f.endDate,
      f.maxOccurrences,
      f.active,
      input.createdBy
    );
  return id;
}

export function updateRecurrence(id: string, input: RecurrenceInput): void {
  const cur = getDb().prepare("select * from task_recurrences where id=?").get(id) as RecurrenceRow | undefined;
  if (!cur) return;
  const f = normalize(input, cur);
  getDb()
    .prepare(
      "update task_recurrences set title=?, description=?, priority=?, project_id=?, frequency=?, weekdays=?, " +
        "month_day=?, interval_days=?, assign_mode=?, assignee_id=?, rotation_ids=?, due_offset_days=?, start_date=?, " +
        "end_date=?, max_occurrences=?, active=?, updated_at=? where id=?"
    )
    .run(
      f.title,
      f.description,
      f.priority,
      f.projectId,
      f.frequency,
      f.weekdays,
      f.monthDay,
      f.intervalDays,
      f.assignMode,
      f.assigneeId,
      f.rotationIds,
      f.dueOffsetDays,
      f.startDate,
      f.endDate,
      f.maxOccurrences,
      f.active,
      new Date().toISOString(),
      id
    );
}

export function setRecurrenceActive(id: string, active: boolean): void {
  getDb()
    .prepare("update task_recurrences set active=?, updated_at=? where id=?")
    .run(active ? 1 : 0, new Date().toISOString(), id);
}

/**
 * Supprime un gabarit. Les occurrences déjà engendrées sont conservées
 * (c'est du travail réel, parfois déjà fait) mais détachées de la série.
 */
export function deleteRecurrence(id: string): void {
  const db = getDb();
  const tx = db.transaction(() => {
    db.prepare("update tasks set recurrence_id=null where recurrence_id=?").run(id);
    db.prepare("delete from task_recurrences where id=?").run(id);
  });
  tx();
}

/** Nombre d'occurrences déjà engendrées et encore présentes, par gabarit. */
export function recurrenceTaskCounts(): Map<string, { total: number; open: number }> {
  const rows = getDb()
    .prepare(
      "select recurrence_id as id, count(*) as total, sum(case when status <> 'fait' then 1 else 0 end) as open " +
        "from tasks where recurrence_id is not null group by recurrence_id"
    )
    .all() as { id: string; total: number; open: number }[];
  return new Map(rows.map((r) => [r.id, { total: r.total, open: r.open ?? 0 }]));
}

/* ---------- Génération des occurrences ---------- */

export interface GenerationResult {
  created: number;
  /** Titres engendrés, pour le compte rendu du cron. */
  titles: string[];
}

/**
 * Engendre les occurrences dues de toutes les séries actives.
 *
 * Idempotent : `last_run_on` avance à mesure, donc un second appel le même
 * jour ne produit rien. Appelé par le moteur de rappels (cron) et, à défaut
 * de cron, paresseusement à la lecture des tâches.
 */
export function generateDueTasks(now: Date = new Date()): GenerationResult {
  const db = getDb();
  const rows = db.prepare("select * from task_recurrences where active=1").all() as RecurrenceRow[];
  const result: GenerationResult = { created: 0, titles: [] };
  // Notifications émises hors transaction : une écriture qui échoue ne doit
  // pas annuler la création des tâches elles-mêmes.
  const toNotify: { userId: string; title: string }[] = [];

  for (const row of rows) {
    const rec = mapRecurrence(row);
    const days = dueOccurrences(rec, now);
    if (days.length === 0) continue;

    let index = rec.rotationIndex;
    let count = rec.occurrencesCount;

    const tx = db.transaction(() => {
      for (const day of days) {
        const assignee = assigneeFor(rec.assignMode, {
          assigneeId: rec.assigneeId,
          rotationIds: rec.rotationIds,
          index,
        });
        const occKey = toDayInput(day);
        db.prepare(
          "insert into tasks (id, title, description, assignee_id, created_by, project_id, status, priority, " +
            "start_date, due_date, published, recurrence_id, occurrence_date) values (?,?,?,?,?,?,?,?,?,?,1,?,?)"
        ).run(
          randomUUID(),
          rec.title,
          rec.description,
          assignee,
          rec.createdBy,
          rec.projectId,
          "à faire",
          rec.priority,
          day.toISOString(),
          dueDateFor(day, rec.dueOffsetDays).toISOString(),
          rec.id,
          occKey
        );
        if (assignee) toNotify.push({ userId: assignee, title: rec.title });
        if (rec.assignMode === "rotation") index++;
        count++;
        result.created++;
        result.titles.push(rec.title);
      }
      db.prepare(
        "update task_recurrences set last_run_on=?, rotation_index=?, occurrences_count=?, updated_at=? where id=?"
      ).run(toDayInput(days[days.length - 1]), index, count, new Date().toISOString(), rec.id);
    });
    tx();
  }

  toNotify.forEach(({ userId, title }) =>
    insertNotification({
      userId,
      itemId: null,
      kind: "tache",
      message: `Tâche récurrente du jour : « ${title} ».`,
      channel: ["in-app"],
      link: "/productivite",
    })
  );

  return result;
}

"use client";

import { useMemo } from "react";
import {
  Ban,
  CalendarClock,
  CheckSquare,
  FolderKanban,
  ListChecks,
  Repeat,
  Timer,
  UserRound,
} from "lucide-react";
import {
  fmt,
  formatWorkload,
  isTaskLate,
  subtaskProgress,
  TASK_STATUTS,
  type Task,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/domain";
import { useApp } from "./app-context";
import { Avatar, Card } from "./atoms";

export type TaskView = "liste" | "kanban" | "groupe";

/** Bande de couleur en tête de carte : la priorité doit se voir sans lire. */
const PRIORITY_BAR: Record<TaskPriority, string> = {
  Basse: "bg-slate-300",
  Normale: "bg-sky-400",
  Haute: "bg-amber-400",
  Urgente: "bg-rose-500",
};
const PRIORITY_CHIP: Record<TaskPriority, string> = {
  Basse: "bg-slate-100 text-slate-500 border-slate-200",
  Normale: "bg-sky-50 text-sky-700 border-sky-200",
  Haute: "bg-amber-50 text-amber-700 border-amber-200",
  Urgente: "bg-rose-50 text-rose-700 border-rose-200",
};
const STATUS_CHIP: Record<TaskStatus, string> = {
  "à faire": "bg-slate-100 text-slate-600 border-slate-200",
  "en cours": "bg-sky-100 text-sky-700 border-sky-200",
  fait: "bg-emerald-100 text-emerald-700 border-emerald-200",
  bloqué: "bg-rose-100 text-rose-700 border-rose-200",
};

/**
 * Carte de tâche.
 *
 * Une ligne de texte ne suffisait pas : on ne « sentait » pas la présence des
 * tâches. La carte porte une bande de priorité, le statut, la personne
 * assignée, le projet, l'échéance, l'avancement des sous-tâches et la charge —
 * de quoi décider sans avoir à l'ouvrir.
 */
export function TaskCard({
  t,
  onOpen,
  showStatus = true,
  showAssignee = true,
}: {
  t: Task;
  onOpen: (id: string) => void;
  showStatus?: boolean;
  showAssignee?: boolean;
}) {
  const { now, projects, profileById } = useApp();
  const late = isTaskLate(t, now);
  const prog = subtaskProgress(t);
  const proj = t.projectId ? projects.find((p) => p.id === t.projectId) : null;
  const who = t.assigneeId ? profileById(t.assigneeId) : null;
  const done = t.status === "fait";

  return (
    <button
      onClick={() => onOpen(t.id)}
      className={`group relative w-full text-left overflow-hidden rounded-xl border bg-white dark:bg-slate-900 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all ${
        late ? "border-rose-200 dark:border-rose-500/30" : "border-slate-200/80 dark:border-slate-800"
      }`}
    >
      {/* Bande de priorité */}
      <span className={`absolute inset-y-0 left-0 w-1 ${done ? "bg-emerald-400" : PRIORITY_BAR[t.priority]}`} aria-hidden />

      <div className="pl-3.5 pr-3 py-2.5">
        <div className="flex items-start gap-2">
          {t.recurrenceId && <Repeat size={12} className="text-violet-500 mt-1 shrink-0" aria-label="Tâche récurrente" />}
          <span
            className={`flex-1 min-w-0 text-[13.5px] font-medium leading-snug ${
              done ? "text-slate-400 line-through" : "text-slate-800 dark:text-slate-100"
            } group-hover:text-violet-700 dark:group-hover:text-violet-300`}
          >
            {t.title}
          </span>
          <span className={`shrink-0 text-[9.5px] font-medium px-1.5 py-0.5 rounded-full border ${PRIORITY_CHIP[t.priority]}`}>
            {t.priority}
          </span>
        </div>

        {/* Ligne d'informations — ce qui permet de décider sans ouvrir */}
        <div className="flex items-center gap-x-2.5 gap-y-1 mt-1.5 flex-wrap text-[11px]">
          {showStatus && (
            <span className={`px-1.5 py-0.5 rounded-full border font-medium ${STATUS_CHIP[t.status]}`}>{t.status}</span>
          )}

          {showAssignee &&
            (who ? (
              <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300">
                <Avatar init={who.init} size="h-4 w-4" /> {who.nom}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-slate-400">
                <UserRound size={11} /> à prendre
              </span>
            ))}

          {proj && (
            <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 truncate max-w-[10rem]">
              <FolderKanban size={11} /> {proj.name}
            </span>
          )}

          {prog.total > 0 && (
            <span className="inline-flex items-center gap-1 text-violet-600 dark:text-violet-400" title={`${prog.done} sur ${prog.total} sous-tâches`}>
              <ListChecks size={11} /> {prog.done}/{prog.total}
            </span>
          )}

          {(t.estimatedMinutes || (t.spentMinutes ?? 0) > 0) && (
            <span
              className="inline-flex items-center gap-1 text-slate-500"
              title={`Estimé ${formatWorkload(t.estimatedMinutes)} · passé ${formatWorkload(t.spentMinutes ?? 0)}`}
            >
              <Timer size={11} />
              {formatWorkload(t.spentMinutes ?? 0)}
              {t.estimatedMinutes ? ` / ${formatWorkload(t.estimatedMinutes)}` : ""}
            </span>
          )}

          {t.dueDate && (
            <span className={`inline-flex items-center gap-1 ml-auto font-medium ${late ? "text-rose-600" : "text-slate-500"}`}>
              <CalendarClock size={11} /> {fmt(t.dueDate)}
              {late && " · en retard"}
            </span>
          )}
        </div>

        {t.status === "bloqué" && t.blockedReason && (
          <div className="mt-1.5 flex items-start gap-1 text-[11px] text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/20 rounded-lg px-2 py-1">
            <Ban size={11} className="mt-px shrink-0" />
            <span className="line-clamp-2">{t.blockedReason}</span>
          </div>
        )}
      </div>
    </button>
  );
}

/**
 * Liste de tâches en trois présentations : liste dense, tableau par statut
 * (kanban), ou regroupement par personne.
 */
export function TaskList({
  tasks,
  view,
  onOpen,
  emptyLabel = "Aucune tâche.",
  showAssignee = true,
}: {
  tasks: Task[];
  view: TaskView;
  onOpen: (id: string) => void;
  emptyLabel?: string;
  showAssignee?: boolean;
}) {
  const { profileById } = useApp();

  const byPerson = useMemo(() => {
    const m = new Map<string, Task[]>();
    tasks.forEach((t) => {
      const k = t.assigneeId ?? "";
      m.set(k, [...(m.get(k) ?? []), t]);
    });
    // Le plus chargé en premier ; les tâches sans responsable en dernier.
    return [...m.entries()].sort((a, b) => (a[0] === "" ? 1 : b[0] === "" ? -1 : b[1].length - a[1].length));
  }, [tasks]);

  if (tasks.length === 0) {
    return (
      <Card className="p-8 text-center">
        <CheckSquare size={22} className="mx-auto text-slate-300 mb-1.5" />
        <div className="text-[13px] text-slate-400">{emptyLabel}</div>
      </Card>
    );
  }

  if (view === "kanban") {
    return (
      <div className="grid md:grid-cols-4 gap-3">
        {TASK_STATUTS.map((st) => {
          const col = tasks.filter((t) => t.status === st);
          return (
            <div key={st} className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-2">
              <div className="flex items-center justify-between px-1 pb-2">
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${STATUS_CHIP[st]}`}>{st}</span>
                <span className="text-[11px] text-slate-400 font-mono">{col.length}</span>
              </div>
              <div className="space-y-2">
                {col.map((t) => (
                  <TaskCard key={t.id} t={t} onOpen={onOpen} showStatus={false} showAssignee={showAssignee} />
                ))}
                {col.length === 0 && <div className="text-[11px] text-slate-300 text-center py-3">—</div>}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (view === "groupe") {
    return (
      <div className="space-y-4">
        {byPerson.map(([personId, list]) => {
          const p = personId ? profileById(personId) : null;
          return (
            <div key={personId || "sans"}>
              <div className="flex items-center gap-2 mb-1.5">
                {p ? <Avatar init={p.init} size="h-6 w-6" /> : <UserRound size={15} className="text-slate-400" />}
                <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">{p ? p.nom : "À prendre"}</span>
                <span className="text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                  {list.length}
                </span>
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                {list.map((t) => (
                  <TaskCard key={t.id} t={t} onOpen={onOpen} showAssignee={false} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
      {tasks.map((t) => (
        <TaskCard key={t.id} t={t} onOpen={onOpen} showAssignee={showAssignee} />
      ))}
    </div>
  );
}

/** Sélecteur de présentation, partagé par les écrans qui listent des tâches. */
export function TaskViewSwitch({ value, onChange }: { value: TaskView; onChange: (v: TaskView) => void }) {
  const VIEWS: { id: TaskView; label: string }[] = [
    { id: "liste", label: "Liste" },
    { id: "kanban", label: "Kanban" },
    { id: "groupe", label: "Par personne" },
  ];
  return (
    <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 text-[12px] bg-white dark:bg-slate-900">
      {VIEWS.map((v) => (
        <button
          key={v.id}
          onClick={() => onChange(v.id)}
          aria-pressed={value === v.id}
          className={`px-2.5 py-1.5 rounded-md font-medium transition ${
            value === v.id ? "bg-emerald-600 text-white" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          {v.label}
        </button>
      ))}
    </div>
  );
}

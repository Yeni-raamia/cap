"use client";

import { useState, type RefObject } from "react";
import { ListTodo, Plus, Repeat } from "lucide-react";
import { TASK_PRIORITIES, type RecurrenceFrequency, type TaskPriority } from "@/lib/domain";
import { parseDay, toDayInput } from "@/lib/period";
import { describeFrequency, isoWeekday } from "@/lib/recurrence";
import { useApp } from "./app-context";

/**
 * Rythmes proposés à la création. La récurrence se règle ici, au moment où
 * l'on crée la tâche — et non dans un écran séparé : c'est la même intention
 * (« ça, il faut le faire tous les jours »), elle mérite un seul geste.
 */
const REPEAT_OPTIONS: { key: "" | RecurrenceFrequency; label: string }[] = [
  { key: "", label: "Ne pas répéter" },
  { key: "quotidien", label: "Chaque jour" },
  { key: "jours_ouvres", label: "Chaque jour ouvré" },
  { key: "hebdomadaire", label: "Chaque semaine" },
  { key: "mensuel", label: "Chaque mois" },
];

/**
 * Formulaire de création de tâche, partagé par Productivité et Mon espace.
 *
 * Quand un rythme est choisi, on ne crée pas une tâche isolée mais une série :
 * celle-ci engendre immédiatement l'occurrence du jour, puis les suivantes,
 * toujours attribuées à la même personne.
 */
export function NewTaskForm({
  canAssignOthers,
  fixedAssignee,
  compact,
  inputRef,
  onCreate,
}: {
  canAssignOthers: boolean;
  /** Assignation imposée (panneau d'un membre) : masque le sélecteur. */
  fixedAssignee?: string;
  /** Version resserrée, sans encadré ni titre. */
  compact?: boolean;
  inputRef?: RefObject<HTMLInputElement | null>;
  onCreate: (p: Promise<string | null>) => void;
}) {
  const { profiles, taskAction, recurrenceAction, me, now, profileById } = useApp();
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState(fixedAssignee ?? me.id);
  const [priority, setPriority] = useState<TaskPriority>("Normale");
  const [start, setStart] = useState("");
  const [due, setDue] = useState("");
  const [repeat, setRepeat] = useState<"" | RecurrenceFrequency>("");

  const assigneeId = fixedAssignee ?? assignee;
  const firstDay = parseDay(start) ?? now;

  const submit = async () => {
    if (!title.trim()) return;

    if (repeat) {
      // Série récurrente : le responsable choisi vaut pour toutes les occurrences.
      onCreate(
        recurrenceAction("create", {
          title: title.trim(),
          priority,
          assignMode: assigneeId ? "fixe" : "libre",
          assigneeId: assigneeId || null,
          frequency: repeat,
          weekdays: repeat === "hebdomadaire" ? [isoWeekday(firstDay)] : [],
          monthDay: repeat === "mensuel" ? firstDay.getDate() : 1,
          startDate: start || toDayInput(now),
          dueOffsetDays: 0,
        })
      );
    } else {
      onCreate(
        taskAction("create", {
          title: title.trim(),
          assigneeId,
          priority,
          startDate: start || null,
          dueDate: due || null,
        })
      );
    }

    setTitle("");
    setStart("");
    setDue("");
    setPriority("Normale");
    setRepeat("");
  };

  // Aperçu du rythme choisi, à partir des valeurs saisies.
  const preview =
    repeat &&
    describeFrequency({
      frequency: repeat,
      weekdays: [isoWeekday(firstDay)],
      monthDay: firstDay.getDate(),
      intervalDays: 1,
    });
  const who = assigneeId ? profileById(assigneeId) : null;

  const fieldCls = "text-[12px] border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-900";

  return (
    <div
      className={
        compact
          ? ""
          : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-soft"
      }
    >
      {!compact && (
        <div className="flex items-center gap-2 mb-2">
          <ListTodo size={15} className="text-violet-500" />
          <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">Nouvelle tâche</span>
        </div>
      )}

      <div className="flex items-end gap-2 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <input
            ref={inputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder={fixedAssignee ? "Assigner une tâche…" : "Que faut-il faire ?"}
            aria-label="Intitulé de la tâche"
            className={`w-full ${compact ? "text-[13px]" : "text-[14px]"} border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 focus:border-emerald-400 outline-none`}
          />
        </div>

        {canAssignOthers && !fixedAssignee && (
          <select value={assignee} onChange={(e) => setAssignee(e.target.value)} aria-label="Assigné à" className={fieldCls}>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>{p.id === me.id ? "Moi" : p.nom}</option>
            ))}
          </select>
        )}

        <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} aria-label="Priorité" className={fieldCls}>
          {TASK_PRIORITIES.map((p) => <option key={p}>{p}</option>)}
        </select>

        <input
          type="date"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          aria-label={repeat ? "Première occurrence" : "Début prévu"}
          title={repeat ? "Première occurrence" : "Début prévu"}
          className={fieldCls}
        />
        <input
          type="date"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          disabled={!!repeat}
          aria-label="Échéance"
          title={repeat ? "Pour une tâche répétée, l'échéance est le jour de chaque occurrence" : "Échéance"}
          className={`${fieldCls} disabled:opacity-40`}
        />

        <select
          value={repeat}
          onChange={(e) => setRepeat(e.target.value as "" | RecurrenceFrequency)}
          aria-label="Répétition"
          title="Répéter cette tâche automatiquement"
          className={`${fieldCls} ${repeat ? "border-violet-300 text-violet-700 font-medium" : ""}`}
        >
          {REPEAT_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
        </select>

        <button
          onClick={submit}
          disabled={!title.trim()}
          className="flex items-center gap-1 text-[13px] font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 rounded-lg px-3.5 py-2"
        >
          <Plus size={15} /> {fixedAssignee ? "Assigner" : "Ajouter"}
        </button>
      </div>

      {repeat && (
        <div className="mt-2 flex items-start gap-1.5 text-[11.5px] text-violet-800 dark:text-violet-200 bg-violet-50 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900 rounded-lg px-2.5 py-1.5">
          <Repeat size={13} className="mt-px shrink-0" />
          <span>
            {preview}, à partir du {firstDay.toLocaleDateString("fr-FR", { day: "2-digit", month: "long" })}
            {who ? ` — toujours pour ${who.id === me.id ? "moi" : who.nom}` : " — sans responsable, à prendre"}.
            Une nouvelle tâche sera créée à chaque fois ; retrouvez et modifiez la série dans l&apos;onglet « Tâches récurrentes ».
          </span>
        </div>
      )}
    </div>
  );
}

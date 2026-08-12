"use client";

import { useState } from "react";
import { Repeat, Trash2, X } from "lucide-react";
import {
  RECURRENCE_ASSIGN_MODES,
  RECURRENCE_FREQUENCIES,
  TASK_PRIORITIES,
  WEEKDAYS,
  type RecurrenceAssignMode,
  type RecurrenceFrequency,
  type TaskPriority,
  type TaskRecurrence,
} from "@/lib/domain";
import { toDayInput } from "@/lib/period";
import { describeFrequency, nextOccurrence } from "@/lib/recurrence";
import { useApp } from "./app-context";

const inputCls =
  "w-full text-[13px] border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 bg-white dark:bg-slate-900 focus:border-emerald-400 outline-none";
const labelCls = "block text-[11px] font-medium text-slate-500 mb-1";

/** Création / édition d'un gabarit de tâche récurrente. */
export function RecurrenceModal({
  recurrence,
  onClose,
}: {
  /** Gabarit à modifier, ou null pour une création. */
  recurrence: TaskRecurrence | null;
  onClose: () => void;
}) {
  const { profiles, projects, me, now, recurrenceAction } = useApp();
  const canAssignOthers = ["manager", "directeur", "admin"].includes(me.role);

  const [title, setTitle] = useState(recurrence?.title ?? "");
  const [description, setDescription] = useState(recurrence?.description ?? "");
  const [priority, setPriority] = useState<TaskPriority>(recurrence?.priority ?? "Normale");
  const [projectId, setProjectId] = useState(recurrence?.projectId ?? "");
  const [frequency, setFrequency] = useState<RecurrenceFrequency>(recurrence?.frequency ?? "jours_ouvres");
  const [weekdays, setWeekdays] = useState<number[]>(recurrence?.weekdays ?? [1]);
  const [monthDay, setMonthDay] = useState(String(recurrence?.monthDay ?? 1));
  const [intervalDays, setIntervalDays] = useState(String(recurrence?.intervalDays ?? 2));
  const [assignMode, setAssignMode] = useState<RecurrenceAssignMode>(
    recurrence?.assignMode ?? (canAssignOthers ? "rotation" : "fixe")
  );
  const [assigneeId, setAssigneeId] = useState(recurrence?.assigneeId ?? me.id);
  const [rotationIds, setRotationIds] = useState<string[]>(recurrence?.rotationIds ?? []);
  const [dueOffsetDays, setDueOffsetDays] = useState(String(recurrence?.dueOffsetDays ?? 0));
  const [startDate, setStartDate] = useState(toDayInput(recurrence?.startDate ?? now));
  const [endDate, setEndDate] = useState(toDayInput(recurrence?.endDate ?? null));
  const [maxOccurrences, setMaxOccurrences] = useState(
    recurrence?.maxOccurrences === null || recurrence?.maxOccurrences === undefined ? "" : String(recurrence.maxOccurrences)
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const toggleWeekday = (v: number) =>
    setWeekdays((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v].sort((a, b) => a - b)));
  const toggleRotation = (id: string) =>
    setRotationIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  // Aperçu du rythme, calculé sur les valeurs du formulaire (pas encore enregistrées).
  const draft: TaskRecurrence = {
    id: recurrence?.id ?? "draft",
    title,
    description,
    priority,
    projectId: projectId || null,
    frequency,
    weekdays,
    monthDay: Number(monthDay) || 1,
    intervalDays: Number(intervalDays) || 1,
    assignMode,
    assigneeId: assigneeId || null,
    rotationIds,
    rotationIndex: recurrence?.rotationIndex ?? 0,
    dueOffsetDays: Number(dueOffsetDays) || 0,
    startDate: startDate ? new Date(`${startDate}T00:00:00`) : now,
    endDate: endDate ? new Date(`${endDate}T00:00:00`) : null,
    maxOccurrences: maxOccurrences ? Number(maxOccurrences) : null,
    active: recurrence?.active ?? true,
    lastRunOn: recurrence?.lastRunOn ?? null,
    occurrencesCount: recurrence?.occurrencesCount ?? 0,
    createdBy: recurrence?.createdBy ?? me.id,
    createdAt: recurrence?.createdAt ?? now,
    updatedAt: now,
  };
  const next = nextOccurrence(draft, now);

  const invalid =
    !title.trim() ||
    (frequency === "hebdomadaire" && weekdays.length === 0) ||
    (assignMode === "rotation" && rotationIds.length === 0) ||
    (assignMode === "fixe" && !assigneeId);

  const save = async () => {
    if (invalid) return;
    setBusy(true);
    setErr(null);
    const e = await recurrenceAction(recurrence ? "update" : "create", {
      id: recurrence?.id,
      title: title.trim(),
      description,
      priority,
      projectId: projectId || null,
      frequency,
      weekdays,
      monthDay: Number(monthDay) || 1,
      intervalDays: Number(intervalDays) || 1,
      assignMode,
      assigneeId: assignMode === "fixe" ? assigneeId || null : null,
      rotationIds: assignMode === "rotation" ? rotationIds : [],
      dueOffsetDays: Number(dueOffsetDays) || 0,
      startDate: startDate || toDayInput(now),
      endDate: endDate || null,
      maxOccurrences: maxOccurrences ? Number(maxOccurrences) : null,
    });
    setBusy(false);
    if (e) setErr(e);
    else onClose();
  };

  const remove = async () => {
    if (!recurrence) return;
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        "Supprimer cette tâche récurrente ? Les occurrences déjà créées sont conservées, mais plus aucune ne sera engendrée."
      )
    )
      return;
    setBusy(true);
    const e = await recurrenceAction("delete", { id: recurrence.id });
    setBusy(false);
    if (e) setErr(e);
    else onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto animate-fade" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-xl my-8 max-h-[90vh] overflow-y-auto animate-pop" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3 p-4 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
          <Repeat size={20} className="text-violet-600 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-semibold text-slate-800 dark:text-slate-100">
              {recurrence ? "Modifier la tâche récurrente" : "Nouvelle tâche récurrente"}
            </div>
            <div className="text-[11.5px] text-slate-400">
              Le gabarit ne se coche pas : il crée une vraie tâche à chaque occurrence.
            </div>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        <div className="p-4 space-y-3">
          {err && <div className="text-[12px] text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{err}</div>}

          <div>
            <label className={labelCls} htmlFor="rec-title">Intitulé de la tâche</label>
            <input id="rec-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Revue des alertes du SIEM" className={inputCls} />
          </div>
          <div>
            <label className={labelCls} htmlFor="rec-desc">Description</label>
            <textarea id="rec-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Ce qu'il faut faire à chaque fois…" className={inputCls} />
          </div>

          {/* Rythme */}
          <div>
            <label className={labelCls} htmlFor="rec-freq">Rythme</label>
            <select id="rec-freq" value={frequency} onChange={(e) => setFrequency(e.target.value as RecurrenceFrequency)} className={inputCls}>
              {RECURRENCE_FREQUENCIES.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
            </select>
            <div className="text-[11px] text-slate-400 mt-1">
              {RECURRENCE_FREQUENCIES.find((f) => f.key === frequency)?.hint}
            </div>
          </div>

          {frequency === "hebdomadaire" && (
            <div>
              <span className={labelCls}>Jours de la semaine</span>
              <div className="flex items-center gap-1">
                {WEEKDAYS.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => toggleWeekday(d.value)}
                    title={d.label}
                    aria-pressed={weekdays.includes(d.value)}
                    className={`h-8 w-8 rounded-lg text-[12px] font-medium border transition ${
                      weekdays.includes(d.value)
                        ? "bg-violet-600 text-white border-violet-600"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    {d.short}
                  </button>
                ))}
              </div>
              {weekdays.length === 0 && <div className="text-[11px] text-rose-600 mt-1">Choisissez au moins un jour.</div>}
            </div>
          )}

          {frequency === "mensuel" && (
            <div>
              <label className={labelCls} htmlFor="rec-monthday">Jour du mois</label>
              <input id="rec-monthday" type="number" min={1} max={31} value={monthDay} onChange={(e) => setMonthDay(e.target.value)} className={inputCls} />
              <div className="text-[11px] text-slate-400 mt-1">Un jour au-delà de la fin du mois se replie sur le dernier jour (le 31 devient le 30 en avril).</div>
            </div>
          )}

          {frequency === "personnalise" && (
            <div>
              <label className={labelCls} htmlFor="rec-interval">Intervalle (jours)</label>
              <input id="rec-interval" type="number" min={1} max={365} value={intervalDays} onChange={(e) => setIntervalDays(e.target.value)} className={inputCls} />
            </div>
          )}

          {/* Attribution */}
          <div>
            <label className={labelCls} htmlFor="rec-mode">Attribution de chaque occurrence</label>
            <select id="rec-mode" value={assignMode} onChange={(e) => setAssignMode(e.target.value as RecurrenceAssignMode)} className={inputCls}>
              {RECURRENCE_ASSIGN_MODES.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
            <div className="text-[11px] text-slate-400 mt-1">
              {RECURRENCE_ASSIGN_MODES.find((m) => m.key === assignMode)?.hint}
            </div>
          </div>

          {assignMode === "fixe" && (
            <div>
              <label className={labelCls} htmlFor="rec-assignee">Responsable</label>
              <select id="rec-assignee" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className={inputCls}>
                {(canAssignOthers ? profiles : profiles.filter((p) => p.id === me.id)).map((p) => (
                  <option key={p.id} value={p.id}>{p.id === me.id ? "Moi" : p.nom}</option>
                ))}
              </select>
            </div>
          )}

          {assignMode === "rotation" && (
            <div>
              <span className={labelCls}>Personnes du roulement (dans l&apos;ordre de passage)</span>
              <div className="flex flex-wrap gap-1.5">
                {profiles.map((p) => {
                  const pos = rotationIds.indexOf(p.id);
                  const disabled = !canAssignOthers && p.id !== me.id;
                  return (
                    <button
                      key={p.id}
                      disabled={disabled}
                      onClick={() => toggleRotation(p.id)}
                      className={`text-[12px] rounded-full border px-2.5 py-1 transition disabled:opacity-40 ${
                        pos >= 0
                          ? "bg-violet-100 text-violet-800 border-violet-300"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      {pos >= 0 && <span className="font-mono mr-1">{pos + 1}.</span>}
                      {p.id === me.id ? "Moi" : p.nom}
                    </button>
                  );
                })}
              </div>
              {rotationIds.length === 0 && <div className="text-[11px] text-rose-600 mt-1">Choisissez au moins une personne.</div>}
              {!canAssignOthers && <div className="text-[11px] text-slate-400 mt-1">Seul un manager ou directeur peut inclure d&apos;autres personnes.</div>}
            </div>
          )}

          {/* Bornes */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} htmlFor="rec-start">Première occurrence</label>
              <input id="rec-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls} htmlFor="rec-end">Fin (facultatif)</label>
              <input id="rec-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls} htmlFor="rec-offset">Échéance : jours après l&apos;occurrence</label>
              <input id="rec-offset" type="number" min={0} max={365} value={dueOffsetDays} onChange={(e) => setDueOffsetDays(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls} htmlFor="rec-max">Nombre max. (facultatif)</label>
              <input id="rec-max" type="number" min={1} value={maxOccurrences} onChange={(e) => setMaxOccurrences(e.target.value)} placeholder="illimité" className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} htmlFor="rec-prio">Priorité</label>
              <select id="rec-prio" value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} className={inputCls}>
                {TASK_PRIORITIES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="rec-project">Projet rattaché</label>
              <select id="rec-project" value={projectId} onChange={(e) => setProjectId(e.target.value)} className={inputCls}>
                <option value="">— Aucun</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          {/* Aperçu */}
          <div className="rounded-lg bg-violet-50 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900 px-3 py-2 text-[12px] text-violet-900 dark:text-violet-200">
            <span className="font-medium">{describeFrequency(draft)}</span>
            {next && <> · prochaine occurrence le {next.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long" })}</>}
            {!next && <> · aucune occurrence à venir</>}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button onClick={save} disabled={busy || invalid} className="inline-flex items-center gap-1 text-[13px] font-semibold text-white bg-emerald-600 rounded-lg px-4 py-2 hover:bg-emerald-700 disabled:opacity-40">
              {recurrence ? "Enregistrer" : "Créer la série"}
            </button>
            <button onClick={onClose} className="text-[13px] text-slate-500 px-3 py-2">Annuler</button>
            {recurrence && (
              <button onClick={remove} disabled={busy} className="inline-flex items-center gap-1 text-[13px] font-medium text-rose-600 border border-rose-200 rounded-lg px-3 py-2 hover:bg-rose-50 ml-auto">
                <Trash2 size={14} /> Supprimer
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

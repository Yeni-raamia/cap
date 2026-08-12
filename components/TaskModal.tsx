"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarClock, Check, Globe, ListTodo, Lock, Plus, Repeat, Trash2, X } from "lucide-react";
import {
  fmt,
  isTaskLate,
  subtaskProgress,
  TASK_PRIORITIES,
  TASK_STATUTS,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/domain";
import { toDayInput } from "@/lib/period";
import { useApp } from "./app-context";
import { Avatar } from "./atoms";
import { ReportsSection } from "./ReportsSection";

const STATUS_STYLE: Record<TaskStatus, string> = {
  "à faire": "bg-slate-100 text-slate-600 border-slate-200",
  "en cours": "bg-sky-100 text-sky-700 border-sky-200",
  fait: "bg-emerald-100 text-emerald-700 border-emerald-200",
  bloqué: "bg-rose-100 text-rose-700 border-rose-200",
};

export function TaskModal() {
  const { openTaskId, setOpenTaskId, tasks, profiles, projects, me, now, taskAction, subtaskAction, publishTask, profileById } = useApp();
  const task = tasks.find((t) => t.id === openTaskId) ?? null;

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [newSub, setNewSub] = useState("");
  const [err, setErr] = useState<string | null>(null);

  // Synchronise les champs texte locaux quand la tâche ouverte change.
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDesc(task.description);
      setErr(null);
      setNewSub("");
    }
  }, [openTaskId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!task) return null;

  const canEdit = task.assigneeId === me.id || task.createdBy === me.id || ["manager", "directeur", "admin"].includes(me.role);
  const canAssign = ["manager", "directeur", "admin"].includes(me.role);
  const canDelete = task.createdBy === me.id || ["manager", "directeur", "admin"].includes(me.role);
  const late = isTaskLate(task, now);
  const prog = subtaskProgress(task);
  const proj = task.projectId ? projects.find((p) => p.id === task.projectId) : null;
  const assignee = task.assigneeId ? profileById(task.assigneeId) : null;
  const author = task.createdBy ? profileById(task.createdBy) : null;

  const run = async (p: Promise<string | null>) => {
    const e = await p;
    setErr(e);
  };
  const patch = (fields: Parameters<typeof taskAction>[1]) => run(taskAction("update", { id: task.id, ...fields }));

  const close = () => setOpenTaskId(null);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto animate-fade" onClick={close}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8 max-h-[90vh] overflow-y-auto animate-pop"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="flex items-start gap-3 p-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <ListTodo size={20} className="text-violet-600 mt-1 shrink-0" />
          <div className="flex-1 min-w-0">
            {canEdit ? (
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => title.trim() && title !== task.title && patch({ title: title.trim() })}
                className="w-full text-[15px] font-semibold text-slate-800 outline-none border-b border-transparent focus:border-slate-200"
              />
            ) : (
              <div className="text-[15px] font-semibold text-slate-800">{task.title}</div>
            )}
            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400 flex-wrap">
              {author && <span>Créée par {author.nom}</span>}
              {task.recurrenceId && (
                <span title="Occurrence d'une tâche récurrente" className="inline-flex items-center gap-1 text-violet-700 bg-violet-50 border border-violet-200 px-1.5 py-0.5 rounded-full">
                  <Repeat size={10} /> Récurrente
                </span>
              )}
              {proj && <Link href={`/projets/${proj.id}`} onClick={close} className="text-emerald-700 hover:underline">· {proj.name}</Link>}
              {late && <span className="text-rose-600 font-medium bg-rose-50 px-1.5 py-0.5 rounded">En retard</span>}
              {task.published === false && (
                <span title="Tâche privée — visible de vous (et de la personne assignée) tant qu'elle n'est pas publiée." className="inline-flex items-center gap-1 text-amber-800 font-medium bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded-full">
                  <Lock size={10} /> Privé
                </span>
              )}
            </div>
          </div>
          {task.published === false && (task.createdBy === me.id || ["manager", "directeur", "admin"].includes(me.role)) && (
            <button
              onClick={async () => {
                if (typeof window !== "undefined" && !window.confirm(
                  "Publier cette tâche la rendra visible par toute l'équipe. Cette action est définitive. Continuer ?"
                )) return;
                await publishTask(task.id);
              }}
              title="Publier : rendre visible par l'équipe (définitif)"
              className="shrink-0 inline-flex items-center gap-1 text-[12px] font-medium text-emerald-700 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 rounded-lg px-2.5 py-1.5"
            >
              <Globe size={13} /> Publier
            </button>
          )}
          <button onClick={close} aria-label="Fermer" className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        <div className="p-4 space-y-4">
          {err && <div className="text-[12px] text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{err}</div>}

          {/* Statut */}
          <div>
            <div className="text-[11px] font-medium text-slate-400 uppercase mb-1.5">Statut</div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {TASK_STATUTS.map((s) => (
                <button
                  key={s}
                  disabled={!canEdit}
                  onClick={() => patch({ status: s })}
                  className={`text-[12px] px-3 py-1.5 rounded-lg border font-medium transition ${
                    task.status === s ? STATUS_STYLE[s] : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                  } disabled:opacity-60`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Planification + méta */}
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Assigné à">
              {canAssign ? (
                <select
                  value={task.assigneeId ?? ""}
                  onChange={(e) => patch({ assigneeId: e.target.value || null })}
                  className="w-full text-[13px] border border-slate-200 rounded-lg px-2 py-1.5 bg-white"
                >
                  <option value="">— Personne</option>
                  {profiles.map((p) => <option key={p.id} value={p.id}>{p.id === me.id ? "Moi" : p.nom}</option>)}
                </select>
              ) : (
                <div className="flex items-center gap-1.5 text-[13px] text-slate-700 py-1.5">
                  {assignee ? <><Avatar init={assignee.init} size="h-5 w-5" /> {assignee.nom}</> : "—"}
                </div>
              )}
            </Field>
            <Field label="Priorité">
              <select
                value={task.priority}
                disabled={!canEdit}
                onChange={(e) => patch({ priority: e.target.value as TaskPriority })}
                className="w-full text-[13px] border border-slate-200 rounded-lg px-2 py-1.5 bg-white disabled:opacity-60"
              >
                {TASK_PRIORITIES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="Début prévu">
              {canEdit ? (
                <input type="date" value={toDayInput(task.startDate)} onChange={(e) => patch({ startDate: e.target.value || null })} className="w-full text-[13px] border border-slate-200 rounded-lg px-2 py-1.5" />
              ) : (
                <div className="text-[13px] text-slate-700 py-1.5">{task.startDate ? fmt(task.startDate) : "—"}</div>
              )}
            </Field>
            <Field label="Échéance">
              {canEdit ? (
                <input type="date" value={toDayInput(task.dueDate)} onChange={(e) => patch({ dueDate: e.target.value || null })} className={`w-full text-[13px] border rounded-lg px-2 py-1.5 ${late ? "border-rose-300" : "border-slate-200"}`} />
              ) : (
                <div className="text-[13px] text-slate-700 py-1.5">{task.dueDate ? fmt(task.dueDate) : "—"}</div>
              )}
            </Field>
            <Field label="Projet rattaché">
              {canEdit ? (
                <select
                  value={task.projectId ?? ""}
                  onChange={(e) => patch({ projectId: e.target.value || null })}
                  className="w-full text-[13px] border border-slate-200 rounded-lg px-2 py-1.5 bg-white"
                >
                  <option value="">— Aucun</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              ) : (
                <div className="text-[13px] text-slate-700 py-1.5">{proj ? proj.name : "—"}</div>
              )}
            </Field>
          </div>

          {/* Description */}
          <div>
            <div className="text-[11px] font-medium text-slate-400 uppercase mb-1.5">Description</div>
            {canEdit ? (
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                onBlur={() => desc !== task.description && patch({ description: desc })}
                rows={3}
                placeholder="Détails, contexte, critères…"
                className="w-full text-[13px] border border-slate-200 rounded-lg px-3 py-2"
              />
            ) : (
              <p className="text-[13px] text-slate-700 whitespace-pre-wrap">{task.description || "—"}</p>
            )}
          </div>

          {/* Sous-tâches */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-[11px] font-medium text-slate-400 uppercase">Sous-tâches</div>
              {prog.total > 0 && <span className="text-[11px] text-slate-500 font-mono">{prog.done}/{prog.total} · {prog.pct}%</span>}
            </div>
            {prog.total > 0 && (
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-2">
                <div className="h-full bg-violet-400" style={{ width: `${prog.pct}%` }} />
              </div>
            )}
            <div className="space-y-1">
              {task.subtasks.map((s) => (
                <div key={s.id} className="flex items-center gap-2 group">
                  <button
                    disabled={!canEdit}
                    onClick={() => run(subtaskAction("toggle", { subtaskId: s.id, done: !s.done }))}
                    aria-label={s.done ? "Marquer à faire" : "Marquer fait"}
                    className={`h-4 w-4 rounded border grid place-items-center shrink-0 ${s.done ? "bg-violet-500 border-violet-500 text-white" : "border-slate-300"} disabled:opacity-60`}
                  >
                    {s.done && <Check size={11} />}
                  </button>
                  <span className={`flex-1 text-[13px] ${s.done ? "text-slate-400 line-through" : "text-slate-700"}`}>{s.title}</span>
                  {canEdit && (
                    <button onClick={() => run(subtaskAction("delete", { subtaskId: s.id }))} aria-label="Supprimer" className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
              {task.subtasks.length === 0 && <div className="text-[12px] text-slate-400">Aucune sous-tâche.</div>}
            </div>
            {canEdit && (
              <div className="flex items-center gap-2 mt-2">
                <input
                  value={newSub}
                  onChange={(e) => setNewSub(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newSub.trim()) {
                      run(subtaskAction("add", { taskId: task.id, title: newSub.trim() }));
                      setNewSub("");
                    }
                  }}
                  placeholder="Ajouter une sous-tâche…"
                  className="flex-1 text-[13px] border border-slate-200 rounded-lg px-2.5 py-1.5"
                />
                <button
                  onClick={() => {
                    if (newSub.trim()) {
                      run(subtaskAction("add", { taskId: task.id, title: newSub.trim() }));
                      setNewSub("");
                    }
                  }}
                  className="flex items-center gap-1 text-[12px] font-medium text-violet-700 border border-violet-200 hover:bg-violet-50 rounded-lg px-2.5 py-1.5"
                >
                  <Plus size={14} /> Ajouter
                </button>
              </div>
            )}
          </div>

          {/* Comptes rendus de la tâche */}
          <ReportsSection refType="task" refId={task.id} refLabel={task.title} canWrite={canEdit} compact />

          {/* Pied */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <CalendarClock size={12} /> Créée le {fmt(task.createdAt)}
              {task.completedAt && <> · achevée le {fmt(task.completedAt)}</>}
            </div>
            {canDelete && (
              <button
                onClick={async () => {
                  const e = await taskAction("delete", { id: task.id });
                  if (e) setErr(e);
                  else close();
                }}
                className="flex items-center gap-1 text-[12px] text-rose-600 hover:bg-rose-50 rounded-lg px-2.5 py-1.5"
              >
                <Trash2 size={13} /> Supprimer
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-medium text-slate-400 uppercase mb-1">{label}</div>
      {children}
    </div>
  );
}

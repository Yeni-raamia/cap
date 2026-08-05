"use client";

import { useState } from "react";
import { CalendarClock, ListTodo, Trash2, X } from "lucide-react";
import {
  fmt,
  TASK_PRIORITIES,
  TASK_STATUTS,
  type Profile,
  type ProjectTask,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/domain";
import { useApp } from "./app-context";
import { Avatar } from "./atoms";

const toDateInput = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

/** Fiche d'édition d'une tâche de projet (titre, description, statut, priorité, responsable, échéance). */
export function ProjectTaskModal({
  task,
  team,
  canEdit,
  onClose,
}: {
  task: ProjectTask;
  team: Profile[];
  canEdit: boolean;
  onClose: () => void;
}) {
  const { projectTask, profileById } = useApp();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [assigneeId, setAssigneeId] = useState<string>(task.assigneeId ?? "");
  const [due, setDue] = useState<string>(toDateInput(task.dueDate));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const proposer = task.proposedBy ? profileById(task.proposedBy) : null;

  const save = async () => {
    if (!title.trim()) return;
    setBusy(true);
    setErr(null);
    const e = await projectTask("update", {
      taskId: task.id,
      title: title.trim(),
      description,
      status,
      priority,
      assigneeId: assigneeId || null,
      dueDate: due || null,
    });
    setBusy(false);
    if (e) setErr(e);
    else onClose();
  };

  const remove = async () => {
    if (typeof window !== "undefined" && !window.confirm("Supprimer cette tâche ?")) return;
    setBusy(true);
    const e = await projectTask("delete", { taskId: task.id });
    setBusy(false);
    if (e) setErr(e);
    else onClose();
  };

  const inputCls = "w-full text-[13px] border border-slate-200 rounded-lg px-2.5 py-2 focus:border-emerald-400 outline-none";
  const labelCls = "block text-[11px] font-medium text-slate-500 mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto animate-fade" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-8 max-h-[90vh] overflow-y-auto animate-pop" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3 p-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <ListTodo size={20} className="text-violet-600 mt-1 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-semibold text-slate-800">{canEdit ? "Éditer la tâche" : "Tâche"}</div>
            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400 flex-wrap">
              <span>Créée le {fmt(task.createdAt)}</span>
              {task.completedAt && <span className="text-emerald-600">· achevée le {fmt(task.completedAt)}</span>}
              {proposer && <span className="text-indigo-600">· proposée par {proposer.nom}</span>}
            </div>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        <div className="p-4 space-y-3">
          {err && <div className="text-[12px] text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{err}</div>}

          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1" htmlFor="pt-title">Intitulé</label>
            <input id="pt-title" value={title} onChange={(e) => setTitle(e.target.value)} disabled={!canEdit} className={inputCls} />
          </div>
          <div>
            <label className={labelCls} htmlFor="pt-desc">Description</label>
            <textarea id="pt-desc" value={description} onChange={(e) => setDescription(e.target.value)} disabled={!canEdit} rows={3} placeholder="Précisions…" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} htmlFor="pt-status">Statut</label>
              <select id="pt-status" value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)} disabled={!canEdit} className={`${inputCls} bg-white`}>
                {TASK_STATUTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="pt-prio">Priorité</label>
              <select id="pt-prio" value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} disabled={!canEdit} className={`${inputCls} bg-white`}>
                {TASK_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="pt-assignee">Responsable</label>
              <select id="pt-assignee" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} disabled={!canEdit} className={`${inputCls} bg-white`}>
                <option value="">— Non assignée</option>
                {team.map((u) => <option key={u.id} value={u.id}>{u.nom}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="pt-due">Échéance</label>
              <input id="pt-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} disabled={!canEdit} className={inputCls} />
            </div>
          </div>

          {task.assigneeId && (
            <div className="flex items-center gap-2 text-[12px] text-slate-500">
              <Avatar init={profileById(task.assigneeId).init} size="h-6 w-6" />
              {profileById(task.assigneeId).nom}
              {task.dueDate && <span className="inline-flex items-center gap-1 ml-1"><CalendarClock size={12} /> {fmt(task.dueDate)}</span>}
            </div>
          )}

          {canEdit && (
            <div className="flex items-center gap-2 pt-1">
              <button onClick={save} disabled={busy || !title.trim()} className="inline-flex items-center gap-1 text-[13px] font-semibold text-white bg-emerald-600 rounded-lg px-4 py-2 hover:bg-emerald-700 disabled:opacity-40">
                Enregistrer
              </button>
              <button onClick={remove} disabled={busy} className="inline-flex items-center gap-1 text-[13px] font-medium text-rose-600 border border-rose-200 rounded-lg px-3 py-2 hover:bg-rose-50 ml-auto">
                <Trash2 size={14} /> Supprimer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

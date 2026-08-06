"use client";

import { useState } from "react";
import { CalendarRange, Target, Trash2, X } from "lucide-react";
import {
  fmt,
  PLAN_CATEGORIES,
  PLAN_PRIORITIES,
  PLAN_QUARTERS,
  PLAN_STATUS,
  type GrcPlanItem,
} from "@/lib/domain";
import { useApp } from "./app-context";

const toDateInput = (d: Date | null | undefined) => (d ? new Date(d).toISOString().slice(0, 10) : "");
const YEAR = new Date().getFullYear();
const YEARS = [YEAR - 1, YEAR, YEAR + 1, YEAR + 2];

/** Fiche d'un chantier du plan de travail GRC : cadrage + avancement. */
export function PlanItemModal({ item, creating, onClose }: { item: GrcPlanItem | null; creating: boolean; onClose: () => void }) {
  const { demo, me, profiles, createPlanItem, updatePlanItem, deletePlanItem } = useApp();
  const canEdit = !demo;

  const [title, setTitle] = useState(item?.title ?? "");
  const [category, setCategory] = useState(item?.category ?? PLAN_CATEGORIES[0]);
  const [year, setYear] = useState(item?.year ?? YEAR);
  const [quarter, setQuarter] = useState(item?.quarter ?? PLAN_QUARTERS[0]);
  const [ownerId, setOwnerId] = useState(item?.ownerId ?? me.id);
  const [priority, setPriority] = useState(item?.priority ?? "Normale");
  const [status, setStatus] = useState(item?.status ?? "À planifier");
  const [progress, setProgress] = useState(item?.progress ?? 0);
  const [dueDate, setDueDate] = useState(toDateInput(item?.dueDate));
  const [description, setDescription] = useState(item?.description ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    if (!title.trim()) return;
    setBusy(true);
    setErr(null);
    const payload = { title: title.trim(), category, year, quarter, ownerId, priority, status, progress, dueDate: dueDate || null, description };
    const e = creating ? await createPlanItem(payload) : item ? await updatePlanItem(item.id, payload) : "—";
    setBusy(false);
    if (e) setErr(e);
    else onClose();
  };
  const remove = async () => {
    if (!item || (typeof window !== "undefined" && !window.confirm(`Supprimer le chantier « ${item.ref} » ?`))) return;
    setBusy(true);
    const e = await deletePlanItem(item.id);
    setBusy(false);
    if (e) setErr(e); else onClose();
  };

  const inputCls = "w-full text-[13px] border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 bg-white dark:bg-slate-900 focus:border-emerald-400 outline-none";
  const labelCls = "block text-[11px] font-medium text-slate-500 mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto animate-fade" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg my-8 max-h-[92vh] overflow-y-auto animate-pop" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3 p-4 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
          <Target size={20} className="text-emerald-600 mt-1 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-semibold text-slate-800 dark:text-slate-100">{creating ? "Nouveau chantier" : item?.ref}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Plan de travail de l&apos;équipe GRC</div>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        <div className="p-4 space-y-3">
          {err && <div className="text-[12px] text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{err}</div>}

          <div>
            <label className={labelCls}>Intitulé du chantier</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} disabled={!canEdit} placeholder="Ex. Campagne de sensibilisation phishing…" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Catégorie</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} disabled={!canEdit} className={inputCls}>
                {PLAN_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Responsable</label>
              <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} disabled={!canEdit} className={inputCls}>
                {profiles.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Année</label>
              <select value={year} onChange={(e) => setYear(Number(e.target.value))} disabled={!canEdit} className={inputCls}>
                {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Trimestre</label>
              <select value={quarter} onChange={(e) => setQuarter(e.target.value)} disabled={!canEdit} className={inputCls}>
                {PLAN_QUARTERS.map((q) => <option key={q} value={q}>{q}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Priorité</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)} disabled={!canEdit} className={inputCls}>
                {PLAN_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Échéance</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} disabled={!canEdit} className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Statut</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} disabled={!canEdit} className={inputCls}>
              {PLAN_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Avancement · <span className="font-mono text-slate-600">{status === "Terminé" ? 100 : progress}%</span></label>
            <input type="range" min={0} max={100} step={5} value={status === "Terminé" ? 100 : progress} onChange={(e) => setProgress(Number(e.target.value))} disabled={!canEdit || status === "Terminé"} className="w-full accent-emerald-500" />
          </div>
          <div>
            <label className={labelCls}>Description / livrables</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} disabled={!canEdit} rows={3} placeholder="Objectif, périmètre, livrables attendus…" className={inputCls} />
          </div>
          {item && <div className="text-[11px] text-slate-400 flex items-center gap-1"><CalendarRange size={12} /> Créé le {fmt(item.createdAt)} · maj {fmt(item.updatedAt)}</div>}
        </div>

        {canEdit && (
          <div className="flex items-center gap-2 p-4 border-t border-slate-100 dark:border-slate-800">
            <button onClick={save} disabled={busy || !title.trim()} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-slate-900 dark:bg-emerald-600 rounded-xl px-4 py-2 hover:-translate-y-0.5 transition-transform shadow-soft disabled:opacity-50">
              <Target size={15} /> {creating ? "Créer le chantier" : "Enregistrer"}
            </button>
            {!creating && item && (
              <button onClick={remove} disabled={busy} className="ml-auto inline-flex items-center gap-1 text-[12px] text-rose-600 border border-rose-200 rounded-lg px-3 py-2 hover:bg-rose-50 dark:hover:bg-rose-500/10"><Trash2 size={14} /> Supprimer</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

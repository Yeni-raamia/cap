"use client";

import { useState } from "react";
import { ListChecks, Plus, Trash2, X } from "lucide-react";
import { RUNBOOK_STATUS, SOC_PROCEDURE_FREQ, SOC_PROCEDURE_TYPES, type SocChecklistItem, type SocProcedure } from "@/lib/domain";
import { useApp } from "./app-context";

const inputCls = "w-full text-[13px] border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 bg-white dark:bg-slate-900 outline-none focus:border-emerald-400";
const labelCls = "block text-[11px] font-medium text-slate-500 mb-1";
const uid = () => `i-${Math.random().toString(36).slice(2, 10)}`;

export function SocProcedureModal({ procedure, creating, onClose }: { procedure: SocProcedure | null; creating: boolean; onClose: () => void }) {
  const { demo, me, profiles, createSocProcedure, updateSocProcedure, deleteSocProcedure } = useApp();
  const canEdit = !demo;

  const [title, setTitle] = useState(procedure?.title ?? "");
  const [type, setType] = useState(procedure?.type ?? SOC_PROCEDURE_TYPES[0]);
  const [frequency, setFrequency] = useState(procedure?.frequency ?? "Ponctuel");
  const [status, setStatus] = useState(procedure?.status ?? "Brouillon");
  const [ownerId, setOwnerId] = useState(procedure?.ownerId || me.id);
  const [objective, setObjective] = useState(procedure?.objective ?? "");
  const [content, setContent] = useState(procedure?.content ?? "");
  const [references, setReferences] = useState(procedure?.references ?? "");
  const [items, setItems] = useState<SocChecklistItem[]>(procedure?.items.map((i) => ({ ...i })) ?? []);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const addItem = () => setItems((a) => [...a, { id: uid(), label: "", guidance: "" }]);
  const patch = (id: string, f: Partial<SocChecklistItem>) => setItems((a) => a.map((it) => (it.id === id ? { ...it, ...f } : it)));
  const remove = (id: string) => setItems((a) => a.filter((it) => it.id !== id));
  const move = (id: string, dir: -1 | 1) => setItems((a) => {
    const i = a.findIndex((x) => x.id === id); const j = i + dir;
    if (i < 0 || j < 0 || j >= a.length) return a;
    const c = [...a]; [c[i], c[j]] = [c[j], c[i]]; return c;
  });

  const save = async () => {
    if (!title.trim()) { setErr("Titre de la procédure requis."); return; }
    setBusy(true); setErr(null);
    const payload = { title: title.trim(), type, frequency, status, ownerId, objective, content, references, items: items.map((i) => ({ ...i, label: i.label.trim() })).filter((i) => i.label) };
    const e = creating ? await createSocProcedure(payload) : procedure ? await updateSocProcedure(procedure.id, payload) : "—";
    setBusy(false);
    if (e) setErr(e); else onClose();
  };
  const del = async () => {
    if (!procedure || (typeof window !== "undefined" && !window.confirm(`Supprimer la procédure « ${procedure.ref} » ?`))) return;
    setBusy(true);
    const e = await deleteSocProcedure(procedure.id);
    setBusy(false);
    if (e) setErr(e); else onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto animate-fade" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl my-8 max-h-[92vh] overflow-y-auto animate-pop" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3 p-4 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
          <ListChecks size={20} className="text-emerald-600 mt-1 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-semibold text-slate-800 dark:text-slate-100">{creating ? "Nouvelle procédure" : procedure?.ref}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Procédure / checklist de routine du SOC</div>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        <div className="p-4 space-y-3">
          {err && <div className="text-[12px] text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{err}</div>}
          <div>
            <label className={labelCls}>Titre</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} disabled={!canEdit} placeholder="Ex. Check-list de prise de poste" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div><label className={labelCls}>Type</label><select value={type} onChange={(e) => setType(e.target.value)} disabled={!canEdit} className={inputCls}>{SOC_PROCEDURE_TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>
            <div><label className={labelCls}>Fréquence</label><select value={frequency} onChange={(e) => setFrequency(e.target.value)} disabled={!canEdit} className={inputCls}>{SOC_PROCEDURE_FREQ.map((f) => <option key={f}>{f}</option>)}</select></div>
            <div><label className={labelCls}>Statut</label><select value={status} onChange={(e) => setStatus(e.target.value)} disabled={!canEdit} className={inputCls}>{RUNBOOK_STATUS.map((s) => <option key={s}>{s}</option>)}</select></div>
            <div><label className={labelCls}>Responsable</label><select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} disabled={!canEdit} className={inputCls}>{profiles.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}</select></div>
          </div>
          <div>
            <label className={labelCls}>Objectif</label>
            <textarea value={objective} onChange={(e) => setObjective(e.target.value)} disabled={!canEdit} rows={2} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Contenu (procédure, matrice, modèle…)</label>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} disabled={!canEdit} rows={5} className={`${inputCls} font-mono text-[12px]`} />
          </div>

          {/* Checklist */}
          <div className="flex items-center justify-between pt-1">
            <div className="text-[12px] font-semibold text-slate-600 uppercase">Points à cocher · {items.length}</div>
            {canEdit && <button onClick={addItem} className="inline-flex items-center gap-1 text-[12px] font-medium text-emerald-700 hover:underline"><Plus size={13} /> Ajouter un point</button>}
          </div>
          {items.length === 0 ? (
            <div className="text-[12px] text-slate-400 text-center py-3 border border-dashed border-slate-200 rounded-lg">Aucun point de checklist (facultatif).</div>
          ) : (
            <div className="space-y-1.5">
              {items.map((it, idx) => (
                <div key={it.id} className="rounded-lg border border-slate-200 dark:border-slate-700 p-2">
                  <div className="flex items-start gap-2">
                    <div className="flex flex-col items-center pt-1 text-slate-300 text-[10px]">
                      <button onClick={() => move(it.id, -1)} disabled={!canEdit || idx === 0} aria-label="Monter" className="disabled:opacity-30 hover:text-slate-500 leading-none">▲</button>
                      <span className="text-slate-400">{idx + 1}</span>
                      <button onClick={() => move(it.id, 1)} disabled={!canEdit || idx === items.length - 1} aria-label="Descendre" className="disabled:opacity-30 hover:text-slate-500 leading-none">▼</button>
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <input value={it.label} onChange={(e) => patch(it.id, { label: e.target.value })} disabled={!canEdit} placeholder="Point à vérifier" className={`${inputCls} font-medium`} />
                      <input value={it.guidance} onChange={(e) => patch(it.id, { guidance: e.target.value })} disabled={!canEdit} placeholder="Précision / comment faire (facultatif)" className={`${inputCls} text-[12px]`} />
                    </div>
                    {canEdit && <button onClick={() => remove(it.id)} aria-label="Supprimer" className="text-rose-500 hover:text-rose-700 pt-1"><Trash2 size={14} /></button>}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div>
            <label className={labelCls}>Références</label>
            <input value={references} onChange={(e) => setReferences(e.target.value)} disabled={!canEdit} placeholder="NIST 800-61, ANSSI, SANS…" className={inputCls} />
          </div>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2 p-4 border-t border-slate-100 dark:border-slate-800 sticky bottom-0 bg-white dark:bg-slate-900">
            <button onClick={save} disabled={busy || !title.trim()} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-slate-900 dark:bg-emerald-600 rounded-xl px-4 py-2 disabled:opacity-50"><ListChecks size={15} /> {creating ? "Créer" : "Enregistrer"}</button>
            {!creating && procedure && <button onClick={del} disabled={busy} className="ml-auto inline-flex items-center gap-1 text-[12px] text-rose-600 border border-rose-200 rounded-lg px-3 py-2 hover:bg-rose-50"><Trash2 size={14} /> Supprimer</button>}
          </div>
        )}
      </div>
    </div>
  );
}

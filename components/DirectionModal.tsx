"use client";

import { useState } from "react";
import { Building2, Plus, Trash2, X } from "lucide-react";
import type { Direction, OrgService } from "@/lib/domain";
import { useApp } from "./app-context";

let seq = 0;
const tempId = () => `new_${++seq}`;

/** Fiche d'une direction : métadonnées + liste de ses services. */
export function DirectionModal({ direction, creating, onClose }: { direction: Direction | null; creating: boolean; onClose: () => void }) {
  const { demo, profiles, createDirection, updateDirection, deleteDirection } = useApp();
  const canEdit = !demo;

  const [name, setName] = useState(direction?.name ?? "");
  const [code, setCode] = useState(direction?.code ?? "");
  const [headId, setHeadId] = useState(direction?.headId ?? "");
  const [description, setDescription] = useState(direction?.description ?? "");
  const [services, setServices] = useState<OrgService[]>(direction?.services ?? []);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const addSvc = () => setServices((prev) => [...prev, { id: tempId(), name: "", headId: "" }]);
  const patchSvc = (id: string, patch: Partial<OrgService>) => setServices((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const removeSvc = (id: string) => setServices((prev) => prev.filter((s) => s.id !== id));

  const save = async () => {
    if (!name.trim()) return;
    setBusy(true);
    setErr(null);
    const payload = { name: name.trim(), code, headId, description, services: services.filter((s) => s.name.trim()).map((s) => ({ name: s.name, headId: s.headId })) };
    const e = creating ? await createDirection(payload) : direction ? await updateDirection(direction.id, payload) : "—";
    setBusy(false);
    if (e) setErr(e); else onClose();
  };
  const remove = async () => {
    if (!direction || (typeof window !== "undefined" && !window.confirm(`Supprimer la direction « ${direction.name} » et ses services ?`))) return;
    setBusy(true);
    const e = await deleteDirection(direction.id);
    setBusy(false);
    if (e) setErr(e); else onClose();
  };

  const inputCls = "w-full text-[13px] border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 bg-white dark:bg-slate-900 focus:border-emerald-400 outline-none";
  const labelCls = "block text-[11px] font-medium text-slate-500 mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto animate-fade" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg my-8 max-h-[92vh] overflow-y-auto animate-pop" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3 p-4 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
          <Building2 size={20} className="text-teal-600 mt-1 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-semibold text-slate-800 dark:text-slate-100">{creating ? "Nouvelle direction" : direction?.ref}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">{services.length} service{services.length > 1 ? "s" : ""}</div>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        <div className="p-4 space-y-3">
          {err && <div className="text-[12px] text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{err}</div>}

          <div className="grid grid-cols-[1fr_auto] gap-3">
            <div>
              <label className={labelCls}>Nom de la direction</label>
              <input value={name} onChange={(e) => setName(e.target.value)} disabled={!canEdit} placeholder="Ex. Direction des systèmes d'information" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Sigle</label>
              <input value={code} onChange={(e) => setCode(e.target.value)} disabled={!canEdit} placeholder="DSI" className={`${inputCls} w-24`} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Directeur / responsable</label>
            <select value={headId} onChange={(e) => setHeadId(e.target.value)} disabled={!canEdit} className={inputCls}>
              <option value="">—</option>
              {profiles.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} disabled={!canEdit} rows={2} placeholder="Périmètre / missions…" className={inputCls} />
          </div>

          {/* Services */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
            <div className="text-[11px] font-medium text-slate-500 uppercase mb-2">Services de la direction</div>
            <div className="space-y-2">
              {services.length === 0 && <div className="text-[12px] text-slate-400">Aucun service. Ajoutez-en un ci-dessous.</div>}
              {services.map((s) => (
                <div key={s.id} className="flex items-center gap-2 flex-wrap">
                  <input value={s.name} onChange={(e) => patchSvc(s.id, { name: e.target.value })} disabled={!canEdit} placeholder="Nom du service…" className="flex-1 min-w-[9rem] text-[13px] border border-slate-200 rounded-lg px-2 py-1.5" />
                  <select value={s.headId} onChange={(e) => patchSvc(s.id, { headId: e.target.value })} disabled={!canEdit} aria-label="Responsable du service" className="text-[11px] border border-slate-200 rounded-lg px-2 py-1.5 bg-white max-w-[9rem]">
                    <option value="">Responsable…</option>
                    {profiles.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
                  </select>
                  {canEdit && <button onClick={() => removeSvc(s.id)} aria-label="Retirer" className="text-slate-300 hover:text-rose-600"><X size={14} /></button>}
                </div>
              ))}
            </div>
            {canEdit && <button onClick={addSvc} className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-teal-700 hover:underline"><Plus size={14} /> Ajouter un service</button>}
          </div>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2 p-4 border-t border-slate-100 dark:border-slate-800">
            <button onClick={save} disabled={busy || !name.trim()} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-slate-900 dark:bg-emerald-600 rounded-xl px-4 py-2 hover:-translate-y-0.5 transition-transform shadow-soft disabled:opacity-50">
              <Building2 size={15} /> {creating ? "Créer la direction" : "Enregistrer"}
            </button>
            {!creating && direction && (
              <button onClick={remove} disabled={busy} className="ml-auto inline-flex items-center gap-1 text-[12px] text-rose-600 border border-rose-200 rounded-lg px-3 py-2 hover:bg-rose-50 dark:hover:bg-rose-500/10"><Trash2 size={14} /> Supprimer</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

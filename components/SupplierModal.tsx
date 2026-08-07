"use client";

import { useState } from "react";
import { Boxes, Trash2, Truck, X } from "lucide-react";
import {
  DATA_ACCESS_LEVELS,
  SUPPLIER_CRITICALITIES,
  SUPPLIER_STATUS,
  SUPPLIER_TYPES,
  type Supplier,
} from "@/lib/domain";
import { useApp } from "./app-context";

const toDateInput = (d: Date | null | undefined) => (d ? new Date(d).toISOString().slice(0, 10) : "");
const inputCls = "w-full text-[13px] border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 bg-white dark:bg-slate-900 outline-none focus:border-emerald-400";
const labelCls = "block text-[11px] font-medium text-slate-500 mb-1";

/** Fiche d'un fournisseur / prestataire (tiers) : criticité, données accédées, SI touché. */
export function SupplierModal({ supplier, creating, onClose }: { supplier: Supplier | null; creating: boolean; onClose: () => void }) {
  const { demo, me, profiles, assets, createSupplier, updateSupplier, deleteSupplier } = useApp();
  const canEdit = !demo;

  const [name, setName] = useState(supplier?.name ?? "");
  const [type, setType] = useState(supplier?.type ?? SUPPLIER_TYPES[0]);
  const [criticality, setCriticality] = useState(supplier?.criticality ?? "Standard");
  const [service, setService] = useState(supplier?.service ?? "");
  const [dataAccess, setDataAccess] = useState(supplier?.dataAccess ?? DATA_ACCESS_LEVELS[0]);
  const [ownerId, setOwnerId] = useState(supplier?.ownerId ?? me.id);
  const [status, setStatus] = useState(supplier?.status ?? "Actif");
  const [contractEnd, setContractEnd] = useState(toDateInput(supplier?.contractEnd));
  const [reviewDate, setReviewDate] = useState(toDateInput(supplier?.reviewDate));
  const [assetIds, setAssetIds] = useState<string[]>(supplier?.assetIds ?? []);
  const [notes, setNotes] = useState(supplier?.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const toggle = (id: string) => setAssetIds((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));
  const save = async () => {
    if (!name.trim()) return;
    setBusy(true); setErr(null);
    const payload = { name: name.trim(), type, criticality, service, dataAccess, ownerId, status, contractEnd: contractEnd || null, reviewDate: reviewDate || null, assetIds, notes };
    const e = creating ? await createSupplier(payload) : supplier ? await updateSupplier(supplier.id, payload) : "—";
    setBusy(false);
    if (e) setErr(e); else onClose();
  };
  const remove = async () => {
    if (!supplier || (typeof window !== "undefined" && !window.confirm(`Supprimer le fournisseur « ${supplier.name} » ?`))) return;
    setBusy(true);
    const e = await deleteSupplier(supplier.id);
    setBusy(false);
    if (e) setErr(e); else onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto animate-fade" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg my-8 max-h-[92vh] overflow-y-auto animate-pop" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3 p-4 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
          <Truck size={20} className="text-orange-600 mt-1 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-semibold text-slate-800 dark:text-slate-100">{creating ? "Nouveau fournisseur" : supplier?.ref}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Fournisseur / prestataire (tiers)</div>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        <div className="p-4 space-y-3">
          {err && <div className="text-[12px] text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{err}</div>}
          <div>
            <label className={labelCls}>Nom du fournisseur</label>
            <input value={name} onChange={(e) => setName(e.target.value)} disabled={!canEdit} placeholder="Ex. Éditeur du logiciel de paie…" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Type</label>
              <select value={type} onChange={(e) => setType(e.target.value)} disabled={!canEdit} className={inputCls}>{SUPPLIER_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
            </div>
            <div>
              <label className={labelCls}>Criticité pour nous</label>
              <select value={criticality} onChange={(e) => setCriticality(e.target.value)} disabled={!canEdit} className={inputCls}>{SUPPLIER_CRITICALITIES.map((c) => <option key={c}>{c}</option>)}</select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Prestation / périmètre du SI concerné</label>
            <input value={service} onChange={(e) => setService(e.target.value)} disabled={!canEdit} placeholder="Ce qu'il fait / opère…" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Données accédées</label>
              <select value={dataAccess} onChange={(e) => setDataAccess(e.target.value)} disabled={!canEdit} className={inputCls}>{DATA_ACCESS_LEVELS.map((d) => <option key={d}>{d}</option>)}</select>
            </div>
            <div>
              <label className={labelCls}>Responsable interne</label>
              <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} disabled={!canEdit} className={inputCls}>{profiles.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}</select>
            </div>
            <div>
              <label className={labelCls}>Statut</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} disabled={!canEdit} className={inputCls}>{SUPPLIER_STATUS.map((s) => <option key={s}>{s}</option>)}</select>
            </div>
            <div>
              <label className={labelCls}>Fin de contrat</label>
              <input type="date" value={contractEnd} onChange={(e) => setContractEnd(e.target.value)} disabled={!canEdit} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Prochaine revue sécurité</label>
              <input type="date" value={reviewDate} onChange={(e) => setReviewDate(e.target.value)} disabled={!canEdit} className={inputCls} />
            </div>
          </div>

          {/* Actifs du SI touchés */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
            <div className="text-[11px] font-medium text-slate-500 uppercase mb-2 flex items-center gap-1.5"><Boxes size={13} /> Actifs du SI concernés ({assetIds.length})</div>
            {assets.length === 0 ? (
              <div className="text-[12px] text-slate-400">Aucun actif au registre.</div>
            ) : (
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                {assets.filter((a) => a.status !== "Retiré").map((a) => {
                  const on = assetIds.includes(a.id);
                  return <button key={a.id} onClick={() => canEdit && toggle(a.id)} className={`text-[11px] rounded-full px-2 py-0.5 border ${on ? "bg-teal-100 border-teal-300 text-teal-800" : "border-slate-200 text-slate-500"}`}>{a.name}</button>;
                })}
              </div>
            )}
          </div>
          <div>
            <label className={labelCls}>Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} disabled={!canEdit} rows={2} placeholder="Clauses de sécurité, engagements, incidents…" className={inputCls} />
          </div>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2 p-4 border-t border-slate-100 dark:border-slate-800">
            <button onClick={save} disabled={busy || !name.trim()} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-slate-900 dark:bg-emerald-600 rounded-xl px-4 py-2 disabled:opacity-50"><Truck size={15} /> {creating ? "Créer le fournisseur" : "Enregistrer"}</button>
            {!creating && supplier && <button onClick={remove} disabled={busy} className="ml-auto inline-flex items-center gap-1 text-[12px] text-rose-600 border border-rose-200 rounded-lg px-3 py-2 hover:bg-rose-50"><Trash2 size={14} /> Supprimer</button>}
          </div>
        )}
      </div>
    </div>
  );
}

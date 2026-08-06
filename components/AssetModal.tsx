"use client";

import { useState } from "react";
import { Boxes, Trash2, X } from "lucide-react";
import {
  assetCriticality,
  ASSET_STATUTS,
  ASSET_TYPES,
  CID_LABELS,
  CONFIDENTIALITY_LABELS,
  CRITICALITY_TONE,
  type Asset,
} from "@/lib/domain";
import { useApp } from "./app-context";

const toDateInput = (d: Date | null | undefined) => (d ? new Date(d).toISOString().slice(0, 10) : "");

/** Fiche d'un actif : nature + valorisation C/I/D → criticité. */
export function AssetModal({ asset, creating, onClose }: { asset: Asset | null; creating: boolean; onClose: () => void }) {
  const { demo, me, profiles, refLists, createAsset, updateAsset, deleteAsset } = useApp();
  const canEdit = !demo;

  const [name, setName] = useState(asset?.name ?? "");
  const [type, setType] = useState(asset?.type ?? ASSET_TYPES[0]);
  const [service, setService] = useState(asset?.service ?? "");
  const [description, setDescription] = useState(asset?.description ?? "");
  const [ownerId, setOwnerId] = useState(asset?.ownerId ?? me.id);
  const [c, setC] = useState(asset?.confidentiality ?? 2);
  const [i, setI] = useState(asset?.integrity ?? 2);
  const [a, setA] = useState(asset?.availability ?? 2);
  const [status, setStatus] = useState(asset?.status ?? "Actif");
  const [review, setReview] = useState(toDateInput(asset?.reviewDate));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const crit = assetCriticality({ confidentiality: c, integrity: i, availability: a });

  const save = async () => {
    if (!name.trim()) return;
    setBusy(true);
    setErr(null);
    const payload = { name: name.trim(), type, service, description, ownerId, confidentiality: c, integrity: i, availability: a, status, reviewDate: review || null };
    const e = creating ? await createAsset(payload) : asset ? await updateAsset(asset.id, payload) : "—";
    setBusy(false);
    if (e) setErr(e);
    else onClose();
  };

  const remove = async () => {
    if (!asset || (typeof window !== "undefined" && !window.confirm(`Supprimer définitivement l'actif « ${asset.ref} » ?`))) return;
    setBusy(true);
    const e = await deleteAsset(asset.id);
    setBusy(false);
    if (e) setErr(e);
    else onClose();
  };

  const inputCls = "w-full text-[13px] border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 bg-white dark:bg-slate-900 focus:border-emerald-400 outline-none";
  const labelCls = "block text-[11px] font-medium text-slate-500 mb-1";

  const CIDField = ({ label, value, set, labels }: { label: string; value: number; set: (v: number) => void; labels: string[] }) => (
    <div>
      <label className={labelCls}>{label}</label>
      <select value={value} onChange={(e) => set(Number(e.target.value))} disabled={!canEdit} className={inputCls}>
        {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n} · {labels[n]}</option>)}
      </select>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto animate-fade" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-xl my-8 max-h-[90vh] overflow-y-auto animate-pop" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3 p-4 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
          <Boxes size={20} className="text-teal-600 mt-1 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-semibold text-slate-800 dark:text-slate-100">{creating ? "Nouvel actif" : asset?.ref}</div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex items-center text-[11px] font-medium rounded-full px-2 py-0.5 border ${CRITICALITY_TONE[crit]}`}>Criticité {crit}</span>
              <span className="text-[11px] text-slate-400 font-mono">C{c} · I{i} · D{a}</span>
            </div>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        <div className="p-4 space-y-3">
          {err && <div className="text-[12px] text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{err}</div>}

          <div>
            <label className={labelCls}>Nom de l&apos;actif</label>
            <input value={name} onChange={(e) => setName(e.target.value)} disabled={!canEdit} placeholder="Ex. Base de données RH, Serveur de messagerie…" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Type</label>
              <select value={type} onChange={(e) => setType(e.target.value)} disabled={!canEdit} className={inputCls}>
                {ASSET_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Direction / service</label>
              <input value={service} onChange={(e) => setService(e.target.value)} disabled={!canEdit} list="asset-services" placeholder="DSI, RH…" className={inputCls} />
              <datalist id="asset-services">{(refLists.services ?? []).map((s) => <option key={s} value={s} />)}</datalist>
            </div>
          </div>

          {/* Valorisation C/I/D */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
            <div className="text-[11px] font-medium text-slate-500 uppercase mb-2">Valorisation (besoins de sécurité)</div>
            <div className="grid grid-cols-3 gap-3">
              <CIDField label="Confidentialité" value={c} set={setC} labels={CONFIDENTIALITY_LABELS} />
              <CIDField label="Intégrité" value={i} set={setI} labels={CID_LABELS} />
              <CIDField label="Disponibilité" value={a} set={setA} labels={CID_LABELS} />
            </div>
            <div className="text-[11px] text-slate-400 mt-2">La criticité de l&apos;actif = la plus haute des trois valeurs.</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Propriétaire</label>
              <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} disabled={!canEdit} className={inputCls}>
                {profiles.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Statut</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} disabled={!canEdit} className={inputCls}>
                {ASSET_STATUTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Prochaine revue</label>
              <input type="date" value={review} onChange={(e) => setReview(e.target.value)} disabled={!canEdit} className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} disabled={!canEdit} rows={2} placeholder="Périmètre, données traitées, dépendances…" className={inputCls} />
          </div>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2 p-4 border-t border-slate-100 dark:border-slate-800">
            <button onClick={save} disabled={busy || !name.trim()} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-slate-900 dark:bg-emerald-600 rounded-xl px-4 py-2 hover:-translate-y-0.5 transition-transform shadow-soft disabled:opacity-50">
              <Boxes size={15} /> {creating ? "Créer l'actif" : "Enregistrer"}
            </button>
            {!creating && asset && (
              <button onClick={remove} disabled={busy} className="ml-auto inline-flex items-center gap-1 text-[12px] text-rose-600 border border-rose-200 rounded-lg px-3 py-2 hover:bg-rose-50 dark:hover:bg-rose-500/10"><Trash2 size={14} /> Supprimer</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

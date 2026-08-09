"use client";

import { useState } from "react";
import { ExternalLink, Trash2, Wrench, X } from "lucide-react";
import {
  CAPA_PRIORITIES,
  CAPA_STATUS,
  CAPA_TYPES,
  fmt,
  type CapaAction,
} from "@/lib/domain";
import { useApp } from "./app-context";

const toDateInput = (d: Date | null | undefined) => (d ? new Date(d).toISOString().slice(0, 10) : "");
const SOURCE_LABELS: Record<string, string> = {
  controle: "Contrôle terrain",
  nonconformite: "Non-conformité",
  risque: "Risque",
  incident: "Incident",
  audit: "Audit technique",
  manuel: "Saisie manuelle",
};

/** Fiche d'une action corrective/préventive (CAPA) : suivi, échéance, vérification. */
export function CapaModal({ capa, creating, onClose }: { capa: CapaAction | null; creating: boolean; onClose: () => void }) {
  const { demo, me, profiles, fieldControlById, createCapa, updateCapa, deleteCapa } = useApp();
  const canEdit = !demo;

  const [title, setTitle] = useState(capa?.title ?? "");
  const [description, setDescription] = useState(capa?.description ?? "");
  const [type, setType] = useState(capa?.type ?? CAPA_TYPES[0]);
  const [priority, setPriority] = useState(capa?.priority ?? "Normale");
  const [ownerId, setOwnerId] = useState(capa?.ownerId ?? me.id);
  const [dueDate, setDueDate] = useState(toDateInput(capa?.dueDate));
  const [status, setStatus] = useState(capa?.status ?? "Ouverte");
  const [verification, setVerification] = useState(capa?.verification ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Source d'origine (traçabilité) : contrôle terrain rattaché, le cas échéant.
  const sourceControl = capa?.sourceType === "controle" && capa.sourceId
    ? (fieldControlById(capa.sourceId) ?? null)
    : null;

  const save = async () => {
    if (!title.trim()) return;
    setBusy(true);
    setErr(null);
    const payload = { title: title.trim(), description, type, priority, ownerId, dueDate: dueDate || null, status, verification };
    const e = creating ? await createCapa({ ...payload, sourceType: "manuel" }) : capa ? await updateCapa(capa.id, payload) : "—";
    setBusy(false);
    if (e) setErr(e);
    else onClose();
  };
  const remove = async () => {
    if (!capa || (typeof window !== "undefined" && !window.confirm(`Supprimer l'action « ${capa.ref} » ?`))) return;
    setBusy(true);
    const e = await deleteCapa(capa.id);
    setBusy(false);
    if (e) setErr(e); else onClose();
  };

  const inputCls = "w-full text-[13px] border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 bg-white dark:bg-slate-900 focus:border-emerald-400 outline-none";
  const labelCls = "block text-[11px] font-medium text-slate-500 mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto animate-fade" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg my-8 max-h-[92vh] overflow-y-auto animate-pop" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3 p-4 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
          <Wrench size={20} className="text-rose-600 mt-1 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-semibold text-slate-800 dark:text-slate-100">{creating ? "Nouvelle action" : capa?.ref}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Plan d&apos;actions correctives &amp; préventives (CAPA)</div>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        <div className="p-4 space-y-3">
          {err && <div className="text-[12px] text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{err}</div>}

          {capa && capa.sourceType !== "manuel" && (
            <div className="text-[11px] text-slate-500 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2">
              Origine : <span className="font-medium">{SOURCE_LABELS[capa.sourceType] ?? capa.sourceType}</span>
              {sourceControl && <span className="inline-flex items-center gap-1 ml-1 text-indigo-600"><ExternalLink size={11} /> {sourceControl.ref} — {sourceControl.title}</span>}
            </div>
          )}

          <div>
            <label className={labelCls}>Intitulé de l&apos;action</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} disabled={!canEdit} placeholder="Ex. Reconditionner l'armoire réseau…" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Description / plan</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} disabled={!canEdit} rows={2} placeholder="Cause, mesures prévues…" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Nature</label>
              <select value={type} onChange={(e) => setType(e.target.value)} disabled={!canEdit} className={inputCls}>
                {CAPA_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Priorité</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)} disabled={!canEdit} className={inputCls}>
                {CAPA_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Responsable</label>
              <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} disabled={!canEdit} className={inputCls}>
                {profiles.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
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
              {CAPA_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Vérification d&apos;efficacité</label>
            <textarea value={verification} onChange={(e) => setVerification(e.target.value)} disabled={!canEdit} rows={2} placeholder="Preuve / constat de clôture (contrôle de l'efficacité)…" className={inputCls} />
          </div>
          {capa && capa.closedAt && <div className="text-[11px] text-emerald-600">Clôturée le {fmt(capa.closedAt)}</div>}
        </div>

        {canEdit && (
          <div className="flex items-center gap-2 p-4 border-t border-slate-100 dark:border-slate-800">
            <button onClick={save} disabled={busy || !title.trim()} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-slate-900 dark:bg-emerald-600 rounded-xl px-4 py-2 hover:-translate-y-0.5 transition-transform shadow-soft disabled:opacity-50">
              <Wrench size={15} /> {creating ? "Créer l'action" : "Enregistrer"}
            </button>
            {!creating && capa && (
              <button onClick={remove} disabled={busy} className="ml-auto inline-flex items-center gap-1 text-[12px] text-rose-600 border border-rose-200 rounded-lg px-3 py-2 hover:bg-rose-50 dark:hover:bg-rose-500/10"><Trash2 size={14} /> Supprimer</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

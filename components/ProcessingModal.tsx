"use client";

import { useState } from "react";
import { Boxes, FileLock2, ShieldAlert, Trash2, X } from "lucide-react";
import {
  DATA_CATEGORIES,
  LEGAL_BASES,
  PIA_RISK_LEVELS,
  PIA_STATUS,
  PROCESSING_STATUS,
  type ProcessingActivity,
} from "@/lib/domain";
import { useApp } from "./app-context";
import { toDayInput } from "@/lib/period";

/* Formatage en heure locale : `toISOString()` bascule en UTC et affiche la
 * veille en fin de journée — réenregistrer reculait alors la date d'un jour. */
const toDateInput = (d: Date | null | undefined) => toDayInput(d ?? null);
const inputCls = "w-full text-[13px] border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 bg-white dark:bg-slate-900 outline-none focus:border-emerald-400";
const labelCls = "block text-[11px] font-medium text-slate-500 mb-1";

/** Fiche d'un traitement (ROPA) + section AIPD/PIA. */
export function ProcessingModal({ item, creating, onClose }: { item: ProcessingActivity | null; creating: boolean; onClose: () => void }) {
  const { demo, me, profiles, assets, refLists, createProcessing, updateProcessing, deleteProcessing } = useApp();
  const canEdit = !demo;

  const [name, setName] = useState(item?.name ?? "");
  const [purpose, setPurpose] = useState(item?.purpose ?? "");
  const [legalBasis, setLegalBasis] = useState(item?.legalBasis ?? LEGAL_BASES[0]);
  const [dataCategories, setDataCategories] = useState<string[]>(item?.dataCategories ?? []);
  const [sensitiveData, setSensitiveData] = useState(item?.sensitiveData ?? false);
  const [dataSubjects, setDataSubjects] = useState(item?.dataSubjects ?? "");
  const [recipients, setRecipients] = useState(item?.recipients ?? "");
  const [retention, setRetention] = useState(item?.retention ?? "");
  const [transfersOutsideEU, setTransfers] = useState(item?.transfersOutsideEU ?? false);
  const [transferDetails, setTransferDetails] = useState(item?.transferDetails ?? "");
  const [ownerId, setOwnerId] = useState(item?.ownerId ?? me.id);
  const [service, setService] = useState(item?.service ?? "");
  const [securityMeasures, setSecurity] = useState(item?.securityMeasures ?? "");
  const [assetIds, setAssetIds] = useState<string[]>(item?.assetIds ?? []);
  const [piaRequired, setPiaRequired] = useState(item?.piaRequired ?? false);
  const [piaStatus, setPiaStatus] = useState(item?.piaStatus ?? "Non requise");
  const [piaRisk, setPiaRisk] = useState(item?.piaRisk ?? "Faible");
  const [piaNotes, setPiaNotes] = useState(item?.piaNotes ?? "");
  const [status, setStatus] = useState(item?.status ?? "Actif");
  const [reviewDate, setReviewDate] = useState(toDateInput(item?.reviewDate));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const toggleCat = (c: string) => setDataCategories((a) => (a.includes(c) ? a.filter((x) => x !== c) : [...a, c]));
  const toggleAsset = (id: string) => setAssetIds((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));

  const save = async () => {
    if (!name.trim()) return;
    setBusy(true); setErr(null);
    const payload = { name: name.trim(), purpose, legalBasis, dataCategories, sensitiveData, dataSubjects, recipients, retention, transfersOutsideEU, transferDetails, ownerId, service, securityMeasures, assetIds, piaRequired, piaStatus, piaRisk, piaNotes, status, reviewDate: reviewDate || null };
    const e = creating ? await createProcessing(payload) : item ? await updateProcessing(item.id, payload) : "—";
    setBusy(false);
    if (e) setErr(e); else onClose();
  };
  const remove = async () => {
    if (!item || (typeof window !== "undefined" && !window.confirm(`Supprimer le traitement « ${item.ref} » ?`))) return;
    setBusy(true);
    const e = await deleteProcessing(item.id);
    setBusy(false);
    if (e) setErr(e); else onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto animate-fade" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl my-8 max-h-[92vh] overflow-y-auto animate-pop" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3 p-4 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
          <FileLock2 size={20} className="text-blue-600 mt-1 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-semibold text-slate-800 dark:text-slate-100">{creating ? "Nouveau traitement" : item?.ref}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Registre des traitements (RGPD, art. 30) + AIPD</div>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        <div className="p-4 space-y-3">
          {err && <div className="text-[12px] text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{err}</div>}
          <div>
            <label className={labelCls}>Nom du traitement</label>
            <input value={name} onChange={(e) => setName(e.target.value)} disabled={!canEdit} placeholder="Ex. Gestion de la paie…" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Finalité</label>
            <textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} disabled={!canEdit} rows={2} placeholder="Pourquoi traite-t-on ces données ?" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Base légale</label>
              <select value={legalBasis} onChange={(e) => setLegalBasis(e.target.value)} disabled={!canEdit} className={inputCls}>{LEGAL_BASES.map((b) => <option key={b}>{b}</option>)}</select>
            </div>
            <div>
              <label className={labelCls}>Responsable (interne)</label>
              <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} disabled={!canEdit} className={inputCls}>{profiles.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}</select>
            </div>
          </div>

          {/* Catégories de données */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
            <div className="text-[11px] font-medium text-slate-500 uppercase mb-2">Catégories de données</div>
            <div className="flex flex-wrap gap-1.5">
              {DATA_CATEGORIES.map((c) => <button key={c} onClick={() => canEdit && toggleCat(c)} className={`text-[11px] rounded-full px-2 py-0.5 border ${dataCategories.includes(c) ? "bg-blue-100 border-blue-300 text-blue-800" : "border-slate-200 text-slate-500"}`}>{c}</button>)}
            </div>
            <label className="flex items-center gap-2 text-[12px] text-slate-700 mt-2">
              <input type="checkbox" checked={sensitiveData} onChange={(e) => setSensitiveData(e.target.checked)} disabled={!canEdit} className="h-4 w-4 accent-rose-600" />
              <ShieldAlert size={14} className="text-rose-500" /> Données sensibles (art. 9 : santé, biométrie, opinions…) — AIPD souvent requise
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Personnes concernées</label>
              <input value={dataSubjects} onChange={(e) => setDataSubjects(e.target.value)} disabled={!canEdit} placeholder="Agents, usagers…" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Durée de conservation</label>
              <input value={retention} onChange={(e) => setRetention(e.target.value)} disabled={!canEdit} placeholder="Ex. 5 ans après départ" className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Destinataires (dont sous-traitants)</label>
            <input value={recipients} onChange={(e) => setRecipients(e.target.value)} disabled={!canEdit} className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Direction / service</label>
              <input value={service} onChange={(e) => setService(e.target.value)} disabled={!canEdit} list="trt-services" className={inputCls} />
              <datalist id="trt-services">{(refLists.services ?? []).map((s) => <option key={s} value={s} />)}</datalist>
            </div>
            <div>
              <label className={labelCls}>Statut</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} disabled={!canEdit} className={inputCls}>{PROCESSING_STATUS.map((s) => <option key={s}>{s}</option>)}</select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-[12px] text-slate-700">
            <input type="checkbox" checked={transfersOutsideEU} onChange={(e) => setTransfers(e.target.checked)} disabled={!canEdit} className="h-4 w-4 accent-amber-600" /> Transfert hors UE
          </label>
          {transfersOutsideEU && <input value={transferDetails} onChange={(e) => setTransferDetails(e.target.value)} disabled={!canEdit} placeholder="Pays et garanties (clauses types, adéquation…)" className={inputCls} />}
          <div>
            <label className={labelCls}>Mesures de sécurité</label>
            <textarea value={securityMeasures} onChange={(e) => setSecurity(e.target.value)} disabled={!canEdit} rows={2} placeholder="Chiffrement, habilitations, journalisation…" className={inputCls} />
          </div>

          {/* Actifs supports */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
            <div className="text-[11px] font-medium text-slate-500 uppercase mb-2 flex items-center gap-1.5"><Boxes size={13} /> Actifs / SI supports ({assetIds.length})</div>
            {assets.length === 0 ? <div className="text-[12px] text-slate-400">Aucun actif au registre.</div> : (
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {assets.filter((a) => a.status !== "Retiré").map((a) => <button key={a.id} onClick={() => canEdit && toggleAsset(a.id)} className={`text-[11px] rounded-full px-2 py-0.5 border ${assetIds.includes(a.id) ? "bg-teal-100 border-teal-300 text-teal-800" : "border-slate-200 text-slate-500"}`}>{a.name}</button>)}
              </div>
            )}
          </div>

          {/* AIPD / PIA */}
          <div className="rounded-lg border border-blue-200 dark:border-blue-500/30 bg-blue-50/40 dark:bg-blue-500/10 p-3">
            <label className="flex items-center gap-2 text-[12px] font-medium text-blue-800 dark:text-blue-300">
              <input type="checkbox" checked={piaRequired} onChange={(e) => setPiaRequired(e.target.checked)} disabled={!canEdit} className="h-4 w-4 accent-blue-600" /> AIPD (analyse d&apos;impact) requise
            </label>
            {piaRequired && (
              <div className="mt-2 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelCls}>État de l&apos;AIPD</label>
                    <select value={piaStatus} onChange={(e) => setPiaStatus(e.target.value)} disabled={!canEdit} className={inputCls}>{PIA_STATUS.map((s) => <option key={s}>{s}</option>)}</select>
                  </div>
                  <div>
                    <label className={labelCls}>Risque résiduel pour les personnes</label>
                    <select value={piaRisk} onChange={(e) => setPiaRisk(e.target.value)} disabled={!canEdit} className={inputCls}>{PIA_RISK_LEVELS.map((r) => <option key={r}>{r}</option>)}</select>
                  </div>
                </div>
                <textarea value={piaNotes} onChange={(e) => setPiaNotes(e.target.value)} disabled={!canEdit} rows={2} placeholder="Synthèse de l'analyse d'impact, mesures retenues…" className={inputCls} />
              </div>
            )}
          </div>

          <div>
            <label className={labelCls}>Prochaine revue</label>
            <input type="date" value={reviewDate} onChange={(e) => setReviewDate(e.target.value)} disabled={!canEdit} className={`${inputCls} max-w-[12rem]`} />
          </div>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2 p-4 border-t border-slate-100 dark:border-slate-800">
            <button onClick={save} disabled={busy || !name.trim()} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-slate-900 dark:bg-emerald-600 rounded-xl px-4 py-2 disabled:opacity-50"><FileLock2 size={15} /> {creating ? "Ajouter au registre" : "Enregistrer"}</button>
            {!creating && item && <button onClick={remove} disabled={busy} className="ml-auto inline-flex items-center gap-1 text-[12px] text-rose-600 border border-rose-200 rounded-lg px-3 py-2 hover:bg-rose-50"><Trash2 size={14} /> Supprimer</button>}
          </div>
        )}
      </div>
    </div>
  );
}

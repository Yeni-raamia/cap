"use client";

import { useState } from "react";
import { Activity, AlertTriangle, Boxes, LifeBuoy, Trash2, X } from "lucide-react";
import {
  CONTINUITY_STATUS,
  hasContinuityGap,
  IMPACT_DOMAINS,
  MISSION_VALUES,
  MISSION_VALUE_TONE,
  RECOVERY_SCALE,
  type ContinuityPlan,
} from "@/lib/domain";
import { useApp } from "./app-context";
import { toDayInput } from "@/lib/period";

/* Formatage en heure locale : `toISOString()` bascule en UTC et affiche la
 * veille en fin de journée — réenregistrer reculait alors la date d'un jour. */
const toDateInput = (d: Date | null | undefined) => toDayInput(d ?? null);
const inputCls = "w-full text-[13px] border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 bg-white dark:bg-slate-900 outline-none focus:border-emerald-400";
const labelCls = "block text-[11px] font-medium text-slate-500 mb-1";

/** Fiche d'un plan de continuité : BIA (impact, DMIA/RTO/RPO) + PCA/PRA (stratégie, procédure). */
export function ContinuityModal({ plan, creating, onClose }: { plan: ContinuityPlan | null; creating: boolean; onClose: () => void }) {
  const { demo, me, profiles, assets, missions, createContinuity, updateContinuity, deleteContinuity } = useApp();
  const canEdit = !demo;

  const [activity, setActivity] = useState(plan?.activity ?? "");
  const [missionId, setMissionId] = useState(plan?.missionId ?? "");
  const [ownerId, setOwnerId] = useState(plan?.ownerId ?? me.id);
  const [criticality, setCriticality] = useState(plan?.criticality ?? "Importante");
  const [mtpd, setMtpd] = useState(plan?.mtpd ?? "< 24h");
  const [rto, setRto] = useState(plan?.rto ?? "< 24h");
  const [rpo, setRpo] = useState(plan?.rpo ?? "< 24h");
  const [impacts, setImpacts] = useState<string[]>(plan?.impacts ?? []);
  const [strategy, setStrategy] = useState(plan?.strategy ?? "");
  const [resources, setResources] = useState(plan?.resources ?? "");
  const [procedure, setProcedure] = useState(plan?.procedure ?? "");
  const [assetIds, setAssetIds] = useState<string[]>(plan?.assetIds ?? []);
  const [lastTestDate, setLastTestDate] = useState(toDateInput(plan?.lastTestDate));
  const [reviewDate, setReviewDate] = useState(toDateInput(plan?.reviewDate));
  const [status, setStatus] = useState(plan?.status ?? "Brouillon");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const toggleImpact = (d: string) => setImpacts((a) => (a.includes(d) ? a.filter((x) => x !== d) : [...a, d]));
  const toggleAsset = (id: string) => setAssetIds((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));
  const gap = hasContinuityGap({ rto, mtpd } as ContinuityPlan);

  const save = async () => {
    if (!activity.trim()) return;
    setBusy(true); setErr(null);
    const payload = { activity: activity.trim(), missionId, ownerId, criticality, mtpd, rto, rpo, impacts, strategy, resources, procedure, assetIds, lastTestDate: lastTestDate || null, reviewDate: reviewDate || null, status };
    const e = creating ? await createContinuity(payload) : plan ? await updateContinuity(plan.id, payload) : "—";
    setBusy(false);
    if (e) setErr(e); else onClose();
  };
  const remove = async () => {
    if (!plan || (typeof window !== "undefined" && !window.confirm(`Supprimer le plan « ${plan.ref} » ?`))) return;
    setBusy(true);
    const e = await deleteContinuity(plan.id);
    setBusy(false);
    if (e) setErr(e); else onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto animate-fade" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl my-8 max-h-[92vh] overflow-y-auto animate-pop" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3 p-4 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
          <LifeBuoy size={20} className="text-cyan-600 mt-1 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-semibold text-slate-800 dark:text-slate-100">{creating ? "Nouveau plan de continuité" : plan?.ref}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">BIA (impact & objectifs de reprise) + PCA/PRA</div>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        <div className="p-4 space-y-3">
          {err && <div className="text-[12px] text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{err}</div>}
          <div>
            <label className={labelCls}>Activité / processus critique</label>
            <input value={activity} onChange={(e) => setActivity(e.target.value)} disabled={!canEdit} placeholder="Ex. Verser les rémunérations…" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Mission rattachée</label>
              <select value={missionId} onChange={(e) => setMissionId(e.target.value)} disabled={!canEdit} className={inputCls}>
                <option value="">—</option>
                {missions.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Responsable</label>
              <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} disabled={!canEdit} className={inputCls}>{profiles.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}</select>
            </div>
          </div>

          {/* BIA : criticité + objectifs de reprise */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
            <div className="text-[11px] font-medium text-slate-500 uppercase mb-2 flex items-center gap-1.5"><Activity size={13} /> BIA — impact & objectifs de reprise</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div>
                <label className={labelCls}>Criticité</label>
                <select value={criticality} onChange={(e) => setCriticality(e.target.value)} disabled={!canEdit} className={inputCls}>{MISSION_VALUES.map((v) => <option key={v}>{v}</option>)}</select>
              </div>
              <div>
                <label className={labelCls} title="Durée max d'interruption admissible">DMIA</label>
                <select value={mtpd} onChange={(e) => setMtpd(e.target.value)} disabled={!canEdit} className={inputCls}>{RECOVERY_SCALE.map((v) => <option key={v}>{v}</option>)}</select>
              </div>
              <div>
                <label className={labelCls} title="Recovery Time Objective — délai de reprise visé">RTO</label>
                <select value={rto} onChange={(e) => setRto(e.target.value)} disabled={!canEdit} className={inputCls}>{RECOVERY_SCALE.map((v) => <option key={v}>{v}</option>)}</select>
              </div>
              <div>
                <label className={labelCls} title="Recovery Point Objective — perte de données max">RPO</label>
                <select value={rpo} onChange={(e) => setRpo(e.target.value)} disabled={!canEdit} className={inputCls}>{RECOVERY_SCALE.map((v) => <option key={v}>{v}</option>)}</select>
              </div>
            </div>
            {gap && <div className="mt-2 text-[11px] text-rose-600 inline-flex items-center gap-1"><AlertTriangle size={12} /> Incohérence : le RTO ({rto}) est plus long que la DMIA ({mtpd}) — la reprise arriverait trop tard.</div>}
            <div className="mt-2">
              <label className={labelCls}>Domaines d&apos;impact</label>
              <div className="flex flex-wrap gap-1.5">
                {IMPACT_DOMAINS.map((d) => <button key={d} onClick={() => canEdit && toggleImpact(d)} className={`text-[11px] rounded-full px-2 py-0.5 border ${impacts.includes(d) ? "bg-rose-100 border-rose-300 text-rose-700" : "border-slate-200 text-slate-500"}`}>{d}</button>)}
              </div>
            </div>
          </div>

          {/* PCA/PRA : stratégie & procédure */}
          <div>
            <label className={labelCls}>Stratégie de continuité</label>
            <textarea value={strategy} onChange={(e) => setStrategy(e.target.value)} disabled={!canEdit} rows={2} placeholder="Site de repli, mode dégradé, sauvegardes…" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Ressources nécessaires</label>
            <textarea value={resources} onChange={(e) => setResources(e.target.value)} disabled={!canEdit} rows={2} placeholder="Sauvegardes, contrats, astreintes, matériel…" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Procédure de reprise (étapes)</label>
            <textarea value={procedure} onChange={(e) => setProcedure(e.target.value)} disabled={!canEdit} rows={3} placeholder="1) … 2) … 3) …" className={inputCls} />
          </div>

          {/* Actifs supports */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
            <div className="text-[11px] font-medium text-slate-500 uppercase mb-2 flex items-center gap-1.5"><Boxes size={13} /> Actifs supports ({assetIds.length})</div>
            {assets.length === 0 ? <div className="text-[12px] text-slate-400">Aucun actif au registre.</div> : (
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {assets.filter((a) => a.status !== "Retiré").map((a) => <button key={a.id} onClick={() => canEdit && toggleAsset(a.id)} className={`text-[11px] rounded-full px-2 py-0.5 border ${assetIds.includes(a.id) ? "bg-teal-100 border-teal-300 text-teal-800" : "border-slate-200 text-slate-500"}`}>{a.name}</button>)}
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Dernier test</label>
              <input type="date" value={lastTestDate} onChange={(e) => setLastTestDate(e.target.value)} disabled={!canEdit} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Prochaine revue</label>
              <input type="date" value={reviewDate} onChange={(e) => setReviewDate(e.target.value)} disabled={!canEdit} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Statut</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} disabled={!canEdit} className={inputCls}>{CONTINUITY_STATUS.map((s) => <option key={s}>{s}</option>)}</select>
            </div>
          </div>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2 p-4 border-t border-slate-100 dark:border-slate-800">
            <button onClick={save} disabled={busy || !activity.trim()} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-slate-900 dark:bg-emerald-600 rounded-xl px-4 py-2 disabled:opacity-50">
              <span className={`h-2 w-2 rounded-full ${MISSION_VALUE_TONE[criticality]?.split(" ")[0] ?? ""}`} /> {creating ? "Créer le plan" : "Enregistrer"}
            </button>
            {!creating && plan && <button onClick={remove} disabled={busy} className="ml-auto inline-flex items-center gap-1 text-[12px] text-rose-600 border border-rose-200 rounded-lg px-3 py-2 hover:bg-rose-50"><Trash2 size={14} /> Supprimer</button>}
          </div>
        )}
      </div>
    </div>
  );
}

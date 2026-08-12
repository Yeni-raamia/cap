"use client";

import { useState } from "react";
import { CalendarRange, Trash2, X } from "lucide-react";
import { AUDIT_CATEGORIES, AUDIT_PLAN_STATUS, AUDIT_RISK_LEVELS, PLAN_QUARTERS, type AuditPlanItem } from "@/lib/domain";
import { toDayInput } from "@/lib/period";
import { useApp } from "./app-context";

const inputCls = "w-full text-[13px] border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 bg-white dark:bg-slate-900 outline-none focus:border-emerald-400";
const labelCls = "block text-[11px] font-medium text-slate-500 mb-1";
/* Formatage en heure locale : `toISOString()` bascule en UTC et affiche la
 * veille en fin de journée — réenregistrer reculait alors la date d'un jour. */
const toDateInput = (d: Date | null | undefined) => toDayInput(d ?? null);

export function AuditPlanModal({ item, creating, defaultYear, onClose }: { item: AuditPlanItem | null; creating: boolean; defaultYear: number; onClose: () => void }) {
  const { demo, me, profiles, assets, auditGrids, audits, createAuditPlanItem, updateAuditPlanItem, deleteAuditPlanItem } = useApp();
  const canEdit = !demo;

  const [title, setTitle] = useState(item?.title ?? "");
  const [category, setCategory] = useState(item?.category ?? AUDIT_CATEGORIES[0]);
  const [riskLevel, setRisk] = useState(item?.riskLevel ?? "Moyen");
  const [year, setYear] = useState(item?.year ?? defaultYear);
  const [quarter, setQuarter] = useState(item?.quarter ?? "T1");
  const [ownerId, setOwnerId] = useState(item?.ownerId || me.id);
  const [targetMode, setTargetMode] = useState<"asset" | "free">(item?.targetAssetId ? "asset" : "free");
  const [targetAssetId, setTargetAssetId] = useState(item?.targetAssetId ?? "");
  const [targetLabel, setTargetLabel] = useState(item?.targetLabel ?? "");
  const [gridId, setGridId] = useState(item?.gridId ?? "");
  const [auditId, setAuditId] = useState(item?.auditId ?? "");
  const [plannedDate, setPlanned] = useState(toDateInput(item?.plannedDate));
  const [status, setStatus] = useState(item?.status ?? "Planifié");
  const [objective, setObjective] = useState(item?.objective ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const activeAssets = assets.filter((a) => a.status !== "Retiré");

  const save = async () => {
    if (!title.trim()) { setErr("Périmètre à auditer requis."); return; }
    setBusy(true); setErr(null);
    const payload = {
      title: title.trim(), category, riskLevel, year, quarter, ownerId,
      targetAssetId: targetMode === "asset" ? (targetAssetId || null) : null,
      targetLabel: targetMode === "free" ? targetLabel.trim() : "",
      gridId, auditId, plannedDate: plannedDate || null, status, objective,
    };
    const e = creating ? await createAuditPlanItem(payload) : item ? await updateAuditPlanItem(item.id, payload) : "—";
    setBusy(false);
    if (e) setErr(e); else onClose();
  };
  const del = async () => {
    if (!item || (typeof window !== "undefined" && !window.confirm(`Supprimer « ${item.ref} » du programme ?`))) return;
    setBusy(true);
    const e = await deleteAuditPlanItem(item.id);
    setBusy(false);
    if (e) setErr(e); else onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto animate-fade" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg my-8 max-h-[92vh] overflow-y-auto animate-pop" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3 p-4 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
          <CalendarRange size={20} className="text-emerald-600 mt-1 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-semibold text-slate-800 dark:text-slate-100">{creating ? "Ajouter au programme d'audit" : item?.ref}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Périmètre planifié (ISO 19011)</div>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        <div className="p-4 space-y-3">
          {err && <div className="text-[12px] text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{err}</div>}
          <div>
            <label className={labelCls}>Périmètre à auditer</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} disabled={!canEdit} placeholder="Ex. Audit des sauvegardes" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className={labelCls}>Catégorie</label><select value={category} onChange={(e) => setCategory(e.target.value)} disabled={!canEdit} className={inputCls}>{AUDIT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
            <div><label className={labelCls}>Priorité (risque)</label><select value={riskLevel} onChange={(e) => setRisk(e.target.value)} disabled={!canEdit} className={inputCls}>{AUDIT_RISK_LEVELS.map((r) => <option key={r}>{r}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div><label className={labelCls}>Année</label><input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} disabled={!canEdit} className={inputCls} /></div>
            <div><label className={labelCls}>Trimestre</label><select value={quarter} onChange={(e) => setQuarter(e.target.value)} disabled={!canEdit} className={inputCls}>{PLAN_QUARTERS.map((q) => <option key={q}>{q}</option>)}</select></div>
            <div><label className={labelCls}>Date prévue</label><input type="date" value={plannedDate} onChange={(e) => setPlanned(e.target.value)} disabled={!canEdit} className={inputCls} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className={labelCls}>Auditeur</label><select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} disabled={!canEdit} className={inputCls}>{profiles.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}</select></div>
            <div><label className={labelCls}>Statut</label><select value={status} onChange={(e) => setStatus(e.target.value)} disabled={!canEdit} className={inputCls}>{AUDIT_PLAN_STATUS.map((s) => <option key={s}>{s}</option>)}</select></div>
          </div>

          <div>
            <label className={labelCls}>Cible</label>
            <div className="flex items-center gap-1.5 mb-1.5">
              <button onClick={() => canEdit && setTargetMode("free")} className={`text-[11px] rounded-full px-2.5 py-1 border ${targetMode === "free" ? "bg-emerald-100 border-emerald-300 text-emerald-800" : "border-slate-200 text-slate-500"}`}>Libre</button>
              <button onClick={() => canEdit && setTargetMode("asset")} className={`text-[11px] rounded-full px-2.5 py-1 border ${targetMode === "asset" ? "bg-emerald-100 border-emerald-300 text-emerald-800" : "border-slate-200 text-slate-500"}`}>Actif du registre</button>
            </div>
            {targetMode === "asset" ? (
              <select value={targetAssetId} onChange={(e) => setTargetAssetId(e.target.value)} disabled={!canEdit} className={inputCls}>
                <option value="">— Choisir un actif —</option>
                {activeAssets.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            ) : (
              <input value={targetLabel} onChange={(e) => setTargetLabel(e.target.value)} disabled={!canEdit} placeholder="Ex. Contrôleurs de domaine" className={inputCls} />
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>Grille pressentie</label>
              <select value={gridId} onChange={(e) => setGridId(e.target.value)} disabled={!canEdit} className={inputCls}>
                <option value="">—</option>
                {auditGrids.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Audit réalisé (lien)</label>
              <select value={auditId} onChange={(e) => setAuditId(e.target.value)} disabled={!canEdit} className={inputCls}>
                <option value="">—</option>
                {audits.map((a) => <option key={a.id} value={a.id}>{a.ref} · {a.title}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Objectif / justification</label>
            <textarea value={objective} onChange={(e) => setObjective(e.target.value)} disabled={!canEdit} rows={2} className={inputCls} />
          </div>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2 p-4 border-t border-slate-100 dark:border-slate-800">
            <button onClick={save} disabled={busy || !title.trim()} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-slate-900 dark:bg-emerald-600 rounded-xl px-4 py-2 disabled:opacity-50"><CalendarRange size={15} /> {creating ? "Ajouter" : "Enregistrer"}</button>
            {!creating && item && <button onClick={del} disabled={busy} className="ml-auto inline-flex items-center gap-1 text-[12px] text-rose-600 border border-rose-200 rounded-lg px-3 py-2 hover:bg-rose-50"><Trash2 size={14} /> Supprimer</button>}
          </div>
        )}
      </div>
    </div>
  );
}

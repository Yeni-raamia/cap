"use client";

import { useMemo, useState } from "react";
import { CalendarRange, Plus, Target } from "lucide-react";
import {
  AUDIT_PLAN_STATUS_TONE, AUDIT_RISK_TONE, PLAN_QUARTERS, fmt, isAuditPlanActive, isAuditPlanLate,
  type AuditPlanItem,
} from "@/lib/domain";
import { useApp } from "@/components/app-context";
import { Card, Token } from "@/components/atoms";
import { GrcTabHeader } from "@/components/grc/GrcTabHeader";
import { EmptyState } from "@/components/EmptyState";
import { AuditPlanModal } from "@/components/AuditPlanModal";

export function ProgrammeTab() {
  const { auditPlanItems, profileById, assetById, readOnly } = useApp();
  const now = useMemo(() => new Date(), []);
  const years = useMemo(() => {
    const ys = new Set(auditPlanItems.map((p) => p.year));
    ys.add(now.getFullYear());
    return [...ys].sort((a, b) => b - a);
  }, [auditPlanItems, now]);
  const [year, setYear] = useState(now.getFullYear());
  const [creating, setCreating] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const ofYear = auditPlanItems.filter((p) => p.year === year);
  const d = useMemo(() => {
    const total = ofYear.length;
    const realises = ofYear.filter((p) => p.status === "Réalisé").length;
    const late = ofYear.filter((p) => isAuditPlanLate(p, now)).length;
    const active = ofYear.filter(isAuditPlanActive).length;
    const coverage = total ? Math.round((realises / total) * 100) : 0;
    return { total, realises, late, active, coverage };
  }, [ofYear, now]);

  const editing = editId ? auditPlanItems.find((p) => p.id === editId) ?? null : null;
  const canCreate = !readOnly;
  const targetName = (p: AuditPlanItem) => (p.targetAssetId ? assetById(p.targetAssetId)?.name ?? p.targetLabel : p.targetLabel);

  return (
    <div className="space-y-5">
      <GrcTabHeader
        title="Programme d'audit annuel"
        subtitle="Le plan d'audit basé sur les risques (ISO 19011 §5) : quels périmètres auditer, quand et avec quelle priorité."
        right={canCreate ? (
          <button onClick={() => setCreating(true)} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-slate-900 dark:bg-emerald-600 rounded-xl px-3.5 py-2 hover:-translate-y-0.5 transition-transform shadow-soft">
            <Plus size={15} /> Ajouter un audit
          </button>
        ) : undefined}
      />

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[12px] text-slate-500">Année</span>
        <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="text-[13px] border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white dark:bg-slate-900">
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <div className="ml-auto flex items-center gap-3 text-[12px]">
          <span className="text-slate-500">{d.realises}/{d.total} réalisés</span>
          <span className="text-slate-400">·</span>
          <span className={d.late ? "text-rose-600 font-medium" : "text-slate-500"}>{d.late} en retard</span>
          <span className="text-slate-400">·</span>
          <span className="text-emerald-700 font-semibold">{d.coverage}% de couverture</span>
        </div>
      </div>

      {ofYear.length === 0 ? (
        <EmptyState icon={CalendarRange} title="Programme vide" subtitle={canCreate ? "Planifie les audits de l'année, par trimestre et par priorité de risque." : "Le programme d'audit sera défini par l'équipe."} />
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
          {PLAN_QUARTERS.map((q) => {
            const items = ofYear.filter((p) => p.quarter === q);
            return (
              <div key={q}>
                <div className="text-[12px] font-semibold text-slate-500 mb-2 flex items-center justify-between">
                  <span>{q}</span><span className="text-slate-400">{items.length}</span>
                </div>
                <div className="space-y-2">
                  {items.length === 0 ? (
                    <div className="text-[11px] text-slate-300 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-3 text-center">—</div>
                  ) : (
                    items.map((p) => {
                      const late = isAuditPlanLate(p, now);
                      return (
                        <button key={p.id} onClick={() => setEditId(p.id)} className="w-full text-left rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-soft p-3 hover:-translate-y-0.5 transition-transform">
                          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${AUDIT_RISK_TONE[p.riskLevel] ?? ""}`}>{p.riskLevel}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${AUDIT_PLAN_STATUS_TONE[p.status] ?? "bg-slate-100 text-slate-500"}`}>{p.status}</span>
                          </div>
                          <div className="text-[13px] font-semibold text-slate-800 dark:text-slate-100 leading-snug">{p.title}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">{p.category}</div>
                          {targetName(p) && <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1"><Target size={10} /> {targetName(p)}</div>}
                          <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-400 flex-wrap">
                            <span>{profileById(p.ownerId).nom}</span>
                            {p.plannedDate && <span className={late ? "text-rose-600 font-medium" : ""}>· {fmt(p.plannedDate)}</span>}
                            {p.auditId && <span className="text-emerald-600">· audit lié</span>}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {(creating || editing) && <AuditPlanModal item={editing} creating={creating} defaultYear={year} onClose={() => { setCreating(false); setEditId(null); }} />}
    </div>
  );
}

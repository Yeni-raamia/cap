"use client";

import { useMemo, useState } from "react";
import { Plus, Target } from "lucide-react";
import {
  fmt,
  isPlanActive,
  isPlanLate,
  PLAN_CATEGORIES,
  PLAN_CATEGORY_TONE,
  PLAN_QUARTERS,
  PLAN_STATUS_TONE,
  type GrcPlanItem,
} from "@/lib/domain";
import { useApp } from "@/components/app-context";
import { Card, Token } from "@/components/atoms";
import { GrcTabHeader } from "@/components/grc/GrcTabHeader";
import { EmptyState } from "@/components/EmptyState";
import { PlanItemModal } from "@/components/PlanItemModal";

const priorityTone: Record<string, string> = {
  Basse: "bg-slate-100 text-slate-500",
  Normale: "bg-sky-100 text-sky-700",
  Haute: "bg-amber-100 text-amber-700",
  Critique: "bg-rose-100 text-rose-700",
};
const QUARTER_LABEL: Record<string, string> = { T1: "T1 · janv.–mars", T2: "T2 · avr.–juin", T3: "T3 · juil.–sept.", T4: "T4 · oct.–déc." };

export function PlanTab() {
  const { planItems, profileById, readOnly } = useApp();
  const now = useMemo(() => new Date(), []);
  const years = useMemo(() => {
    const s = new Set(planItems.map((p) => p.year));
    s.add(new Date().getFullYear());
    return [...s].sort((a, b) => b - a);
  }, [planItems]);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [fCategory, setFCategory] = useState("");
  const [creating, setCreating] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const ofYear = useMemo(
    () => planItems.filter((p) => p.year === year && (!fCategory || p.category === fCategory)),
    [planItems, year, fCategory]
  );

  const kpi = useMemo(() => {
    const active = ofYear.filter(isPlanActive);
    const done = ofYear.filter((p) => p.status === "Terminé").length;
    const late = ofYear.filter((p) => isPlanLate(p, now)).length;
    const avg = ofYear.length ? Math.round(ofYear.reduce((a, p) => a + (p.status === "Terminé" ? 100 : p.progress), 0) / ofYear.length) : 0;
    return { total: ofYear.length, active: active.length, done, late, avg };
  }, [ofYear, now]);

  const editing = editId ? planItems.find((p) => p.id === editId) ?? null : null;
  const canCreate = !readOnly;

  return (
    <div className="space-y-5">
      <GrcTabHeader
        title="Plan de travail"
        subtitle="Chantiers de l'équipe GRC, cadencés par trimestre — pilotage de l'avancement et des priorités."
        right={canCreate ? (
          <button onClick={() => setCreating(true)} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-slate-900 dark:bg-emerald-600 rounded-xl px-3.5 py-2 hover:-translate-y-0.5 transition-transform shadow-soft">
            <Plus size={15} /> Nouveau chantier
          </button>
        ) : undefined}
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Kpi label="Chantiers" value={`${kpi.total}`} tone="text-slate-700" />
        <Kpi label="Actifs" value={`${kpi.active}`} tone="text-sky-600" />
        <Kpi label="Terminés" value={`${kpi.done}`} tone="text-emerald-600" />
        <Kpi label="En retard" value={`${kpi.late}`} tone="text-rose-600" />
        <Kpi label="Avancement moy." value={`${kpi.avg}%`} tone="text-violet-600" />
      </div>

      <Card className="p-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} aria-label="Année" className="text-[12px] border border-slate-200 rounded-lg px-2 py-1.5 bg-white font-medium">
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={fCategory} onChange={(e) => setFCategory(e.target.value)} aria-label="Catégorie" className="text-[12px] border border-slate-200 rounded-lg px-2 py-1.5 bg-white">
            <option value="">Toutes catégories</option>
            {PLAN_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </Card>

      {planItems.length === 0 ? (
        <EmptyState icon={Target} title="Aucun chantier" subtitle={canCreate ? "Structure le plan de travail de l'équipe par trimestre." : "Le plan de travail sera géré par l'équipe GRC."} />
      ) : ofYear.length === 0 ? (
        <Card className="p-6 text-center text-[13px] text-slate-400">Aucun chantier pour {year}{fCategory ? ` · ${fCategory}` : ""}.</Card>
      ) : (
        <div className="space-y-4">
          {PLAN_QUARTERS.map((q) => {
            const items = ofYear.filter((p) => p.quarter === q);
            if (items.length === 0) return null;
            return (
              <div key={q}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[12px] font-semibold text-slate-600">{QUARTER_LABEL[q]}</span>
                  <span className="text-[11px] text-slate-400">· {items.length} chantier{items.length > 1 ? "s" : ""}</span>
                  <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  {items.map((p) => (
                    <PlanCard key={p.id} p={p} late={isPlanLate(p, now)} owner={profileById(p.ownerId).nom} onClick={() => setEditId(p.id)} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {(creating || editing) && (
        <PlanItemModal item={editing} creating={creating} onClose={() => { setCreating(false); setEditId(null); }} />
      )}
    </div>
  );
}

function PlanCard({ p, late, owner, onClick }: { p: GrcPlanItem; late: boolean; owner: string; onClick: () => void }) {
  const pct = p.status === "Terminé" ? 100 : p.progress;
  return (
    <button onClick={onClick} className="text-left rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-soft p-4 hover:-translate-y-0.5 transition-transform">
      <div className="flex items-start gap-2 mb-1.5 flex-wrap">
        <Token>{p.ref}</Token>
        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${PLAN_CATEGORY_TONE[p.category] ?? "bg-slate-50 text-slate-600 border-slate-200"}`}>{p.category}</span>
        <span className={`text-[10px] px-2 py-0.5 rounded-full ${PLAN_STATUS_TONE[p.status] ?? "bg-slate-100 text-slate-500"}`}>{p.status}</span>
        <span className={`text-[10px] px-2 py-0.5 rounded-full ${priorityTone[p.priority] ?? "bg-slate-100 text-slate-500"}`}>{p.priority}</span>
      </div>
      <div className="text-[14px] font-semibold text-slate-800 leading-snug">{p.title}</div>
      <div className="mt-2.5">
        <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
          <span>Avancement</span>
          <span className="font-mono">{pct}%</span>
        </div>
        <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${pct >= 100 ? "bg-emerald-500" : pct >= 50 ? "bg-sky-500" : "bg-amber-500"}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-400 flex-wrap">
        <span>{owner}</span>
        {p.dueDate && <span className={late ? "text-rose-600 font-medium" : ""}>· échéance {fmt(p.dueDate)}</span>}
      </div>
    </button>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <Card className="p-3.5">
      <div className={`text-2xl font-bold ${tone}`}>{value}</div>
      <div className="text-[11px] text-slate-400 mt-0.5">{label}</div>
    </Card>
  );
}

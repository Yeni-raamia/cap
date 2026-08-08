"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, LifeBuoy, Plus, Search } from "lucide-react";
import {
  fmt,
  hasContinuityGap,
  isPlanReviewLate,
  isPlanTestStale,
  MISSION_VALUES,
  MISSION_VALUE_TONE,
  type ContinuityPlan,
} from "@/lib/domain";
import { useApp } from "@/components/app-context";
import { Card, Token } from "@/components/atoms";
import { GrcTabHeader } from "@/components/grc/GrcTabHeader";
import { ContinuiteRapportPdf } from "@/components/grc/ContinuiteRapportPdf";
import { EmptyState } from "@/components/EmptyState";
import { ContinuityModal } from "@/components/ContinuityModal";

const statusTone: Record<string, string> = {
  Brouillon: "bg-slate-100 text-slate-600",
  Validé: "bg-emerald-100 text-emerald-700",
  "À réviser": "bg-amber-100 text-amber-700",
  Obsolète: "bg-slate-200 text-slate-400",
};

export function ContinuiteTab() {
  const { continuityPlans, missionById, profileById, readOnly } = useApp();
  const now = useMemo(() => new Date(), []);
  const [search, setSearch] = useState("");
  const [fCrit, setFCrit] = useState("");
  const [creating, setCreating] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return continuityPlans.filter((p) =>
      (!q || p.activity.toLowerCase().includes(q) || p.ref.toLowerCase().includes(q)) &&
      (!fCrit || p.criticality === fCrit)
    );
  }, [continuityPlans, search, fCrit]);

  const kpi = useMemo(() => {
    const active = continuityPlans.filter((p) => p.status !== "Obsolète");
    return {
      total: continuityPlans.length,
      vitaux: active.filter((p) => p.criticality === "Vitale").length,
      aTester: active.filter((p) => isPlanTestStale(p, now)).length,
      ecarts: active.filter((p) => hasContinuityGap(p) || isPlanReviewLate(p, now)).length,
    };
  }, [continuityPlans, now]);

  const editing = editId ? continuityPlans.find((p) => p.id === editId) ?? null : null;
  const canCreate = !readOnly;

  return (
    <div className="space-y-5">
      <GrcTabHeader
        title="Continuité d'activité"
        subtitle="BIA (analyse d'impact) et plans de continuité/reprise (PCA/PRA) : pour chaque activité critique, l'impact d'une interruption et comment reprendre — DMIA, RTO, RPO."
        right={
          <div className="flex items-center gap-2">
            <ContinuiteRapportPdf />
            {canCreate && (
              <button onClick={() => setCreating(true)} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-slate-900 dark:bg-emerald-600 rounded-xl px-3.5 py-2 hover:-translate-y-0.5 transition-transform shadow-soft">
                <Plus size={15} /> Nouveau plan
              </button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Plans de continuité" value={`${kpi.total}`} tone="text-cyan-600" />
        <Kpi label="Activités vitales" value={`${kpi.vitaux}`} tone="text-rose-600" />
        <Kpi label="À tester" value={`${kpi.aTester}`} tone="text-amber-600" />
        <Kpi label="Écarts / à réviser" value={`${kpi.ecarts}`} tone="text-rose-600" />
      </div>

      <Card className="p-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[10rem]">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher…" className="w-full text-[13px] border border-slate-200 rounded-lg pl-8 pr-2 py-1.5 outline-none focus:border-emerald-400" />
          </div>
          <select value={fCrit} onChange={(e) => setFCrit(e.target.value)} aria-label="Criticité" className="text-[12px] border border-slate-200 rounded-lg px-2 py-1.5 bg-white">
            <option value="">Toutes criticités</option>
            {MISSION_VALUES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </Card>

      {continuityPlans.length === 0 ? (
        <EmptyState icon={LifeBuoy} title="Aucun plan de continuité" subtitle={canCreate ? "Décris tes activités critiques, leur impact et comment les reprendre." : "La continuité sera gérée par l'équipe GRC."} />
      ) : filtered.length === 0 ? (
        <Card className="p-6 text-center text-[13px] text-slate-400">Aucun plan ne correspond au filtre.</Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {filtered.map((p) => (
            <PlanCard key={p.id} p={p} missionName={p.missionId ? missionById(p.missionId)?.name ?? null : null} owner={p.ownerId ? profileById(p.ownerId).nom : "—"} testStale={isPlanTestStale(p, now)} reviewLate={isPlanReviewLate(p, now)} gap={hasContinuityGap(p)} onClick={() => setEditId(p.id)} />
          ))}
        </div>
      )}

      {(creating || editing) && <ContinuityModal plan={editing} creating={creating} onClose={() => { setCreating(false); setEditId(null); }} />}
    </div>
  );
}

function PlanCard({ p, missionName, owner, testStale, reviewLate, gap, onClick }: { p: ContinuityPlan; missionName: string | null; owner: string; testStale: boolean; reviewLate: boolean; gap: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-left rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-soft p-4 hover:-translate-y-0.5 transition-transform">
      <div className="flex items-start gap-2 mb-1.5 flex-wrap">
        <Token>{p.ref}</Token>
        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${MISSION_VALUE_TONE[p.criticality] ?? ""}`}>{p.criticality}</span>
        <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusTone[p.status] ?? "bg-slate-100 text-slate-500"}`}>{p.status}</span>
        {gap && <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700"><AlertTriangle size={11} /> RTO &gt; DMIA</span>}
      </div>
      <div className="text-[14px] font-semibold text-slate-800 dark:text-slate-100 leading-snug">{p.activity}</div>
      {missionName && <div className="text-[11px] text-indigo-600 mt-0.5">🎯 {missionName}</div>}

      {/* Objectifs de reprise */}
      <div className="grid grid-cols-3 gap-1.5 mt-2.5">
        <Obj label="DMIA" value={p.mtpd} />
        <Obj label="RTO" value={p.rto} />
        <Obj label="RPO" value={p.rpo} />
      </div>

      <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-400 flex-wrap">
        <span>{owner}</span>
        <span className={testStale ? "text-amber-600 font-medium" : ""}>· {p.lastTestDate ? `testé ${fmt(p.lastTestDate)}` : "jamais testé"}</span>
        {reviewLate && <span className="text-rose-600 font-medium inline-flex items-center gap-0.5"><AlertTriangle size={11} /> revue en retard</span>}
      </div>
    </button>
  );
}

function Obj({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 dark:bg-slate-800 text-center py-1.5">
      <div className="text-[9px] text-slate-400 uppercase">{label}</div>
      <div className="text-[12px] font-bold text-slate-700 dark:text-slate-200">{value}</div>
    </div>
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

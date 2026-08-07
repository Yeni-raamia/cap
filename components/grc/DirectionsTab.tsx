"use client";

import { useMemo, useState } from "react";
import { Building2, Plus, Users2 } from "lucide-react";
import { directionPolicyRollup, type Direction } from "@/lib/domain";
import { useApp } from "@/components/app-context";
import { Card, Token } from "@/components/atoms";
import { GrcTabHeader } from "@/components/grc/GrcTabHeader";
import { EmptyState } from "@/components/EmptyState";
import { DirectionModal } from "@/components/DirectionModal";

export function DirectionsTab() {
  const { directions, policies, profileById, readOnly } = useApp();
  const [creating, setCreating] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const kpi = useMemo(() => {
    const services = directions.reduce((n, d) => n + d.services.length, 0);
    const rolls = directions.map((d) => directionPolicyRollup(d, policies)).filter((r) => r.total > 0);
    const avg = rolls.length ? Math.round(rolls.reduce((a, r) => a + r.pct, 0) / rolls.length) : 0;
    return { total: directions.length, services, avg };
  }, [directions, policies]);

  const editing = editId ? directions.find((d) => d.id === editId) ?? null : null;
  const canCreate = !readOnly;

  return (
    <div className="space-y-5">
      <GrcTabHeader
        title="Directions & services"
        subtitle="Organigramme de l'organisation (une direction regroupe plusieurs services) — et le suivi de l'assimilation/applicabilité des politiques par direction."
        right={canCreate ? (
          <button onClick={() => setCreating(true)} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-slate-900 dark:bg-emerald-600 rounded-xl px-3.5 py-2 hover:-translate-y-0.5 transition-transform shadow-soft">
            <Plus size={15} /> Nouvelle direction
          </button>
        ) : undefined}
      />

      <div className="grid grid-cols-3 gap-3">
        <Kpi label="Directions" value={`${kpi.total}`} tone="text-teal-600" />
        <Kpi label="Services" value={`${kpi.services}`} tone="text-slate-700" />
        <Kpi label="Applicabilité moyenne" value={`${kpi.avg}%`} tone="text-emerald-600" />
      </div>

      {directions.length === 0 ? (
        <EmptyState icon={Building2} title="Aucune direction" subtitle={canCreate ? "Recense les directions et leurs services pour suivre l'assimilation des politiques." : "L'organigramme sera géré par l'équipe GRC."} />
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {directions.map((d) => <DirectionCard key={d.id} d={d} roll={directionPolicyRollup(d, policies)} headName={d.headId ? profileById(d.headId).nom : "—"} onClick={() => setEditId(d.id)} />)}
        </div>
      )}

      {(creating || editing) && (
        <DirectionModal direction={editing} creating={creating} onClose={() => { setCreating(false); setEditId(null); }} />
      )}
    </div>
  );
}

function DirectionCard({ d, roll, headName, onClick }: { d: Direction; roll: ReturnType<typeof directionPolicyRollup>; headName: string; onClick: () => void }) {
  const assim = roll.total ? Math.round((roll.comprises / roll.total) * 100) : 0;
  return (
    <button onClick={onClick} className="text-left rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-soft p-4 hover:-translate-y-0.5 transition-transform">
      <div className="flex items-start gap-2 mb-1.5 flex-wrap">
        <Token>{d.ref}</Token>
        {d.code && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">{d.code}</span>}
      </div>
      <div className="text-[14px] font-semibold text-slate-800 dark:text-slate-100 leading-snug">{d.name}</div>
      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1"><Users2 size={12} /> {headName} · {d.services.length} service{d.services.length > 1 ? "s" : ""}</div>

      {/* Services */}
      {d.services.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {d.services.map((s) => <span key={s.id} className="text-[10px] text-slate-500 bg-slate-100 dark:bg-slate-800 rounded-full px-2 py-0.5">{s.name}</span>)}
        </div>
      )}

      {/* Applicabilité des politiques */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
          <span>Applicabilité des politiques{roll.total > 0 ? ` · ${roll.applicable}/${roll.total}` : ""}</span>
          <span className="font-mono">{roll.total > 0 ? `${roll.pct}%` : "—"}</span>
        </div>
        <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${roll.pct >= 70 ? "bg-emerald-500" : roll.pct >= 40 ? "bg-amber-500" : "bg-rose-500"}`} style={{ width: `${roll.pct}%` }} />
        </div>
        {roll.total > 0 && <div className="text-[10px] text-slate-400 mt-1">Assimilation (compris + appliqué) : {assim}%</div>}
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

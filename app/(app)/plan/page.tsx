"use client";

import { useMemo, useState } from "react";
import { CalendarRange, ChevronLeft, ChevronRight, Flag, Plane, Plus, Target, TrendingDown } from "lucide-react";
import {
  fmt,
  objectiveHealth,
  objectiveProgress,
  OBJECTIVE_COLORS,
  OBJECTIVE_STATUT_LABEL,
  type Objective,
  type ObjectiveHealth,
} from "@/lib/domain";
import { useApp } from "@/components/app-context";
import { Avatar } from "@/components/atoms";
import { CountUp, Ring } from "@/components/dataviz";
import { PageHero } from "@/components/PageHero";
import { EmptyState } from "@/components/EmptyState";
import { ObjectiveModal } from "@/components/ObjectiveModal";

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

const HEALTH: Record<ObjectiveHealth, { label: string; color: string; text: string }> = {
  planned: { label: "Planifié", color: "#94a3b8", text: "text-slate-500" },
  on_track: { label: "Sur la bonne voie", color: "#10b981", text: "text-emerald-600" },
  at_risk: { label: "À risque", color: "#f59e0b", text: "text-amber-600" },
  late: { label: "En retard", color: "#f43f5e", text: "text-rose-600" },
  done: { label: "Atteint", color: "#10b981", text: "text-emerald-600" },
  downgraded: { label: "Déclassé", color: "#64748b", text: "text-slate-400" },
};

export default function PlanPage() {
  const { objectives, projects, tasks, me, now, profileById, demo } = useApp();
  const [year, setYear] = useState(now.getFullYear());
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const canManage = !demo && ["manager", "directeur", "admin"].includes(me.role);

  const yearStart = new Date(year, 0, 1).getTime();
  const yearEnd = new Date(year, 11, 31, 23, 59, 59).getTime();
  const yearMs = yearEnd - yearStart;

  // Objectifs qui recoupent l'année sélectionnée, triés par début.
  const shown = useMemo(
    () =>
      objectives
        .filter((o) => o.startDate.getTime() <= yearEnd && o.endDate.getTime() >= yearStart)
        .sort((a, b) => a.startDate.getTime() - b.startDate.getTime()),
    [objectives, yearStart, yearEnd]
  );

  const rows = shown.map((o) => {
    const progress = objectiveProgress(o, projects, tasks, now);
    const health = objectiveHealth(o, progress, now);
    return { o, progress, health };
  });

  const stats = {
    total: shown.length,
    atteints: rows.filter((r) => r.o.status === "atteint").length,
    risque: rows.filter((r) => r.health === "at_risk" || r.health === "late").length,
    avg: rows.length ? Math.round(rows.reduce((s, r) => s + r.progress, 0) / rows.length) : 0,
  };

  const todayPct = now.getFullYear() === year ? ((now.getTime() - yearStart) / yearMs) * 100 : -1;

  const openObj = openId ? objectives.find((o) => o.id === openId) ?? null : null;

  return (
    <div className="space-y-6 animate-float">
      <PageHero
        kicker="Cap sur l'année"
        icon={CalendarRange}
        title="Plan de l'année"
        subtitle="Les grands objectifs de l'année, comme un plan de vol : d'où l'on part, où l'on va, et les turbulences."
        right={
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-1">
              <button onClick={() => setYear((y) => y - 1)} aria-label="Année précédente" className="p-1.5 text-slate-500 hover:text-slate-800"><ChevronLeft size={16} /></button>
              <span className="text-[13px] font-bold text-slate-800 tabular-nums w-12 text-center">{year}</span>
              <button onClick={() => setYear((y) => y + 1)} aria-label="Année suivante" className="p-1.5 text-slate-500 hover:text-slate-800"><ChevronRight size={16} /></button>
            </div>
            {canManage && (
              <button onClick={() => setCreating(true)} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-slate-900 dark:bg-emerald-600 rounded-xl px-3.5 py-2 hover:-translate-y-0.5 transition-transform shadow-soft">
                <Plus size={16} /> Objectif
              </button>
            )}
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger">
        <Kpi label="Objectifs" value={stats.total} icon={Target} tone="#0ea5e9" />
        <Kpi label="Atteints" value={stats.atteints} icon={Flag} tone="#10b981" />
        <Kpi label="À risque" value={stats.risque} icon={TrendingDown} tone="#f43f5e" danger={stats.risque > 0} />
        <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-soft p-4 flex items-center gap-4">
          <Ring value={stats.avg} size={62} color="#10b981"><span className="text-[13px] font-bold text-slate-800"><CountUp value={stats.avg} suffix="%" /></span></Ring>
          <div>
            <div className="text-[13px] font-semibold text-slate-800">Avancement global</div>
            <div className="text-[11px] text-slate-400">moyenne des objectifs {year}</div>
          </div>
        </div>
      </div>

      {/* Timeline / plan de vol */}
      <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-soft p-5 overflow-hidden">
        <div className="flex items-center gap-2 mb-4">
          <Plane size={16} className="text-emerald-500 -rotate-45" />
          <h2 className="text-[14px] font-bold text-slate-800">Plan de vol {year}</h2>
        </div>

        {rows.length === 0 ? (
          <EmptyState icon={CalendarRange} title="Aucun objectif pour cette année" subtitle={canManage ? "Ajoute un premier objectif pour tracer le cap." : "Les objectifs seront définis par un manager."} action={canManage ? <button onClick={() => setCreating(true)} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-slate-900 dark:bg-emerald-600 rounded-xl px-3.5 py-2 hover:-translate-y-0.5 transition-transform shadow-soft"><Plus size={15} /> Nouvel objectif</button> : undefined} />
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[720px]">
              {/* En-tête des mois */}
              <div className="flex pl-[210px] pr-2 relative">
                {MONTHS.map((m, i) => (
                  <div key={i} className="flex-1 text-[10px] font-medium text-slate-400 text-center uppercase tracking-wide">{m}</div>
                ))}
              </div>

              {/* Lignes d'objectifs */}
              <div className="relative mt-1">
                {/* Curseur aujourd'hui */}
                {todayPct >= 0 && todayPct <= 100 && (
                  <div className="absolute top-0 bottom-0 z-[2] pointer-events-none" style={{ left: `calc(210px + (100% - 218px) * ${todayPct / 100})` }}>
                    <div className="absolute inset-y-0 w-px bg-emerald-400/70" />
                    <div className="absolute -top-1 -translate-x-1/2 h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.25)]" />
                  </div>
                )}

                {rows.map(({ o, progress, health }) => {
                  const cs = Math.max(o.startDate.getTime(), yearStart);
                  const ce = Math.min(o.endDate.getTime(), yearEnd);
                  const left = ((cs - yearStart) / yearMs) * 100;
                  const width = Math.max(2, ((ce - cs) / yearMs) * 100);
                  const owner = profileById(o.ownerId);
                  const hc = HEALTH[health];
                  const downgraded = o.status === "declasse";
                  return (
                    <button
                      key={o.id}
                      onClick={() => setOpenId(o.id)}
                      className="group w-full flex items-center h-11 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors text-left"
                    >
                      {/* Colonne libellé */}
                      <div className="w-[210px] shrink-0 pr-3 flex items-center gap-2 min-w-0">
                        <Avatar init={owner.init} size="h-6 w-6" />
                        <div className="min-w-0">
                          <div className={`text-[12.5px] font-medium truncate ${downgraded ? "text-slate-400 line-through" : "text-slate-800"}`}>{o.title}</div>
                          <div className={`text-[10px] ${hc.text}`}>{hc.label}</div>
                        </div>
                      </div>
                      {/* Piste */}
                      <div className="relative flex-1 h-full">
                        {/* Lignes de mois */}
                        {Array.from({ length: 11 }, (_, i) => (
                          <div key={i} className="absolute inset-y-0 w-px bg-slate-100 dark:bg-slate-800" style={{ left: `${((i + 1) / 12) * 100}%` }} />
                        ))}
                        {/* Barre de l'objectif */}
                        <div
                          className="absolute top-1/2 -translate-y-1/2 h-5 rounded-full flex items-center shadow-soft transition-transform group-hover:scale-y-110"
                          style={{
                            left: `${left}%`,
                            width: `${width}%`,
                            background: downgraded ? "repeating-linear-gradient(45deg,#cbd5e1,#cbd5e1 5px,#e2e8f0 5px,#e2e8f0 10px)" : `${o.color}22`,
                            border: `1.5px solid ${downgraded ? "#cbd5e1" : o.color}`,
                          }}
                        >
                          {/* Remplissage = avancement */}
                          {!downgraded && (
                            <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${progress}%`, background: o.color, opacity: 0.85 }} />
                          )}
                          {/* Destination (drapeau) */}
                          <span className="absolute -right-1.5 top-1/2 -translate-y-1/2 grid place-items-center h-4 w-4 rounded-full bg-white dark:bg-slate-900 border" style={{ borderColor: downgraded ? "#cbd5e1" : o.color }}>
                            <Flag size={9} style={{ color: downgraded ? "#94a3b8" : o.color }} />
                          </span>
                          {/* % au-dessus de la barre */}
                          <span className="relative z-[1] ml-2 text-[10px] font-bold" style={{ color: downgraded ? "#94a3b8" : "#fff", mixBlendMode: downgraded ? "normal" : "normal" }}>
                            {downgraded ? "déclassé" : `${progress}%`}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Liste des objectifs */}
      {rows.length > 0 && (
        <div className="grid md:grid-cols-2 gap-3 stagger">
          {rows.map(({ o, progress, health }) => (
            <ObjectiveCard key={o.id} o={o} progress={progress} health={health} onOpen={() => setOpenId(o.id)} />
          ))}
        </div>
      )}

      {(openObj || creating) && (
        <ObjectiveModal
          objective={openObj}
          creating={creating}
          onClose={() => {
            setOpenId(null);
            setCreating(false);
          }}
        />
      )}
    </div>
  );
}

function Kpi({ label, value, icon: Icon, tone, danger }: { label: string; value: number; icon: typeof Target; tone: string; danger?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 transition-transform duration-200 hover:-translate-y-0.5 ${danger ? "border-rose-200/70 dark:border-rose-500/20 bg-rose-50/40 dark:bg-rose-500/5" : "border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900"} shadow-soft`}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">{label}</span>
        <Icon size={15} style={{ color: tone }} />
      </div>
      <div className="text-[32px] font-extrabold tracking-tight text-slate-900 leading-none mt-1"><CountUp value={value} /></div>
    </div>
  );
}

function ObjectiveCard({ o, progress, health, onOpen }: { o: Objective; progress: number; health: ObjectiveHealth; onOpen: () => void }) {
  const { profileById } = useApp();
  const owner = profileById(o.ownerId);
  const hc = HEALTH[health];
  return (
    <button onClick={onOpen} className="group text-left rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-soft p-4 transition-transform duration-200 hover:-translate-y-0.5">
      <div className="flex items-start gap-3">
        <span className="mt-1 h-3 w-3 rounded-full shrink-0" style={{ background: o.color }} />
        <div className="flex-1 min-w-0">
          <div className={`text-[14px] font-bold truncate ${o.status === "declasse" ? "text-slate-400 line-through" : "text-slate-800"}`}>{o.title}</div>
          <div className="text-[11.5px] text-slate-400 mt-0.5">{fmt(o.startDate)} → {fmt(o.endDate)}</div>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium bg-slate-100 dark:bg-slate-800 ${hc.text}`}>{o.status === "declasse" ? OBJECTIVE_STATUT_LABEL.declasse : hc.label}</span>
      </div>
      {o.status !== "declasse" ? (
        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1"><span>Avancement</span><span className="font-mono">{progress}%</span></div>
          <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${progress}%`, background: o.color }} />
          </div>
        </div>
      ) : (
        <div className="mt-3 text-[12px] text-slate-500 flex items-start gap-1.5"><TrendingDown size={13} className="text-slate-400 mt-0.5 shrink-0" /> {o.downgradeReason || "Objectif déclassé."}</div>
      )}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
        <Avatar init={owner.init} size="h-6 w-6" />
        <span className="text-[11.5px] text-slate-500 truncate">{owner.nom}</span>
        {o.projectIds.length > 0 && <span className="text-[11px] text-slate-400">· {o.projectIds.length} projet(s)</span>}
        {o.memberIds.length > 0 && <span className="text-[11px] text-slate-400">· {o.memberIds.length} équipier(s)</span>}
        <span className="ml-auto text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">Ouvrir →</span>
      </div>
    </button>
  );
}

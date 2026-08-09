"use client";

import { useMemo } from "react";
import { AlertTriangle, ClipboardCheck, ClipboardList, Gauge, Target } from "lucide-react";
import { auditScoreTone, computeAuditScore, fmt, type Audit } from "@/lib/domain";
import { useApp } from "@/components/app-context";
import { Card, Token } from "@/components/atoms";
import { GrcTabHeader } from "@/components/grc/GrcTabHeader";
import { EmptyState } from "@/components/EmptyState";
import { ConsolidatedRadarCard } from "@/components/audit/ConsolidatedRadarCard";

export function AuditDashboardTab({ onTab }: { onTab: (tab: string) => void }) {
  const { audits, auditGrids, assetById, profileById } = useApp();

  const d = useMemo(() => {
    const scored = audits.map((a) => ({ a, s: computeAuditScore(a.questions, a.responses) }));
    const withAnswers = scored.filter((x) => x.s.answered > 0);
    const avg = withAnswers.length ? Math.round(withAnswers.reduce((sum, x) => sum + x.s.global, 0) / withAnswers.length) : 0;
    const gaps = scored.reduce((n, x) => n + x.s.gaps, 0);
    const criticalGaps = scored.reduce((n, x) => n + x.s.criticalGaps, 0);

    // Score moyen par catégorie.
    const byCat = new Map<string, { sum: number; n: number }>();
    withAnswers.forEach(({ a, s }) => {
      const c = byCat.get(a.category) ?? { sum: 0, n: 0 };
      c.sum += s.global; c.n += 1; byCat.set(a.category, c);
    });
    const catScores = [...byCat.entries()].map(([category, v]) => ({ category, score: Math.round(v.sum / v.n) })).sort((x, y) => x.score - y.score);

    const recent = [...scored].slice(0, 5);
    return { avg, gaps, criticalGaps, catScores, recent };
  }, [audits]);

  const targetName = (a: Audit) => (a.targetAssetId ? assetById(a.targetAssetId)?.name ?? a.targetLabel : a.targetLabel) || "—";

  return (
    <div className="space-y-5">
      <GrcTabHeader title="Tableau de bord Audit" subtitle="Vue d'ensemble des audits techniques : couverture, scores et constats à traiter." />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile icon={ClipboardCheck} tone="text-emerald-600" label="Audits" value={audits.length} sub={`${auditGrids.length} grilles`} onClick={() => onTab("audits")} />
        <StatTile icon={Gauge} tone={d.avg >= 80 ? "text-emerald-600" : d.avg >= 50 ? "text-amber-600" : "text-rose-600"} label="Score moyen" value={`${d.avg}%`} sub="audits évalués" onClick={() => onTab("audits")} />
        <StatTile icon={AlertTriangle} tone="text-rose-600" label="Constats" value={d.gaps} sub={`${d.criticalGaps} critiques`} onClick={() => onTab("audits")} />
        <StatTile icon={ClipboardList} tone="text-sky-600" label="Grilles" value={auditGrids.length} sub="référentiels" onClick={() => onTab("grilles")} />
      </div>

      {audits.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title="Aucun audit pour l'instant" subtitle="Crée une grille puis lance ton premier audit pour voir apparaître les scores." />
      ) : (
        <>
        <ConsolidatedRadarCard />
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Score par catégorie */}
          <Card className="p-4">
            <div className="text-[13px] font-semibold text-slate-700 mb-3 flex items-center gap-2"><Gauge size={15} className="text-emerald-500" /> Score moyen par catégorie</div>
            {d.catScores.length === 0 ? (
              <div className="text-[12px] text-slate-400 py-4 text-center">Aucun audit évalué.</div>
            ) : (
              <div className="space-y-2">
                {d.catScores.map((c) => (
                  <div key={c.category} className="flex items-center gap-2">
                    <span className="w-40 shrink-0 text-[12px] text-slate-600 truncate" title={c.category}>{c.category}</span>
                    <div className="flex-1 h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${c.score >= 80 ? "bg-emerald-500" : c.score >= 50 ? "bg-amber-500" : "bg-rose-500"}`} style={{ width: `${c.score}%` }} />
                    </div>
                    <span className={`w-9 text-right text-[12px] font-mono font-semibold ${auditScoreTone(c.score)}`}>{c.score}%</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Audits récents */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[13px] font-semibold text-slate-700 flex items-center gap-2"><ClipboardCheck size={15} className="text-sky-500" /> Audits récents</div>
              <button onClick={() => onTab("audits")} className="text-[11px] text-emerald-700 hover:underline">Tous →</button>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {d.recent.map(({ a, s }) => (
                <button key={a.id} onClick={() => onTab("audits")} className="w-full text-left flex items-center gap-2 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded px-1">
                  <Token>{a.ref}</Token>
                  <span className="flex-1 min-w-0 text-[12.5px] text-slate-700 dark:text-slate-200 truncate">{a.title}<span className="text-slate-400"> · {targetName(a)}</span></span>
                  {s.gaps > 0 && <span className="text-[10px] text-rose-500 shrink-0">{s.gaps} constat{s.gaps > 1 ? "s" : ""}</span>}
                  <span className={`shrink-0 text-[13px] font-bold ${auditScoreTone(s.global)}`}>{s.global}%</span>
                </button>
              ))}
            </div>
          </Card>
        </div>
        </>
      )}
    </div>
  );
}

function StatTile({ icon: Icon, tone, label, value, sub, onClick }: { icon: typeof Target; tone: string; label: string; value: number | string; sub?: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="text-left">
      <Card className="p-3.5 hover:-translate-y-0.5 transition-transform">
        <div className="flex items-center gap-2"><Icon size={16} className={tone} /><span className="text-[11px] text-slate-400">{label}</span></div>
        <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{value}</div>
        {sub && <div className="text-[11px] text-slate-400 mt-0.5">{sub}</div>}
      </Card>
    </button>
  );
}

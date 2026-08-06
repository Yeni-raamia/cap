"use client";

import { useMemo } from "react";
import { Boxes, ScrollText, ShieldAlert, TrendingUp } from "lucide-react";
import {
  assetCriticality,
  policyCoverage,
  riskLevel,
  RISK_LEVEL_TONE,
  type AssetCriticality,
  type RiskLevel,
} from "@/lib/domain";
import { useApp } from "@/components/app-context";
import { Card, Token } from "@/components/atoms";
import { GrcTabHeader } from "@/components/grc/GrcTabHeader";

export function DashboardTab({ onTab }: { onTab: (tab: string) => void }) {
  const { risks, policies, assets, profileById } = useApp();

  const d = useMemo(() => {
    const withLvl = risks.map((r) => ({ r, level: riskLevel(r.probability, r.impact) }));
    const openRisks = withLvl.filter(({ r }) => r.status !== "Clôturé");
    const riskByLevel: Record<RiskLevel, number> = { Critique: 0, Élevé: 0, Moyen: 0, Faible: 0 };
    openRisks.forEach(({ level }) => (riskByLevel[level] += 1));
    const topRisks = [...openRisks].sort((a, b) => b.r.probability * b.r.impact - a.r.probability * a.r.impact).slice(0, 5);

    const assetByCrit: Record<AssetCriticality, number> = { Critique: 0, Élevé: 0, Modéré: 0, Faible: 0 };
    assets.filter((a) => a.status !== "Retiré").forEach((a) => (assetByCrit[assetCriticality(a)] += 1));

    const enVigueur = policies.filter((p) => p.status === "En vigueur");
    const covs = enVigueur.map((p) => policyCoverage(p)).filter((c) => c.total > 0);
    const applicMoy = covs.length ? Math.round(covs.reduce((a, c) => a + c.pct, 0) / covs.length) : 0;

    const now = Date.now();
    const overdue =
      risks.filter((r) => r.reviewDate && r.reviewDate.getTime() < now && r.status !== "Clôturé").length +
      assets.filter((a) => a.reviewDate && a.reviewDate.getTime() < now && a.status !== "Retiré").length +
      policies.filter((p) => p.reviewDate && p.reviewDate.getTime() < now && p.status !== "Retirée").length;

    return { riskByLevel, topRisks, assetByCrit, applicMoy, overdue, openRisks: openRisks.length };
  }, [risks, policies, assets]);

  return (
    <div className="space-y-5">
      <GrcTabHeader title="Tableau de bord GRC" subtitle="Vue transverse : actifs, risques et conformité de l'équipe Gouvernance-Risque-Conformité." />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile icon={Boxes} tone="text-teal-600" label="Actifs" value={assets.length} sub={`${d.assetByCrit.Critique} critiques`} onClick={() => onTab("actifs")} />
        <StatTile icon={ShieldAlert} tone="text-rose-600" label="Risques ouverts" value={d.openRisks} sub={`${d.riskByLevel.Critique} critiques · ${d.riskByLevel.Élevé} élevés`} onClick={() => onTab("risques")} />
        <StatTile icon={ScrollText} tone="text-sky-600" label="Applicabilité moy." value={`${d.applicMoy}%`} sub={`${policies.length} politiques`} onClick={() => onTab("politiques")} />
        <StatTile icon={TrendingUp} tone="text-amber-600" label="Revues en retard" value={d.overdue} sub="actifs · risques · politiques" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Répartition des risques ouverts par niveau */}
        <Card className="p-4">
          <div className="text-[13px] font-semibold text-slate-700 mb-3 flex items-center gap-2"><ShieldAlert size={15} className="text-rose-500" /> Risques ouverts par niveau</div>
          <div className="space-y-2">
            {(["Critique", "Élevé", "Moyen", "Faible"] as RiskLevel[]).map((lvl) => {
              const n = d.riskByLevel[lvl];
              const pct = d.openRisks ? Math.round((n / d.openRisks) * 100) : 0;
              return (
                <div key={lvl} className="flex items-center gap-2">
                  <span className={`w-16 text-[11px] font-medium rounded px-1.5 py-0.5 text-center border ${RISK_LEVEL_TONE[lvl]}`}>{lvl}</span>
                  <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-slate-400 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[12px] font-mono text-slate-500 w-6 text-right">{n}</span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Top risques */}
        <Card className="p-4">
          <div className="text-[13px] font-semibold text-slate-700 mb-3 flex items-center gap-2"><TrendingUp size={15} className="text-orange-500" /> Risques les plus élevés</div>
          {d.topRisks.length === 0 ? (
            <div className="text-[12px] text-slate-400 py-4 text-center">Aucun risque ouvert.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {d.topRisks.map(({ r, level }) => (
                <button key={r.id} onClick={() => onTab("risques")} className="w-full text-left flex items-center gap-2 py-2 hover:bg-slate-50 rounded px-1">
                  <span className={`shrink-0 text-[10px] font-bold rounded-full px-2 py-0.5 border ${RISK_LEVEL_TONE[level]}`}>{level}</span>
                  <Token>{r.ref}</Token>
                  <span className="flex-1 min-w-0 text-[12.5px] text-slate-700 truncate">{r.title}</span>
                  <span className="text-[11px] text-slate-400 shrink-0">{profileById(r.ownerId).nom}</span>
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function StatTile({ icon: Icon, tone, label, value, sub, onClick }: { icon: typeof Boxes; tone: string; label: string; value: number | string; sub?: string; onClick?: () => void }) {
  const inner = (
    <>
      <div className="flex items-center gap-2">
        <Icon size={16} className={tone} />
        <span className="text-[11px] text-slate-400">{label}</span>
      </div>
      <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{value}</div>
      {sub && <div className="text-[11px] text-slate-400 mt-0.5">{sub}</div>}
    </>
  );
  return onClick ? (
    <button onClick={onClick} className="text-left"><Card className="p-3.5 hover:-translate-y-0.5 transition-transform">{inner}</Card></button>
  ) : (
    <Card className="p-3.5">{inner}</Card>
  );
}

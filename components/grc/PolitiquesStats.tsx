"use client";

import { useMemo } from "react";
import { BarChart3 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { POLICY_STAGE_ALL, POLICY_STATUTS, type Policy } from "@/lib/domain";
import { useApp } from "@/components/app-context";
import { Card } from "@/components/atoms";

const STAGE_HEX: Record<string, string> = {
  Diffusée: "#94a3b8",
  Consultée: "#0ea5e9",
  Comprise: "#8b5cf6",
  Applicable: "#10b981",
  "Non applicable": "#cbd5e1",
};
const STATUS_HEX: Record<string, string> = {
  Brouillon: "#94a3b8",
  "En vigueur": "#10b981",
  Révisée: "#0ea5e9",
  Retirée: "#cbd5e1",
};

/** Graphiques : répartition des diffusions par état de suivi + politiques par statut. */
export function PolitiquesStats({ policies }: { policies: Policy[] }) {
  const { theme } = useApp();
  const dark = theme === "dark";
  const grid = dark ? "#1e293b" : "#eef2f6";
  const tick = { fontSize: 11, fill: dark ? "#94a3b8" : "#64748b" };
  const tip = {
    contentStyle: { fontSize: 12, borderRadius: 8, border: `1px solid ${grid}`, background: dark ? "#0f172a" : "#fff" },
    labelStyle: { color: dark ? "#e2e8f0" : "#334155" },
  };

  const stageData = useMemo(() => {
    const counts: Record<string, number> = {};
    POLICY_STAGE_ALL.forEach((s) => (counts[s] = 0));
    policies.forEach((p) => p.diffusions.forEach((d) => { if (counts[d.stage] !== undefined) counts[d.stage] += 1; }));
    return POLICY_STAGE_ALL.map((s) => ({ name: s, n: counts[s] }));
  }, [policies]);

  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    POLICY_STATUTS.forEach((s) => (counts[s] = 0));
    policies.forEach((p) => { if (counts[p.status] !== undefined) counts[p.status] += 1; });
    return POLICY_STATUTS.map((s) => ({ name: s, value: counts[s] })).filter((x) => x.value > 0);
  }, [policies]);

  const totalDiff = stageData.reduce((a, x) => a + x.n, 0);

  return (
    <Card className="p-4">
      <div className="text-[13px] font-semibold text-slate-700 mb-3 flex items-center gap-2"><BarChart3 size={15} className="text-sky-500" /> Statistiques de suivi</div>
      <div className="grid md:grid-cols-2 gap-4">
        {/* Diffusions par état de suivi */}
        <div>
          <div className="text-[11px] text-slate-500 mb-1">Diffusions par état de suivi{totalDiff > 0 ? ` · ${totalDiff} au total` : ""}</div>
          {totalDiff === 0 ? (
            <div className="h-[180px] grid place-items-center text-[12px] text-slate-400">Aucune diffusion à afficher.</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={stageData} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={grid} />
                <XAxis dataKey="name" tick={tick} tickLine={false} axisLine={{ stroke: grid }} interval={0} angle={-12} textAnchor="end" height={44} />
                <YAxis tick={tick} allowDecimals={false} tickLine={false} axisLine={false} width={30} />
                <Tooltip {...tip} cursor={{ fill: dark ? "#ffffff10" : "#00000008" }} />
                <Bar dataKey="n" name="Diffusions" radius={[4, 4, 0, 0]}>
                  {stageData.map((d) => <Cell key={d.name} fill={STAGE_HEX[d.name] ?? "#94a3b8"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Politiques par statut */}
        <div>
          <div className="text-[11px] text-slate-500 mb-1">Politiques par statut</div>
          {statusData.length === 0 ? (
            <div className="h-[180px] grid place-items-center text-[12px] text-slate-400">Aucune politique.</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={38} outerRadius={64} paddingAngle={2}>
                  {statusData.map((d) => <Cell key={d.name} fill={STATUS_HEX[d.name] ?? "#94a3b8"} />)}
                </Pie>
                <Tooltip {...tip} />
                <Legend wrapperStyle={{ fontSize: 11, color: dark ? "#c3c2b7" : "#52514e" }} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </Card>
  );
}

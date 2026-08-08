"use client";

import { useMemo } from "react";
import { Building2 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { directionPolicyRollup, POLICY_STAGES, POLICY_STAGE_NA, type Direction, type Policy } from "@/lib/domain";
import { useApp } from "@/components/app-context";
import { Card } from "@/components/atoms";

/** Couleurs par étape (mêmes teintes que PolitiquesStats). */
export const STAGE_HEX: Record<string, string> = {
  Diffusée: "#94a3b8",
  Consultée: "#0ea5e9",
  Comprise: "#8b5cf6",
  Applicable: "#10b981",
  "Non applicable": "#cbd5e1",
};

/** Agrège l'avancement de l'acceptation des politiques par direction. */
export function directionPolicyRows(directions: Direction[], policies: Policy[]) {
  return directions
    .map((d) => {
      const roll = directionPolicyRollup(d, policies);
      const concernedTotal = roll.total + (roll.byStage[POLICY_STAGE_NA] ?? 0);
      return { dir: d, roll, concernedTotal };
    })
    .filter((r) => r.concernedTotal > 0)
    .sort((a, b) => b.roll.pct - a.roll.pct || b.roll.total - a.roll.total);
}

/** Graphe : avancement de l'acceptation des politiques par direction (barres empilées). */
export function PolitiquesParDirection() {
  const { directions, policies, theme } = useApp();
  const dark = theme === "dark";
  const grid = dark ? "#1e293b" : "#eef2f6";
  const tick = { fontSize: 11, fill: dark ? "#94a3b8" : "#64748b" };

  const rows = useMemo(() => directionPolicyRows(directions, policies), [directions, policies]);

  const data = rows.map(({ dir, roll }) => ({
    name: `${dir.code || dir.name} · ${roll.pct}%`,
    Diffusée: roll.byStage["Diffusée"] ?? 0,
    Consultée: roll.byStage["Consultée"] ?? 0,
    Comprise: roll.byStage["Comprise"] ?? 0,
    Applicable: roll.byStage["Applicable"] ?? 0,
    "Non applicable": roll.byStage[POLICY_STAGE_NA] ?? 0,
  }));

  const stages = [...POLICY_STAGES, POLICY_STAGE_NA];

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="text-[13px] font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
          <Building2 size={15} className="text-indigo-500" /> Avancement de l&apos;acceptation par direction
        </div>
        <span className="text-[11px] text-slate-400">% = politiques applicables / concernées</span>
      </div>
      {data.length === 0 ? (
        <div className="h-[160px] grid place-items-center text-[12px] text-slate-400 text-center px-4">
          Aucune diffusion rattachée à une direction. Renseigne l&apos;organigramme (onglet Directions) et diffuse les politiques aux services correspondants.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(160, data.length * 46 + 40)}>
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={grid} />
            <XAxis type="number" tick={tick} allowDecimals={false} tickLine={false} axisLine={{ stroke: grid }} />
            <YAxis type="category" dataKey="name" tick={tick} tickLine={false} axisLine={false} width={104} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${grid}`, background: dark ? "#0f172a" : "#fff" }}
              labelStyle={{ color: dark ? "#e2e8f0" : "#334155" }}
              cursor={{ fill: dark ? "#ffffff10" : "#00000008" }}
            />
            <Legend wrapperStyle={{ fontSize: 11, color: dark ? "#c3c2b7" : "#52514e" }} iconType="circle" />
            {stages.map((s, i) => (
              <Bar key={s} dataKey={s} stackId="a" fill={STAGE_HEX[s]} radius={i === stages.length - 1 ? [0, 4, 4, 0] : undefined} maxBarSize={26} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}

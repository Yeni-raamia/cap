"use client";

import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";
import { useApp } from "@/components/app-context";

/** Radar des scores par domaine d'un audit (0–100). */
export function AuditRadar({ data, height = 240, color = "#10b981" }: { data: { domain: string; score: number }[]; height?: number; color?: string }) {
  const { theme } = useApp();
  const dark = theme === "dark";
  const grid = dark ? "#334155" : "#e2e8f0";
  const tick = { fontSize: 10, fill: dark ? "#94a3b8" : "#64748b" };

  if (data.length < 3) {
    return <div style={{ height }} className="grid place-items-center text-[12px] text-slate-400 text-center px-4">Le radar s&apos;affiche à partir de 3 domaines dans la grille.</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke={grid} />
        <PolarAngleAxis dataKey="domain" tick={tick} />
        <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9, fill: dark ? "#64748b" : "#94a3b8" }} angle={90} />
        <Radar dataKey="score" stroke={color} fill={color} fillOpacity={0.35} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${grid}`, background: dark ? "#0f172a" : "#fff" }}
          labelStyle={{ color: dark ? "#e2e8f0" : "#334155" }}
          formatter={(v) => [`${v}/100`, "Score"]}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}

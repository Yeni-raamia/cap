"use client";

import { useMemo, useState } from "react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Radar as RadarIcon } from "lucide-react";
import { computeRadar, type Item, type Profile, type Project, type Task } from "@/lib/domain";
import { Card } from "./atoms";

interface TipRow {
  dim: string;
  hint: string;
  raw: number;
  membre: number;
  equipe: number;
}

function RadarTip({ active, payload, memberName }: { active?: boolean; payload?: { payload: TipRow }[]; memberName: string }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-[11px] max-w-[220px]">
      <div className="font-semibold text-slate-700">{row.dim}</div>
      <div className="text-slate-400 mb-1">{row.hint}</div>
      <div className="text-emerald-600 font-medium">{memberName} : {row.membre}/100 <span className="text-slate-400">({row.raw})</span></div>
      <div className="text-slate-500">Équipe (moy.) : {row.equipe}/100</div>
    </div>
  );
}

/** Radar de profil (gamification) : un membre vs la moyenne de l'équipe, 6 axes normalisés. */
export function ProfilRadar({
  members,
  items,
  tasks,
  projects,
  now,
  meId,
}: {
  members: Profile[];
  items: Item[];
  tasks: Task[];
  projects: Project[];
  now: Date;
  meId: string;
}) {
  const memberIds = useMemo(() => members.map((m) => m.id), [members]);
  const radar = useMemo(() => computeRadar(memberIds, items, tasks, projects, now), [memberIds, items, tasks, projects, now]);
  const [sel, setSel] = useState<string>(meId);

  const selName = members.find((m) => m.id === sel)?.nom ?? "Membre";
  const data: TipRow[] = radar.labels.map((label, i) => ({
    dim: label,
    hint: radar.hints[i],
    raw: radar.rawByMember[sel]?.[i] ?? 0,
    membre: radar.byMember[sel]?.[i] ?? 0,
    equipe: radar.average[i],
  }));
  const total = data.reduce((a, r) => a + r.membre, 0);
  const teamTotal = data.reduce((a, r) => a + r.equipe, 0);

  return (
    <div>
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <RadarIcon size={15} className="text-emerald-500" />
        <h2 className="text-[13px] font-semibold text-slate-700 uppercase tracking-wide">Profil de compétences</h2>
        <span className="text-[11px] text-slate-400">échelle relative à l&apos;équipe</span>
        <select
          value={sel}
          onChange={(e) => setSel(e.target.value)}
          aria-label="Membre à comparer"
          className="ml-auto text-[12px] border border-slate-200 rounded-lg px-2 py-1 bg-white"
        >
          {members.map((m) => (
            <option key={m.id} value={m.id}>{m.id === meId ? `${m.nom} (moi)` : m.nom}</option>
          ))}
        </select>
      </div>
      <Card className="p-3">
        <div className="grid md:grid-cols-[1fr_auto] gap-3 items-center">
          <div className="h-[320px] min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={data} outerRadius="72%">
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="dim" tick={{ fontSize: 11, fill: "#475569" }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Radar name="Équipe (moy.)" dataKey="equipe" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.2} />
                <Radar name={selName} dataKey="membre" stroke="#10b981" fill="#10b981" fillOpacity={0.4} />
                <Tooltip content={<RadarTip memberName={selName} />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex md:flex-col gap-3 justify-around md:justify-center px-2">
            <div className="text-center">
              <div className="text-[11px] text-slate-400">Indice {sel === meId ? "(moi)" : ""}</div>
              <div className="text-2xl font-bold text-emerald-600">{Math.round(total / data.length)}</div>
              <div className="text-[10px] text-slate-400">/ 100</div>
            </div>
            <div className="text-center">
              <div className="text-[11px] text-slate-400">Équipe</div>
              <div className="text-2xl font-bold text-slate-400">{Math.round(teamTotal / data.length)}</div>
              <div className="text-[10px] text-slate-400">/ 100</div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

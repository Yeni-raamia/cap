"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { STATUTS, type Statut } from "@/lib/domain";
import { useApp } from "@/components/app-context";
import { RapportPdf } from "@/components/RapportPdf";

const box = "bg-white border border-slate-200 rounded-xl p-4";

export default function StatsPage() {
  const { items, profiles, catalogue } = useApp();
  const agents = profiles.filter((u) => u.role === "agent");

  const parMetier = Object.keys(catalogue.metiers)
    .map((m) => ({ name: m, v: items.filter((i) => i.metier === m).length }))
    .filter((x) => x.v);

  const parAgent = agents.map((u) => {
    const mine = items.filter((i) => i.ownerId === u.id);
    const rep = mine.filter((i) => i.timeline.some((e) => e.kind === "reponse")).length;
    return { name: u.init, taux: mine.length ? Math.round((rep / mine.length) * 100) : 0 };
  });

  const relances = agents.map((u) => ({
    name: u.init,
    v: items.filter((i) => i.ownerId === u.id).reduce((s, i) => s + i.relancesCount, 0),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Statistiques</h1>
          <p className="text-[13px] text-slate-500">
            Le registre, en vivant. Ce qui avance, ce qui répond, qui fait bouger les lignes.
          </p>
        </div>
        <RapportPdf />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className={box}>
          <div className="text-[13px] font-semibold text-slate-700 mb-3">Volume par métier</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={parMetier}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f6" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="v" radius={[4, 4, 0, 0]} fill="#1FA07A" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className={box}>
          <div className="text-[13px] font-semibold text-slate-700 mb-3">
            Taux de réponse par agent (%)
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={parAgent}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f6" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="taux" radius={[4, 4, 0, 0]}>
                {parAgent.map((e, i) => (
                  <Cell
                    key={i}
                    fill={e.taux >= 60 ? "#1FA07A" : e.taux >= 30 ? "#D9943B" : "#C9503E"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className={box}>
          <div className="text-[13px] font-semibold text-slate-700 mb-3">
            Relances effectuées par agent
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={relances}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f6" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="v" radius={[4, 4, 0, 0]} fill="#3E7CB1" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className={box}>
          <div className="text-[13px] font-semibold text-slate-700 mb-3">
            Répartition des statuts
          </div>
          <div className="space-y-2 mt-4">
            {(Object.keys(STATUTS) as Statut[]).map((s) => {
              const n = items.filter((i) => i.statut === s).length;
              const pct = items.length ? Math.round((n / items.length) * 100) : 0;
              return (
                <div key={s} className="flex items-center gap-2 text-[12px]">
                  <span className="w-24 text-slate-600">{s}</span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-400" style={{ width: pct + "%" }} />
                  </div>
                  <span className="w-6 text-right text-slate-400">{n}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

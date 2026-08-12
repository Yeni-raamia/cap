"use client";

import { useMemo } from "react";
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
import { Megaphone, TriangleAlert } from "lucide-react";
import { policyPublicationStats } from "@/lib/domain";
import { useApp } from "@/components/app-context";
import { Card } from "@/components/atoms";

const AXIS = { fill: "#94a3b8", fontSize: 11 };
const GRID = "#e2e8f0";
const TOOLTIP = {
  contentStyle: {
    borderRadius: 10,
    border: "1px solid #e2e8f0",
    fontSize: 12,
    boxShadow: "0 4px 14px rgba(15,23,42,.08)",
  },
  labelStyle: { fontSize: 12, fontWeight: 600 },
};

/** Au-delà de 60 jours sans rappel, la politique mérite l'attention. */
const RAPPEL_SEUIL_JOURS = 60;

/**
 * Statistiques de rediffusion des politiques.
 *
 * À distinguer de `PolitiquesStats`, qui mesure l'avancement des diffusions
 * par service (Diffusée → Consultée → Comprise → Applicable) : ici on suit le
 * rythme des rappels dans le temps.
 *
 * Répond à trois questions : combien rappelle-t-on, lesquelles, et par quel
 * canal — plus celles qu'on a cessé de rappeler, qui sont le vrai signal.
 */
export function PolitiquesRediffusionsStats() {
  const { policies, now } = useApp();
  const s = useMemo(() => policyPublicationStats(policies, now, 12), [policies, now]);

  const top = s.parPolitique.filter((p) => p.count > 0).slice(0, 8);
  const oubliees = s.parPolitique.filter((p) => p.jours !== null && p.jours > RAPPEL_SEUIL_JOURS);

  if (s.total === 0) {
    return (
      <Card className="p-6 text-center">
        <Megaphone size={22} className="mx-auto text-slate-300 mb-1.5" />
        <div className="text-[13px] text-slate-400">
          Aucune rediffusion consignée pour l&apos;instant. Enregistrez vos rappels depuis la fiche d&apos;une politique :
          les statistiques apparaîtront ici.
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Repères */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="text-2xl font-semibold text-slate-800 dark:text-slate-100">{s.total}</div>
          <div className="text-[12px] text-slate-500">Rediffusions au total</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-semibold text-emerald-600">{s.ceMois}</div>
          <div className="text-[12px] text-slate-500">Ce mois-ci</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-semibold text-slate-800 dark:text-slate-100">{s.moyenne}</div>
          <div className="text-[12px] text-slate-500">Moyenne par politique en vigueur</div>
        </Card>
        <Card className="p-4">
          <div className={`text-2xl font-semibold ${s.jamais ? "text-amber-600" : "text-emerald-600"}`}>{s.jamais}</div>
          <div className="text-[12px] text-slate-500">Jamais rediffusées</div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Rythme mensuel */}
        <Card className="p-4">
          <div className="text-[13px] font-semibold text-slate-700 dark:text-slate-200 mb-3">
            Rythme des rediffusions — 12 derniers mois
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={s.parMois} margin={{ top: 4, right: 8, left: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
              <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} />
              <YAxis tick={AXIS} allowDecimals={false} tickLine={false} axisLine={false} width={30} />
              <Tooltip {...TOOLTIP} formatter={(v) => [`${Number(v)} rediffusion(s)`, ""]} />
              <Bar dataKey="count" name="Rediffusions" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Par politique */}
        <Card className="p-4">
          <div className="text-[13px] font-semibold text-slate-700 dark:text-slate-200 mb-3">
            Rediffusions par politique
          </div>
          {top.length === 0 ? (
            <div className="text-[12.5px] text-slate-400 py-8 text-center">Aucune politique rediffusée.</div>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(200, top.length * 30)}>
              <BarChart data={top} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={GRID} />
                <XAxis type="number" tick={AXIS} allowDecimals={false} tickLine={false} axisLine={{ stroke: GRID }} />
                <YAxis
                  type="category"
                  dataKey="titre"
                  tick={AXIS}
                  width={130}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: string) => (v.length > 20 ? `${v.slice(0, 19)}…` : v)}
                />
                <Tooltip {...TOOLTIP} formatter={(v) => [`${Number(v)} rediffusion(s)`, ""]} />
                <Bar dataKey="count" name="Rediffusions" radius={[0, 6, 6, 0]}>
                  {top.map((p) => (
                    // Une politique rappelée ce mois-ci se distingue de celles qu'on a laissées dormir.
                    <Cell key={p.id} fill={p.ceMois > 0 ? "#10b981" : "#94a3b8"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
          <div className="text-[11px] text-slate-400 mt-1">Vert : rappelée ce mois-ci · gris : pas ce mois-ci.</div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Canaux */}
        <Card className="p-4">
          <div className="text-[13px] font-semibold text-slate-700 dark:text-slate-200 mb-3">Canaux utilisés</div>
          <div className="space-y-2">
            {s.parCanal.map((c) => {
              const pct = Math.round((c.count / s.total) * 100);
              return (
                <div key={c.canal} className="flex items-center gap-2">
                  <span className="w-36 shrink-0 text-[12px] text-slate-600 dark:text-slate-300 truncate">{c.canal}</span>
                  <div className="flex-1 h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-sky-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-14 text-right text-[11px] font-mono text-slate-500">{c.count} · {pct}%</span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Ce qui mérite attention */}
        <Card className="p-4">
          <div className="text-[13px] font-semibold text-slate-700 dark:text-slate-200 mb-3 inline-flex items-center gap-1.5">
            <TriangleAlert size={14} className="text-amber-500" /> Politiques à rappeler
          </div>
          {oubliees.length === 0 && s.jamais === 0 ? (
            <div className="text-[12.5px] text-slate-400 py-6 text-center">
              Toutes les politiques en vigueur ont été rappelées récemment.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {s.parPolitique
                .filter((p) => p.count === 0 || (p.jours !== null && p.jours > RAPPEL_SEUIL_JOURS))
                .slice(0, 8)
                .map((p) => (
                  <div key={p.id} className="flex items-center gap-2 py-1.5">
                    <span className="flex-1 min-w-0 text-[12.5px] text-slate-700 dark:text-slate-200 truncate">{p.titre}</span>
                    <span className={`text-[11.5px] shrink-0 ${p.count === 0 ? "text-amber-700" : "text-slate-500"}`}>
                      {p.count === 0 ? "jamais rediffusée" : `il y a ${p.jours} j`}
                    </span>
                  </div>
                ))}
            </div>
          )}
          <div className="text-[11px] text-slate-400 mt-2">
            Signalées au-delà de {RAPPEL_SEUIL_JOURS} jours sans rappel, ou jamais rediffusées.
          </div>
        </Card>
      </div>
    </div>
  );
}

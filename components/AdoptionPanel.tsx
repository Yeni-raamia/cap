"use client";

import { useCallback, useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, Info, Loader2, Users } from "lucide-react";
import { Card } from "./atoms";

interface UsageData {
  days: number;
  retentionDays: number;
  comptes: number;
  actifs7: number;
  actifs30: number;
  parJour: { day: string; users: number }[];
  heures: { weekday: number; hour: number; users: number }[];
  pages: { page: string; users: number }[];
}

const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const HEURES = Array.from({ length: 13 }, (_, i) => i + 7); // 7 h → 19 h

/** Libellés lisibles des routes internes. */
const PAGE_LABELS: Record<string, string> = {
  "/espace": "Mon espace",
  "/cockpit": "Accueil",
  "/global": "Vue globale",
  "/projets": "Projets",
  "/productivite": "Productivité",
  "/planning": "Planning",
  "/plan": "Plan de l'année",
  "/grc": "GRC",
  "/audit": "Audit",
  "/soc": "SOC",
  "/stats": "Statistiques",
  "/messagerie": "Messagerie",
  "/reunions": "Réunions",
  "/contacts": "Contacts",
  "/classement": "Classement",
  "/rappels": "Rappels",
  "/relations": "Relations",
  "/admin": "Administration",
};
const pageLabel = (p: string) => PAGE_LABELS[p] ?? p;

/**
 * Adoption de l'application — volontairement **non nominative**.
 *
 * On mesure si l'outil sert, pas qui s'en sert : uniquement des comptages de
 * personnes distinctes. Et seule l'activité réelle compte — un onglet laissé
 * ouvert sans interaction n'est pas comptabilisé.
 */
export function AdoptionPanel() {
  const [data, setData] = useState<UsageData | null>(null);
  const [days, setDays] = useState(30);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/usage?days=${days}`, { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) return setErr(d.error ?? "Erreur.");
      setErr(null);
      setData(d);
    } catch {
      setErr("Impossible de charger la mesure d'adoption.");
    }
  }, [days]);

  useEffect(() => {
    void load();
  }, [load]);

  if (err) return <Card className="p-6 text-center text-[13px] text-rose-600">{err}</Card>;
  if (!data)
    return (
      <Card className="p-8 text-center text-[13px] text-slate-400">
        <Loader2 size={18} className="mx-auto animate-spin mb-2" /> Chargement…
      </Card>
    );

  const taux = data.comptes ? Math.round((data.actifs30 / data.comptes) * 100) : 0;
  const maxHeat = Math.max(1, ...data.heures.map((h) => h.users));
  const heatOf = (weekday: number, hour: number) =>
    data.heures.find((h) => h.weekday === weekday && h.hour === hour)?.users ?? 0;
  const totalMesure = data.parJour.reduce((n, d) => n + d.users, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 text-[12px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2">
        <Info size={15} className="text-slate-400 mt-0.5 shrink-0" />
        <span>
          Mesure <b>non nominative</b> : uniquement des comptages de personnes distinctes, jamais de temps individuel.
          Seule l&apos;<b>activité réelle</b> est comptée — un onglet ouvert sans interaction ne compte pas. Les données
          brutes sont effacées après {data.retentionDays} jours.
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-medium text-slate-500 uppercase tracking-wide">Actifs · 7 j</span>
            <Users size={15} className="text-emerald-600" />
          </div>
          <div className="text-[30px] font-extrabold tracking-tight text-slate-900 dark:text-slate-100 leading-none mt-1 tabular-nums">
            {data.actifs7}
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-medium text-slate-500 uppercase tracking-wide">Actifs · 30 j</span>
            <Users size={15} className="text-sky-600" />
          </div>
          <div className="text-[30px] font-extrabold tracking-tight text-slate-900 dark:text-slate-100 leading-none mt-1 tabular-nums">
            {data.actifs30}
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-medium text-slate-500 uppercase tracking-wide">Comptes</span>
            <Users size={15} className="text-slate-400" />
          </div>
          <div className="text-[30px] font-extrabold tracking-tight text-slate-900 dark:text-slate-100 leading-none mt-1 tabular-nums">
            {data.comptes}
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-medium text-slate-500 uppercase tracking-wide">Taux d&apos;adoption</span>
            <Activity size={15} className={taux >= 70 ? "text-emerald-600" : taux >= 40 ? "text-amber-600" : "text-rose-600"} />
          </div>
          <div className={`text-[30px] font-extrabold tracking-tight leading-none mt-1 tabular-nums ${taux >= 70 ? "text-emerald-600" : taux >= 40 ? "text-amber-600" : "text-rose-600"}`}>
            {taux}%
          </div>
        </Card>
      </div>

      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 w-fit">
        {[7, 30, 90].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`text-[12px] px-2.5 py-1 rounded-md transition ${
              days === d ? "bg-white dark:bg-slate-700 shadow-sm font-medium text-slate-800 dark:text-slate-100" : "text-slate-500"
            }`}
          >
            {d} j
          </button>
        ))}
      </div>

      {totalMesure === 0 ? (
        <Card className="p-8 text-center text-[13px] text-slate-400">
          Aucune mesure pour l&apos;instant. La collecte démarre à partir de maintenant — rien n&apos;est reconstitué
          rétroactivement, aucune donnée d&apos;usage n&apos;existait avant.
        </Card>
      ) : (
        <>
          <Card className="p-4">
            <div className="text-[13px] font-semibold text-slate-700 dark:text-slate-200 mb-3">
              Personnes actives par jour
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={data.parJour} margin={{ top: 4, right: 8, left: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="gAdoption" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="day"
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "#e2e8f0" }}
                  tickFormatter={(v: string) => v.slice(8)}
                />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} allowDecimals={false} tickLine={false} axisLine={false} width={30} />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 }}
                  formatter={(v) => [`${Number(v)} personne(s)`, ""]}
                />
                <Area type="monotone" dataKey="users" stroke="#10b981" strokeWidth={2} fill="url(#gAdoption)" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          <div className="grid lg:grid-cols-2 gap-4">
            <Card className="p-4">
              <div className="text-[13px] font-semibold text-slate-700 dark:text-slate-200 mb-3">Heures d&apos;affluence</div>
              <div className="overflow-x-auto">
                <div className="min-w-[30rem]">
                  <div className="grid grid-cols-[2.5rem_repeat(13,1fr)] gap-0.5 mb-0.5">
                    <div />
                    {HEURES.map((h) => (
                      <div key={h} className="text-[9px] text-slate-400 text-center">{h}</div>
                    ))}
                  </div>
                  {JOURS.map((j, wd) => (
                    <div key={j} className="grid grid-cols-[2.5rem_repeat(13,1fr)] gap-0.5 mb-0.5">
                      <div className="text-[10px] text-slate-400 pr-1 text-right leading-5">{j}</div>
                      {HEURES.map((h) => {
                        const n = heatOf(wd, h);
                        const intensite = n / maxHeat;
                        return (
                          <div
                            key={h}
                            title={`${j} ${h} h — ${n} personne(s)`}
                            className="h-5 rounded-sm"
                            style={{
                              backgroundColor: n === 0 ? "rgba(148,163,184,.12)" : `rgba(16,185,129,${0.18 + intensite * 0.72})`,
                            }}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
              <div className="text-[11px] text-slate-400 mt-2">Cumul des personnes distinctes par créneau, sur la période.</div>
            </Card>

            <Card className="p-4">
              <div className="text-[13px] font-semibold text-slate-700 dark:text-slate-200 mb-3">Pages les plus utilisées</div>
              {data.pages.length === 0 ? (
                <div className="text-[12.5px] text-slate-400 py-6 text-center">Aucune page mesurée.</div>
              ) : (
                <div className="space-y-2">
                  {data.pages.map((p) => {
                    const pct = Math.round((p.users / Math.max(1, data.pages[0].users)) * 100);
                    return (
                      <div key={p.page} className="flex items-center gap-2">
                        <span className="w-32 shrink-0 text-[12px] text-slate-600 dark:text-slate-300 truncate">{pageLabel(p.page)}</span>
                        <div className="flex-1 h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-sky-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-8 text-right text-[11px] font-mono text-slate-500">{p.users}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

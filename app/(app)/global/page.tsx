"use client";

import { useMemo } from "react";
import { AlertOctagon, Inbox, ShieldAlert, TrendingUp, Users } from "lucide-react";
import { isPublished, STATUTS, toneBg, type Statut } from "@/lib/domain";
import { useApp } from "@/components/app-context";
import { CountUp, Heatmap, Sparkline } from "@/components/dataviz";
import { PageHero } from "@/components/PageHero";
import { SuiviExplorer } from "@/components/SuiviExplorer";

const iso = (d: Date) => new Date(d).toISOString().slice(0, 10);

export default function VueGlobalePage() {
  const { items: allItems, now, rs, catalogue } = useApp();
  // Vue d'équipe : on n'affiche que les suivis publiés (les brouillons privés
  // restent dans « Mon espace »).
  const items = useMemo(() => allItems.filter(isPublished), [allItems]);

  const sup = useMemo(() => {
    const active = items.filter((i) => i.statut !== "Clôturé");
    const late = items.filter((i) => rs(i).level === "escalade").length;
    const bloques = items.filter((i) => i.statut === "Bloqué").length;
    const clot = items.filter((i) => i.statut === "Clôturé").length;
    const slaOk = active.length ? Math.round(((active.length - late - bloques) / active.length) * 100) : 100;

    // Débit 14 j.
    const createdByDay = new Map<string, number>();
    items.forEach((i) => createdByDay.set(iso(i.dateCreation), (createdByDay.get(iso(i.dateCreation)) ?? 0) + 1));
    const debit = Array.from({ length: 14 }, (_, k) => {
      const d = new Date(now);
      d.setDate(now.getDate() - (13 - k));
      return createdByDay.get(iso(d)) ?? 0;
    });

    // Répartition par statut.
    const byStatut = (Object.keys(STATUTS) as Statut[]).map((s) => ({
      s,
      n: items.filter((i) => i.statut === s).length,
      color: STATUTS[s].color,
    }));
    const maxStatut = Math.max(1, ...byStatut.map((x) => x.n));

    // Volume par métier (top).
    const metierCount = new Map<string, number>();
    items.forEach((i) => metierCount.set(i.metier, (metierCount.get(i.metier) ?? 0) + 1));
    const byMetier = [...metierCount.entries()]
      .map(([code, n]) => ({ code, n, tone: catalogue.metiers[code]?.tone ?? "slate" }))
      .sort((a, b) => b.n - a.n)
      .slice(0, 7);
    const maxMetier = Math.max(1, ...byMetier.map((x) => x.n));

    // Heatmap d'activité.
    const heat = new Map<string, number>();
    items.forEach((i) => i.timeline.forEach((e) => heat.set(iso(e.date), (heat.get(iso(e.date)) ?? 0) + 1)));

    return { activeN: active.length, late, bloques, clot, slaOk, debit, byStatut, maxStatut, byMetier, maxMetier, heat };
  }, [items, now, rs, catalogue]);

  return (
    <div className="space-y-6 animate-float">
      <PageHero
        kicker="Centre de supervision"
        icon={Users}
        title="Vue globale"
        subtitle="Le travail de toute l'équipe, en un coup d'œil — pipeline, retards et activité en temps réel."
      />

      {/* KPIs de supervision */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger">
        <SupKpi label="Suivis de mail actifs" value={sup.activeN} icon={Inbox} tone="#0ea5e9">
          <Sparkline data={sup.debit} stroke="#0ea5e9" width={150} height={26} className="w-full" />
        </SupKpi>
        <SupKpi label="En retard" value={sup.late} icon={TrendingUp} tone="#f43f5e" danger={sup.late > 0}>
          <div className="text-[11px] text-slate-400">escaladés · à traiter</div>
        </SupKpi>
        <SupKpi label="Bloqués" value={sup.bloques} icon={ShieldAlert} tone="#f59e0b" danger={sup.bloques > 0}>
          <div className="text-[11px] text-slate-400">en attente de déblocage</div>
        </SupKpi>
        <SupKpi label="SLA tenu" value={sup.slaOk} suffix="%" icon={AlertOctagon} tone="#10b981">
          <div className="text-[11px] text-slate-400">{sup.clot} clôturés au total</div>
        </SupKpi>
      </div>

      {/* Panneaux : statuts · métiers · activité */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Panel title="Répartition par statut">
          <div className="space-y-2">
            {sup.byStatut.map(({ s, n, color }) => (
              <div key={s} className="flex items-center gap-2">
                <span className="text-[11.5px] text-slate-600 w-24 shrink-0 truncate">{s}</span>
                <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${toneBg[color]}`} style={{ width: `${Math.round((n / sup.maxStatut) * 100)}%` }} />
                </div>
                <span className="text-[11px] font-mono text-slate-500 w-6 text-right">{n}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Volume par métier">
          <div className="space-y-2">
            {sup.byMetier.map(({ code, n, tone }) => (
              <div key={code} className="flex items-center gap-2">
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${toneBg[tone]} w-12 text-center shrink-0`}>{code}</span>
                <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-slate-400" style={{ width: `${Math.round((n / sup.maxMetier) * 100)}%` }} />
                </div>
                <span className="text-[11px] font-mono text-slate-500 w-6 text-right">{n}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Activité de l'équipe">
          <Heatmap counts={sup.heat} weeks={13} />
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[11px] text-slate-400">Débit 14 j</span>
            <Sparkline data={sup.debit} width={130} height={30} />
          </div>
        </Panel>
      </div>

      {/* Explorateur détaillé */}
      <SuiviExplorer items={items} showResponsable showKpis={false} />
    </div>
  );
}

function SupKpi({ label, value, icon: Icon, tone, danger, suffix, children }: { label: string; value: number; icon: typeof Inbox; tone: string; danger?: boolean; suffix?: string; children?: React.ReactNode }) {
  return (
    <div className={`relative rounded-2xl border p-4 transition-transform duration-200 hover:-translate-y-0.5 ${danger ? "border-rose-200/70 dark:border-rose-500/20 bg-rose-50/40 dark:bg-rose-500/5" : "border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900"} shadow-soft`}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">{label}</span>
        <Icon size={15} style={{ color: tone }} />
      </div>
      <div className="text-[32px] font-extrabold tracking-tight text-slate-900 leading-none mt-1">
        <CountUp value={value} suffix={suffix} />
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-soft p-5">
      <h2 className="text-[13px] font-bold text-slate-800 mb-3">{title}</h2>
      {children}
    </div>
  );
}

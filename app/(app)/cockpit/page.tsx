"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  Bell,
  CheckCircle2,
  Command,
  Gauge as GaugeIcon,
  Inbox,
  Plus,
  ShieldAlert,
  Sparkles,
  Sun,
  TrendingUp,
} from "lucide-react";
import { fmtLong, greeting, isProjectArchived } from "@/lib/domain";
import { useApp } from "@/components/app-context";
import { Avatar } from "@/components/atoms";
import { CountUp, Sparkline, Ring, Heatmap } from "@/components/dataviz";

const iso = (d: Date) => new Date(d).toISOString().slice(0, 10);

export default function CockpitPage() {
  const { items, projects, negligences, profiles, me, now, rs, scores, setShowNew, openItem, profileById } = useApp();

  const firstName = (me.nom || "").split(/\s+/)[0] || me.nom;

  const data = useMemo(() => {
    const active = items.filter((i) => i.statut !== "Clôturé");
    const late = items.filter((i) => rs(i).level === "escalade").length;
    const bloques = items.filter((i) => i.statut === "Bloqué").length;
    const clot = items.filter((i) => i.statut === "Clôturé").length;
    const slaOk = active.length ? Math.round(((active.length - late - bloques) / active.length) * 100) : 100;

    const mine = items.filter((i) => i.ownerId === me.id);
    const attends = mine.filter((i) => ["relance", "escalade"].includes(rs(i).level));
    const aJustifier = mine.filter((i) => i.statut === "Bloqué" && !i.appreciation);

    const isDG = me.role === "directeur" || me.role === "admin" || me.role === "manager";
    const negAValider = isDG ? negligences.filter((n) => n.status !== "Décision rendue" && n.status !== "Classée") : [];
    const projAValider =
      me.role === "directeur" || me.role === "admin"
        ? projects.filter((p) => p.pendingStatus || (p.closure && p.closure.status === "en_attente"))
        : [];
    const aValider = negAValider.length + projAValider.length;

    // Débit sur 14 jours (créations par jour).
    const days: string[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      days.push(iso(d));
    }
    const createdByDay = new Map<string, number>();
    items.forEach((i) => {
      const k = iso(i.dateCreation);
      createdByDay.set(k, (createdByDay.get(k) ?? 0) + 1);
    });
    const debit = days.map((d) => createdByDay.get(d) ?? 0);

    // Heatmap d'activité (événements de timeline).
    const heat = new Map<string, number>();
    items.forEach((i) => i.timeline.forEach((e) => {
      const k = iso(e.date);
      heat.set(k, (heat.get(k) ?? 0) + 1);
    }));

    // Charge par personne (suivis actifs).
    const loadByOwner = new Map<string, number>();
    active.forEach((i) => loadByOwner.set(i.ownerId, (loadByOwner.get(i.ownerId) ?? 0) + 1));
    const maxLoad = Math.max(1, ...loadByOwner.values());
    const team = profiles
      .filter((p) => p.id)
      .map((p) => ({ p, load: loadByOwner.get(p.id) ?? 0 }))
      .sort((a, b) => b.load - a.load)
      .slice(0, 5);

    // Flux d'activité récent.
    const feed = items
      .flatMap((i) => i.timeline.map((e) => ({ e, i })))
      .sort((a, b) => b.e.date.getTime() - a.e.date.getTime())
      .slice(0, 6);

    const activeProjects = projects.filter((p) => !isProjectArchived(p)).length;

    return { active, late, bloques, clot, slaOk, attends, aJustifier, aValider, debit, heat, team, maxLoad, feed, activeProjects };
  }, [items, projects, negligences, profiles, me, now, rs]);

  // Météo du jour.
  const weather =
    data.late + data.bloques >= 4
      ? { label: "Sous tension", tone: "text-rose-600 bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20", icon: ShieldAlert }
      : data.attends.length > 0
      ? { label: "À suivre de près", tone: "text-amber-600 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20", icon: Bell }
      : { label: "Journée sereine", tone: "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20", icon: Sun };

  const rank = scores.findIndex((s) => s.id === me.id);

  return (
    <div className="space-y-8 pb-10">
      {/* ===== Hero / Briefing ===== */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-soft animate-float">
        <div className="aurora" aria-hidden />
        <div className="relative z-[1] p-7 md:p-9">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-500 mb-3">
                <Sparkles size={13} className="text-emerald-500" /> {fmtLong(now)}
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.05]">
                {greeting(now)}, {firstName}.
              </h1>
              <p className="mt-2 text-[17px] md:text-lg text-slate-500 max-w-xl">
                Voici ce qui compte <span className="text-gradient font-semibold">aujourd&apos;hui</span>.
              </p>
              <div className="mt-4 flex items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center gap-1.5 text-[12px] font-semibold rounded-full border px-3 py-1.5 ${weather.tone}`}>
                  <weather.icon size={13} /> {weather.label}
                </span>
                {rank >= 0 && (
                  <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-500 rounded-full border border-slate-200 dark:border-slate-700 px-3 py-1.5">
                    🏆 {rank + 1}ᵉ au classement
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-3">
              <button
                onClick={() => setShowNew(true)}
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-slate-900 dark:bg-emerald-600 rounded-xl px-4 py-2.5 hover:-translate-y-0.5 transition-transform shadow-soft"
              >
                <Plus size={16} /> Nouveau suivi de mail
              </button>
              <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-400">
                <Command size={12} /> Astuce : appuie sur <kbd className="px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-sans">⌘K</kbd>
              </span>
            </div>
          </div>

          {/* KPIs animés */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8 stagger">
            <Kpi label="Suivis de mail actifs" value={data.active.length} icon={Inbox} tone="#0ea5e9">
              <Sparkline data={data.debit} stroke="#0ea5e9" width={140} height={30} className="w-full" />
            </Kpi>
            <Kpi label="En retard" value={data.late} icon={TrendingUp} tone="#f43f5e" danger={data.late > 0}>
              <div className="text-[11px] text-slate-400">escaladés · à traiter en priorité</div>
            </Kpi>
            <Kpi label="Bloqués" value={data.bloques} icon={ShieldAlert} tone="#f59e0b" danger={data.bloques > 0}>
              <div className="text-[11px] text-slate-400">en attente de déblocage</div>
            </Kpi>
            <div className="relative rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 p-4 flex items-center gap-4">
              <Ring value={data.slaOk} size={66} color="#10b981">
                <span className="text-[15px] font-bold text-slate-800"><CountUp value={data.slaOk} suffix="%" /></span>
              </Ring>
              <div>
                <div className="text-[13px] font-semibold text-slate-800">SLA tenu</div>
                <div className="text-[11px] text-slate-400">{data.clot} clôturés au total</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Briefing (3 colonnes) ===== */}
      <section className="grid md:grid-cols-3 gap-5 stagger">
        <BriefCard title="Ce qui t'attend" count={data.attends.length} icon={Bell} tone="amber" empty="Rien ne t'attend. Tout est à jour.">
          {data.attends.slice(0, 4).map((i) => (
            <Row key={i.id} onClick={() => openItem(i)} left={i.ref} main={i.objet} right={rs(i).level === "escalade" ? "Escaladé" : "Relance due"} danger={rs(i).level === "escalade"} />
          ))}
        </BriefCard>
        <BriefCard title="À valider" count={data.aValider} icon={CheckCircle2} tone="emerald" empty="Aucune validation en attente.">
          {negligences.filter((n) => (me.role === "directeur" || me.role === "admin" || me.role === "manager") && n.status !== "Décision rendue" && n.status !== "Classée").slice(0, 3).map((n) => (
            <RowLink key={n.id} href={`/negligences/${n.id}`} left="Négl." main={n.objet || "Négligence"} right={n.status} />
          ))}
          {(me.role === "directeur" || me.role === "admin") &&
            projects.filter((p) => p.pendingStatus || (p.closure && p.closure.status === "en_attente")).slice(0, 3).map((p) => (
              <RowLink key={p.id} href={`/projets/${p.id}`} left="Projet" main={p.name} right={p.closure?.status === "en_attente" ? "Clôture" : "Statut"} />
            ))}
        </BriefCard>
        <BriefCard title="À justifier" count={data.aJustifier.length} icon={ShieldAlert} tone="rose" empty="Aucun blocage à qualifier.">
          {data.aJustifier.slice(0, 4).map((i) => (
            <Row key={i.id} onClick={() => openItem(i)} left={i.ref} main={i.objet} right="Motif ?" danger />
          ))}
        </BriefCard>
      </section>

      {/* ===== Pouls de l'équipe ===== */}
      <section className="grid lg:grid-cols-3 gap-5">
        {/* Activité (heatmap) */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-soft p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-emerald-500" />
              <h2 className="text-[14px] font-bold text-slate-800">Pouls de l&apos;équipe</h2>
            </div>
            <Link href="/stats" className="text-[12px] text-emerald-600 hover:underline inline-flex items-center gap-1">Statistiques <ArrowUpRight size={13} /></Link>
          </div>
          <Heatmap counts={data.heat} weeks={18} />
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div>
              <div className="text-[11px] text-slate-400 uppercase tracking-wide">Débit (14 j)</div>
              <div className="text-[22px] font-bold text-slate-800 leading-none mt-1">
                <CountUp value={data.debit.reduce((a, b) => a + b, 0)} /> <span className="text-[12px] font-medium text-slate-400">créés</span>
              </div>
            </div>
            <Sparkline data={data.debit} width={200} height={44} />
          </div>
        </div>

        {/* Charge par personne */}
        <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-soft p-5">
          <div className="flex items-center gap-2 mb-4">
            <GaugeIcon size={16} className="text-sky-500" />
            <h2 className="text-[14px] font-bold text-slate-800">Charge de l&apos;équipe</h2>
          </div>
          <div className="space-y-3">
            {data.team.map(({ p, load }) => (
              <div key={p.id} className="flex items-center gap-3">
                <Avatar init={p.init} size="h-7 w-7" />
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] font-medium text-slate-700 truncate">{p.nom}</div>
                  <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-1">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.round((load / data.maxLoad) * 100)}%`, background: load / data.maxLoad > 0.75 ? "#f43f5e" : load / data.maxLoad > 0.45 ? "#f59e0b" : "#10b981" }}
                    />
                  </div>
                </div>
                <span className="text-[12px] font-mono text-slate-500 w-6 text-right">{load}</span>
              </div>
            ))}
            {data.team.length === 0 && <div className="text-[12px] text-slate-400 text-center py-4">—</div>}
          </div>
        </div>
      </section>

      {/* ===== Flux d'activité ===== */}
      <section className="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-soft p-5">
        <h2 className="text-[14px] font-bold text-slate-800 mb-3">Dernière activité</h2>
        <div className="space-y-1">
          {data.feed.map(({ e, i }, idx) => (
            <button key={idx} onClick={() => openItem(i)} className="w-full flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 text-left transition-colors">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
              <span className="text-[13px] text-slate-700 flex-1 truncate">
                <span className="font-medium text-slate-800">{profileById(e.author).nom}</span> — {e.label}
                <span className="text-slate-400"> · {i.ref}</span>
              </span>
              <span className="text-[11px] text-slate-400 shrink-0">{timeAgo(e.date, now)}</span>
            </button>
          ))}
          {data.feed.length === 0 && <div className="text-[12px] text-slate-400 text-center py-4">Aucune activité récente.</div>}
        </div>
      </section>
    </div>
  );
}

/* ---------- Sous-composants ---------- */
function Kpi({ label, value, icon: Icon, tone, danger, children }: { label: string; value: number; icon: typeof Bell; tone: string; danger?: boolean; children?: React.ReactNode }) {
  return (
    <div className={`relative rounded-2xl border p-4 transition-transform duration-200 hover:-translate-y-0.5 ${danger ? "border-rose-200/70 dark:border-rose-500/20 bg-rose-50/40 dark:bg-rose-500/5" : "border-slate-200/70 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30"}`}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">{label}</span>
        <Icon size={15} style={{ color: tone }} />
      </div>
      <div className="text-[34px] font-extrabold tracking-tight text-slate-900 leading-none mt-1">
        <CountUp value={value} />
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function BriefCard({ title, count, icon: Icon, tone, empty, children }: { title: string; count: number; icon: typeof Bell; tone: "amber" | "emerald" | "rose"; empty: string; children?: React.ReactNode }) {
  const tones = {
    amber: "text-amber-500",
    emerald: "text-emerald-500",
    rose: "text-rose-500",
  };
  const hasChildren = Array.isArray(children) ? children.flat().filter(Boolean).length > 0 : Boolean(children);
  return (
    <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-soft p-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={15} className={tones[tone]} />
        <h2 className="text-[13px] font-bold text-slate-800 uppercase tracking-wide">{title}</h2>
        <span className="ml-auto text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 rounded-full px-2 py-0.5">{count}</span>
      </div>
      {hasChildren ? <div className="space-y-1">{children}</div> : <div className="text-[12.5px] text-slate-400 py-4 text-center">{empty}</div>}
    </div>
  );
}

function Row({ left, main, right, danger, onClick }: { left: string; main: string; right: string; danger?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-2 py-2 px-2 -mx-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 text-left transition-colors">
      <span className="text-[10px] font-mono font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 rounded px-1.5 py-0.5 shrink-0">{left}</span>
      <span className="text-[13px] text-slate-700 flex-1 truncate">{main}</span>
      <span className={`text-[11px] font-medium shrink-0 ${danger ? "text-rose-600" : "text-amber-600"}`}>{right}</span>
    </button>
  );
}
function RowLink({ href, left, main, right }: { href: string; left: string; main: string; right: string }) {
  return (
    <Link href={href} className="w-full flex items-center gap-2 py-2 px-2 -mx-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
      <span className="text-[10px] font-mono font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 rounded px-1.5 py-0.5 shrink-0">{left}</span>
      <span className="text-[13px] text-slate-700 flex-1 truncate">{main}</span>
      <span className="text-[11px] font-medium text-emerald-600 shrink-0">{right}</span>
    </Link>
  );
}

function timeAgo(d: Date, now: Date): string {
  const s = Math.max(0, (now.getTime() - new Date(d).getTime()) / 1000);
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  if (s < 86400) return `${Math.floor(s / 3600)} h`;
  return `${Math.floor(s / 86400)} j`;
}

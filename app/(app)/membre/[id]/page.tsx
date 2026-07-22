"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CalendarRange, CheckCircle2, FolderKanban, Inbox, ListTodo, Lock } from "lucide-react";
import { computeGame, fmt, objectiveProgress, projectMetrics } from "@/lib/domain";
import { useApp } from "@/components/app-context";
import { Avatar, Card } from "@/components/atoms";
import { CountUp, Ring } from "@/components/dataviz";

export default function MembrePage() {
  const params = useParams();
  const id = String(params.id);
  const { profiles, items, tasks, projects, objectives, now, profileById, openItem, me } = useApp();

  const u = profileById(id);
  const exists = profiles.some((p) => p.id === id);

  const d = useMemo(() => {
    const mine = items.filter((i) => i.ownerId === id);
    const game = computeGame(id, items, tasks, projects, objectives);
    const actifs = mine.filter((i) => i.statut !== "Clôturé").length;
    const clot = mine.filter((i) => i.statut === "Clôturé").length;
    const myTasks = tasks.filter((t) => t.assigneeId === id);
    const tasksOpen = myTasks.filter((t) => t.status !== "fait").length;
    const myProjects = projects.filter((p) => p.ownerId === id || p.memberIds.includes(id));
    const myObjectives = objectives.filter((o) => o.ownerId === id || o.memberIds.includes(id));
    const feed = items
      .flatMap((i) => i.timeline.filter((e) => e.author === id).map((e) => ({ e, i })))
      .sort((a, b) => b.e.date.getTime() - a.e.date.getTime())
      .slice(0, 12);
    return { game, actifs, clot, tasksOpen, myProjects, myObjectives, feed };
  }, [id, items, tasks, projects, objectives]);

  if (!exists) {
    return (
      <div className="space-y-4">
        <Link href="/classement" className="inline-flex items-center gap-1 text-[13px] text-emerald-700"><ArrowLeft size={15} /> Classement</Link>
        <Card className="p-10 text-center text-[13px] text-slate-400">Membre introuvable.</Card>
      </div>
    );
  }

  const g = d.game;
  const earned = g.badges.filter((b) => b.earned);

  return (
    <div className="space-y-6 animate-float">
      <Link href="/classement" className="inline-flex items-center gap-1 text-[13px] text-emerald-700 dark:text-emerald-400 hover:underline"><ArrowLeft size={15} /> Classement</Link>

      {/* Hero profil */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-soft">
        <div className="aurora" aria-hidden />
        <div className="relative z-[1] p-6 md:p-8 flex items-center gap-5 flex-wrap">
          <div className="relative">
            <Avatar init={u.init} size="h-20 w-20" />
            <span className="absolute -bottom-1 -right-1 text-[22px]">{g.levelIcon}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">{u.nom}{id === me.id && <span className="text-[13px] font-medium text-emerald-600 ml-2">· toi</span>}</h1>
            <div className="text-[13px] text-slate-500">{u.poste || u.role} · Niveau {g.level + 1} « {g.levelName} »</div>
            <div className="mt-3 max-w-xs">
              <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                <b className="text-emerald-600"><CountUp value={g.xp} /> XP</b>
                {g.nextXp != null && <span>{g.nextXp - g.xp} avant niv. {g.level + 2}</span>}
              </div>
              <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-emerald-400" style={{ width: `${g.progressPct}%` }} /></div>
            </div>
          </div>
          <Ring value={g.progressPct} size={84} stroke={8} color="#10b981"><span className="text-[26px]">{g.levelIcon}</span></Ring>
        </div>
      </section>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger">
        <Stat label="Suivis actifs" value={d.actifs} icon={Inbox} tone="#0ea5e9" />
        <Stat label="Clôturés" value={d.clot} icon={CheckCircle2} tone="#10b981" />
        <Stat label="Tâches ouvertes" value={d.tasksOpen} icon={ListTodo} tone="#8b5cf6" />
        <Stat label="Badges" value={earned.length} icon={CalendarRange} tone="#f59e0b" />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Activité récente */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-soft p-5">
          <h2 className="text-[14px] font-bold text-slate-800 mb-3">Activité récente</h2>
          <div className="space-y-1">
            {d.feed.map(({ e, i }, idx) => (
              <button key={idx} onClick={() => openItem(i)} className="w-full flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 text-left transition-colors">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span className="text-[13px] text-slate-700 flex-1 truncate">{e.label}<span className="text-slate-400"> · {i.ref}</span></span>
                <span className="text-[11px] text-slate-400 shrink-0">{fmt(e.date)}</span>
              </button>
            ))}
            {d.feed.length === 0 && <div className="text-[12px] text-slate-400 text-center py-4">Aucune activité récente.</div>}
          </div>
        </div>

        {/* Badges */}
        <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-soft p-5">
          <h2 className="text-[14px] font-bold text-slate-800 mb-3">Badges ({earned.length}/{g.badges.length})</h2>
          <div className="grid grid-cols-2 gap-2">
            {g.badges.map((b) => (
              <div key={b.id} title={b.desc} className={`rounded-xl border p-2 flex items-center gap-2 ${b.earned ? "border-emerald-200/70 dark:border-emerald-500/30" : "border-slate-200/70 dark:border-slate-800 opacity-60"}`}>
                <span className="text-[16px]">{b.earned ? b.icon : <Lock size={13} className="text-slate-400" />}</span>
                <span className={`text-[11px] font-medium truncate ${b.earned ? "text-slate-700" : "text-slate-400"}`}>{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Objectifs & projets */}
      <div className="grid md:grid-cols-2 gap-5">
        <div>
          <h2 className="text-[13px] font-semibold text-slate-700 uppercase tracking-wide mb-2">Objectifs</h2>
          <div className="space-y-2">
            {d.myObjectives.map((o) => {
              const pr = objectiveProgress(o, projects, tasks, now);
              return (
                <Link key={o.id} href="/plan" className="flex items-center gap-3 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-soft p-3 hover:-translate-y-0.5 transition-transform">
                  <span className="h-3 w-3 rounded-full shrink-0" style={{ background: o.color }} />
                  <span className="flex-1 text-[13px] font-medium text-slate-800 truncate">{o.title}</span>
                  <span className="text-[12px] font-mono text-slate-500">{o.status === "declasse" ? "—" : `${pr}%`}</span>
                </Link>
              );
            })}
            {d.myObjectives.length === 0 && <div className="text-[12px] text-slate-400">Aucun objectif.</div>}
          </div>
        </div>
        <div>
          <h2 className="text-[13px] font-semibold text-slate-700 uppercase tracking-wide mb-2">Projets</h2>
          <div className="space-y-2">
            {d.myProjects.map((p) => {
              const m = projectMetrics(p, now);
              return (
                <Link key={p.id} href={`/projets/${p.id}`} className="flex items-center gap-3 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-soft p-3 hover:-translate-y-0.5 transition-transform">
                  <FolderKanban size={16} className="text-slate-400 shrink-0" />
                  <span className="flex-1 text-[13px] font-medium text-slate-800 truncate">{p.name}</span>
                  <span className="text-[12px] font-mono text-slate-500">{m.progress}%</span>
                </Link>
              );
            })}
            {d.myProjects.length === 0 && <div className="text-[12px] text-slate-400">Aucun projet.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, icon: Icon, tone }: { label: string; value: number; icon: typeof Inbox; tone: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-soft p-4 transition-transform duration-200 hover:-translate-y-0.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">{label}</span>
        <Icon size={15} style={{ color: tone }} />
      </div>
      <div className="text-[30px] font-extrabold tracking-tight text-slate-900 leading-none mt-1"><CountUp value={value} /></div>
    </div>
  );
}

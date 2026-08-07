"use client";

import { useMemo } from "react";
import { Award, Crown, Flame, Lock } from "lucide-react";
import { computeGame, isPublished, memberOfMonth, weeklyChallenges, type Badge, type GameProfile } from "@/lib/domain";
import { useApp } from "@/components/app-context";
import { Avatar, Card } from "@/components/atoms";
import { CountUp, Ring } from "@/components/dataviz";
import Link from "next/link";
import { PageHero } from "@/components/PageHero";

const medal = ["🥇", "🥈", "🥉"];

export default function ClassementPage() {
  const { me, profiles, items: allItems, tasks: allTasks, projects: allProjects, objectives, now, profileById } = useApp();
  // Classement = travail publié uniquement (les brouillons privés ne comptent pas).
  const items = useMemo(() => allItems.filter(isPublished), [allItems]);
  const tasks = useMemo(() => allTasks.filter(isPublished), [allTasks]);
  const projects = useMemo(() => allProjects.filter(isPublished), [allProjects]);

  const motmId = useMemo(() => memberOfMonth(profiles.filter((p) => p.id).map((p) => p.id), items, tasks, now), [profiles, items, tasks, now]);
  const challenges = useMemo(() => weeklyChallenges(me.id, items, tasks, now), [me.id, items, tasks, now]);

  const board = useMemo(
    () =>
      profiles
        .filter((p) => p.id)
        .map((p) => ({ p, g: computeGame(p.id, items, tasks, projects, objectives) }))
        .sort((a, b) => b.g.xp - a.g.xp),
    [profiles, items, tasks, projects, objectives]
  );

  const mine = board.find((r) => r.p.id === me.id);
  const myRank = board.findIndex((r) => r.p.id === me.id);

  return (
    <div className="space-y-6 animate-float">
      <PageHero
        kicker="Hall of fame"
        icon={Award}
        title="Classement de l'équipe"
        subtitle="Gagne de l'XP en relançant, en clôturant tes suivis, en achevant tes tâches, en menant tes projets à terme et en atteignant les objectifs. Monte de niveau, débloque des badges."
      />

      {/* Membre du mois */}
      {motmId && (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-gradient-to-r from-amber-50 to-white dark:from-amber-500/10 dark:to-slate-900 shadow-soft p-4 flex items-center gap-3">
          <div className="relative">
            <Avatar init={profileById(motmId).init} src={profileById(motmId).avatar || undefined} size="h-11 w-11" />
            <Crown size={16} className="absolute -top-2 left-1/2 -translate-x-1/2 text-amber-500" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-amber-600 uppercase tracking-wide">Membre du mois 👑</div>
            <div className="text-[15px] font-bold text-slate-800">{profileById(motmId).nom}</div>
            <div className="text-[11.5px] text-slate-500">La plus forte activité ce mois-ci — bravo !</div>
          </div>
        </div>
      )}

      {/* Défis de la semaine */}
      <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-soft p-5">
        <div className="flex items-center gap-2 mb-3">
          <Flame size={16} className="text-orange-500" />
          <h2 className="text-[14px] font-bold text-slate-800">Défis de la semaine</h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          {challenges.map((c) => (
            <div key={c.id} className={`rounded-xl border p-3 ${c.done ? "border-emerald-200/70 dark:border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-500/5" : "border-slate-200/70 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20"}`}>
              <div className="flex items-center justify-between">
                <span className="text-[12.5px] font-medium text-slate-700 flex items-center gap-1.5"><span>{c.icon}</span> {c.label}</span>
                {c.done && <span className="text-[11px] font-semibold text-emerald-600">✓</span>}
              </div>
              <div className="mt-2 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${c.done ? "bg-emerald-500" : "bg-orange-400"}`} style={{ width: `${Math.round((c.current / c.target) * 100)}%` }} />
              </div>
              <div className="text-[11px] text-slate-400 mt-1 text-right">{c.current}/{c.target}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Mon profil de jeu */}
      {mine && (
        <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-gradient-to-br from-white to-emerald-50/40 dark:from-slate-900 dark:to-emerald-950/20 shadow-soft p-5">
          <div className="flex items-center gap-4 flex-wrap">
            <Ring value={mine.g.progressPct} size={78} stroke={8} color="#10b981">
              <span className="text-[22px]">{mine.g.levelIcon}</span>
            </Ring>
            <div className="min-w-0">
              <div className="text-[12px] text-slate-500">Niveau {mine.g.level + 1} · {myRank >= 0 ? `${myRank + 1}ᵉ` : ""}</div>
              <div className="text-2xl font-extrabold tracking-tight text-slate-900">{mine.g.levelName}</div>
              <div className="text-[12px] text-slate-500 mt-0.5">
                <b className="text-emerald-600"><CountUp value={mine.g.xp} /> XP</b>
                {mine.g.nextXp != null ? ` · ${mine.g.nextXp - mine.g.xp} XP avant le niveau suivant` : " · niveau maximal atteint 👑"}
              </div>
            </div>
            <div className="ml-auto flex items-center gap-1.5 flex-wrap justify-end max-w-[50%]">
              {mine.g.badges.filter((b) => b.earned).map((b) => <BadgePill key={b.id} b={b} />)}
              {mine.g.badges.every((b) => !b.earned) && <span className="text-[12px] text-slate-400">Débloque ton premier badge en clôturant un suivi de mail.</span>}
            </div>
          </div>
          {/* Répartition de l'XP par source d'accomplissement */}
          <SourceBreakdown g={mine.g} />
        </div>
      )}

      {/* Podium */}
      <div className="grid sm:grid-cols-3 gap-3 stagger">
        {board.slice(0, 3).map(({ p, g }, i) => (
          <Link key={p.id} href={`/membre/${p.id}`} className={`rounded-2xl border shadow-soft p-4 text-center transition-transform hover:-translate-y-0.5 ${i === 0 ? "border-amber-200 dark:border-amber-500/30 bg-amber-50/40 dark:bg-amber-500/5" : "border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900"}`}>
            <div className="text-[26px]">{medal[i]}</div>
            <div className="mt-1 flex justify-center"><Avatar init={p.init} src={p.avatar || undefined} size="h-11 w-11" /></div>
            <div className="text-[13.5px] font-bold text-slate-800 mt-2 truncate">{p.nom}</div>
            <div className="text-[11px] text-slate-500">{g.levelIcon} {g.levelName}</div>
            <div className="text-[20px] font-extrabold text-slate-900 mt-1"><CountUp value={g.xp} /> <span className="text-[11px] font-medium text-slate-400">XP</span></div>
          </Link>
        ))}
      </div>

      {/* Classement complet */}
      <div className="space-y-2">
        {board.map(({ p, g }, i) => {
          const isMe = p.id === me.id;
          const earned = g.badges.filter((b) => b.earned);
          return (
            <Link key={p.id} href={`/membre/${p.id}`} className="block">
            <Card className={`p-3.5 flex items-center gap-3 hover:-translate-y-0.5 transition-transform ${isMe ? "ring-2 ring-emerald-300 dark:ring-emerald-500/40" : ""}`}>
              <div className="w-7 text-center">{medal[i] || <span className="text-slate-400 text-[13px] font-semibold">{i + 1}</span>}</div>
              <div className="relative">
                <Avatar init={p.init} src={p.avatar || undefined} size="h-9 w-9" />
                <span className="absolute -bottom-1 -right-1 text-[12px]">{g.levelIcon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] font-semibold text-slate-800 truncate">
                  {p.nom}{isMe && <span className="text-[11px] text-emerald-600 ml-1">· toi</span>}
                </div>
                <div className="flex items-center gap-1 mt-1 flex-wrap">
                  <span className="text-[10px] font-medium text-slate-500">{g.levelName}</span>
                  {(g.counts.tache > 0 || g.counts.projet > 0) && (
                    <span className="text-[10px] text-slate-400" title="Tâches achevées · projets menés à terme">· ✓ {g.counts.tache} tâche{g.counts.tache > 1 ? "s" : ""} · {g.counts.projet} projet{g.counts.projet > 1 ? "s" : ""}</span>
                  )}
                  {earned.slice(0, 6).map((b) => <span key={b.id} title={b.label} className="text-[12px]">{b.icon}</span>)}
                  {earned.length === 0 && <span className="text-[10px] text-slate-400">—</span>}
                </div>
              </div>
              <div className="w-28 hidden sm:block">
                <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-emerald-400" style={{ width: `${g.progressPct}%` }} /></div>
              </div>
              <div className="text-right w-16">
                <div className="text-[16px] font-extrabold text-slate-900 tabular-nums">{g.xp}</div>
                <div className="text-[10px] text-slate-400">XP</div>
              </div>
            </Card>
            </Link>
          );
        })}
      </div>

      {/* Badges à débloquer */}
      {mine && (
        <div>
          <h2 className="text-[13px] font-semibold text-slate-700 uppercase tracking-wide mb-2">Badges</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {mine.g.badges.map((b) => (
              <div key={b.id} className={`rounded-2xl border p-3 flex items-center gap-3 ${b.earned ? "border-emerald-200/70 dark:border-emerald-500/30 bg-white dark:bg-slate-900" : "border-slate-200/70 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20"}`}>
                <div className={`grid place-items-center h-10 w-10 rounded-xl text-[20px] ${b.earned ? "bg-emerald-50 dark:bg-emerald-500/10" : "bg-slate-100 dark:bg-slate-800 grayscale opacity-60"}`}>
                  {b.earned ? b.icon : <Lock size={16} className="text-slate-400" />}
                </div>
                <div className="min-w-0">
                  <div className={`text-[12.5px] font-semibold ${b.earned ? "text-slate-800" : "text-slate-400"}`}>{b.label}</div>
                  <div className="text-[11px] text-slate-400">{b.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* Répartition de l'XP par source : mails, tâches, projets, objectifs. */
function SourceBreakdown({ g }: { g: GameProfile }) {
  const segs = [
    { key: "mails", label: "Mails", xp: g.sources.mails, count: g.counts.cloture, unit: "clôtures", color: "#0ea5e9" },
    { key: "taches", label: "Tâches", xp: g.sources.taches, count: g.counts.tache, unit: "achevées", color: "#10b981" },
    { key: "projets", label: "Projets", xp: g.sources.projets, count: g.counts.projet, unit: "menés", color: "#8b5cf6" },
    { key: "objectifs", label: "Objectifs", xp: g.sources.objectifs, count: g.counts.objectif, unit: "atteints", color: "#f59e0b" },
  ];
  const total = g.xp || 1;
  return (
    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
      <div className="text-[11px] text-slate-500 mb-1.5">D&apos;où vient ton XP</div>
      <div className="flex h-2 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 mb-2">
        {segs.map((s) => s.xp > 0 && <div key={s.key} style={{ width: `${(s.xp / total) * 100}%`, background: s.color }} title={`${s.label} · ${s.xp} XP`} />)}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {segs.map((s) => (
          <div key={s.key} className="rounded-lg border border-slate-100 dark:border-slate-800 p-2">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
              <span className="text-[11px] text-slate-500">{s.label}</span>
            </div>
            <div className="text-[15px] font-bold text-slate-800 dark:text-slate-100">{s.xp} <span className="text-[10px] font-medium text-slate-400">XP</span></div>
            <div className="text-[10px] text-slate-400">{s.count} {s.unit}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BadgePill({ b }: { b: Badge }) {
  return (
    <span title={b.desc} className="inline-flex items-center gap-1 text-[11px] font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 rounded-full px-2 py-0.5">
      <span>{b.icon}</span> {b.label}
    </span>
  );
}

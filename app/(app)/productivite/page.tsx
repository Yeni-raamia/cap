"use client";

import { useMemo, useState } from "react";
import { Activity, CheckSquare, Flame, Gauge, Plus, Repeat, TrendingUp, X } from "lucide-react";
import {
  fmt,
  isPublished,
  isTaskLate,
  isTaskOpen,
  memberProductivity,
  subtaskProgress,
  TASK_PRIORITIES,
  TASK_STATUTS,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/domain";
import { DEFAULT_PERIOD, isPeriodActive, matchesPeriod, periodLabel, type PeriodFilter as Period } from "@/lib/period";
import { useApp } from "@/components/app-context";
import { Avatar, Card } from "@/components/atoms";
import { Ring } from "@/components/dataviz";
import { PageHero } from "@/components/PageHero";
import { PeriodFilter } from "@/components/PeriodFilter";
import { ProfilRadar } from "@/components/ProfilRadar";
import { RecurrencesPanel } from "@/components/RecurrencesPanel";

const STATUS_STYLE: Record<TaskStatus, string> = {
  "à faire": "bg-slate-100 text-slate-600",
  "en cours": "bg-sky-100 text-sky-700",
  fait: "bg-emerald-100 text-emerald-700",
  bloqué: "bg-rose-100 text-rose-700",
};
const PRIORITY_STYLE: Record<TaskPriority, string> = {
  Basse: "bg-slate-100 text-slate-500",
  Normale: "bg-slate-100 text-slate-600",
  Haute: "bg-amber-100 text-amber-700",
  Urgente: "bg-rose-100 text-rose-700",
};

const WINDOWS = [
  { key: 7, label: "7 j" },
  { key: 30, label: "30 j" },
  { key: 90, label: "90 j" },
];

export default function ProductivitePage() {
  const { tasks: allTasks, profiles, items: allItems, projects: allProjects, me, now, taskAction, profileById, setOpenTaskId } = useApp();
  // Vue d'équipe : sur les éléments publiés uniquement.
  const tasks = useMemo(() => allTasks.filter(isPublished), [allTasks]);
  const items = useMemo(() => allItems.filter(isPublished), [allItems]);
  const projects = useMemo(() => allProjects.filter(isPublished), [allProjects]);
  const [windowDays, setWindowDays] = useState(30);
  const [selected, setSelected] = useState<string | null>(null);
  const [filterMember, setFilterMember] = useState<string>("");
  const [boardQuery, setBoardQuery] = useState("");
  const [filterPrio, setFilterPrio] = useState<string>("");
  const [period, setPeriod] = useState<Period>(DEFAULT_PERIOD);
  const [err, setErr] = useState<string | null>(null);

  const canAssignOthers = ["manager", "directeur", "admin"].includes(me.role);
  const activeProfiles = profiles.filter((p) => p.id);

  const run = async (p: Promise<string | null>) => {
    setErr(null);
    const e = await p;
    if (e) setErr(e);
  };

  // Rendement par personne.
  const rows = useMemo(
    () =>
      activeProfiles
        .map((p) => {
          const prod = memberProductivity(p.id, tasks, now, windowDays);
          const suivisActifs = items.filter((i) => i.ownerId === p.id && i.statut !== "Clôturé").length;
          const projs = projects.filter(
            (pr) => (pr.ownerId === p.id || pr.memberIds.includes(p.id)) && pr.status !== "Terminé" && pr.status !== "Annulé"
          ).length;
          return { p, prod, suivisActifs, projs };
        })
        .sort((a, b) => b.prod.doneRecent - a.prod.doneRecent || b.prod.charge - a.prod.charge),
    [activeProfiles, tasks, items, projects, now, windowDays]
  );

  // Indicateurs d'équipe.
  const team = useMemo(() => {
    const open = tasks.filter(isTaskOpen).length;
    const doneRecent = tasks.filter(
      (t) => t.status === "fait" && t.completedAt && t.completedAt.getTime() >= now.getTime() - windowDays * 86400000
    ).length;
    const late = tasks.filter((t) => isTaskLate(t, now)).length;
    const blocked = tasks.filter((t) => t.status === "bloqué").length;
    const done = tasks.filter((t) => t.status === "fait").length;
    const rate = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
    return { open, doneRecent, late, blocked, rate };
  }, [tasks, now, windowDays]);

  const boardQ = boardQuery.trim().toLowerCase();
  // Le filtre de période porte sur l'échéance ; « en retard » réutilise la
  // définition métier (non terminée + échéance dépassée).
  const boardTasks = tasks.filter(
    (t) =>
      (!filterMember || t.assigneeId === filterMember) &&
      (!filterPrio || t.priority === filterPrio) &&
      matchesPeriod(t.dueDate, isTaskLate(t, now), period, now) &&
      (!boardQ || t.title.toLowerCase().includes(boardQ) || t.description.toLowerCase().includes(boardQ))
  );

  const selProfile = selected ? profileById(selected) : null;
  const selTasks = selected ? tasks.filter((t) => t.assigneeId === selected) : [];

  return (
    <div className="space-y-6 animate-float">
      <PageHero
        kicker="Rendement"
        icon={Activity}
        title="Productivité de l'équipe"
        subtitle="Charge, rendement et suivi des tâches de toute l'équipe."
        right={
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
            {WINDOWS.map((w) => (
              <button
                key={w.key}
                onClick={() => setWindowDays(w.key)}
                className={`text-[12px] px-2.5 py-1 rounded-md transition ${windowDays === w.key ? "bg-white dark:bg-slate-700 shadow-sm font-medium text-slate-800" : "text-slate-500"}`}
              >
                {w.label}
              </button>
            ))}
          </div>
        }
      />

      {err && <div className="text-[12px] text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{err}</div>}

      {/* Indicateurs d'équipe */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard icon={CheckSquare} tone="text-slate-600" label="Tâches ouvertes" value={team.open} />
        <KpiCard icon={TrendingUp} tone="text-emerald-600" label={`Achevées (${windowDays} j)`} value={team.doneRecent} />
        <KpiCard icon={Gauge} tone="text-sky-600" label="Taux d'achèvement" value={`${team.rate}%`} />
        <KpiCard icon={Flame} tone="text-rose-600" label="En retard" value={team.late} />
        <KpiCard icon={X} tone="text-rose-600" label="Bloquées" value={team.blocked} />
      </div>

      {/* Radar de profil (gamification) : moi vs moyenne d'équipe */}
      <ProfilRadar members={activeProfiles} items={items} tasks={tasks} projects={projects} now={now} meId={me.id} />

      {/* Podium de rendement */}
      {rows.some((r) => r.prod.doneRecent > 0 || r.prod.tasksOpen > 0) && (
        <div className="grid sm:grid-cols-3 gap-3 stagger">
          {rows.slice(0, 3).map(({ p, prod }, i) => (
            <div key={p.id} className="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-soft p-4 flex items-center gap-3">
              <div className="relative">
                <Ring value={prod.completionRate} size={58} color={i === 0 ? "#f59e0b" : i === 1 ? "#94a3b8" : "#b45309"}>
                  <Avatar init={p.init} size="h-8 w-8" />
                </Ring>
                <span className="absolute -top-1 -right-1 text-[13px]">{["🥇", "🥈", "🥉"][i]}</span>
              </div>
              <div className="min-w-0">
                <div className="text-[13.5px] font-semibold text-slate-800 truncate">{p.nom}</div>
                <div className="text-[11.5px] text-slate-400">{prod.doneRecent} achevées · {prod.tasksOpen} en cours</div>
                <div className="text-[11px] font-medium text-emerald-600">{prod.completionRate}% d&apos;achèvement</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Créer / assigner une tâche */}
      <NewTaskForm canAssignOthers={canAssignOthers} onCreate={run} />

      {/* Séries récurrentes : gabarits qui engendrent les occurrences */}
      <RecurrencesPanel />

      {/* Rendement par personne */}
      <div>
        <h2 className="text-[13px] font-semibold text-slate-700 uppercase tracking-wide mb-2">Rendement par personne</h2>
        <Card className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead className="text-slate-400 border-b border-slate-100">
              <tr className="text-left">
                <th className="px-3 py-2 font-medium">Personne</th>
                <th className="px-2 py-2 font-medium text-center" title="Charge = tâches ouvertes pondérées par priorité">Charge</th>
                <th className="px-2 py-2 font-medium text-center">Ouvertes</th>
                <th className="px-2 py-2 font-medium text-center">Achevées ({windowDays} j)</th>
                <th className="px-2 py-2 font-medium text-center">Retard</th>
                <th className="px-2 py-2 font-medium text-center">Bloquées</th>
                <th className="px-2 py-2 font-medium text-center">Taux</th>
                <th className="px-2 py-2 font-medium text-center">Suivis de mail</th>
                <th className="px-2 py-2 font-medium text-center">Projets</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows.map(({ p, prod, suivisActifs, projs }) => (
                <tr
                  key={p.id}
                  onClick={() => setSelected(selected === p.id ? null : p.id)}
                  className={`cursor-pointer hover:bg-slate-50 ${selected === p.id ? "bg-emerald-50/50" : ""}`}
                >
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Avatar init={p.init} size="h-7 w-7" />
                      <div className="min-w-0">
                        <div className="font-medium text-slate-800 truncate">{p.nom}</div>
                        <div className="text-[10px] text-slate-400">{p.poste || p.role}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-2 text-center">
                    <ChargeBar value={prod.charge} max={Math.max(10, ...rows.map((r) => r.prod.charge))} />
                  </td>
                  <td className="px-2 py-2 text-center font-mono">{prod.tasksOpen}</td>
                  <td className="px-2 py-2 text-center font-mono text-emerald-700">{prod.doneRecent}</td>
                  <td className={`px-2 py-2 text-center font-mono ${prod.tasksLate ? "text-rose-600 font-semibold" : "text-slate-300"}`}>{prod.tasksLate || "—"}</td>
                  <td className={`px-2 py-2 text-center font-mono ${prod.tasksBlocked ? "text-rose-600" : "text-slate-300"}`}>{prod.tasksBlocked || "—"}</td>
                  <td className="px-2 py-2 text-center font-mono">{prod.completionRate}%</td>
                  <td className="px-2 py-2 text-center font-mono text-slate-500">{suivisActifs}</td>
                  <td className="px-2 py-2 text-center font-mono text-slate-500">{projs}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={9} className="px-3 py-6 text-center text-slate-400">Aucun membre.</td></tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>

      {/* Panneau membre sélectionné */}
      {selProfile && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Avatar init={selProfile.init} size="h-9 w-9" />
              <div>
                <div className="font-semibold text-slate-800">{selProfile.nom}</div>
                <div className="text-[11px] text-slate-400">{selProfile.poste || selProfile.role}</div>
              </div>
            </div>
            <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
          </div>

          {canAssignOthers && (
            <NewTaskForm
              canAssignOthers
              fixedAssignee={selProfile.id}
              compact
              onCreate={run}
            />
          )}

          <div className="mt-3 space-y-1.5">
            {selTasks.length === 0 ? (
              <div className="text-[12px] text-slate-400 py-3 text-center">Aucune tâche assignée.</div>
            ) : (
              selTasks
                .slice()
                .sort((a, b) => Number(isTaskOpen(b)) - Number(isTaskOpen(a)))
                .map((t) => <TaskRow key={t.id} t={t} onUpdate={run} canAssignOthers={canAssignOthers} me={me.id} />)
            )}
          </div>
        </Card>
      )}

      {/* Tableau des tâches (Kanban par statut) */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
          <h2 className="text-[13px] font-semibold text-slate-700 uppercase tracking-wide">
            Tâches de l&apos;équipe
            {isPeriodActive(period) && (
              <span className="ml-2 normal-case font-medium text-[11.5px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                {periodLabel(period, now)} · {boardTasks.length}
              </span>
            )}
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              value={boardQuery}
              onChange={(e) => setBoardQuery(e.target.value)}
              placeholder="Rechercher…"
              className="text-[12px] border border-slate-200 rounded-lg px-2.5 py-1 w-36 focus:border-emerald-400 outline-none"
            />
            <select
              value={filterPrio}
              onChange={(e) => setFilterPrio(e.target.value)}
              aria-label="Filtrer par priorité"
              className="text-[12px] border border-slate-200 rounded-lg px-2 py-1 bg-white"
            >
              <option value="">Toute priorité</option>
              {TASK_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <select
              value={filterMember}
              onChange={(e) => setFilterMember(e.target.value)}
              aria-label="Filtrer par personne"
              className="text-[12px] border border-slate-200 rounded-lg px-2 py-1 bg-white"
            >
              <option value="">Toute l&apos;équipe</option>
              {activeProfiles.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
            </select>
          </div>
        </div>
        <PeriodFilter value={period} onChange={setPeriod} className="mb-2" />
        <div className="grid md:grid-cols-4 gap-3">
          {TASK_STATUTS.map((st) => {
            const col = boardTasks.filter((t) => t.status === st);
            return (
              <div key={st} className="bg-slate-50 rounded-xl p-2">
                <div className="flex items-center justify-between px-1 pb-2">
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${STATUS_STYLE[st]}`}>{st}</span>
                  <span className="text-[11px] text-slate-400">{col.length}</span>
                </div>
                <div className="space-y-2">
                  {col.map((t) => {
                    const who = t.assigneeId ? profileById(t.assigneeId) : null;
                    const proj = t.projectId ? projects.find((p) => p.id === t.projectId) : null;
                    const late = isTaskLate(t, now);
                    const prog = subtaskProgress(t);
                    return (
                      <button
                        key={t.id}
                        onClick={() => setOpenTaskId(t.id)}
                        className="w-full text-left bg-white rounded-lg border border-slate-100 p-2 shadow-sm hover:border-violet-200 hover:shadow transition"
                      >
                        <div className="flex items-start gap-1.5">
                          {t.recurrenceId && <Repeat size={11} className="text-violet-500 mt-1 shrink-0" aria-label="Tâche récurrente" />}
                          <span className="text-[13px] text-slate-800 flex-1">{t.title}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded ${PRIORITY_STYLE[t.priority]}`}>{t.priority}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {who && (
                            <span className="flex items-center gap-1 text-[10px] text-slate-500">
                              <Avatar init={who.init} size="h-4 w-4" /> {who.nom}
                            </span>
                          )}
                          {proj && <span className="text-[10px] text-emerald-700">{proj.name}</span>}
                          {prog.total > 0 && <span className="text-[10px] text-violet-600">☑ {prog.done}/{prog.total}</span>}
                          {t.dueDate && <span className={`text-[10px] ${late ? "text-rose-600 font-medium" : "text-slate-400"}`}>{fmt(t.dueDate)}</span>}
                        </div>
                      </button>
                    );
                  })}
                  {col.length === 0 && <div className="text-[11px] text-slate-300 text-center py-2">—</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, tone }: { icon: typeof Activity; label: string; value: string | number; tone: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-soft p-4 transition-transform duration-200 hover:-translate-y-0.5">
      <div className="flex items-center justify-between">
        <span className="text-[10.5px] font-medium text-slate-500 uppercase tracking-wide">{label}</span>
        <Icon size={15} className={tone} />
      </div>
      <div className="text-[30px] font-extrabold tracking-tight text-slate-900 leading-none mt-1 tabular-nums">{value}</div>
    </div>
  );
}

function ChargeBar({ value, max }: { value: number; max: number }) {
  const pct = max ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const tone = pct > 75 ? "bg-rose-400" : pct > 45 ? "bg-amber-400" : "bg-emerald-400";
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1.5 w-14 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-slate-500 text-[11px]">{value}</span>
    </div>
  );
}

function TaskRow({
  t,
  onUpdate,
  canAssignOthers,
  me,
}: {
  t: import("@/lib/domain").Task;
  onUpdate: (p: Promise<string | null>) => void;
  canAssignOthers: boolean;
  me: string;
}) {
  const { taskAction, projects, setOpenTaskId } = useApp();
  const proj = t.projectId ? projects.find((p) => p.id === t.projectId) : null;
  const editable = canAssignOthers || t.assigneeId === me || t.createdBy === me;
  const prog = subtaskProgress(t);
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-slate-50 last:border-0">
      <span className={`text-[9px] px-1.5 py-0.5 rounded ${PRIORITY_STYLE[t.priority]}`}>{t.priority}</span>
      <button onClick={() => setOpenTaskId(t.id)} className="flex-1 text-left text-[13px] text-slate-800 truncate hover:text-violet-700">
        {t.title}
        {proj && <span className="text-[11px] text-slate-400"> · {proj.name}</span>}
        {prog.total > 0 && <span className="text-[11px] text-violet-600"> · ☑ {prog.done}/{prog.total}</span>}
      </button>
      {t.dueDate && <span className="text-[10px] text-slate-400">{fmt(t.dueDate)}</span>}
      <select
        value={t.status}
        disabled={!editable}
        onChange={(e) => onUpdate(taskAction("update", { id: t.id, status: e.target.value as TaskStatus }))}
        aria-label="Statut"
        className={`text-[11px] rounded px-1 py-0.5 border ${STATUS_STYLE[t.status]} border-transparent disabled:opacity-60`}
      >
        {TASK_STATUTS.map((s) => <option key={s}>{s}</option>)}
      </select>
    </div>
  );
}

function NewTaskForm({
  canAssignOthers,
  fixedAssignee,
  compact,
  onCreate,
}: {
  canAssignOthers: boolean;
  fixedAssignee?: string;
  compact?: boolean;
  onCreate: (p: Promise<string | null>) => void;
}) {
  const { profiles, taskAction, me } = useApp();
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState(fixedAssignee ?? me.id);
  const [priority, setPriority] = useState<TaskPriority>("Normale");
  const [start, setStart] = useState("");
  const [due, setDue] = useState("");

  const submit = async () => {
    if (!title.trim()) return;
    await onCreate(
      taskAction("create", {
        title: title.trim(),
        assigneeId: fixedAssignee ?? assignee,
        priority,
        startDate: start || null,
        dueDate: due || null,
      })
    );
    setTitle("");
    setStart("");
    setDue("");
    setPriority("Normale");
  };

  return (
    <div className={`flex items-end gap-2 flex-wrap ${compact ? "" : "bg-white border border-slate-200 rounded-xl p-3"}`}>
      <div className="flex-1 min-w-[180px]">
        {!compact && <label className="text-[11px] text-slate-400 block mb-1">Nouvelle tâche</label>}
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder={fixedAssignee ? "Assigner une tâche…" : "Intitulé de la tâche…"}
          className="w-full text-[13px] border border-slate-200 rounded-lg px-2.5 py-1.5"
        />
      </div>
      {canAssignOthers && !fixedAssignee && (
        <select value={assignee} onChange={(e) => setAssignee(e.target.value)} aria-label="Assigné à" className="text-[12px] border border-slate-200 rounded-lg px-2 py-1.5 bg-white">
          {profiles.map((p) => <option key={p.id} value={p.id}>{p.id === me.id ? "Moi" : p.nom}</option>)}
        </select>
      )}
      <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} aria-label="Priorité" className="text-[12px] border border-slate-200 rounded-lg px-2 py-1.5 bg-white">
        {TASK_PRIORITIES.map((p) => <option key={p}>{p}</option>)}
      </select>
      <input type="date" value={start} onChange={(e) => setStart(e.target.value)} aria-label="Début prévu" title="Début prévu" className="text-[12px] border border-slate-200 rounded-lg px-2 py-1.5" />
      <input type="date" value={due} onChange={(e) => setDue(e.target.value)} aria-label="Échéance" title="Échéance" className="text-[12px] border border-slate-200 rounded-lg px-2 py-1.5" />
      <button onClick={submit} className="flex items-center gap-1 text-[13px] font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg px-3 py-1.5">
        <Plus size={15} /> {fixedAssignee ? "Assigner" : "Ajouter"}
      </button>
    </div>
  );
}

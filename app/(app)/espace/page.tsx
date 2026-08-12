"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  AlertOctagon,
  Bell,
  CheckCircle2,
  CheckSquare,
  Command,
  FolderKanban,
  Gavel,
  Inbox,
  ListChecks,
  ListTodo,
  MessageSquare,
  Plus,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { fmt, fmtLong, greeting, isTaskLate, isTaskOpen, projectMetrics, TASK_STATUTS, type TaskStatus } from "@/lib/domain";
import { DEFAULT_PERIOD, matchesPeriod, type PeriodFilter as Period } from "@/lib/period";
import { useApp } from "@/components/app-context";
import { NewTaskForm } from "@/components/NewTaskForm";
import { QuickCreateModal } from "@/components/QuickCreateModal";
import { TaskList, TaskViewSwitch, type TaskView } from "@/components/TaskList";
import { PeriodFilter } from "@/components/PeriodFilter";
import { Card } from "@/components/atoms";
import { CountUp, Sparkline } from "@/components/dataviz";
import { EmptyState } from "@/components/EmptyState";
import { ItemCard } from "@/components/ItemCard";
import { SuiviExplorer } from "@/components/SuiviExplorer";

/* Défini hors du composant de page : une définition imbriquée changerait
 * d'identité à chaque rendu, React remonterait tout le sous-arbre et les
 * champs de saisie perdraient le focus à chaque frappe. */
function Section({
  icon: Icon,
  title,
  count,
  tone = "text-slate-500",
  children,
}: {
  icon: typeof Bell;
  title: string;
  count: number;
  tone?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={15} className={tone} />
        <h2 className="text-[13px] font-semibold text-slate-700 uppercase tracking-wide">{title}</h2>
        <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">{count}</span>
      </div>
      {children}
    </div>
  );
}

export default function MonEspacePage() {
  const { items, now, me, scores, rs, projects, negligences, conversations, tasks, projectTask, setShowNew, setOpenTaskId } = useApp();
  const [taskPeriod, setTaskPeriod] = useState<Period>(DEFAULT_PERIOD);
  const [taskView, setTaskView] = useState<TaskView>("liste");
  const [taskErr, setTaskErr] = useState<string | null>(null);
  const taskInputRef = useRef<HTMLInputElement>(null);
  const [quickCreate, setQuickCreate] = useState(false);

  const mine = items.filter((i) => i.ownerId === me.id);
  const attends = mine.filter((i) => ["relance", "escalade"].includes(rs(i).level));
  const actifs = mine.filter((i) => i.statut !== "Clôturé");
  const rank = scores.findIndex((s) => s.id === me.id);
  const firstName = (me.nom || "").split(/\s+/)[0] || me.nom;

  // Mini-courbe : mon activité (événements de mes suivis) sur 14 jours.
  const iso = (d: Date) => new Date(d).toISOString().slice(0, 10);
  const byDay = new Map<string, number>();
  mine.forEach((i) => i.timeline.forEach((e) => byDay.set(iso(e.date), (byDay.get(iso(e.date)) ?? 0) + 1)));
  const myActivity = Array.from({ length: 14 }, (_, k) => {
    const d = new Date(now);
    d.setDate(now.getDate() - (13 - k));
    return byDay.get(iso(d)) ?? 0;
  });

  // Un encadrant peut assigner à quelqu'un d'autre, y compris depuis son espace.
  const canAssignOthers = ["manager", "directeur", "admin"].includes(me.role);

  // À justifier : mes blocages dont le motif n'est pas encore qualifié.
  const aJustifier = mine.filter((i) => i.statut === "Bloqué" && !i.appreciation);

  // Mes tâches de projet (attribuées, non terminées).
  const myTasks = projects
    .flatMap((p) => p.tasks.filter((t) => t.assigneeId === me.id && t.status !== "fait").map((t) => ({ t, p })))
    .sort((a, b) => (a.t.dueDate?.getTime() ?? Infinity) - (b.t.dueDate?.getTime() ?? Infinity));

  // Mes projets (responsable ou membre), actifs.
  const myProjects = projects.filter(
    (p) => (p.ownerId === me.id || p.memberIds.includes(me.id)) && p.status !== "Terminé" && p.status !== "Annulé"
  );

  // À décider (directeur/admin) : négligences en attente de décision.
  const isDG = me.role === "directeur" || me.role === "admin";
  const aDecider = isDG ? negligences.filter((n) => n.status !== "Décision rendue" && n.status !== "Classée") : [];
  // Projets dont le changement de statut attend une validation.
  const aValiderProjets = isDG ? projects.filter((p) => p.pendingStatus) : [];

  const unreadConvs = conversations.filter((c) => c.unread > 0);

  // Mes tâches assignées (module productivité), ouvertes d'abord.
  const myAssignedTasks = tasks
    .filter((t) => t.assigneeId === me.id)
    .sort((a, b) => Number(isTaskOpen(b)) - Number(isTaskOpen(a)) || (a.dueDate?.getTime() ?? Infinity) - (b.dueDate?.getTime() ?? Infinity));
  const openTaskCount = myAssignedTasks.filter(isTaskOpen).length;
  const visibleTasks = myAssignedTasks.filter((t) => matchesPeriod(t.dueDate, isTaskLate(t, now), taskPeriod, now));

  const run = async (p: Promise<string | null>) => {
    setTaskErr(await p);
  };


  return (
    <div className="space-y-6">
      {/* Hero premium */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-soft animate-float">
        <div className="aurora" aria-hidden />
        <div className="relative z-[1] p-6 md:p-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-500 mb-2">
                <Sparkles size={13} className="text-emerald-500" /> {fmtLong(now)}
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
                {greeting(now)}, {firstName}.
              </h1>
              <p className="mt-1.5 text-[15px] text-slate-500">Ton espace, ton rythme.</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setQuickCreate(true)}
                  className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-violet-700 dark:text-violet-300 bg-white dark:bg-slate-800 border border-violet-200 dark:border-violet-800 rounded-xl px-4 py-2.5 hover:-translate-y-0.5 transition-transform shadow-soft"
                >
                  <ListTodo size={16} /> Nouvelle tâche
                </button>
                <button
                  onClick={() => setShowNew(true)}
                  className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-slate-900 dark:bg-emerald-600 rounded-xl px-4 py-2.5 hover:-translate-y-0.5 transition-transform shadow-soft"
                >
                  <Plus size={16} /> Nouveau suivi de mail
                </button>
              </div>
              <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-400">
                <Command size={12} /> <kbd className="px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-sans">⌘K</kbd> pour tout faire
              </span>
            </div>
          </div>

          {/* Bandeau de KPIs personnels */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 stagger">
            <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Actifs</span>
                <Inbox size={14} className="text-sky-500" />
              </div>
              <div className="text-[28px] font-extrabold tracking-tight text-slate-900 leading-none mt-1"><CountUp value={actifs.length} /></div>
              <Sparkline data={myActivity} stroke="#0ea5e9" width={120} height={22} className="w-full mt-1.5" />
            </div>
            <MiniStat label="À traiter" value={attends.length} icon={Bell} tone="#f59e0b" danger={attends.length > 0} />
            <MiniStat label="Tâches ouvertes" value={openTaskCount} icon={ListTodo} tone="#8b5cf6" />
            <MiniStat label="Classement" value={rank >= 0 ? rank + 1 : 0} icon={Sparkles} tone="#10b981" prefix="#" />
          </div>
        </div>
      </section>

      {/* Ce qui t'attend */}
      <Section icon={Bell} title="Ce qui t'attend" count={attends.length} tone="text-amber-500">
        {attends.length === 0 ? (
          <Card><EmptyState icon={CheckCircle2} title="Tout est à jour" subtitle="Rien ne t'attend pour l'instant — profites-en." compact /></Card>
        ) : (
          <div className="space-y-3 stagger">{attends.map((i) => <ItemCard key={i.id} item={i} />)}</div>
        )}
      </Section>

      {/* Mes tâches (productivité) */}
      <div id="mes-taches" className="scroll-mt-4">
      <Section icon={ListTodo} title="Mes tâches" count={openTaskCount} tone="text-violet-500">
        <Card className="p-3">
          <div className="mb-3">
            <NewTaskForm canAssignOthers={canAssignOthers} inputRef={taskInputRef} onCreate={run} />
          </div>
          {taskErr && <div className="mb-2 text-[12px] text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{taskErr}</div>}
          {myAssignedTasks.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <PeriodFilter value={taskPeriod} onChange={setTaskPeriod} compact />
              <span className="ml-auto"><TaskViewSwitch value={taskView} onChange={setTaskView} /></span>
            </div>
          )}
          {myAssignedTasks.length === 0 ? (
            <div className="text-[12.5px] text-slate-400 text-center py-4">
              Aucune tâche pour l&apos;instant. Ajoutez-en une, ou attendez qu&apos;on vous en assigne.
            </div>
          ) : (
            <TaskList
              tasks={visibleTasks}
              view={taskView}
              onOpen={setOpenTaskId}
              showAssignee={false}
              emptyLabel="Aucune tâche sur cette période."
            />
          )}
        </Card>
      </Section>
      </div>

      {/* À justifier */}
      {aJustifier.length > 0 && (
        <Section icon={ShieldAlert} title="À justifier (motif de blocage)" count={aJustifier.length} tone="text-rose-500">
          <div className="space-y-3">{aJustifier.map((i) => <ItemCard key={i.id} item={i} />)}</div>
        </Section>
      )}

      {/* À décider (DG) */}
      {aDecider.length > 0 && (
        <Section icon={Gavel} title="À décider (négligences transmises)" count={aDecider.length} tone="text-rose-500">
          <Card>
            <div className="divide-y divide-slate-100">
              {aDecider.map((n) => {
                const it = n.itemId ? items.find((x) => x.id === n.itemId) : null;
                return (
                  <Link key={n.id} href={`/negligences/${n.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50">
                    <AlertOctagon size={15} className="text-rose-500 shrink-0" />
                    <span className="flex-1 text-[13px] text-slate-800 truncate">{n.objet || it?.objet || "—"}</span>
                    <span className="text-[11px] text-slate-500">{n.service || "—"}</span>
                    <span className="text-[11px] text-amber-600 font-medium">{n.status}</span>
                  </Link>
                );
              })}
            </div>
          </Card>
        </Section>
      )}

      {/* Projets à valider (statut proposé) */}
      {aValiderProjets.length > 0 && (
        <Section icon={Gavel} title="Statuts projet à valider" count={aValiderProjets.length} tone="text-amber-500">
          <Card>
            <div className="divide-y divide-slate-100">
              {aValiderProjets.map((p) => (
                <Link key={p.id} href={`/projets/${p.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50">
                  <FolderKanban size={15} className="text-slate-400 shrink-0" />
                  <span className="flex-1 text-[13px] text-slate-800 truncate">{p.name}</span>
                  <span className="text-[11px] text-slate-500">{p.status}</span>
                  <span className="text-slate-300">→</span>
                  <span className="text-[11px] text-amber-600 font-medium">{p.pendingStatus}</span>
                </Link>
              ))}
            </div>
          </Card>
        </Section>
      )}

      {/* Mes tâches de projet */}
      {myTasks.length > 0 && (
        <Section icon={ListChecks} title="Mes tâches de projet" count={myTasks.length} tone="text-sky-500">
          <Card>
            <div className="divide-y divide-slate-100">
              {myTasks.map(({ t, p }) => {
                const late = t.dueDate && t.dueDate.getTime() < now.getTime();
                return (
                  <div key={t.id} className="flex items-center gap-3 px-4 py-2.5">
                    <CheckSquare size={15} className="text-slate-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] text-slate-800 truncate">{t.title}</div>
                      <Link href={`/projets/${p.id}`} className="text-[11px] text-emerald-700 hover:underline">{p.name}</Link>
                    </div>
                    {t.dueDate && <span className={`text-[11px] ${late ? "text-rose-600 font-medium" : "text-slate-400"}`}>{fmt(t.dueDate)}</span>}
                    <select value={t.status} onChange={(e) => projectTask("update", { taskId: t.id, status: e.target.value as TaskStatus })} aria-label="Statut" className="text-[11px] border border-slate-200 rounded px-1 py-0.5">
                      {TASK_STATUTS.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                );
              })}
            </div>
          </Card>
        </Section>
      )}

      {/* Mes projets */}
      {myProjects.length > 0 && (
        <Section icon={FolderKanban} title="Mes projets" count={myProjects.length} tone="text-slate-500">
          <div className="grid md:grid-cols-2 gap-3">
            {myProjects.map((p) => {
              const m = projectMetrics(p, now);
              return (
                <Link key={p.id} href={`/projets/${p.id}`}>
                  <Card className="p-3 hover:shadow-sm transition">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-slate-900 text-emerald-400 grid place-items-center shrink-0"><FolderKanban size={16} /></div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium text-slate-800 truncate">{p.name}</div>
                        <div className="text-[11px] text-slate-400">{p.status} · {m.done}/{m.total} tâches</div>
                      </div>
                      <span className="text-[12px] font-mono text-slate-500">{m.progress}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-2">
                      <div className="h-full bg-emerald-400" style={{ width: `${m.progress}%` }} />
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </Section>
      )}

      {/* Messages non lus */}
      {unreadConvs.length > 0 && (
        <Section icon={MessageSquare} title="Messages non lus" count={unreadConvs.reduce((s, c) => s + c.unread, 0)} tone="text-emerald-600">
          <Card>
            <div className="divide-y divide-slate-100">
              {unreadConvs.map((c) => (
                <Link key={c.id} href="/messagerie" className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50">
                  <MessageSquare size={15} className="text-emerald-600 shrink-0" />
                  <span className="flex-1 text-[13px] text-slate-800 truncate">{c.title}</span>
                  <span className="text-[11px] text-slate-400 truncate max-w-[40%]">{c.lastPreview}</span>
                  <span className="text-[10px] bg-emerald-500 text-white font-bold rounded-full px-1.5">{c.unread}</span>
                </Link>
              ))}
            </div>
          </Card>
        </Section>
      )}

      {/* Tous mes suivis */}
      <div>
        <h2 className="text-[13px] font-semibold text-slate-700 uppercase tracking-wide mb-2">Mes suivis de mail</h2>
        {mine.length === 0 ? (
          <Card>
            <EmptyState
              icon={Inbox}
              title="Aucun suivi de mail"
              subtitle="Crée ton premier suivi de mail pour commencer à tout tracer."
              action={
                <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-slate-900 dark:bg-emerald-600 rounded-xl px-3.5 py-2 hover:-translate-y-0.5 transition-transform shadow-soft">
                  <Plus size={15} /> Nouveau suivi de mail
                </button>
              }
            />
          </Card>
        ) : (
          <SuiviExplorer items={mine} showResponsable={false} defaultView="cartes" />
        )}
      </div>

      {quickCreate && <QuickCreateModal onClose={() => setQuickCreate(false)} />}
    </div>
  );
}

function MiniStat({
  label,
  value,
  icon: Icon,
  tone,
  danger,
  prefix = "",
}: {
  label: string;
  value: number;
  icon: typeof Bell;
  tone: string;
  danger?: boolean;
  prefix?: string;
}) {
  return (
    <div className={`rounded-2xl border p-3.5 ${danger ? "border-amber-200/70 dark:border-amber-500/20 bg-amber-50/40 dark:bg-amber-500/5" : "border-slate-200/70 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30"}`}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">{label}</span>
        <Icon size={14} style={{ color: tone }} />
      </div>
      <div className="text-[28px] font-extrabold tracking-tight text-slate-900 leading-none mt-1">
        {prefix}
        <CountUp value={value} />
      </div>
    </div>
  );
}

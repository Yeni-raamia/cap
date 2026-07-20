"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertOctagon,
  Bell,
  CheckSquare,
  FolderKanban,
  Gavel,
  ListChecks,
  ListTodo,
  MessageSquare,
  Plus,
  ShieldAlert,
} from "lucide-react";
import { fmt, fmtLong, isTaskOpen, projectMetrics, subtaskProgress, TASK_STATUTS, type TaskStatus } from "@/lib/domain";
import { useApp } from "@/components/app-context";
import { Card } from "@/components/atoms";
import { ItemCard } from "@/components/ItemCard";
import { SuiviExplorer } from "@/components/SuiviExplorer";

export default function MonEspacePage() {
  const { items, now, me, scores, rs, projects, negligences, conversations, tasks, taskAction, projectTask, setShowNew, setOpenTaskId } = useApp();
  const [newTask, setNewTask] = useState("");

  const mine = items.filter((i) => i.ownerId === me.id);
  const attends = mine.filter((i) => ["relance", "escalade"].includes(rs(i).level));
  const actifs = mine.filter((i) => i.statut !== "Clôturé");
  const rank = scores.findIndex((s) => s.id === me.id);

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

  const addTask = async () => {
    if (!newTask.trim()) return;
    await taskAction("create", { title: newTask.trim(), assigneeId: me.id });
    setNewTask("");
  };

  const Section = ({ icon: Icon, title, count, tone = "text-slate-500", children }: { icon: typeof Bell; title: string; count: number; tone?: string; children: React.ReactNode }) => (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={15} className={tone} />
        <h2 className="text-[13px] font-semibold text-slate-700 uppercase tracking-wide">{title}</h2>
        <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">{count}</span>
      </div>
      {children}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Bonjour, {me.nom}</h1>
          <p className="text-[13px] text-slate-500">
            {fmtLong(now)} · {actifs.length} suivis actifs{rank >= 0 && ` · ${rank + 1}ᵉ au classement`}
          </p>
        </div>
        <button onClick={() => setShowNew(true)} className="flex items-center gap-1.5 text-[13px] font-medium text-white bg-emerald-600 rounded-lg px-3 py-2 hover:bg-emerald-700">
          <Plus size={16} /> Nouveau suivi
        </button>
      </div>

      {/* Ce qui t'attend */}
      <Section icon={Bell} title="Ce qui t'attend" count={attends.length} tone="text-amber-500">
        {attends.length === 0 ? (
          <Card className="p-6 text-center text-[13px] text-slate-400">Rien ne t&apos;attend. Tout est à jour.</Card>
        ) : (
          <div className="space-y-3">{attends.map((i) => <ItemCard key={i.id} item={i} />)}</div>
        )}
      </Section>

      {/* Mes tâches (productivité) */}
      <Section icon={ListTodo} title="Mes tâches" count={openTaskCount} tone="text-violet-500">
        <Card className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <input
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTask()}
              placeholder="Ajouter une tâche personnelle…"
              className="flex-1 text-[13px] border border-slate-200 rounded-lg px-2.5 py-1.5"
            />
            <button onClick={addTask} className="flex items-center gap-1 text-[13px] font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg px-3 py-1.5">
              <Plus size={15} /> Ajouter
            </button>
          </div>
          {myAssignedTasks.length === 0 ? (
            <div className="text-[12px] text-slate-400 text-center py-2">Aucune tâche. Ajoute-en une ou attends une assignation.</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {myAssignedTasks.map((t) => {
                const late = t.status !== "fait" && t.dueDate && t.dueDate.getTime() < now.getTime();
                const proj = t.projectId ? projects.find((p) => p.id === t.projectId) : null;
                const prog = subtaskProgress(t);
                return (
                  <div key={t.id} className="flex items-center gap-2 py-1.5">
                    <CheckSquare size={14} className={t.status === "fait" ? "text-emerald-500" : "text-slate-300"} />
                    <button onClick={() => setOpenTaskId(t.id)} className={`flex-1 text-left text-[13px] ${t.status === "fait" ? "text-slate-400 line-through" : "text-slate-800"} truncate hover:text-violet-700`}>
                      {t.title}
                      {proj && <span className="text-[11px] text-emerald-700"> · {proj.name}</span>}
                      {prog.total > 0 && <span className="text-[11px] text-violet-600"> · ☑ {prog.done}/{prog.total}</span>}
                    </button>
                    {t.dueDate && <span className={`text-[11px] ${late ? "text-rose-600 font-medium" : "text-slate-400"}`}>{fmt(t.dueDate)}</span>}
                    <select
                      value={t.status}
                      onChange={(e) => taskAction("update", { id: t.id, status: e.target.value as TaskStatus })}
                      aria-label="Statut de la tâche"
                      className="text-[11px] border border-slate-200 rounded px-1 py-0.5"
                    >
                      {TASK_STATUTS.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </Section>

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
        <h2 className="text-[13px] font-semibold text-slate-700 uppercase tracking-wide mb-2">Mes suivis</h2>
        {mine.length === 0 ? (
          <Card className="p-6 text-center text-[13px] text-slate-400">Aucun suivi. Crée-en un pour commencer.</Card>
        ) : (
          <SuiviExplorer items={mine} showResponsable={false} defaultView="cartes" />
        )}
      </div>
    </div>
  );
}

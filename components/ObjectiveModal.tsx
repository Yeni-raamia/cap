"use client";

import { useState } from "react";
import { Flag, Target, Trash2, TrendingDown, X } from "lucide-react";
import { fmt, objectiveProgress, OBJECTIVE_COLORS, OBJECTIVE_CRITICALITIES, OBJECTIVE_CRITICALITY_DOT, OBJECTIVE_CRITICALITY_TONE, type Objective, type ObjectiveCriticality } from "@/lib/domain";
import { toDayInput } from "@/lib/period";
import { useApp } from "./app-context";
import { Avatar } from "./atoms";
import { Ring } from "./dataviz";

/* Formatage en heure locale : `toISOString()` bascule en UTC et affiche la
 * veille en fin de journée — réenregistrer reculait alors la date d'un jour. */
const toDateInput = (d: Date | null | undefined) => toDayInput(d ?? null);

export function ObjectiveModal({ objective, creating, onClose }: { objective: Objective | null; creating: boolean; onClose: () => void }) {
  const { objectiveAction, projects, tasks, profiles, me, now, profileById, demo } = useApp();
  const canManage = !demo && ["manager", "directeur", "admin"].includes(me.role);

  const [title, setTitle] = useState(objective?.title ?? "");
  const [subtitle, setSubtitle] = useState(objective?.subtitle ?? "");
  const [criticality, setCriticality] = useState<ObjectiveCriticality>(objective?.criticality ?? "Moyenne");
  const [desc, setDesc] = useState(objective?.description ?? "");
  const [start, setStart] = useState(toDateInput(objective?.startDate) || toDateInput(new Date(now.getFullYear(), now.getMonth(), 1)));
  const [end, setEnd] = useState(toDateInput(objective?.endDate) || toDateInput(new Date(now.getFullYear(), now.getMonth() + 3, 0)));
  const [color, setColor] = useState(objective?.color ?? OBJECTIVE_COLORS[0]);
  const [ownerId, setOwnerId] = useState(objective?.ownerId ?? me.id);
  const [projectIds, setProjectIds] = useState<string[]>(objective?.projectIds ?? []);
  const [taskIds, setTaskIds] = useState<string[]>(objective?.taskIds ?? []);
  const [memberIds, setMemberIds] = useState<string[]>(objective?.memberIds ?? []);
  const [milestones, setMilestones] = useState<{ label: string; date: string; done: boolean }[]>(
    (objective?.milestones ?? []).map((m) => ({ label: m.label, date: toDateInput(m.date), done: m.done }))
  );
  const [reason, setReason] = useState("");
  const [showDowngrade, setShowDowngrade] = useState(false);
  const [busy, setBusy] = useState(false);

  const editable = canManage && (creating || objective?.status !== "declasse");
  const progress = objective ? objectiveProgress(objective, projects, tasks, now) : 0;
  const activeProjects = projects.filter((p) => p.status !== "Annulé");
  const linkableTasks = tasks.filter((t) => t.status !== "fait" || taskIds.includes(t.id));

  const toggle = (arr: string[], set: (v: string[]) => void, id: string) =>
    set(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);

  const run = async (p: Promise<string | null>) => {
    setBusy(true);
    const e = await p;
    setBusy(false);
    if (!e) onClose();
  };

  const save = () => {
    const payload = { title: title.trim(), subtitle: subtitle.trim(), description: desc, criticality, startDate: start, endDate: end, color, ownerId, projectIds, taskIds, memberIds, milestones: milestones.filter((m) => m.label.trim() && m.date) };
    if (creating) run(objectiveAction("create", payload));
    else if (objective) run(objectiveAction("update", { id: objective.id, ...payload }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto animate-fade" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl my-8 max-h-[90vh] overflow-y-auto animate-pop" onClick={(e) => e.stopPropagation()}>
        {/* En-tête */}
        <div className="flex items-start gap-3 p-4 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
          <span className="mt-1 h-4 w-4 rounded-full shrink-0" style={{ background: color }} />
          <div className="flex-1 min-w-0">
            {editable ? (
              <>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Intitulé de l'objectif…" className="w-full text-[15px] font-semibold text-slate-800 dark:text-slate-100 bg-transparent outline-none border-b border-transparent focus:border-slate-200" />
                <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Sous-titre (accroche courte)…" className="w-full text-[12px] text-slate-500 dark:text-slate-400 bg-transparent outline-none border-b border-transparent focus:border-slate-200 mt-1" />
              </>
            ) : (
              <>
                <div className="text-[15px] font-semibold text-slate-800">{objective?.title}</div>
                {objective?.subtitle && <div className="text-[12px] text-slate-500 dark:text-slate-400">{objective.subtitle}</div>}
              </>
            )}
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`inline-flex items-center gap-1 text-[10px] font-medium rounded-full px-2 py-0.5 border ${OBJECTIVE_CRITICALITY_TONE[criticality]}`}>
                <span className={`h-2 w-2 rounded-full ${OBJECTIVE_CRITICALITY_DOT[criticality]}`} /> {criticality}
              </span>
              {objective && <span className="text-[11px] text-slate-400">{fmt(objective.startDate)} → {fmt(objective.endDate)}</span>}
            </div>
          </div>
          {objective && objective.status !== "declasse" && <Ring value={progress} size={44} color={color}><span className="text-[10px] font-bold text-slate-700">{progress}%</span></Ring>}
          <button onClick={onClose} aria-label="Fermer" className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        <div className="p-4 space-y-4">
          {objective?.status === "declasse" && (
            <div className="flex items-start gap-2 text-[12.5px] text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-lg px-3 py-2">
              <TrendingDown size={15} className="text-slate-400 mt-0.5 shrink-0" /> Objectif déclassé — {objective.downgradeReason}
            </div>
          )}

          {/* Période + couleur + responsable */}
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Du">
              {editable ? <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="w-full text-[13px] border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 bg-transparent" /> : <div className="text-[13px] text-slate-700 py-1.5">{objective && fmt(objective.startDate)}</div>}
            </Field>
            <Field label="Au">
              {editable ? <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="w-full text-[13px] border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 bg-transparent" /> : <div className="text-[13px] text-slate-700 py-1.5">{objective && fmt(objective.endDate)}</div>}
            </Field>
            <Field label="Responsable">
              {editable ? (
                <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className="w-full text-[13px] border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-900">
                  {profiles.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
                </select>
              ) : (
                <div className="flex items-center gap-1.5 py-1.5 text-[13px] text-slate-700">{objective && <><Avatar init={profileById(objective.ownerId).init} size="h-5 w-5" /> {profileById(objective.ownerId).nom}</>}</div>
              )}
            </Field>
            <Field label="Criticité">
              {editable ? (
                <select value={criticality} onChange={(e) => setCriticality(e.target.value as ObjectiveCriticality)} className="w-full text-[13px] border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-900">
                  {OBJECTIVE_CRITICALITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              ) : (
                <div className="py-1.5">
                  <span className={`inline-flex items-center gap-1 text-[11px] font-medium rounded-full px-2 py-0.5 border ${OBJECTIVE_CRITICALITY_TONE[criticality]}`}>
                    <span className={`h-2 w-2 rounded-full ${OBJECTIVE_CRITICALITY_DOT[criticality]}`} /> {criticality}
                  </span>
                </div>
              )}
            </Field>
            {editable && (
              <Field label="Couleur">
                <div className="flex items-center gap-1.5 py-1">
                  {OBJECTIVE_COLORS.map((c) => (
                    <button key={c} onClick={() => setColor(c)} aria-label={`Couleur ${c}`} className={`h-6 w-6 rounded-full transition-transform ${color === c ? "ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 scale-110" : ""}`} style={{ background: c }} />
                  ))}
                </div>
              </Field>
            )}
          </div>

          {/* Description */}
          <div>
            <div className="text-[11px] font-medium text-slate-400 uppercase mb-1.5">Description</div>
            {editable ? (
              <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} placeholder="Le résultat visé, les critères de réussite…" className="w-full text-[13px] border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-transparent" />
            ) : (
              <p className="text-[13px] text-slate-700 whitespace-pre-wrap">{objective?.description || "—"}</p>
            )}
          </div>

          {/* Liaisons : projets */}
          <LinkSection label="Projets liés" hint="l'avancement en est déduit">
            <div className="flex flex-wrap gap-1.5">
              {activeProjects.length === 0 && <span className="text-[12px] text-slate-400">Aucun projet.</span>}
              {activeProjects.map((p) => {
                const on = projectIds.includes(p.id);
                return (
                  <button key={p.id} disabled={!editable} onClick={() => toggle(projectIds, setProjectIds, p.id)} className={`text-[12px] rounded-full px-2.5 py-1 border transition-colors disabled:opacity-70 ${on ? "bg-emerald-600 text-white border-emerald-600" : "border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>{p.name}</button>
                );
              })}
            </div>
          </LinkSection>

          {/* Liaisons : tâches */}
          {(editable || taskIds.length > 0) && (
            <LinkSection label="Tâches liées">
              <div className="flex flex-wrap gap-1.5">
                {linkableTasks.length === 0 && <span className="text-[12px] text-slate-400">Aucune tâche.</span>}
                {linkableTasks.slice(0, 40).map((t) => {
                  const on = taskIds.includes(t.id);
                  return (
                    <button key={t.id} disabled={!editable} onClick={() => toggle(taskIds, setTaskIds, t.id)} className={`text-[12px] rounded-full px-2.5 py-1 border transition-colors disabled:opacity-70 ${on ? "bg-violet-600 text-white border-violet-600" : "border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>{t.title}</button>
                  );
                })}
              </div>
            </LinkSection>
          )}

          {/* Liaisons : équipe */}
          <LinkSection label="Équipe / contributeurs">
            <div className="flex flex-wrap gap-1.5">
              {profiles.map((p) => {
                const on = memberIds.includes(p.id);
                return (
                  <button key={p.id} disabled={!editable} onClick={() => toggle(memberIds, setMemberIds, p.id)} className={`inline-flex items-center gap-1.5 text-[12px] rounded-full pl-1 pr-2.5 py-0.5 border transition-colors disabled:opacity-70 ${on ? "bg-slate-900 dark:bg-emerald-600 text-white border-transparent" : "border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
                    <Avatar init={p.init} size="h-5 w-5" /> {p.nom}
                  </button>
                );
              })}
            </div>
          </LinkSection>

          {/* Jalons */}
          {(editable || milestones.length > 0) && (
            <LinkSection label="Jalons" hint="étapes clés de l'objectif">
              <div className="space-y-1.5">
                {milestones.map((m, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    {editable ? (
                      <>
                        <button onClick={() => setMilestones((a) => a.map((x, i) => (i === idx ? { ...x, done: !x.done } : x)))} aria-label={m.done ? "Fait" : "À faire"} className={`h-4 w-4 rounded border grid place-items-center shrink-0 ${m.done ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300"}`}>{m.done && <Flag size={10} />}</button>
                        <input value={m.label} onChange={(e) => setMilestones((a) => a.map((x, i) => (i === idx ? { ...x, label: e.target.value } : x)))} placeholder="Intitulé du jalon…" className="flex-1 text-[13px] border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 bg-transparent" />
                        <input type="date" value={m.date} onChange={(e) => setMilestones((a) => a.map((x, i) => (i === idx ? { ...x, date: e.target.value } : x)))} className="text-[12px] border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 bg-transparent" />
                        <button onClick={() => setMilestones((a) => a.filter((_, i) => i !== idx))} aria-label="Supprimer" className="text-slate-300 hover:text-rose-500"><X size={14} /></button>
                      </>
                    ) : (
                      <div className="flex items-center gap-2 text-[13px]">
                        <span className={`h-2.5 w-2.5 rotate-45 border ${m.done ? "bg-emerald-500 border-emerald-500" : "border-slate-400"}`} />
                        <span className={m.done ? "text-slate-400 line-through" : "text-slate-700"}>{m.label}</span>
                        <span className="text-[11px] text-slate-400">{m.date}</span>
                      </div>
                    )}
                  </div>
                ))}
                {editable && (
                  <button onClick={() => setMilestones((a) => [...a, { label: "", date: toDateInput(new Date()), done: false }])} className="text-[12px] font-medium text-emerald-700 dark:text-emerald-400 hover:underline">+ Ajouter un jalon</button>
                )}
              </div>
            </LinkSection>
          )}

          {/* Déclassement */}
          {showDowngrade && (
            <div className="rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-500/5 p-3 space-y-2">
              <div className="text-[12px] font-medium text-amber-700">Motif du déclassement</div>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Pourquoi cet objectif est-il déclassé ?" className="w-full text-[13px] border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 bg-transparent" />
              <div className="flex gap-2">
                <button disabled={!reason.trim() || busy} onClick={() => objective && run(objectiveAction("downgrade", { id: objective.id, reason: reason.trim() }))} className="text-[12px] font-medium text-white bg-amber-600 rounded-lg px-3 py-1.5 disabled:opacity-50">Confirmer le déclassement</button>
                <button onClick={() => setShowDowngrade(false)} className="text-[12px] text-slate-500 px-3 py-1.5">Annuler</button>
              </div>
            </div>
          )}
        </div>

        {/* Pied d'actions */}
        {canManage && (
          <div className="flex items-center gap-2 p-4 border-t border-slate-100 dark:border-slate-800 flex-wrap">
            {creating ? (
              <button disabled={!title.trim() || busy} onClick={save} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-slate-900 dark:bg-emerald-600 rounded-xl px-4 py-2 hover:-translate-y-0.5 transition-transform shadow-soft disabled:opacity-50">
                <Target size={15} /> Créer l&apos;objectif
              </button>
            ) : objective && (
              <>
                {objective.status !== "declasse" && (
                  <>
                    <button disabled={busy} onClick={save} className="text-[13px] font-semibold text-white bg-slate-900 dark:bg-emerald-600 rounded-xl px-4 py-2 hover:-translate-y-0.5 transition-transform shadow-soft disabled:opacity-50">Enregistrer</button>
                    {objective.status !== "atteint" && (
                      <button disabled={busy} onClick={() => run(objectiveAction("achieve", { id: objective.id }))} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 rounded-xl px-3 py-2 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"><Flag size={15} /> Marquer atteint</button>
                    )}
                    <button onClick={() => setShowDowngrade((v) => !v)} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-amber-700 border border-amber-200 rounded-xl px-3 py-2 hover:bg-amber-50 dark:hover:bg-amber-500/10"><TrendingDown size={15} /> Déclasser</button>
                  </>
                )}
                <button disabled={busy} onClick={() => run(objectiveAction("delete", { id: objective.id }))} className="ml-auto inline-flex items-center gap-1 text-[12px] text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg px-2.5 py-1.5"><Trash2 size={13} /> Supprimer</button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-medium text-slate-400 uppercase mb-1">{label}</div>
      {children}
    </div>
  );
}
function LinkSection({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-medium text-slate-400 uppercase mb-1.5">{label}{hint && <span className="normal-case font-normal text-slate-400"> · {hint}</span>}</div>
      {children}
    </div>
  );
}

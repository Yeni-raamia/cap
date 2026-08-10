"use client";

import { useState } from "react";
import { BookOpen, GitBranch, Plus, Trash2, X } from "lucide-react";
import { INCIDENT_SEVERITIES, RUNBOOK_CATEGORIES, RUNBOOK_PHASES, RUNBOOK_PHASE_TONE, RUNBOOK_STATUS, type Runbook, type RunbookStep } from "@/lib/domain";
import { useApp } from "./app-context";

const inputCls = "w-full text-[13px] border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 bg-white dark:bg-slate-900 outline-none focus:border-emerald-400";
const labelCls = "block text-[11px] font-medium text-slate-500 mb-1";
const uid = () => `s-${Math.random().toString(36).slice(2, 10)}`;

export function RunbookModal({ runbook, creating, onClose }: { runbook: Runbook | null; creating: boolean; onClose: () => void }) {
  const { demo, me, profiles, createRunbook, updateRunbook, deleteRunbook } = useApp();
  const canEdit = !demo;

  const [title, setTitle] = useState(runbook?.title ?? "");
  const [category, setCategory] = useState(runbook?.category ?? RUNBOOK_CATEGORIES[0]);
  const [severity, setSeverity] = useState(runbook?.severity ?? "Majeur");
  const [status, setStatus] = useState(runbook?.status ?? "Brouillon");
  const [ownerId, setOwnerId] = useState(runbook?.ownerId || me.id);
  const [trigger, setTrigger] = useState(runbook?.trigger ?? "");
  const [objective, setObjective] = useState(runbook?.objective ?? "");
  const [attack, setAttack] = useState((runbook?.attackTechniques ?? []).join(", "));
  const [escalation, setEscalation] = useState(runbook?.escalation ?? "");
  const [references, setReferences] = useState(runbook?.references ?? "");
  const [steps, setSteps] = useState<RunbookStep[]>(runbook?.steps.map((s) => ({ ...s })) ?? []);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const addStep = () => setSteps((ss) => [...ss, { id: uid(), phase: ss[ss.length - 1]?.phase ?? RUNBOOK_PHASES[0], title: "", detail: "", decision: false }]);
  const patch = (id: string, f: Partial<RunbookStep>) => setSteps((ss) => ss.map((s) => (s.id === id ? { ...s, ...f } : s)));
  const remove = (id: string) => setSteps((ss) => ss.filter((s) => s.id !== id));
  const move = (id: string, dir: -1 | 1) => setSteps((ss) => {
    const i = ss.findIndex((s) => s.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ss.length) return ss;
    const c = [...ss]; [c[i], c[j]] = [c[j], c[i]]; return c;
  });

  const save = async () => {
    if (!title.trim()) { setErr("Titre du runbook requis."); return; }
    setBusy(true); setErr(null);
    const payload = {
      title: title.trim(), category, severity, status, ownerId, trigger, objective,
      attackTechniques: attack.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean),
      steps: steps.map((s) => ({ ...s, title: s.title.trim() })).filter((s) => s.title || s.detail),
      escalation, references,
    };
    const e = creating ? await createRunbook(payload) : runbook ? await updateRunbook(runbook.id, payload) : "—";
    setBusy(false);
    if (e) setErr(e); else onClose();
  };
  const del = async () => {
    if (!runbook || (typeof window !== "undefined" && !window.confirm(`Supprimer le runbook « ${runbook.ref} » ?`))) return;
    setBusy(true);
    const e = await deleteRunbook(runbook.id);
    setBusy(false);
    if (e) setErr(e); else onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto animate-fade" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl my-8 max-h-[92vh] overflow-y-auto animate-pop" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3 p-4 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
          <BookOpen size={20} className="text-emerald-600 mt-1 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-semibold text-slate-800 dark:text-slate-100">{creating ? "Nouveau runbook" : runbook?.ref}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Procédure de réponse (méthode NIST SP 800-61)</div>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        <div className="p-4 space-y-3">
          {err && <div className="text-[12px] text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{err}</div>}
          <div>
            <label className={labelCls}>Titre</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} disabled={!canEdit} placeholder="Ex. Suspicion de rançongiciel" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div><label className={labelCls}>Catégorie</label><select value={category} onChange={(e) => setCategory(e.target.value)} disabled={!canEdit} className={inputCls}>{RUNBOOK_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
            <div><label className={labelCls}>Gravité</label><select value={severity} onChange={(e) => setSeverity(e.target.value)} disabled={!canEdit} className={inputCls}>{INCIDENT_SEVERITIES.map((s) => <option key={s}>{s}</option>)}</select></div>
            <div><label className={labelCls}>Statut</label><select value={status} onChange={(e) => setStatus(e.target.value)} disabled={!canEdit} className={inputCls}>{RUNBOOK_STATUS.map((s) => <option key={s}>{s}</option>)}</select></div>
            <div><label className={labelCls}>Responsable</label><select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} disabled={!canEdit} className={inputCls}>{profiles.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}</select></div>
          </div>
          <div>
            <label className={labelCls}>Déclencheur — quand appliquer ce runbook</label>
            <textarea value={trigger} onChange={(e) => setTrigger(e.target.value)} disabled={!canEdit} rows={2} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Objectif</label>
            <textarea value={objective} onChange={(e) => setObjective(e.target.value)} disabled={!canEdit} rows={2} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Techniques MITRE ATT&amp;CK (codes séparés par des virgules)</label>
            <input value={attack} onChange={(e) => setAttack(e.target.value)} disabled={!canEdit} placeholder="Ex. T1566, T1486" className={`${inputCls} font-mono text-[12px]`} />
          </div>

          {/* Étapes par phase */}
          <div className="flex items-center justify-between pt-1">
            <div className="text-[12px] font-semibold text-slate-600 uppercase">Étapes · {steps.length}</div>
            {canEdit && <button onClick={addStep} className="inline-flex items-center gap-1 text-[12px] font-medium text-emerald-700 hover:underline"><Plus size={13} /> Ajouter une étape</button>}
          </div>
          {steps.length === 0 ? (
            <div className="text-[12px] text-slate-400 text-center py-4 border border-dashed border-slate-200 rounded-lg">Aucune étape. Ajoute les étapes de la procédure, phase par phase.</div>
          ) : (
            <div className="space-y-2">
              {steps.map((s, idx) => (
                <div key={s.id} className={`rounded-xl border p-2.5 ${RUNBOOK_PHASE_TONE[s.phase]?.replace(/text-\S+/, "").replace(/bg-(\S+)/, "border-$1") ?? "border-slate-200"} border-slate-200 dark:border-slate-700`}>
                  <div className="flex items-start gap-2">
                    <div className="flex flex-col items-center pt-1 text-slate-300 text-[10px]">
                      <button onClick={() => move(s.id, -1)} disabled={!canEdit || idx === 0} aria-label="Monter" className="disabled:opacity-30 hover:text-slate-500 leading-none">▲</button>
                      <span className="text-slate-400 py-0.5">{idx + 1}</span>
                      <button onClick={() => move(s.id, 1)} disabled={!canEdit || idx === steps.length - 1} aria-label="Descendre" className="disabled:opacity-30 hover:text-slate-500 leading-none">▼</button>
                    </div>
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <select value={s.phase} onChange={(e) => patch(s.id, { phase: e.target.value })} disabled={!canEdit} className={`text-[11px] rounded-lg px-1.5 py-1 border ${RUNBOOK_PHASE_TONE[s.phase] ?? "border-slate-200"}`}>
                          {RUNBOOK_PHASES.map((p) => <option key={p} value={p}>{p}</option>)}
                        </select>
                        <button onClick={() => canEdit && patch(s.id, { decision: !s.decision })} className={`inline-flex items-center gap-1 text-[11px] rounded-full px-2 py-0.5 border ${s.decision ? "bg-amber-100 text-amber-700 border-amber-200" : "border-slate-200 text-slate-400"}`}>
                          <GitBranch size={11} /> Point de décision
                        </button>
                        {canEdit && <button onClick={() => remove(s.id)} aria-label="Supprimer l'étape" className="ml-auto text-rose-500 hover:text-rose-700"><Trash2 size={14} /></button>}
                      </div>
                      <input value={s.title} onChange={(e) => patch(s.id, { title: e.target.value })} disabled={!canEdit} placeholder="Intitulé de l'étape" className={`${inputCls} font-medium`} />
                      <textarea value={s.detail} onChange={(e) => patch(s.id, { detail: e.target.value })} disabled={!canEdit} rows={2} placeholder="Détail : ce qu'il faut faire concrètement" className={`${inputCls} text-[12px]`} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div>
            <label className={labelCls}>Escalade — quand ouvrir un incident (GRC) / qui prévenir</label>
            <textarea value={escalation} onChange={(e) => setEscalation(e.target.value)} disabled={!canEdit} rows={2} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Références (normes & sources)</label>
            <input value={references} onChange={(e) => setReferences(e.target.value)} disabled={!canEdit} placeholder="NIST SP 800-61, ANSSI, CERT-FR…" className={inputCls} />
          </div>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2 p-4 border-t border-slate-100 dark:border-slate-800 sticky bottom-0 bg-white dark:bg-slate-900">
            <button onClick={save} disabled={busy || !title.trim()} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-slate-900 dark:bg-emerald-600 rounded-xl px-4 py-2 disabled:opacity-50"><BookOpen size={15} /> {creating ? "Créer le runbook" : "Enregistrer"}</button>
            {!creating && runbook && <button onClick={del} disabled={busy} className="ml-auto inline-flex items-center gap-1 text-[12px] text-rose-600 border border-rose-200 rounded-lg px-3 py-2 hover:bg-rose-50"><Trash2 size={14} /> Supprimer</button>}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { BookOpen, Crosshair, RotateCcw, X } from "lucide-react";
import { ATTACK_COVERAGE_STATUS, ATTACK_COVERAGE_TONE, runbookCoversTechnique } from "@/lib/domain";
import { attackTacticById, type AttackTechnique } from "@/lib/data/attack";
import { useApp } from "./app-context";

const inputCls = "w-full text-[13px] border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 bg-white dark:bg-slate-900 outline-none focus:border-emerald-400";

export function AttackTechniqueModal({ technique, onClose }: { technique: AttackTechnique; onClose: () => void }) {
  const { demo, runbooks, attackCoverage, assessAttack, resetAttack } = useApp();
  const canEdit = !demo;
  const cur = attackCoverage.find((c) => c.techniqueId === technique.id) ?? null;

  const [status, setStatus] = useState(cur?.status ?? "Non couverte");
  const [detectionNote, setDetectionNote] = useState(cur?.detectionNote ?? "");
  const [busy, setBusy] = useState(false);

  const linkedRunbooks = runbooks.filter((r) => runbookCoversTechnique(r.attackTechniques, technique.id));

  const save = async () => {
    setBusy(true);
    const e = await assessAttack(technique.id, { status, detectionNote });
    setBusy(false);
    if (!e) onClose();
  };
  const reset = async () => {
    setBusy(true);
    await resetAttack(technique.id);
    setBusy(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto animate-fade" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg my-8 animate-pop" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3 p-4 border-b border-slate-100 dark:border-slate-800">
          <Crosshair size={20} className="text-rose-500 mt-1 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-semibold text-slate-800 dark:text-slate-100"><span className="font-mono text-rose-600">{technique.id}</span> · {technique.name}</div>
            <div className="text-[11px] text-slate-400 mt-0.5 flex flex-wrap gap-1">
              {technique.tacticIds.map((id) => <span key={id} className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">{attackTacticById(id)?.name ?? id}</span>)}
            </div>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        <div className="p-4 space-y-3">
          <div className="text-[12.5px] text-slate-600 dark:text-slate-300">{technique.description}</div>

          {/* Réponse : runbooks reliés */}
          <div>
            <div className="text-[11px] font-medium text-slate-500 uppercase mb-1">Réponse — runbooks reliés</div>
            {linkedRunbooks.length === 0 ? (
              <div className="text-[12px] text-slate-400">Aucun runbook ne couvre cette technique pour l&apos;instant.</div>
            ) : (
              <div className="space-y-1">
                {linkedRunbooks.map((r) => (
                  <a key={r.id} href={`/soc?tab=runbooks`} className="flex items-center gap-1.5 text-[12px] text-emerald-700 hover:underline">
                    <BookOpen size={12} /> {r.ref} · {r.title}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Détection : auto-évaluation (piste Wazuh) */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 space-y-2">
            <div className="text-[11px] font-medium text-slate-500 uppercase">Détection — auto-évaluation</div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {ATTACK_COVERAGE_STATUS.map((s) => (
                <button key={s} onClick={() => canEdit && setStatus(s)} className={`text-[11px] rounded-full px-2.5 py-1 border ${status === s ? ATTACK_COVERAGE_TONE[s] : "border-slate-200 text-slate-400"}`}>{s}</button>
              ))}
            </div>
            <textarea value={detectionNote} onChange={(e) => setDetectionNote(e.target.value)} disabled={!canEdit} rows={3} placeholder="Piste de détection / règle Wazuh (ex. règle sur les Event IDs, décodeur, seuil…)" className={inputCls} />
          </div>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2 p-4 border-t border-slate-100 dark:border-slate-800">
            <button onClick={save} disabled={busy} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-slate-900 dark:bg-emerald-600 rounded-xl px-4 py-2 disabled:opacity-50"><Crosshair size={15} /> Enregistrer</button>
            {cur && <button onClick={reset} disabled={busy} className="ml-auto inline-flex items-center gap-1 text-[12px] text-slate-500 border border-slate-200 rounded-lg px-3 py-2 hover:bg-slate-50"><RotateCcw size={13} /> Réinitialiser</button>}
          </div>
        )}
      </div>
    </div>
  );
}

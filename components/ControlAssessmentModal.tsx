"use client";

import { useState } from "react";
import { RotateCcw, Save, X } from "lucide-react";
import { CONTROL_STATUS, MATURITY_LABELS, type ControlAssessment } from "@/lib/domain";
import type { RefControl } from "@/lib/grc/frameworks";
import { useApp } from "./app-context";

const toDateInput = (d: Date | null | undefined) => (d ? new Date(d).toISOString().slice(0, 10) : "");
const today = () => new Date().toISOString().slice(0, 10);

/** Fiche d'évaluation d'une mesure : applicabilité (SoA), statut, maturité, preuves. */
export function ControlAssessmentModal({
  frameworkId,
  frameworkShort,
  control,
  assessment,
  onClose,
}: {
  frameworkId: string;
  frameworkShort: string;
  control: RefControl;
  assessment: ControlAssessment | null;
  onClose: () => void;
}) {
  const { demo, me, profiles, assessControl, resetControl } = useApp();
  const canEdit = !demo;

  const [applicable, setApplicable] = useState(assessment ? assessment.applicable : true);
  const [justification, setJustification] = useState(assessment?.justification ?? "");
  const [status, setStatus] = useState(assessment?.status ?? "Non évalué");
  const [maturity, setMaturity] = useState(assessment?.maturity ?? 0);
  const [responsibleId, setResponsibleId] = useState(assessment?.responsibleId ?? me.id);
  const [evidence, setEvidence] = useState(assessment?.evidence ?? "");
  const [note, setNote] = useState(assessment?.note ?? "");
  const [lastAssessed, setLastAssessed] = useState(toDateInput(assessment?.lastAssessedAt) || today());
  const [nextReview, setNextReview] = useState(toDateInput(assessment?.nextReviewAt));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setErr(null);
    const e = await assessControl(frameworkId, control.code, {
      applicable,
      justification,
      status,
      maturity,
      responsibleId,
      evidence,
      note,
      lastAssessedAt: lastAssessed || null,
      nextReviewAt: nextReview || null,
    });
    setBusy(false);
    if (e) setErr(e);
    else onClose();
  };

  const reset = async () => {
    if (typeof window !== "undefined" && !window.confirm("Réinitialiser l'évaluation de cette mesure ?")) return;
    setBusy(true);
    const e = await resetControl(frameworkId, control.code);
    setBusy(false);
    if (e) setErr(e);
    else onClose();
  };

  const inputCls = "w-full text-[13px] border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 bg-white dark:bg-slate-900 focus:border-emerald-400 outline-none";
  const labelCls = "block text-[11px] font-medium text-slate-500 mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto animate-fade" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg my-8 max-h-[90vh] overflow-y-auto animate-pop" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3 p-4 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 rounded px-1.5 py-0.5">{control.code}</span>
              <span className="text-[11px] text-slate-400">{frameworkShort} · {control.group}</span>
            </div>
            <div className="text-[14px] font-semibold text-slate-800 dark:text-slate-100 mt-1">{control.title}</div>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        <div className="p-4 space-y-3">
          {err && <div className="text-[12px] text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{err}</div>}

          {/* Applicabilité (SoA) */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
            <label className="flex items-center gap-2 text-[13px] font-medium text-slate-700 dark:text-slate-200 cursor-pointer">
              <input type="checkbox" checked={applicable} disabled={!canEdit} onChange={(e) => setApplicable(e.target.checked)} className="h-4 w-4 accent-emerald-600" />
              Mesure applicable (incluse dans la déclaration d&apos;applicabilité)
            </label>
            <textarea value={justification} onChange={(e) => setJustification(e.target.value)} disabled={!canEdit} rows={2} placeholder={applicable ? "Justification d'inclusion (facultatif)…" : "Justification d'exclusion (recommandée)…"} className={`${inputCls} mt-2`} />
          </div>

          {applicable && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Statut d&apos;implémentation</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value)} disabled={!canEdit} className={inputCls}>
                    {CONTROL_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Maturité</label>
                  <select value={maturity} onChange={(e) => setMaturity(Number(e.target.value))} disabled={!canEdit} className={inputCls}>
                    {MATURITY_LABELS.map((l, n) => <option key={n} value={n}>{n} · {l}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Responsable</label>
                  <select value={responsibleId} onChange={(e) => setResponsibleId(e.target.value)} disabled={!canEdit} className={inputCls}>
                    {profiles.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Évalué le</label>
                  <input type="date" value={lastAssessed} onChange={(e) => setLastAssessed(e.target.value)} disabled={!canEdit} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Prochaine revue</label>
                  <input type="date" value={nextReview} onChange={(e) => setNextReview(e.target.value)} disabled={!canEdit} className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Preuves / dispositif en place</label>
                <textarea value={evidence} onChange={(e) => setEvidence(e.target.value)} disabled={!canEdit} rows={2} placeholder="Procédure, outil, document, capture… (référence)" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Note / plan d&apos;amélioration</label>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} disabled={!canEdit} rows={2} placeholder="Écart constaté, action prévue…" className={inputCls} />
              </div>
            </>
          )}
        </div>

        {canEdit && (
          <div className="flex items-center gap-2 p-4 border-t border-slate-100 dark:border-slate-800">
            <button onClick={save} disabled={busy} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-slate-900 dark:bg-emerald-600 rounded-xl px-4 py-2 hover:-translate-y-0.5 transition-transform shadow-soft disabled:opacity-50">
              <Save size={15} /> Enregistrer l&apos;évaluation
            </button>
            {assessment && (
              <button onClick={reset} disabled={busy} className="ml-auto inline-flex items-center gap-1 text-[12px] text-slate-500 border border-slate-200 rounded-lg px-3 py-2 hover:bg-slate-50"><RotateCcw size={13} /> Réinitialiser</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

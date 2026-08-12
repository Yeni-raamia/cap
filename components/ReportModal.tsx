"use client";

import { useState } from "react";
import { FileText, Trash2, X } from "lucide-react";
import {
  REPORT_KINDS,
  reportKindDef,
  type Report,
  type ReportKind,
  type ReportRefType,
} from "@/lib/domain";
import { endOfWeek, startOfWeek, toDayInput } from "@/lib/period";
import { useApp } from "./app-context";

const inputCls =
  "w-full text-[13px] border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 bg-white dark:bg-slate-900 focus:border-emerald-400 outline-none";
const labelCls = "block text-[11px] font-medium text-slate-500 mb-1";

/** Rédaction / édition d'un compte rendu, rattaché à une tâche ou un projet. */
export function ReportModal({
  report,
  refType,
  refId,
  refLabel,
  defaultKind = "periodique",
  onClose,
}: {
  /** Compte rendu à modifier, ou null pour une rédaction. */
  report: Report | null;
  refType: ReportRefType;
  refId: string;
  /** Nom de la tâche ou du projet, affiché en en-tête. */
  refLabel: string;
  defaultKind?: ReportKind;
  onClose: () => void;
}) {
  const { now, reportAction } = useApp();

  const [kind, setKind] = useState<ReportKind>(report?.kind ?? defaultKind);
  const [title, setTitle] = useState(report?.title ?? "");
  // Par défaut, un point d'avancement couvre la semaine en cours.
  const [periodStart, setPeriodStart] = useState(
    toDayInput(report?.periodStart ?? (report ? null : startOfWeek(now)))
  );
  const [periodEnd, setPeriodEnd] = useState(toDayInput(report?.periodEnd ?? (report ? null : endOfWeek(now))));
  const [progress, setProgress] = useState(String(report?.progress ?? 0));
  const [done, setDone] = useState(report?.done ?? "");
  const [difficulties, setDifficulties] = useState(report?.difficulties ?? "");
  const [nextSteps, setNextSteps] = useState(report?.nextSteps ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const def = reportKindDef(kind);
  // Un compte rendu vide n'a pas d'intérêt : on demande au moins une section remplie.
  const invalid = !done.trim() && !difficulties.trim() && !nextSteps.trim();

  const save = async () => {
    if (invalid) return;
    setBusy(true);
    setErr(null);
    const e = await reportAction(report ? "update" : "create", {
      id: report?.id,
      refType,
      refId,
      kind,
      title: title.trim(),
      periodStart: kind === "periodique" ? periodStart || null : null,
      periodEnd: kind === "periodique" ? periodEnd || null : null,
      progress: Number(progress) || 0,
      done,
      difficulties,
      nextSteps,
    });
    setBusy(false);
    if (e) setErr(e);
    else onClose();
  };

  const remove = async () => {
    if (!report) return;
    if (typeof window !== "undefined" && !window.confirm("Supprimer ce compte rendu ?")) return;
    setBusy(true);
    const e = await reportAction("delete", { id: report.id });
    setBusy(false);
    if (e) setErr(e);
    else onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto animate-fade" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl my-8 max-h-[90vh] overflow-y-auto animate-pop" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3 p-4 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
          <FileText size={20} className="text-sky-600 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-semibold text-slate-800 dark:text-slate-100">
              {report ? "Modifier le compte rendu" : "Nouveau compte rendu"}
            </div>
            <div className="text-[11.5px] text-slate-400 truncate">{refLabel}</div>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        <div className="p-4 space-y-3">
          {err && <div className="text-[12px] text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{err}</div>}

          {/* Type : change les intitulés des trois sections */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {REPORT_KINDS.map((k) => (
              <button
                key={k.key}
                onClick={() => setKind(k.key)}
                title={k.hint}
                aria-pressed={kind === k.key}
                className={`text-[12px] px-3 py-1.5 rounded-lg border font-medium transition ${
                  kind === k.key
                    ? "bg-sky-100 text-sky-800 border-sky-300"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50"
                }`}
              >
                {k.label}
              </button>
            ))}
            <span className="text-[11px] text-slate-400 ml-1">{def.hint}</span>
          </div>

          <div>
            <label className={labelCls} htmlFor="rep-title">Titre (facultatif)</label>
            <input
              id="rep-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={kind === "cloture" ? "Bilan de fin" : "Point de la semaine"}
              className={inputCls}
            />
          </div>

          {kind === "periodique" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls} htmlFor="rep-from">Période du</label>
                <input id="rep-from" type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls} htmlFor="rep-to">au</label>
                <input id="rep-to" type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className={inputCls} />
              </div>
            </div>
          )}

          <div>
            <label className={labelCls} htmlFor="rep-progress">Avancement déclaré : {progress} %</label>
            <input
              id="rep-progress"
              type="range"
              min={0}
              max={100}
              step={5}
              value={progress}
              onChange={(e) => setProgress(e.target.value)}
              className="w-full accent-sky-600"
            />
          </div>

          <div>
            <label className={labelCls} htmlFor="rep-done">{def.sections.done}</label>
            <textarea id="rep-done" value={done} onChange={(e) => setDone(e.target.value)} rows={4} className={inputCls} />
          </div>
          <div>
            <label className={labelCls} htmlFor="rep-diff">{def.sections.difficulties}</label>
            <textarea id="rep-diff" value={difficulties} onChange={(e) => setDifficulties(e.target.value)} rows={3} className={inputCls} />
          </div>
          <div>
            <label className={labelCls} htmlFor="rep-next">{def.sections.nextSteps}</label>
            <textarea id="rep-next" value={nextSteps} onChange={(e) => setNextSteps(e.target.value)} rows={3} className={inputCls} />
          </div>

          {invalid && <div className="text-[11.5px] text-slate-400">Renseignez au moins une section pour enregistrer.</div>}

          <div className="flex items-center gap-2 pt-1">
            <button onClick={save} disabled={busy || invalid} className="inline-flex items-center gap-1 text-[13px] font-semibold text-white bg-emerald-600 rounded-lg px-4 py-2 hover:bg-emerald-700 disabled:opacity-40">
              {report ? "Enregistrer" : "Enregistrer le compte rendu"}
            </button>
            <button onClick={onClose} className="text-[13px] text-slate-500 px-3 py-2">Annuler</button>
            {report && (
              <button onClick={remove} disabled={busy} className="inline-flex items-center gap-1 text-[13px] font-medium text-rose-600 border border-rose-200 rounded-lg px-3 py-2 hover:bg-rose-50 ml-auto">
                <Trash2 size={14} /> Supprimer
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

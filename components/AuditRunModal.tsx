"use client";

import { useMemo, useState } from "react";
import { ClipboardCheck, Star, Target, Trash2, X } from "lucide-react";
import {
  AUDIT_ANSWER_TONE, AUDIT_STATUS, auditScoreTone, computeAuditScore, fmt, gridDomains,
  type Audit, type AuditResponse,
} from "@/lib/domain";
import { useApp } from "./app-context";
import { AuditRadar } from "./audit/AuditRadar";

const ANSWER_BUTTONS = ["Oui", "Partiel", "Non", "Non applicable"];
const inputCls = "w-full text-[12px] border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-900 outline-none focus:border-emerald-400";

type Resp = { answer: string; note: string; evidence: string };

export function AuditRunModal({ audit, onClose }: { audit: Audit; onClose: () => void }) {
  const { demo, assetById, profileById, updateAudit, deleteAudit } = useApp();
  const canEdit = !demo;

  const [resp, setResp] = useState<Record<string, Resp>>(() => {
    const m: Record<string, Resp> = {};
    audit.responses.forEach((r) => { m[r.questionId] = { answer: r.answer, note: r.note, evidence: r.evidence }; });
    return m;
  });
  const [status, setStatus] = useState(audit.status);
  const [summary, setSummary] = useState(audit.summary);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const domains = useMemo(() => gridDomains(audit.questions), [audit.questions]);
  const responsesArr = useMemo<AuditResponse[]>(
    () => Object.entries(resp).map(([questionId, r]) => ({ questionId, answer: r.answer, note: r.note, evidence: r.evidence })),
    [resp]
  );
  const score = useMemo(() => computeAuditScore(audit.questions, responsesArr), [audit.questions, responsesArr]);

  const setAnswer = (qid: string, answer: string) => setResp((m) => ({ ...m, [qid]: { answer, note: m[qid]?.note ?? "", evidence: m[qid]?.evidence ?? "" } }));
  const setField = (qid: string, f: Partial<Resp>) => setResp((m) => ({ ...m, [qid]: { answer: m[qid]?.answer ?? "À vérifier", note: m[qid]?.note ?? "", evidence: m[qid]?.evidence ?? "", ...f } }));

  const targetName = audit.targetAssetId ? assetById(audit.targetAssetId)?.name ?? audit.targetLabel : audit.targetLabel;

  const save = async () => {
    setBusy(true); setErr(null);
    const e = await updateAudit(audit.id, { responses: responsesArr, status, summary });
    setBusy(false);
    if (e) setErr(e); else onClose();
  };
  const del = async () => {
    if (typeof window !== "undefined" && !window.confirm(`Supprimer l'audit « ${audit.ref} » ?`)) return;
    setBusy(true);
    const e = await deleteAudit(audit.id);
    setBusy(false);
    if (e) setErr(e); else onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto animate-fade" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl my-8 max-h-[92vh] overflow-y-auto animate-pop" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3 p-4 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
          <ClipboardCheck size={20} className="text-emerald-600 mt-1 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-semibold text-slate-800 dark:text-slate-100 truncate">{audit.ref} · {audit.title}</div>
            <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1 flex-wrap">
              <Target size={11} /> {targetName || "—"} · {audit.gridName}{audit.date ? ` · ${fmt(audit.date)}` : ""} · {profileById(audit.auditorId).nom}
            </div>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        {/* Synthèse live : score + radar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 grid md:grid-cols-[220px_1fr] gap-4 items-center">
          <div className="grid grid-cols-3 md:grid-cols-1 gap-2">
            <div>
              <div className={`text-3xl font-bold ${auditScoreTone(score.global)}`}>{score.global}%</div>
              <div className="text-[11px] text-slate-400">Score global</div>
            </div>
            <div className="flex gap-3 md:gap-4 text-[11px] text-slate-500 md:mt-1">
              <div><span className="font-semibold text-slate-700 dark:text-slate-200">{score.answered}/{score.total}</span> évaluées</div>
              <div><span className={`font-semibold ${score.gaps ? "text-rose-600" : "text-slate-700 dark:text-slate-200"}`}>{score.gaps}</span> constat{score.gaps > 1 ? "s" : ""}{score.criticalGaps > 0 ? ` (${score.criticalGaps} crit.)` : ""}</div>
            </div>
          </div>
          <div><AuditRadar data={score.byDomain} height={200} /></div>
        </div>

        {/* Statut */}
        <div className="px-4 pt-3 flex items-center gap-2 flex-wrap">
          {err && <div className="w-full text-[12px] text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{err}</div>}
          <label className="text-[11px] text-slate-500">Statut</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} disabled={!canEdit} className="text-[12px] border border-slate-200 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-900">
            {AUDIT_STATUS.map((s) => <option key={s}>{s}</option>)}
          </select>
          <span className="text-[11px] text-slate-400">Couverture {score.coverage}%</span>
        </div>

        {/* Questions par domaine */}
        <div className="p-4 space-y-4">
          {domains.map((dom) => {
            const qs = audit.questions.filter((q) => (q.domain.trim() || "Général") === dom);
            const ds = score.byDomain.find((d) => d.domain === dom);
            return (
              <div key={dom}>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">{dom}</div>
                  {ds && <span className={`text-[11px] font-semibold ${auditScoreTone(ds.score)}`}>{ds.score}%</span>}
                  <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
                </div>
                <div className="space-y-2">
                  {qs.map((q) => {
                    const r = resp[q.id];
                    return (
                      <div key={q.id} className="rounded-xl border border-slate-200/70 dark:border-slate-800 p-2.5">
                        <div className="flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] text-slate-800 dark:text-slate-100 font-medium flex items-center gap-1.5">
                              {q.critical && <Star size={12} className="fill-amber-500 text-amber-500 shrink-0" aria-label="Point critique" />}
                              {q.text}
                            </div>
                            {q.guidance && <div className="text-[11px] text-slate-400 mt-0.5">{q.guidance}</div>}
                          </div>
                          <span className="text-[10px] text-slate-300 shrink-0">×{q.weight}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          {ANSWER_BUTTONS.map((ans) => {
                            const on = r?.answer === ans;
                            return (
                              <button key={ans} onClick={() => canEdit && setAnswer(q.id, ans)} className={`text-[11px] rounded-full px-2.5 py-1 border transition-colors ${on ? AUDIT_ANSWER_TONE[ans] : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
                                {ans === "Non applicable" ? "N/A" : ans}
                              </button>
                            );
                          })}
                        </div>
                        {r && (r.answer === "Non" || r.answer === "Partiel" || r.note || r.evidence) && (
                          <div className="grid sm:grid-cols-2 gap-1.5 mt-2">
                            <input value={r.note ?? ""} onChange={(e) => setField(q.id, { note: e.target.value })} disabled={!canEdit} placeholder="Observation / écart constaté" className={inputCls} />
                            <input value={r.evidence ?? ""} onChange={(e) => setField(q.id, { evidence: e.target.value })} disabled={!canEdit} placeholder="Preuve / référence" className={inputCls} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Synthèse / conclusion</label>
            <textarea value={summary} onChange={(e) => setSummary(e.target.value)} disabled={!canEdit} rows={2} className="w-full text-[13px] border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 bg-white dark:bg-slate-900 outline-none focus:border-emerald-400" />
          </div>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2 p-4 border-t border-slate-100 dark:border-slate-800 sticky bottom-0 bg-white dark:bg-slate-900">
            <button onClick={save} disabled={busy} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-slate-900 dark:bg-emerald-600 rounded-xl px-4 py-2 disabled:opacity-50"><ClipboardCheck size={15} /> Enregistrer</button>
            <button onClick={del} disabled={busy} className="ml-auto inline-flex items-center gap-1 text-[12px] text-rose-600 border border-rose-200 rounded-lg px-3 py-2 hover:bg-rose-50"><Trash2 size={14} /> Supprimer</button>
          </div>
        )}
      </div>
    </div>
  );
}

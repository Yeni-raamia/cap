"use client";

import { useMemo } from "react";
import { GripVertical, Plus, Star, Trash2 } from "lucide-react";
import { gridDomains, type AuditQuestion } from "@/lib/domain";

const inputCls = "w-full text-[13px] border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 bg-white dark:bg-slate-900 outline-none focus:border-emerald-400";
export const newQuestionId = () => `q-${Math.random().toString(36).slice(2, 10)}`;

/** Éditeur de questions d'audit réutilisable (grilles + questionnaire manuel). */
export function QuestionsEditor({ questions, setQuestions, disabled, listId = "audit-domains" }: {
  questions: AuditQuestion[];
  setQuestions: (updater: (qs: AuditQuestion[]) => AuditQuestion[]) => void;
  disabled?: boolean;
  listId?: string;
}) {
  const domains = useMemo(() => gridDomains(questions), [questions]);

  const add = () => setQuestions((qs) => [...qs, { id: newQuestionId(), domain: domains[domains.length - 1] ?? "Général", text: "", guidance: "", weight: 1, critical: false }]);
  const patch = (id: string, f: Partial<AuditQuestion>) => setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, ...f } : q)));
  const remove = (id: string) => setQuestions((qs) => qs.filter((q) => q.id !== id));
  const move = (id: string, dir: -1 | 1) => setQuestions((qs) => {
    const i = qs.findIndex((q) => q.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= qs.length) return qs;
    const copy = [...qs];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    return copy;
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-[12px] font-semibold text-slate-600 uppercase">Questions · {questions.length}</div>
        {!disabled && <button onClick={add} className="inline-flex items-center gap-1 text-[12px] font-medium text-emerald-700 hover:underline"><Plus size={13} /> Ajouter une question</button>}
      </div>
      <datalist id={listId}>{domains.map((d) => <option key={d} value={d} />)}</datalist>
      {questions.length === 0 ? (
        <div className="text-[12px] text-slate-400 text-center py-4 border border-dashed border-slate-200 rounded-lg">Aucune question. Ajoute-en une pour composer le questionnaire.</div>
      ) : (
        questions.map((q, idx) => (
          <div key={q.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-2.5">
            <div className="flex items-start gap-2">
              <div className="flex flex-col items-center pt-1 text-slate-300">
                <button onClick={() => move(q.id, -1)} disabled={disabled || idx === 0} aria-label="Monter" className="disabled:opacity-30 hover:text-slate-500 leading-none">▲</button>
                <GripVertical size={12} />
                <button onClick={() => move(q.id, 1)} disabled={disabled || idx === questions.length - 1} aria-label="Descendre" className="disabled:opacity-30 hover:text-slate-500 leading-none">▼</button>
              </div>
              <div className="flex-1 min-w-0 space-y-1.5">
                <input value={q.text} onChange={(e) => patch(q.id, { text: e.target.value })} disabled={disabled} placeholder="Point de contrôle (la question)" className={`${inputCls} font-medium`} />
                <input value={q.guidance} onChange={(e) => patch(q.id, { guidance: e.target.value })} disabled={disabled} placeholder="Comment vérifier / preuve attendue" className={`${inputCls} text-[12px]`} />
                <div className="flex items-center gap-2 flex-wrap">
                  <input list={listId} value={q.domain} onChange={(e) => patch(q.id, { domain: e.target.value })} disabled={disabled} placeholder="Domaine" className="text-[12px] border border-slate-200 rounded-lg px-2 py-1 bg-white dark:bg-slate-900 w-40" />
                  <label className="text-[11px] text-slate-500 flex items-center gap-1">Poids
                    <select value={q.weight} onChange={(e) => patch(q.id, { weight: Number(e.target.value) })} disabled={disabled} className="text-[12px] border border-slate-200 rounded-lg px-1.5 py-1 bg-white dark:bg-slate-900">
                      <option value={1}>1</option><option value={2}>2</option><option value={3}>3</option>
                    </select>
                  </label>
                  <button onClick={() => !disabled && patch(q.id, { critical: !q.critical })} className={`inline-flex items-center gap-1 text-[11px] rounded-full px-2 py-0.5 border ${q.critical ? "bg-amber-100 text-amber-700 border-amber-200" : "border-slate-200 text-slate-400"}`}>
                    <Star size={11} className={q.critical ? "fill-amber-500 text-amber-500" : ""} /> Critique
                  </button>
                  {!disabled && <button onClick={() => remove(q.id)} aria-label="Supprimer la question" className="ml-auto text-rose-500 hover:text-rose-700"><Trash2 size={14} /></button>}
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { ClipboardList, Download, GripVertical, Plus, Star, Trash2, X } from "lucide-react";
import { AUDIT_CATEGORIES, AUDIT_SOURCES, gridDomains, type AuditGrid, type AuditQuestion } from "@/lib/domain";
import { useApp } from "./app-context";

const inputCls = "w-full text-[13px] border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 bg-white dark:bg-slate-900 outline-none focus:border-emerald-400";
const labelCls = "block text-[11px] font-medium text-slate-500 mb-1";
const uid = () => `q-${Math.random().toString(36).slice(2, 10)}`;

type QDraft = AuditQuestion;

export function AuditGridModal({ grid, creating, onClose }: { grid: AuditGrid | null; creating: boolean; onClose: () => void }) {
  const { demo, createAuditGrid, updateAuditGrid, deleteAuditGrid } = useApp();
  const canEdit = !demo;

  const [name, setName] = useState(grid?.name ?? "");
  const [category, setCategory] = useState(grid?.category ?? AUDIT_CATEGORIES[0]);
  const [source, setSource] = useState(grid?.source ?? "Interne");
  const [description, setDescription] = useState(grid?.description ?? "");
  const [questions, setQuestions] = useState<QDraft[]>(grid?.questions.map((q) => ({ ...q })) ?? []);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const domains = useMemo(() => gridDomains(questions), [questions]);

  const addQuestion = () => setQuestions((qs) => [...qs, { id: uid(), domain: domains[domains.length - 1] ?? "Général", text: "", guidance: "", weight: 1, critical: false }]);
  const patch = (id: string, f: Partial<QDraft>) => setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, ...f } : q)));
  const remove = (id: string) => setQuestions((qs) => qs.filter((q) => q.id !== id));
  const move = (id: string, dir: -1 | 1) => setQuestions((qs) => {
    const i = qs.findIndex((q) => q.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= qs.length) return qs;
    const copy = [...qs];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    return copy;
  });

  const cleanQuestions = () => questions.map((q) => ({ ...q, text: q.text.trim(), domain: q.domain.trim() || "Général" })).filter((q) => q.text);

  const save = async () => {
    if (!name.trim()) { setErr("Nom de la grille requis."); return; }
    const qs = cleanQuestions();
    if (qs.length === 0) { setErr("Ajoute au moins une question."); return; }
    setBusy(true); setErr(null);
    const payload = { name: name.trim(), category, source, description, questions: qs };
    const e = creating ? await createAuditGrid(payload) : grid ? await updateAuditGrid(grid.id, payload) : "—";
    setBusy(false);
    if (e) setErr(e); else onClose();
  };
  const exportJson = () => {
    const data = { name: name.trim() || "grille", category, source, description, questions: cleanQuestions().map(({ domain, text, guidance, weight, critical }) => ({ domain, text, guidance, weight, critical })) };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(name.trim() || "grille").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const del = async () => {
    if (!grid || (typeof window !== "undefined" && !window.confirm(`Supprimer la grille « ${grid.ref} » ?`))) return;
    setBusy(true);
    const e = await deleteAuditGrid(grid.id);
    setBusy(false);
    if (e) setErr(e); else onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto animate-fade" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl my-8 max-h-[92vh] overflow-y-auto animate-pop" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3 p-4 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
          <ClipboardList size={20} className="text-emerald-600 mt-1 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-semibold text-slate-800 dark:text-slate-100">{creating ? "Nouvelle grille d'audit" : grid?.ref}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">{questions.length} question{questions.length > 1 ? "s" : ""} · {domains.length} domaine{domains.length > 1 ? "s" : ""}</div>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        <div className="p-4 space-y-3">
          {err && <div className="text-[12px] text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{err}</div>}
          <div>
            <label className={labelCls}>Nom de la grille</label>
            <input value={name} onChange={(e) => setName(e.target.value)} disabled={!canEdit} placeholder="Ex. Audit des sauvegardes" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className={labelCls}>Catégorie</label><select value={category} onChange={(e) => setCategory(e.target.value)} disabled={!canEdit} className={inputCls}>{AUDIT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
            <div><label className={labelCls}>Source</label><select value={source} onChange={(e) => setSource(e.target.value)} disabled={!canEdit} className={inputCls}>{AUDIT_SOURCES.map((s) => <option key={s}>{s}</option>)}</select></div>
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} disabled={!canEdit} rows={2} className={inputCls} />
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="text-[12px] font-semibold text-slate-600 uppercase">Questions</div>
            {canEdit && <button onClick={addQuestion} className="inline-flex items-center gap-1 text-[12px] font-medium text-emerald-700 hover:underline"><Plus size={13} /> Ajouter une question</button>}
          </div>
          <datalist id="audit-domains">{domains.map((d) => <option key={d} value={d} />)}</datalist>

          {questions.length === 0 ? (
            <div className="text-[12px] text-slate-400 text-center py-4 border border-dashed border-slate-200 rounded-lg">Aucune question. Ajoute-en une pour composer la grille.</div>
          ) : (
            <div className="space-y-2">
              {questions.map((q, idx) => (
                <div key={q.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-2.5">
                  <div className="flex items-start gap-2">
                    <div className="flex flex-col items-center pt-1 text-slate-300">
                      <button onClick={() => move(q.id, -1)} disabled={!canEdit || idx === 0} aria-label="Monter" className="disabled:opacity-30 hover:text-slate-500 leading-none">▲</button>
                      <GripVertical size={12} />
                      <button onClick={() => move(q.id, 1)} disabled={!canEdit || idx === questions.length - 1} aria-label="Descendre" className="disabled:opacity-30 hover:text-slate-500 leading-none">▼</button>
                    </div>
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <input value={q.text} onChange={(e) => patch(q.id, { text: e.target.value })} disabled={!canEdit} placeholder="Point de contrôle (la question)" className={`${inputCls} font-medium`} />
                      <input value={q.guidance} onChange={(e) => patch(q.id, { guidance: e.target.value })} disabled={!canEdit} placeholder="Comment vérifier / preuve attendue" className={`${inputCls} text-[12px]`} />
                      <div className="flex items-center gap-2 flex-wrap">
                        <input list="audit-domains" value={q.domain} onChange={(e) => patch(q.id, { domain: e.target.value })} disabled={!canEdit} placeholder="Domaine" className="text-[12px] border border-slate-200 rounded-lg px-2 py-1 bg-white dark:bg-slate-900 w-40" />
                        <label className="text-[11px] text-slate-500 flex items-center gap-1">Poids
                          <select value={q.weight} onChange={(e) => patch(q.id, { weight: Number(e.target.value) })} disabled={!canEdit} className="text-[12px] border border-slate-200 rounded-lg px-1.5 py-1 bg-white dark:bg-slate-900">
                            <option value={1}>1</option><option value={2}>2</option><option value={3}>3</option>
                          </select>
                        </label>
                        <button onClick={() => canEdit && patch(q.id, { critical: !q.critical })} className={`inline-flex items-center gap-1 text-[11px] rounded-full px-2 py-0.5 border ${q.critical ? "bg-amber-100 text-amber-700 border-amber-200" : "border-slate-200 text-slate-400"}`}>
                          <Star size={11} className={q.critical ? "fill-amber-500 text-amber-500" : ""} /> Critique
                        </button>
                        {canEdit && <button onClick={() => remove(q.id)} aria-label="Supprimer la question" className="ml-auto text-rose-500 hover:text-rose-700"><Trash2 size={14} /></button>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {canEdit && (
          <div className="flex items-center gap-2 p-4 border-t border-slate-100 dark:border-slate-800 sticky bottom-0 bg-white dark:bg-slate-900">
            <button onClick={save} disabled={busy || !name.trim()} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-slate-900 dark:bg-emerald-600 rounded-xl px-4 py-2 disabled:opacity-50"><ClipboardList size={15} /> {creating ? "Créer la grille" : "Enregistrer"}</button>
            <button onClick={exportJson} disabled={questions.length === 0} className="inline-flex items-center gap-1 text-[12px] text-slate-600 border border-slate-200 rounded-lg px-3 py-2 hover:bg-slate-50 disabled:opacity-40"><Download size={14} /> Exporter JSON</button>
            {!creating && grid && <button onClick={del} disabled={busy} className="ml-auto inline-flex items-center gap-1 text-[12px] text-rose-600 border border-rose-200 rounded-lg px-3 py-2 hover:bg-rose-50"><Trash2 size={14} /> Supprimer</button>}
          </div>
        )}
      </div>
    </div>
  );
}

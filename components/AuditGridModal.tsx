"use client";

import { useMemo, useState } from "react";
import { ClipboardList, Download, Trash2, X } from "lucide-react";
import { AUDIT_CATEGORIES, AUDIT_SOURCES, gridDomains, type AuditGrid, type AuditQuestion } from "@/lib/domain";
import { useApp } from "./app-context";
import { QuestionsEditor } from "./audit/QuestionsEditor";

const inputCls = "w-full text-[13px] border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 bg-white dark:bg-slate-900 outline-none focus:border-emerald-400";
const labelCls = "block text-[11px] font-medium text-slate-500 mb-1";

export function AuditGridModal({ grid, creating, onClose }: { grid: AuditGrid | null; creating: boolean; onClose: () => void }) {
  const { demo, createAuditGrid, updateAuditGrid, deleteAuditGrid } = useApp();
  const canEdit = !demo;

  const [name, setName] = useState(grid?.name ?? "");
  const [category, setCategory] = useState(grid?.category ?? AUDIT_CATEGORIES[0]);
  const [source, setSource] = useState(grid?.source ?? "Interne");
  const [description, setDescription] = useState(grid?.description ?? "");
  const [questions, setQuestions] = useState<AuditQuestion[]>(grid?.questions.map((q) => ({ ...q })) ?? []);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const domains = useMemo(() => gridDomains(questions), [questions]);
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

          <div className="pt-1"><QuestionsEditor questions={questions} setQuestions={setQuestions} disabled={!canEdit} /></div>
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

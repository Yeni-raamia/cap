"use client";

import { useState } from "react";
import { FileUp, Upload, X } from "lucide-react";
import { AUDIT_CATEGORIES, AUDIT_SOURCES, type AuditQuestion } from "@/lib/domain";
import { useApp } from "@/components/app-context";

const inputCls = "w-full text-[13px] border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 bg-white dark:bg-slate-900 outline-none focus:border-emerald-400";

const MODEL = {
  name: "Ma grille d'audit",
  category: AUDIT_CATEGORIES[0],
  source: "Interne",
  description: "Description de la grille.",
  questions: [
    { domain: "Domaine A", text: "Le point de contrôle est-il respecté ?", guidance: "Comment vérifier / preuve attendue", weight: 2, critical: true },
  ],
};

interface ParsedGrid {
  name: string; category?: string; source?: string; description?: string;
  questions: Omit<AuditQuestion, "id">[];
}

function parseGrids(raw: string): { grids: ParsedGrid[]; error: string | null } {
  let data: unknown;
  try { data = JSON.parse(raw); } catch { return { grids: [], error: "JSON invalide." }; }
  const arr = Array.isArray(data) ? data : [data];
  const grids: ParsedGrid[] = [];
  for (const item of arr) {
    const o = (item ?? {}) as Record<string, unknown>;
    const name = String(o.name ?? "").trim();
    if (!name) return { grids: [], error: "Chaque grille doit avoir un « name »." };
    const qsRaw = Array.isArray(o.questions) ? o.questions : [];
    const questions = qsRaw
      .map((q) => {
        const c = (q ?? {}) as Record<string, unknown>;
        const w = Number(c.weight);
        return {
          domain: String(c.domain ?? "").trim() || "Général",
          text: String(c.text ?? "").trim(),
          guidance: String(c.guidance ?? ""),
          weight: Number.isFinite(w) && w >= 1 && w <= 3 ? Math.round(w) : 1,
          critical: Boolean(c.critical),
        };
      })
      .filter((q) => q.text);
    if (questions.length === 0) return { grids: [], error: `La grille « ${name} » n'a aucune question valide.` };
    grids.push({
      name,
      category: AUDIT_CATEGORIES.includes(String(o.category)) ? String(o.category) : "Autre",
      source: AUDIT_SOURCES.includes(String(o.source)) ? String(o.source) : "Interne",
      description: String(o.description ?? ""),
      questions,
    });
  }
  return { grids, error: null };
}

export function ImportGridModal({ onClose }: { onClose: () => void }) {
  const { createAuditGrid } = useApp();
  const [raw, setRaw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onFile = (f: File) => {
    const reader = new FileReader();
    reader.onload = () => setRaw(String(reader.result ?? ""));
    reader.readAsText(f);
  };

  const doImport = async () => {
    const { grids, error } = parseGrids(raw);
    if (error) { setErr(error); return; }
    setBusy(true); setErr(null);
    let okCount = 0;
    for (const g of grids) {
      // Les ids de questions sont attribués côté serveur (id vide ici).
      const e = await createAuditGrid({ ...g, questions: g.questions.map((q) => ({ ...q, id: "" })) });
      if (!e) okCount += 1; // createAuditGrid renvoie error|null
    }
    setBusy(false);
    if (okCount > 0) onClose();
    else setErr("Import échoué.");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto animate-fade" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg my-8 animate-pop" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3 p-4 border-b border-slate-100 dark:border-slate-800">
          <FileUp size={20} className="text-emerald-600 mt-1 shrink-0" />
          <div className="flex-1">
            <div className="text-[15px] font-semibold text-slate-800 dark:text-slate-100">Importer une grille (JSON)</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Un objet grille, ou un tableau de grilles.</div>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        <div className="p-4 space-y-3">
          {err && <div className="text-[12px] text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{err}</div>}
          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-700 border border-slate-200 rounded-lg px-3 py-1.5 cursor-pointer hover:bg-slate-50">
              <Upload size={14} /> Choisir un fichier
              <input type="file" accept="application/json,.json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
            </label>
            <button onClick={() => setRaw(JSON.stringify(MODEL, null, 2))} className="text-[12px] text-emerald-700 hover:underline">Insérer un modèle</button>
          </div>
          <textarea value={raw} onChange={(e) => setRaw(e.target.value)} rows={12} placeholder="Colle ici le JSON de la grille…" className={`${inputCls} font-mono text-[11px]`} />
        </div>

        <div className="flex items-center gap-2 p-4 border-t border-slate-100 dark:border-slate-800">
          <button onClick={doImport} disabled={busy || !raw.trim()} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-slate-900 dark:bg-emerald-600 rounded-xl px-4 py-2 disabled:opacity-50"><FileUp size={15} /> Importer</button>
          <button onClick={onClose} className="text-[13px] text-slate-500 px-3 py-2">Annuler</button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import { Download, FileJson, Upload, X } from "lucide-react";
import { useApp } from "./app-context";

const TEMPLATE = {
  title: "Titre du parcours",
  description: "Description courte",
  category: "Gestion des risques",
  icon: "⚠️",
  badge: "Certification décernée à 100 %",
  lessons: [
    { type: "lesson", title: "Une leçon", content: "Le contenu de la leçon (les retours à la ligne sont conservés).", xp: 20 },
    { type: "quiz", title: "Un quiz", content: "Intro facultative.", xp: 25, questions: [
      { prompt: "Une question ?", options: ["Réponse A", "Réponse B", "Réponse C"], correct: 1, explanation: "Pourquoi B est la bonne réponse." },
    ] },
    { type: "case", title: "Une étude de cas", content: "La mise en situation.", xp: 35, steps: [
      { prompt: "Que faites-vous ?", options: [
        { label: "Choix pertinent", feedback: "Bonne décision, voici pourquoi.", score: 100 },
        { label: "Mauvais choix", feedback: "À éviter, voici pourquoi.", score: 20 },
      ] },
    ] },
    { type: "challenge", title: "Un défi pratique", content: "Consigne à réaliser dans l'application.", xp: 25, challengeHref: "/grc?tab=risques" },
  ],
};

/** Importer un parcours de l'Académie à partir d'un fichier / texte JSON. */
export function ImportCourseModal({ onClose }: { onClose: () => void }) {
  const { trainingEdit } = useApp();
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const download = () => {
    const blob = new Blob([JSON.stringify(TEMPLATE, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "parcours-modele.json"; a.click();
    URL.revokeObjectURL(url);
  };

  const readFile = (file: File) => {
    const r = new FileReader();
    r.onload = () => setText(String(r.result));
    r.readAsText(file);
  };

  const submit = async () => {
    setErr(null);
    let parsed: unknown;
    try { parsed = JSON.parse(text); } catch { return setErr("JSON invalide : vérifiez la syntaxe (virgules, guillemets…)."); }
    const c = parsed as { title?: unknown; lessons?: unknown };
    if (!c || typeof c !== "object" || typeof c.title !== "string" || !c.title.trim()) return setErr("Le JSON doit contenir un « title ».");
    if (c.lessons !== undefined && !Array.isArray(c.lessons)) return setErr("« lessons » doit être une liste.");
    setBusy(true);
    const e = await trainingEdit("course.import", { course: parsed as Record<string, unknown> });
    setBusy(false);
    if (!e) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto animate-fade" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg my-8 max-h-[92vh] overflow-y-auto animate-pop" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 p-4 border-b border-slate-100 dark:border-slate-800">
          <FileJson size={20} className="text-emerald-600 shrink-0" />
          <div className="flex-1 text-[15px] font-semibold text-slate-800 dark:text-slate-100">Importer un parcours (JSON)</div>
          <button onClick={onClose} aria-label="Fermer" className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <div className="p-4 space-y-3">
          {err && <div className="text-[12px] text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{err}</div>}
          <p className="text-[12px] text-slate-500">Collez le contenu JSON d&apos;un parcours (leçons, quiz, études de cas, défis) ou chargez un fichier. Le nouveau parcours est créé aussitôt.</p>
          <div className="flex items-center gap-2">
            <button onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1 text-[12px] font-medium text-emerald-700 border border-emerald-200 rounded-lg px-2.5 py-1.5 hover:bg-emerald-50"><Upload size={13} /> Charger un fichier .json</button>
            <button onClick={download} className="inline-flex items-center gap-1 text-[12px] text-slate-600 border border-slate-200 rounded-lg px-2.5 py-1.5 hover:bg-slate-50"><Download size={13} /> Télécharger le modèle</button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) readFile(f); if (fileRef.current) fileRef.current.value = ""; }} />
          </div>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={12} placeholder='{ "title": "…", "lessons": [ … ] }' className="w-full text-[12px] font-mono border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 bg-white dark:bg-slate-900 outline-none focus:border-emerald-400" />
        </div>
        <div className="flex items-center gap-2 p-4 border-t border-slate-100 dark:border-slate-800">
          <button onClick={submit} disabled={busy || !text.trim()} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-emerald-600 rounded-xl px-4 py-2 disabled:opacity-50"><FileJson size={15} /> Importer le parcours</button>
        </div>
      </div>
    </div>
  );
}

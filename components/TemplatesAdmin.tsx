"use client";

import { useState } from "react";
import { FileText, Pencil, Plus, Trash2, X } from "lucide-react";
import { TEMPLATE_CATEGORIES, TEMPLATE_VARS, type EmailTemplate, type TemplateCategory } from "@/lib/domain";
import { useApp } from "./app-context";
import { Card } from "./atoms";

const catLabel = (v: string) => TEMPLATE_CATEGORIES.find((c) => c.value === v)?.label ?? v;

const EMPTY = { name: "", category: "relance" as TemplateCategory, subject: "", body: "" };

/** Administration des modèles de relance (liste + création/édition/suppression). */
export function TemplatesAdmin() {
  const { templates, templateAction, toast } = useApp();
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [draft, setDraft] = useState(EMPTY);
  const [showEditor, setShowEditor] = useState(false);
  const [busy, setBusy] = useState(false);

  const closeEditor = () => {
    setShowEditor(false);
    setEditing(null);
    setDraft(EMPTY);
  };
  const startCreate = () => {
    setEditing(null);
    setDraft(EMPTY);
    setShowEditor(true);
  };
  const startEdit = (t: EmailTemplate) => {
    setEditing(t);
    setDraft({ name: t.name, category: t.category, subject: t.subject, body: t.body });
    setShowEditor(true);
  };

  const save = async () => {
    if (!draft.name.trim() || !draft.body.trim()) {
      toast("Nom et corps requis.", "error");
      return;
    }
    setBusy(true);
    const err = editing
      ? await templateAction("update", { id: editing.id, ...draft })
      : await templateAction("create", draft);
    setBusy(false);
    if (err) {
      toast(err, "error");
      return;
    }
    toast(editing ? "Modèle mis à jour." : "Modèle créé.", "success");
    closeEditor();
  };

  const remove = async (t: EmailTemplate) => {
    if (!confirm(`Supprimer le modèle « ${t.name} » ?`)) return;
    const err = await templateAction("delete", { id: t.id });
    if (err) toast(err, "error");
    else toast("Modèle supprimé.", "success");
  };

  const inputCls =
    "w-full text-[12px] border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-emerald-400/40";

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-slate-400" />
          <h2 className="text-[14px] font-bold text-slate-800 dark:text-slate-100">Modèles de relance</h2>
        </div>
        <button onClick={startCreate} className="inline-flex items-center gap-1 text-[12px] font-medium text-white bg-slate-800 dark:bg-emerald-600 rounded-lg px-2.5 py-1.5">
          <Plus size={13} /> Nouveau
        </button>
      </div>

      {/* Liste */}
      <div className="space-y-1.5 mb-4">
        {templates.length === 0 && <div className="text-[12px] text-slate-400">Aucun modèle.</div>}
        {templates.map((t) => (
          <div key={t.id} className="flex items-center gap-2 rounded-lg border border-slate-200/70 dark:border-slate-800 px-3 py-2">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 w-16 shrink-0">{catLabel(t.category)}</span>
            <span className="flex-1 text-[12.5px] font-medium text-slate-700 dark:text-slate-200 truncate">{t.name}</span>
            <button onClick={() => startEdit(t)} className="text-slate-400 hover:text-slate-700" aria-label="Modifier"><Pencil size={13} /></button>
            <button onClick={() => remove(t)} className="text-slate-300 hover:text-rose-600" aria-label="Supprimer"><Trash2 size={13} /></button>
          </div>
        ))}
      </div>

      {/* Éditeur */}
      {showEditor && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-2 bg-slate-50/60 dark:bg-slate-800/30">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">{editing ? "Modifier le modèle" : "Nouveau modèle"}</span>
            <button onClick={closeEditor} className="text-slate-400 hover:text-slate-600" aria-label="Fermer l'éditeur"><X size={14} /></button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Nom du modèle" className={inputCls} />
            <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as TemplateCategory })} className={inputCls} aria-label="Catégorie">
              {TEMPLATE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <input value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} placeholder="Objet (ex. [{ref}] Relance — {objet})" className={`${inputCls} font-mono`} />
          <textarea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} placeholder="Corps du message…" rows={6} className={`${inputCls} font-mono`} />
          <div className="text-[10.5px] text-slate-400 leading-relaxed">
            Variables : {TEMPLATE_VARS.map((v) => <code key={v.key} title={v.desc} className="mx-0.5 px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">{v.key}</code>)}
          </div>
          <button onClick={save} disabled={busy} className="text-[12px] font-semibold text-white bg-emerald-600 rounded-lg px-3 py-1.5 disabled:opacity-50">
            {editing ? "Enregistrer" : "Créer le modèle"}
          </button>
        </div>
      )}
    </Card>
  );
}

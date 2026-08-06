"use client";

import { useState } from "react";
import { ClipboardCheck, Plus, Trash2, Wrench, X } from "lucide-react";
import {
  CHECK_RESULT_TONE,
  CHECK_RESULTS,
  FIELD_CONTROL_STATUS,
  FIELD_CONTROL_TYPES,
  type CheckItem,
  type FieldControl,
} from "@/lib/domain";
import { useApp } from "./app-context";

const toDateInput = (d: Date | null | undefined) => (d ? new Date(d).toISOString().slice(0, 10) : "");
let seq = 0;
const tempId = () => `new_${++seq}`;

type LocalItem = CheckItem;

/** Fiche d'un contrôle terrain : métadonnées + check-list ; les écarts génèrent des actions. */
export function FieldControlModal({ control, creating, onClose }: { control: FieldControl | null; creating: boolean; onClose: () => void }) {
  const { demo, me, profiles, refLists, createFieldControl, updateFieldControl, deleteFieldControl, createCapa } = useApp();
  const canEdit = !demo;

  const [title, setTitle] = useState(control?.title ?? "");
  const [type, setType] = useState(control?.type ?? FIELD_CONTROL_TYPES[0]);
  const [service, setService] = useState(control?.service ?? "");
  const [location, setLocation] = useState(control?.location ?? "");
  const [date, setDate] = useState(toDateInput(control?.date) || new Date().toISOString().slice(0, 10));
  const [inspectorId, setInspectorId] = useState(control?.inspectorId ?? me.id);
  const [status, setStatus] = useState(control?.status ?? "Planifié");
  const [summary, setSummary] = useState(control?.summary ?? "");
  const [items, setItems] = useState<LocalItem[]>(control?.items ?? []);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const gaps = items.filter((it) => it.result === "Écart").length;

  const addItem = () => setItems((prev) => [...prev, { id: tempId(), label: "", result: "À vérifier", note: "", frameworkId: "", controlCode: "" }]);
  const patchItem = (id: string, patch: Partial<LocalItem>) => setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const removeItem = (id: string) => setItems((prev) => prev.filter((it) => it.id !== id));

  const save = async () => {
    if (!title.trim()) return;
    setBusy(true);
    setErr(null);
    const payload = { title: title.trim(), type, service, location, date: date || null, inspectorId, status, summary, items: items.filter((it) => it.label.trim()).map((it) => ({ label: it.label, result: it.result, note: it.note })) };
    const e = creating ? await createFieldControl(payload) : control ? await updateFieldControl(control.id, payload) : "—";
    setBusy(false);
    if (e) setErr(e);
    else onClose();
  };
  const remove = async () => {
    if (!control || (typeof window !== "undefined" && !window.confirm(`Supprimer le contrôle « ${control.ref} » ?`))) return;
    setBusy(true);
    const e = await deleteFieldControl(control.id);
    setBusy(false);
    if (e) setErr(e); else onClose();
  };
  const toAction = async (it: LocalItem) => {
    await createCapa({
      title: `Corriger : ${it.label}`,
      description: it.note,
      type: "Corrective",
      priority: "Haute",
      sourceType: "controle",
      sourceId: it.id.startsWith("new_") ? null : it.id,
    });
  };

  const inputCls = "w-full text-[13px] border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 bg-white dark:bg-slate-900 focus:border-emerald-400 outline-none";
  const labelCls = "block text-[11px] font-medium text-slate-500 mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto animate-fade" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl my-8 max-h-[92vh] overflow-y-auto animate-pop" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3 p-4 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
          <ClipboardCheck size={20} className="text-indigo-600 mt-1 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-semibold text-slate-800 dark:text-slate-100">{creating ? "Nouveau contrôle terrain" : control?.ref}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">{items.length} point(s) · {gaps > 0 ? <span className="text-rose-600 font-medium">{gaps} écart(s)</span> : "aucun écart"}</div>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        <div className="p-4 space-y-3">
          {err && <div className="text-[12px] text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{err}</div>}

          <div>
            <label className={labelCls}>Intitulé du contrôle</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} disabled={!canEdit} placeholder="Ex. Ronde bureaux — étage 3…" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Type</label>
              <select value={type} onChange={(e) => setType(e.target.value)} disabled={!canEdit} className={inputCls}>
                {FIELD_CONTROL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Direction / service</label>
              <input value={service} onChange={(e) => setService(e.target.value)} disabled={!canEdit} list="fc-services" placeholder="DSI, RH…" className={inputCls} />
              <datalist id="fc-services">{(refLists.services ?? []).map((s) => <option key={s} value={s} />)}</datalist>
            </div>
            <div>
              <label className={labelCls}>Lieu</label>
              <input value={location} onChange={(e) => setLocation(e.target.value)} disabled={!canEdit} placeholder="Bâtiment, étage, salle…" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Contrôleur</label>
              <select value={inspectorId} onChange={(e) => setInspectorId(e.target.value)} disabled={!canEdit} className={inputCls}>
                {profiles.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={!canEdit} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Statut</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} disabled={!canEdit} className={inputCls}>
                {FIELD_CONTROL_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Check-list */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
            <div className="text-[11px] font-medium text-slate-500 uppercase mb-2">Check-list</div>
            <div className="space-y-2">
              {items.length === 0 && <div className="text-[12px] text-slate-400">Aucun point de contrôle. Ajoutez-en un ci-dessous.</div>}
              {items.map((it) => (
                <div key={it.id} className="rounded-lg border border-slate-100 dark:border-slate-800 p-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <input value={it.label} onChange={(e) => patchItem(it.id, { label: e.target.value })} disabled={!canEdit} placeholder="Point de contrôle…" className="flex-1 min-w-[10rem] text-[13px] border border-slate-200 rounded-lg px-2 py-1.5" />
                    <select value={it.result} onChange={(e) => patchItem(it.id, { result: e.target.value })} disabled={!canEdit} aria-label="Résultat" className={`text-[11px] border rounded-lg px-2 py-1.5 ${CHECK_RESULT_TONE[it.result] ?? ""}`}>
                      {CHECK_RESULTS.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                    {canEdit && <button onClick={() => removeItem(it.id)} aria-label="Retirer" className="text-slate-300 hover:text-rose-600"><X size={14} /></button>}
                  </div>
                  {(it.note || canEdit) && (
                    <input value={it.note} onChange={(e) => patchItem(it.id, { note: e.target.value })} disabled={!canEdit} placeholder="Constat / note…" className="mt-1.5 w-full text-[11px] border border-slate-100 rounded px-2 py-1 text-slate-600" />
                  )}
                  {it.result === "Écart" && canEdit && !creating && (
                    <button onClick={() => toAction(it)} className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-rose-700 border border-rose-200 rounded-lg px-2 py-1 hover:bg-rose-50"><Wrench size={12} /> Créer une action corrective</button>
                  )}
                </div>
              ))}
            </div>
            {canEdit && <button onClick={addItem} className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-indigo-700 hover:underline"><Plus size={14} /> Ajouter un point</button>}
          </div>

          <div>
            <label className={labelCls}>Conclusion / synthèse</label>
            <textarea value={summary} onChange={(e) => setSummary(e.target.value)} disabled={!canEdit} rows={2} placeholder="Bilan du contrôle…" className={inputCls} />
          </div>
          {creating && <div className="text-[11px] text-slate-400">Astuce : enregistrez le contrôle, puis rouvrez-le pour générer une action corrective à partir d&apos;un écart.</div>}
        </div>

        {canEdit && (
          <div className="flex items-center gap-2 p-4 border-t border-slate-100 dark:border-slate-800">
            <button onClick={save} disabled={busy || !title.trim()} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-slate-900 dark:bg-emerald-600 rounded-xl px-4 py-2 hover:-translate-y-0.5 transition-transform shadow-soft disabled:opacity-50">
              <ClipboardCheck size={15} /> {creating ? "Créer le contrôle" : "Enregistrer"}
            </button>
            {!creating && control && (
              <button onClick={remove} disabled={busy} className="ml-auto inline-flex items-center gap-1 text-[12px] text-rose-600 border border-rose-200 rounded-lg px-3 py-2 hover:bg-rose-50 dark:hover:bg-rose-500/10"><Trash2 size={14} /> Supprimer</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

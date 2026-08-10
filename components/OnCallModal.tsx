"use client";

import { useState } from "react";
import { CalendarClock, Trash2, X } from "lucide-react";
import { SHIFT_ROLES, type OnCallShift } from "@/lib/domain";
import { useApp } from "./app-context";

const inputCls = "w-full text-[13px] border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 bg-white dark:bg-slate-900 outline-none focus:border-emerald-400";
const labelCls = "block text-[11px] font-medium text-slate-500 mb-1";
// Vers la valeur d'un <input type="datetime-local"> (heure locale, sans secondes).
const toLocal = (d: Date | null | undefined) => {
  if (!d) return "";
  const dt = new Date(d);
  const off = dt.getTimezoneOffset();
  return new Date(dt.getTime() - off * 60000).toISOString().slice(0, 16);
};

export function OnCallModal({ shift, creating, onClose }: { shift: OnCallShift | null; creating: boolean; onClose: () => void }) {
  const { demo, me, profiles, createOnCall, updateOnCall, deleteOnCall } = useApp();
  const canEdit = !demo;

  const [personId, setPersonId] = useState(shift?.personId || me.id);
  const [role, setRole] = useState(shift?.role ?? SHIFT_ROLES[0]);
  const [start, setStart] = useState(toLocal(shift?.start) || toLocal(new Date()));
  const [end, setEnd] = useState(toLocal(shift?.end) || toLocal(new Date(Date.now() + 24 * 3600e3)));
  const [contact, setContact] = useState(shift?.contact ?? "");
  const [notes, setNotes] = useState(shift?.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    if (!start || !end) { setErr("Début et fin requis."); return; }
    if (new Date(end).getTime() < new Date(start).getTime()) { setErr("La fin doit suivre le début."); return; }
    setBusy(true); setErr(null);
    const payload = { personId, role, start, end, contact, notes };
    const e = creating ? await createOnCall(payload) : shift ? await updateOnCall(shift.id, payload) : "—";
    setBusy(false);
    if (e) setErr(e); else onClose();
  };
  const del = async () => {
    if (!shift || (typeof window !== "undefined" && !window.confirm("Supprimer cette garde ?"))) return;
    setBusy(true);
    const e = await deleteOnCall(shift.id);
    setBusy(false);
    if (e) setErr(e); else onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto animate-fade" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md my-8 animate-pop" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3 p-4 border-b border-slate-100 dark:border-slate-800">
          <CalendarClock size={20} className="text-emerald-600 mt-1 shrink-0" />
          <div className="flex-1">
            <div className="text-[15px] font-semibold text-slate-800 dark:text-slate-100">{creating ? "Nouvelle garde" : "Garde"}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Planning d&apos;astreinte</div>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        <div className="p-4 space-y-3">
          {err && <div className="text-[12px] text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{err}</div>}
          <div className="grid grid-cols-2 gap-2">
            <div><label className={labelCls}>Personne de garde</label><select value={personId} onChange={(e) => setPersonId(e.target.value)} disabled={!canEdit} className={inputCls}>{profiles.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}</select></div>
            <div><label className={labelCls}>Rôle</label><select value={role} onChange={(e) => setRole(e.target.value)} disabled={!canEdit} className={inputCls}>{SHIFT_ROLES.map((r) => <option key={r}>{r}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className={labelCls}>Début</label><input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} disabled={!canEdit} className={inputCls} /></div>
            <div><label className={labelCls}>Fin</label><input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} disabled={!canEdit} className={inputCls} /></div>
          </div>
          <div>
            <label className={labelCls}>Contact (téléphone…)</label>
            <input value={contact} onChange={(e) => setContact(e.target.value)} disabled={!canEdit} placeholder="06 12 34 56 78" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} disabled={!canEdit} rows={2} className={inputCls} />
          </div>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2 p-4 border-t border-slate-100 dark:border-slate-800">
            <button onClick={save} disabled={busy} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-slate-900 dark:bg-emerald-600 rounded-xl px-4 py-2 disabled:opacity-50"><CalendarClock size={15} /> {creating ? "Ajouter" : "Enregistrer"}</button>
            {!creating && shift && <button onClick={del} disabled={busy} className="ml-auto inline-flex items-center gap-1 text-[12px] text-rose-600 border border-rose-200 rounded-lg px-3 py-2 hover:bg-rose-50"><Trash2 size={14} /> Supprimer</button>}
          </div>
        )}
      </div>
    </div>
  );
}

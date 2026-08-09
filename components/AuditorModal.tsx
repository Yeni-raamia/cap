"use client";

import { useState } from "react";
import { Trash2, UserCheck, X } from "lucide-react";
import { AUDIT_CATEGORIES, AUDITOR_ROLES, AUDITOR_STATUS, type Auditor } from "@/lib/domain";
import { useApp } from "./app-context";

const inputCls = "w-full text-[13px] border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 bg-white dark:bg-slate-900 outline-none focus:border-emerald-400";
const labelCls = "block text-[11px] font-medium text-slate-500 mb-1";

export function AuditorModal({ auditor, creating, onClose }: { auditor: Auditor | null; creating: boolean; onClose: () => void }) {
  const { demo, profiles, createAuditor, updateAuditor, deleteAuditor } = useApp();
  const canEdit = !demo;

  const [profileId, setProfileId] = useState(auditor?.profileId ?? "");
  const [name, setName] = useState(auditor?.name ?? "");
  const [role, setRole] = useState(auditor?.role ?? "Auditeur");
  const [competencies, setCompetencies] = useState<string[]>(auditor?.competencies ?? []);
  const [certifications, setCertifications] = useState(auditor?.certifications ?? "");
  const [independence, setIndependence] = useState(auditor?.independence ?? "");
  const [status, setStatus] = useState(auditor?.status ?? "Actif");
  const [notes, setNotes] = useState(auditor?.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const toggleComp = (c: string) => setCompetencies((a) => (a.includes(c) ? a.filter((x) => x !== c) : [...a, c]));
  // Si un profil interne est choisi, son nom sert de nom affiché par défaut.
  const onProfile = (id: string) => {
    setProfileId(id);
    if (id && !name.trim()) { const p = profiles.find((x) => x.id === id); if (p) setName(p.nom); }
  };

  const save = async () => {
    const finalName = name.trim() || (profileId ? profiles.find((p) => p.id === profileId)?.nom ?? "" : "");
    if (!finalName) { setErr("Nom de l'auditeur requis."); return; }
    setBusy(true); setErr(null);
    const payload = { profileId, name: finalName, role, competencies, certifications, independence, status, notes };
    const e = creating ? await createAuditor(payload) : auditor ? await updateAuditor(auditor.id, payload) : "—";
    setBusy(false);
    if (e) setErr(e); else onClose();
  };
  const del = async () => {
    if (!auditor || (typeof window !== "undefined" && !window.confirm(`Retirer « ${auditor.name} » du registre ?`))) return;
    setBusy(true);
    const e = await deleteAuditor(auditor.id);
    setBusy(false);
    if (e) setErr(e); else onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto animate-fade" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg my-8 max-h-[92vh] overflow-y-auto animate-pop" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3 p-4 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
          <UserCheck size={20} className="text-emerald-600 mt-1 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-semibold text-slate-800 dark:text-slate-100">{creating ? "Nouvel auditeur" : auditor?.ref}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Compétences & indépendance (ISO 19011 §7)</div>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        <div className="p-4 space-y-3">
          {err && <div className="text-[12px] text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{err}</div>}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>Profil interne (facultatif)</label>
              <select value={profileId} onChange={(e) => onProfile(e.target.value)} disabled={!canEdit} className={inputCls}>
                <option value="">— Externe / non rattaché —</option>
                {profiles.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
              </select>
            </div>
            <div><label className={labelCls}>Nom affiché</label><input value={name} onChange={(e) => setName(e.target.value)} disabled={!canEdit} placeholder="Nom de l'auditeur" className={inputCls} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className={labelCls}>Rôle</label><select value={role} onChange={(e) => setRole(e.target.value)} disabled={!canEdit} className={inputCls}>{AUDITOR_ROLES.map((r) => <option key={r}>{r}</option>)}</select></div>
            <div><label className={labelCls}>Statut</label><select value={status} onChange={(e) => setStatus(e.target.value)} disabled={!canEdit} className={inputCls}>{AUDITOR_STATUS.map((s) => <option key={s}>{s}</option>)}</select></div>
          </div>
          <div>
            <label className={labelCls}>Domaines de compétence</label>
            <div className="flex flex-wrap gap-1.5">
              {AUDIT_CATEGORIES.filter((c) => c !== "Autre").map((c) => (
                <button key={c} onClick={() => canEdit && toggleComp(c)} className={`text-[11px] rounded-full px-2 py-0.5 border ${competencies.includes(c) ? "bg-emerald-100 border-emerald-300 text-emerald-800" : "border-slate-200 text-slate-500"}`}>{c}</button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelCls}>Certifications / qualifications</label>
            <input value={certifications} onChange={(e) => setCertifications(e.target.value)} disabled={!canEdit} placeholder="Ex. ISO 27001 Lead Auditor, CISA, PASSI…" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Indépendance / impartialité</label>
            <textarea value={independence} onChange={(e) => setIndependence(e.target.value)} disabled={!canEdit} rows={2} placeholder="Déclaration de conflits d'intérêt éventuels…" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} disabled={!canEdit} rows={2} className={inputCls} />
          </div>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2 p-4 border-t border-slate-100 dark:border-slate-800">
            <button onClick={save} disabled={busy} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-slate-900 dark:bg-emerald-600 rounded-xl px-4 py-2 disabled:opacity-50"><UserCheck size={15} /> {creating ? "Ajouter" : "Enregistrer"}</button>
            {!creating && auditor && <button onClick={del} disabled={busy} className="ml-auto inline-flex items-center gap-1 text-[12px] text-rose-600 border border-rose-200 rounded-lg px-3 py-2 hover:bg-rose-50"><Trash2 size={14} /> Retirer</button>}
          </div>
        )}
      </div>
    </div>
  );
}

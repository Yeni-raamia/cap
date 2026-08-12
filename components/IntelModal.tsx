"use client";

import { useState } from "react";
import { Radio, Trash2, X } from "lucide-react";
import { INCIDENT_SEVERITIES, INTEL_KINDS, INTEL_STATUS, IOC_TYPES, TLP_LEVELS, type IntelItem } from "@/lib/domain";
import { toDayInput } from "@/lib/period";
import { useApp } from "./app-context";

const inputCls = "w-full text-[13px] border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 bg-white dark:bg-slate-900 outline-none focus:border-emerald-400";
const labelCls = "block text-[11px] font-medium text-slate-500 mb-1";
/* Formatage en heure locale (cf. toDayInput) : `toISOString()` décalait la
 * date d'un jour en fin de journée. */
const toDate = (d: Date | null | undefined) => toDayInput(d ?? null);

export function IntelModal({ item, creating, onClose }: { item: IntelItem | null; creating: boolean; onClose: () => void }) {
  const { demo, me, profiles, createIntel, updateIntel, deleteIntel } = useApp();
  const canEdit = !demo;

  const [kind, setKind] = useState(item?.kind ?? "IOC");
  const [title, setTitle] = useState(item?.title ?? "");
  const [iocType, setIocType] = useState(item?.iocType ?? IOC_TYPES[0]);
  const [value, setValue] = useState(item?.value ?? "");
  const [tlp, setTlp] = useState(item?.tlp ?? "TLP:AMBER");
  const [severity, setSeverity] = useState(item?.severity ?? "Modéré");
  const [source, setSource] = useState(item?.source ?? "");
  const [status, setStatus] = useState(item?.status ?? "Actif");
  const [description, setDescription] = useState(item?.description ?? "");
  const [action, setAction] = useState(item?.action ?? "");
  const [attack, setAttack] = useState((item?.attackTechniques ?? []).join(", "));
  const [expiresAt, setExpiresAt] = useState(toDate(item?.expiresAt));
  const [ownerId, setOwnerId] = useState(item?.ownerId || me.id);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isIoc = kind === "IOC";
  const save = async () => {
    if (!title.trim()) { setErr("Intitulé requis."); return; }
    setBusy(true); setErr(null);
    const payload = {
      kind, title: title.trim(), iocType, value: value.trim(), tlp, severity, source, status, description, action,
      attackTechniques: attack.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean),
      expiresAt: expiresAt || null, ownerId,
    };
    const e = creating ? await createIntel(payload) : item ? await updateIntel(item.id, payload) : "—";
    setBusy(false);
    if (e) setErr(e); else onClose();
  };
  const del = async () => {
    if (!item || (typeof window !== "undefined" && !window.confirm(`Supprimer « ${item.ref} » ?`))) return;
    setBusy(true);
    const e = await deleteIntel(item.id);
    setBusy(false);
    if (e) setErr(e); else onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto animate-fade" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg my-8 max-h-[92vh] overflow-y-auto animate-pop" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3 p-4 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
          <Radio size={20} className="text-emerald-600 mt-1 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-semibold text-slate-800 dark:text-slate-100">{creating ? "Nouvel élément de veille" : item?.ref}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">IOC, bulletin ou vulnérabilité</div>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        <div className="p-4 space-y-3">
          {err && <div className="text-[12px] text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{err}</div>}
          <div className="grid grid-cols-2 gap-2">
            <div><label className={labelCls}>Nature</label><select value={kind} onChange={(e) => setKind(e.target.value)} disabled={!canEdit} className={inputCls}>{INTEL_KINDS.map((k) => <option key={k}>{k}</option>)}</select></div>
            <div><label className={labelCls}>Statut</label><select value={status} onChange={(e) => setStatus(e.target.value)} disabled={!canEdit} className={inputCls}>{INTEL_STATUS.map((s) => <option key={s}>{s}</option>)}</select></div>
          </div>
          <div>
            <label className={labelCls}>Intitulé</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} disabled={!canEdit} placeholder="Ex. Domaine d'hameçonnage usurpant la messagerie" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {isIoc && <div><label className={labelCls}>Type d&apos;IOC</label><select value={iocType} onChange={(e) => setIocType(e.target.value)} disabled={!canEdit} className={inputCls}>{IOC_TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>}
            <div className={isIoc ? "" : "col-span-2"}><label className={labelCls}>{isIoc ? "Valeur (IOC)" : "Référence (ex. CVE)"}</label><input value={value} onChange={(e) => setValue(e.target.value)} disabled={!canEdit} placeholder={isIoc ? "203.0.113.10, mauvais[.]site, hash…" : "CVE-2026-XXXX"} className={`${inputCls} font-mono text-[12px]`} /></div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div><label className={labelCls}>TLP</label><select value={tlp} onChange={(e) => setTlp(e.target.value)} disabled={!canEdit} className={inputCls}>{TLP_LEVELS.map((t) => <option key={t}>{t}</option>)}</select></div>
            <div><label className={labelCls}>Gravité</label><select value={severity} onChange={(e) => setSeverity(e.target.value)} disabled={!canEdit} className={inputCls}>{INCIDENT_SEVERITIES.map((s) => <option key={s}>{s}</option>)}</select></div>
            <div><label className={labelCls}>Expire le</label><input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} disabled={!canEdit} className={inputCls} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className={labelCls}>Source</label><input value={source} onChange={(e) => setSource(e.target.value)} disabled={!canEdit} placeholder="CERT-FR, éditeur, OSINT…" className={inputCls} /></div>
            <div><label className={labelCls}>Référent</label><select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} disabled={!canEdit} className={inputCls}>{profiles.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}</select></div>
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} disabled={!canEdit} rows={2} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Conduite à tenir</label>
            <textarea value={action} onChange={(e) => setAction(e.target.value)} disabled={!canEdit} rows={2} placeholder="Bloquer sur le proxy, rechercher dans Wazuh, appliquer le correctif…" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Techniques MITRE ATT&amp;CK (facultatif)</label>
            <input value={attack} onChange={(e) => setAttack(e.target.value)} disabled={!canEdit} placeholder="T1566, T1105" className={`${inputCls} font-mono text-[12px]`} />
          </div>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2 p-4 border-t border-slate-100 dark:border-slate-800 sticky bottom-0 bg-white dark:bg-slate-900">
            <button onClick={save} disabled={busy || !title.trim()} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-slate-900 dark:bg-emerald-600 rounded-xl px-4 py-2 disabled:opacity-50"><Radio size={15} /> {creating ? "Ajouter" : "Enregistrer"}</button>
            {!creating && item && <button onClick={del} disabled={busy} className="ml-auto inline-flex items-center gap-1 text-[12px] text-rose-600 border border-rose-200 rounded-lg px-3 py-2 hover:bg-rose-50"><Trash2 size={14} /> Supprimer</button>}
          </div>
        )}
      </div>
    </div>
  );
}

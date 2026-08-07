"use client";

import { useState } from "react";
import { AlertOctagon, Boxes, ShieldAlert, Trash2, Wrench, X } from "lucide-react";
import {
  fmtLong,
  incidentResolutionHours,
  INCIDENT_SEVERITIES,
  INCIDENT_SEVERITY_TONE,
  INCIDENT_STATUS,
  INCIDENT_STATUS_TONE,
  INCIDENT_TYPES,
  type Incident,
} from "@/lib/domain";
import { useApp } from "./app-context";

const toDT = (d: Date | null | undefined) => (d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");
const inputCls = "w-full text-[13px] border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 bg-white dark:bg-slate-900 outline-none focus:border-emerald-400";
const labelCls = "block text-[11px] font-medium text-slate-500 mb-1";

/** Fiche d'un incident : cycle de vie ISO 27035 (déclaration → REX). */
export function IncidentModal({ incident, creating, onClose }: { incident: Incident | null; creating: boolean; onClose: () => void }) {
  const { demo, me, profiles, assets, missions, createIncident, updateIncident, deleteIncident, createCapa } = useApp();
  const canEdit = !demo;

  const [title, setTitle] = useState(incident?.title ?? "");
  const [type, setType] = useState(incident?.type ?? INCIDENT_TYPES[0]);
  const [severity, setSeverity] = useState(incident?.severity ?? "Mineur");
  const [status, setStatus] = useState(incident?.status ?? "Déclaré");
  const [dataBreach, setDataBreach] = useState(incident?.dataBreach ?? false);
  const [detectedAt, setDetectedAt] = useState(toDT(incident?.detectedAt) || toDT(new Date()));
  const [declaredBy, setDeclaredBy] = useState(incident?.declaredBy ?? me.id);
  const [ownerId, setOwnerId] = useState(incident?.ownerId ?? me.id);
  const [missionId, setMissionId] = useState(incident?.missionId ?? "");
  const [assetIds, setAssetIds] = useState<string[]>(incident?.assetIds ?? []);
  const [description, setDescription] = useState(incident?.description ?? "");
  const [impact, setImpact] = useState(incident?.impact ?? "");
  const [actionsTaken, setActionsTaken] = useState(incident?.actionsTaken ?? "");
  const [rootCause, setRootCause] = useState(incident?.rootCause ?? "");
  const [lessons, setLessons] = useState(incident?.lessons ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const toggleAsset = (id: string) => setAssetIds((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));
  const resHours = incident ? incidentResolutionHours(incident) : null;

  const save = async () => {
    if (!title.trim()) return;
    setBusy(true); setErr(null);
    const payload = { title: title.trim(), type, severity, status, dataBreach, detectedAt: detectedAt || null, declaredBy, ownerId, missionId, assetIds, description, impact, actionsTaken, rootCause, lessons };
    const e = creating ? await createIncident(payload) : incident ? await updateIncident(incident.id, payload) : "—";
    setBusy(false);
    if (e) setErr(e); else onClose();
  };
  const remove = async () => {
    if (!incident || (typeof window !== "undefined" && !window.confirm(`Supprimer l'incident « ${incident.ref} » ?`))) return;
    setBusy(true);
    const e = await deleteIncident(incident.id);
    setBusy(false);
    if (e) setErr(e); else onClose();
  };
  const toCapa = async () => {
    if (!incident) return;
    await createCapa({ title: `Suite à incident : ${incident.title}`, description: incident.rootCause || incident.description, type: "Corrective", priority: severity === "Critique" ? "Critique" : "Haute", sourceType: "incident", sourceId: incident.id });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto animate-fade" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl my-8 max-h-[92vh] overflow-y-auto animate-pop" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3 p-4 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
          <AlertOctagon size={20} className="text-rose-600 mt-1 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-semibold text-slate-800 dark:text-slate-100">{creating ? "Déclarer un incident" : incident?.ref}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Cycle de vie ISO 27035{resHours != null ? ` · résolu en ${resHours} h` : ""}</div>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        {/* Stepper du cycle de vie */}
        <div className="flex items-center gap-1 px-4 pt-3 flex-wrap">
          {INCIDENT_STATUS.map((s, i) => (
            <button key={s} onClick={() => canEdit && setStatus(s)} className={`text-[10px] px-2 py-0.5 rounded-full ${status === s ? INCIDENT_STATUS_TONE[s] : "bg-slate-50 text-slate-400 border border-slate-200"}`}>{i + 1}. {s}</button>
          ))}
        </div>

        <div className="p-4 space-y-3">
          {err && <div className="text-[12px] text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{err}</div>}
          <div>
            <label className={labelCls}>Intitulé de l&apos;incident</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} disabled={!canEdit} placeholder="Ex. Tentative de rançongiciel…" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div>
              <label className={labelCls}>Type</label>
              <select value={type} onChange={(e) => setType(e.target.value)} disabled={!canEdit} className={inputCls}>{INCIDENT_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
            </div>
            <div>
              <label className={labelCls}>Gravité</label>
              <select value={severity} onChange={(e) => setSeverity(e.target.value)} disabled={!canEdit} className={`${inputCls} ${INCIDENT_SEVERITY_TONE[severity] ?? ""}`}>{INCIDENT_SEVERITIES.map((s) => <option key={s}>{s}</option>)}</select>
            </div>
            <div>
              <label className={labelCls}>Détecté le</label>
              <input type="datetime-local" value={detectedAt} onChange={(e) => setDetectedAt(e.target.value)} disabled={!canEdit} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Statut</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} disabled={!canEdit} className={inputCls}>{INCIDENT_STATUS.map((s) => <option key={s}>{s}</option>)}</select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-[12px] text-slate-700">
            <input type="checkbox" checked={dataBreach} onChange={(e) => setDataBreach(e.target.checked)} disabled={!canEdit} className="h-4 w-4 accent-rose-600" />
            <ShieldAlert size={14} className="text-rose-500" /> Violation de données personnelles (pertinence RGPD — notification sous 72 h à évaluer)
          </label>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Déclaré par</label>
              <select value={declaredBy} onChange={(e) => setDeclaredBy(e.target.value)} disabled={!canEdit} className={inputCls}>{profiles.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}</select>
            </div>
            <div>
              <label className={labelCls}>Responsable</label>
              <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} disabled={!canEdit} className={inputCls}>{profiles.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}</select>
            </div>
            <div>
              <label className={labelCls}>Mission impactée</label>
              <select value={missionId} onChange={(e) => setMissionId(e.target.value)} disabled={!canEdit} className={inputCls}><option value="">—</option>{missions.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} disabled={!canEdit} rows={2} placeholder="Que s'est-il passé ?" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Impact constaté</label>
            <textarea value={impact} onChange={(e) => setImpact(e.target.value)} disabled={!canEdit} rows={2} className={inputCls} />
          </div>
          {/* Actifs impactés */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
            <div className="text-[11px] font-medium text-slate-500 uppercase mb-2 flex items-center gap-1.5"><Boxes size={13} /> Actifs impactés ({assetIds.length})</div>
            {assets.length === 0 ? <div className="text-[12px] text-slate-400">Aucun actif au registre.</div> : (
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {assets.filter((a) => a.status !== "Retiré").map((a) => <button key={a.id} onClick={() => canEdit && toggleAsset(a.id)} className={`text-[11px] rounded-full px-2 py-0.5 border ${assetIds.includes(a.id) ? "bg-teal-100 border-teal-300 text-teal-800" : "border-slate-200 text-slate-500"}`}>{a.name}</button>)}
              </div>
            )}
          </div>
          <div>
            <label className={labelCls}>Mesures prises (confinement / traitement)</label>
            <textarea value={actionsTaken} onChange={(e) => setActionsTaken(e.target.value)} disabled={!canEdit} rows={2} className={inputCls} />
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Cause racine</label>
              <textarea value={rootCause} onChange={(e) => setRootCause(e.target.value)} disabled={!canEdit} rows={2} placeholder="Pourquoi est-ce arrivé ?" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Retour d&apos;expérience (REX)</label>
              <textarea value={lessons} onChange={(e) => setLessons(e.target.value)} disabled={!canEdit} rows={2} placeholder="Que corriger pour éviter la récidive ?" className={inputCls} />
            </div>
          </div>
          {!creating && incident && canEdit && (
            <button onClick={toCapa} className="inline-flex items-center gap-1 text-[12px] font-medium text-emerald-700 border border-emerald-200 rounded-lg px-2.5 py-1.5 hover:bg-emerald-50"><Wrench size={13} /> Créer une action corrective (CAPA)</button>
          )}
          {incident?.updatedAt && <div className="text-[10px] text-slate-400">Mise à jour {fmtLong(incident.updatedAt)}</div>}
        </div>

        {canEdit && (
          <div className="flex items-center gap-2 p-4 border-t border-slate-100 dark:border-slate-800">
            <button onClick={save} disabled={busy || !title.trim()} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-slate-900 dark:bg-emerald-600 rounded-xl px-4 py-2 disabled:opacity-50"><AlertOctagon size={15} /> {creating ? "Déclarer l'incident" : "Enregistrer"}</button>
            {!creating && incident && <button onClick={remove} disabled={busy} className="ml-auto inline-flex items-center gap-1 text-[12px] text-rose-600 border border-rose-200 rounded-lg px-3 py-2 hover:bg-rose-50"><Trash2 size={14} /> Supprimer</button>}
          </div>
        )}
      </div>
    </div>
  );
}

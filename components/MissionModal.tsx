"use client";

import { useState } from "react";
import { Boxes, Crosshair, Plus, Trash2, Users2, X } from "lucide-react";
import {
  assetCriticality,
  DEP_DIRECTION_LABEL,
  DEP_KINDS,
  MISSION_STATUS,
  MISSION_TYPES,
  MISSION_VALUES,
  MISSION_VALUE_TONE,
  type DepDirection,
  type Mission,
  type MissionDependency,
} from "@/lib/domain";
import { useApp } from "./app-context";

let seq = 0;
const tid = () => `d_${++seq}`;
const inputCls = "w-full text-[13px] border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 bg-white dark:bg-slate-900 outline-none focus:border-emerald-400";
const labelCls = "block text-[11px] font-medium text-slate-500 mb-1";

/** Fiche d'une mission : valeur, actifs & personnes rattachés, dépendances amont/aval. */
export function MissionModal({ mission, creating, onClose }: { mission: Mission | null; creating: boolean; onClose: () => void }) {
  const { demo, me, profiles, assets, createMission, updateMission, deleteMission } = useApp();
  const canEdit = !demo;

  const [name, setName] = useState(mission?.name ?? "");
  const [type, setType] = useState(mission?.type ?? MISSION_TYPES[0]);
  const [value, setValue] = useState(mission?.value ?? "Importante");
  const [ownerId, setOwnerId] = useState(mission?.ownerId ?? me.id);
  const [status, setStatus] = useState(mission?.status ?? "Active");
  const [description, setDescription] = useState(mission?.description ?? "");
  const [assetIds, setAssetIds] = useState<string[]>(mission?.assetIds ?? []);
  const [peopleIds, setPeopleIds] = useState<string[]>(mission?.peopleIds ?? []);
  const [deps, setDeps] = useState<MissionDependency[]>(mission?.dependencies ?? []);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const toggle = (arr: string[], set: (v: string[]) => void, id: string) => set(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);
  const addDep = (direction: DepDirection) => setDeps((p) => [...p, { id: tid(), direction, kind: DEP_KINDS[0], name: "", description: "", criticality: "Importante" }]);
  const patchDep = (id: string, patch: Partial<MissionDependency>) => setDeps((p) => p.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  const removeDep = (id: string) => setDeps((p) => p.filter((d) => d.id !== id));

  const save = async () => {
    if (!name.trim()) return;
    setBusy(true); setErr(null);
    const payload = { name: name.trim(), type, value, ownerId, status, description, assetIds, peopleIds, dependencies: deps.filter((d) => d.name.trim()) };
    const e = creating ? await createMission(payload) : mission ? await updateMission(mission.id, payload) : "—";
    setBusy(false);
    if (e) setErr(e); else onClose();
  };
  const remove = async () => {
    if (!mission || (typeof window !== "undefined" && !window.confirm(`Supprimer la mission « ${mission.name} » ?`))) return;
    setBusy(true);
    const e = await deleteMission(mission.id);
    setBusy(false);
    if (e) setErr(e); else onClose();
  };

  const DepList = ({ direction }: { direction: DepDirection }) => (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-medium text-slate-500">{DEP_DIRECTION_LABEL[direction]}</span>
        {canEdit && <button onClick={() => addDep(direction)} className="text-[11px] text-emerald-700 hover:underline inline-flex items-center gap-0.5"><Plus size={12} /> Ajouter</button>}
      </div>
      <div className="space-y-1.5">
        {deps.filter((d) => d.direction === direction).length === 0 && <div className="text-[11px] text-slate-400">Aucune.</div>}
        {deps.filter((d) => d.direction === direction).map((d) => (
          <div key={d.id} className="rounded-lg border border-slate-100 dark:border-slate-800 p-2 space-y-1">
            <div className="flex items-center gap-1.5">
              <input value={d.name} onChange={(e) => patchDep(d.id, { name: e.target.value })} disabled={!canEdit} placeholder="Nom de l'entité…" className="flex-1 text-[12px] border border-slate-200 rounded px-2 py-1" />
              {canEdit && <button onClick={() => removeDep(d.id)} className="text-slate-300 hover:text-rose-600"><X size={13} /></button>}
            </div>
            <div className="flex items-center gap-1.5">
              <select value={d.kind} onChange={(e) => patchDep(d.id, { kind: e.target.value })} disabled={!canEdit} className="text-[11px] border border-slate-200 rounded px-1 py-1 bg-white flex-1">
                {DEP_KINDS.map((k) => <option key={k}>{k}</option>)}
              </select>
              <select value={d.criticality} onChange={(e) => patchDep(d.id, { criticality: e.target.value })} disabled={!canEdit} className="text-[11px] border border-slate-200 rounded px-1 py-1 bg-white">
                {MISSION_VALUES.map((v) => <option key={v}>{v}</option>)}
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto animate-fade" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl my-8 max-h-[92vh] overflow-y-auto animate-pop" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3 p-4 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
          <Crosshair size={20} className="text-indigo-600 mt-1 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-semibold text-slate-800 dark:text-slate-100">{creating ? "Nouvelle mission" : mission?.ref}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Mission & dépendances</div>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        <div className="p-4 space-y-3">
          {err && <div className="text-[12px] text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{err}</div>}
          <div>
            <label className={labelCls}>Intitulé de la mission</label>
            <input value={name} onChange={(e) => setName(e.target.value)} disabled={!canEdit} placeholder="Ex. Verser les rémunérations…" className={inputCls} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Type</label>
              <select value={type} onChange={(e) => setType(e.target.value)} disabled={!canEdit} className={inputCls}>{MISSION_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
            </div>
            <div>
              <label className={labelCls}>Valeur</label>
              <select value={value} onChange={(e) => setValue(e.target.value)} disabled={!canEdit} className={inputCls}>{MISSION_VALUES.map((v) => <option key={v}>{v}</option>)}</select>
            </div>
            <div>
              <label className={labelCls}>Statut</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} disabled={!canEdit} className={inputCls}>{MISSION_STATUS.map((s) => <option key={s}>{s}</option>)}</select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Responsable</label>
            <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} disabled={!canEdit} className={inputCls}>{profiles.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}</select>
          </div>
          <div>
            <label className={labelCls}>Description / finalité</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} disabled={!canEdit} rows={2} className={inputCls} />
          </div>

          {/* Actifs rattachés */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
            <div className="text-[11px] font-medium text-slate-500 uppercase mb-2 flex items-center gap-1.5"><Boxes size={13} /> Actifs rattachés ({assetIds.length})</div>
            {assets.length === 0 ? (
              <div className="text-[12px] text-slate-400">Aucun actif au registre. Alimente d&apos;abord l&apos;onglet Actifs.</div>
            ) : (
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                {assets.filter((a) => a.status !== "Retiré").map((a) => {
                  const on = assetIds.includes(a.id);
                  return (
                    <button key={a.id} onClick={() => canEdit && toggle(assetIds, setAssetIds, a.id)} className={`text-[11px] rounded-full px-2 py-0.5 border ${on ? "bg-teal-100 border-teal-300 text-teal-800" : "border-slate-200 text-slate-500"}`}>
                      {a.name} <span className="opacity-60">· {assetCriticality(a)}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Personnes clés */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
            <div className="text-[11px] font-medium text-slate-500 uppercase mb-2 flex items-center gap-1.5"><Users2 size={13} /> Personnes clés ({peopleIds.length})</div>
            <div className="flex flex-wrap gap-1.5">
              {profiles.map((p) => {
                const on = peopleIds.includes(p.id);
                return <button key={p.id} onClick={() => canEdit && toggle(peopleIds, setPeopleIds, p.id)} className={`text-[11px] rounded-full px-2 py-0.5 border ${on ? "bg-violet-100 border-violet-300 text-violet-800" : "border-slate-200 text-slate-500"}`}>{p.nom}</button>;
              })}
            </div>
          </div>

          {/* Dépendances amont / aval */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 grid md:grid-cols-2 gap-3">
            <DepList direction="amont" />
            <DepList direction="aval" />
          </div>
          <div className="text-[11px] text-slate-400">Amont = ce dont la mission dépend · Aval = qui dépend de la mission. La valeur d&apos;une mission élève la criticité de ses actifs dans l&apos;analyse des joyaux.</div>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2 p-4 border-t border-slate-100 dark:border-slate-800">
            <button onClick={save} disabled={busy || !name.trim()} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-slate-900 dark:bg-emerald-600 rounded-xl px-4 py-2 disabled:opacity-50">
              <span className={`h-2 w-2 rounded-full ${MISSION_VALUE_TONE[value]?.split(" ")[0] ?? ""}`} /> {creating ? "Créer la mission" : "Enregistrer"}
            </button>
            {!creating && mission && <button onClick={remove} disabled={busy} className="ml-auto inline-flex items-center gap-1 text-[12px] text-rose-600 border border-rose-200 rounded-lg px-3 py-2 hover:bg-rose-50"><Trash2 size={14} /> Supprimer</button>}
          </div>
        )}
      </div>
    </div>
  );
}

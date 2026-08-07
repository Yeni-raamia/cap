"use client";

import { useMemo, useState } from "react";
import { AlertOctagon, ChevronRight, Plus, Search, ShieldAlert } from "lucide-react";
import {
  fmt,
  incidentResolutionHours,
  isIncidentOpen,
  nextIncidentStatus,
  INCIDENT_SEVERITIES,
  INCIDENT_SEVERITY_TONE,
  INCIDENT_STATUS_TONE,
  INCIDENT_TYPES,
  type Incident,
} from "@/lib/domain";
import { useApp } from "@/components/app-context";
import { Card, Token } from "@/components/atoms";
import { GrcTabHeader } from "@/components/grc/GrcTabHeader";
import { EmptyState } from "@/components/EmptyState";
import { IncidentModal } from "@/components/IncidentModal";

export function IncidentsTab() {
  const { incidents, profileById, readOnly, setIncidentStatus } = useApp();
  const [search, setSearch] = useState("");
  const [fSev, setFSev] = useState("");
  const [fType, setFType] = useState("");
  const [creating, setCreating] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return incidents.filter((i) =>
      (!q || i.title.toLowerCase().includes(q) || i.ref.toLowerCase().includes(q)) &&
      (!fSev || i.severity === fSev) &&
      (!fType || i.type === fType)
    );
  }, [incidents, search, fSev, fType]);

  const kpi = useMemo(() => {
    const open = incidents.filter(isIncidentOpen);
    const resolved = incidents.map(incidentResolutionHours).filter((h): h is number => h != null);
    const mttr = resolved.length ? Math.round(resolved.reduce((a, h) => a + h, 0) / resolved.length) : null;
    return {
      total: incidents.length,
      open: open.length,
      critiques: open.filter((i) => i.severity === "Critique").length,
      breaches: incidents.filter((i) => i.dataBreach).length,
      mttr,
    };
  }, [incidents]);

  const editing = editId ? incidents.find((i) => i.id === editId) ?? null : null;
  const canCreate = !readOnly;

  return (
    <div className="space-y-5">
      <GrcTabHeader
        title="Gestion des incidents"
        subtitle="Registre des incidents de sécurité (cycle ISO 27035) : déclaration → qualification → traitement → résolution → retour d'expérience."
        right={canCreate ? (
          <button onClick={() => setCreating(true)} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-slate-900 dark:bg-emerald-600 rounded-xl px-3.5 py-2 hover:-translate-y-0.5 transition-transform shadow-soft">
            <Plus size={15} /> Déclarer un incident
          </button>
        ) : undefined}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Incidents" value={`${kpi.total}`} tone="text-slate-700" />
        <Kpi label="Ouverts" value={`${kpi.open}`} tone="text-amber-600" />
        <Kpi label="Critiques ouverts" value={`${kpi.critiques}`} tone="text-rose-600" />
        <Kpi label="Violations de données" value={`${kpi.breaches}`} tone="text-rose-600" />
      </div>
      {kpi.mttr != null && <div className="text-[11px] text-slate-400">Délai moyen de résolution : <span className="font-semibold text-slate-600">{kpi.mttr} h</span></div>}

      <Card className="p-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[10rem]">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher…" className="w-full text-[13px] border border-slate-200 rounded-lg pl-8 pr-2 py-1.5 outline-none focus:border-emerald-400" />
          </div>
          <select value={fType} onChange={(e) => setFType(e.target.value)} aria-label="Type" className="text-[12px] border border-slate-200 rounded-lg px-2 py-1.5 bg-white">
            <option value="">Tous types</option>
            {INCIDENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={fSev} onChange={(e) => setFSev(e.target.value)} aria-label="Gravité" className="text-[12px] border border-slate-200 rounded-lg px-2 py-1.5 bg-white">
            <option value="">Toutes gravités</option>
            {INCIDENT_SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </Card>

      {incidents.length === 0 ? (
        <EmptyState icon={AlertOctagon} title="Aucun incident" subtitle={canCreate ? "Déclare un incident pour en assurer le suivi jusqu'au retour d'expérience." : "Les incidents seront gérés par l'équipe GRC."} />
      ) : filtered.length === 0 ? (
        <Card className="p-6 text-center text-[13px] text-slate-400">Aucun incident ne correspond au filtre.</Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((i) => (
            <IncidentRow key={i.id} i={i} owner={i.ownerId ? profileById(i.ownerId).nom : "—"} canEdit={!readOnly} onOpen={() => setEditId(i.id)} onAdvance={(s) => setIncidentStatus(i.id, s)} />
          ))}
        </div>
      )}

      {(creating || editing) && <IncidentModal incident={editing} creating={creating} onClose={() => { setCreating(false); setEditId(null); }} />}
    </div>
  );
}

function IncidentRow({ i, owner, canEdit, onOpen, onAdvance }: { i: Incident; owner: string; canEdit: boolean; onOpen: () => void; onAdvance: (s: string) => void }) {
  const next = nextIncidentStatus(i.status);
  const advanceLabel: Record<string, string> = { "Qualifié": "Qualifier", "En traitement": "Traiter", "Résolu": "Résoudre", "Clôturé": "Clôturer" };
  return (
    <div className="relative rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-soft p-3 hover:-translate-y-0.5 transition-transform">
      <button onClick={onOpen} className="absolute inset-0 rounded-xl" aria-label={`Ouvrir ${i.ref}`} />
      <div className="relative pointer-events-none">
        <div className="flex items-center gap-2 flex-wrap">
          <Token>{i.ref}</Token>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${INCIDENT_SEVERITY_TONE[i.severity] ?? ""}`}>{i.severity}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${INCIDENT_STATUS_TONE[i.status] ?? "bg-slate-100 text-slate-500"}`}>{i.status}</span>
          <span className="text-[10px] text-slate-400">{i.type}</span>
          {i.dataBreach && <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700"><ShieldAlert size={11} /> Violation de données</span>}
        </div>
        <div className="text-[14px] font-semibold text-slate-800 dark:text-slate-100 leading-snug mt-1.5">{i.title}</div>
        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400 flex-wrap">
          <span>{owner}</span>
          {i.detectedAt && <span>· détecté {fmt(i.detectedAt)}</span>}
          {i.resolvedAt && <span>· résolu {fmt(i.resolvedAt)}</span>}
        </div>
      </div>
      {canEdit && next && (
        <div className="relative mt-2 flex justify-end">
          <button onClick={(e) => { e.stopPropagation(); onAdvance(next); }} className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 border border-emerald-200 rounded-lg px-2.5 py-1 hover:bg-emerald-50">
            {advanceLabel[next] ?? next} <ChevronRight size={13} />
          </button>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <Card className="p-3.5">
      <div className={`text-2xl font-bold ${tone}`}>{value}</div>
      <div className="text-[11px] text-slate-400 mt-0.5">{label}</div>
    </Card>
  );
}

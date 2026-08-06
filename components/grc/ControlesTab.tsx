"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ChevronRight, ClipboardCheck, Plus, Search, Wrench } from "lucide-react";
import {
  controlConformity,
  controlGaps,
  controlProgress,
  fmt,
  isCapaLate,
  nextFieldStatus,
  FIELD_CONTROL_STATUS,
  FIELD_CONTROL_TYPES,
  type CapaAction,
  type FieldControl,
} from "@/lib/domain";
import { useApp } from "@/components/app-context";
import { Card, Token } from "@/components/atoms";
import { GrcTabHeader } from "@/components/grc/GrcTabHeader";
import { EmptyState } from "@/components/EmptyState";
import { FieldControlModal } from "@/components/FieldControlModal";

const statusTone: Record<string, string> = {
  "Planifié": "bg-slate-100 text-slate-600",
  "En cours": "bg-sky-100 text-sky-700",
  "Réalisé": "bg-emerald-100 text-emerald-700",
  "Clôturé": "bg-slate-200 text-slate-500",
};

export function ControlesTab() {
  const { fieldControls, capaActions, profileById, readOnly, updateFieldControl } = useApp();
  const [search, setSearch] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fType, setFType] = useState("");
  const [creating, setCreating] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return fieldControls.filter((c) =>
      (!q || c.title.toLowerCase().includes(q) || c.ref.toLowerCase().includes(q) || c.service.toLowerCase().includes(q) || c.location.toLowerCase().includes(q)) &&
      (!fStatus || c.status === fStatus) &&
      (!fType || c.type === fType)
    );
  }, [fieldControls, search, fStatus, fType]);

  const kpi = useMemo(() => {
    const gaps = fieldControls.reduce((n, c) => n + controlGaps(c).length, 0);
    const planned = fieldControls.filter((c) => c.status === "Planifié" || c.status === "En cours").length;
    return { total: fieldControls.length, gaps, planned };
  }, [fieldControls]);

  const editing = editId ? fieldControls.find((c) => c.id === editId) ?? null : null;
  const canCreate = !readOnly;

  return (
    <div className="space-y-5">
      <GrcTabHeader
        title="Contrôles terrain"
        subtitle="Rondes, inspections et audits avec check-list ; chaque écart alimente le plan d'actions correctives."
        right={canCreate ? (
          <button onClick={() => setCreating(true)} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-slate-900 dark:bg-emerald-600 rounded-xl px-3.5 py-2 hover:-translate-y-0.5 transition-transform shadow-soft">
            <Plus size={15} /> Nouveau contrôle
          </button>
        ) : undefined}
      />

      <div className="grid grid-cols-3 gap-3">
        <Kpi label="Contrôles" value={`${kpi.total}`} tone="text-slate-700" />
        <Kpi label="À réaliser / en cours" value={`${kpi.planned}`} tone="text-sky-600" />
        <Kpi label="Écarts relevés" value={`${kpi.gaps}`} tone="text-rose-600" />
      </div>

      <Card className="p-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[10rem]">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher…" className="w-full text-[13px] border border-slate-200 rounded-lg pl-8 pr-2 py-1.5 outline-none focus:border-emerald-400" />
          </div>
          <select value={fType} onChange={(e) => setFType(e.target.value)} aria-label="Type" className="text-[12px] border border-slate-200 rounded-lg px-2 py-1.5 bg-white">
            <option value="">Tous types</option>
            {FIELD_CONTROL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} aria-label="Statut" className="text-[12px] border border-slate-200 rounded-lg px-2 py-1.5 bg-white">
            <option value="">Tous statuts</option>
            {FIELD_CONTROL_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </Card>

      {fieldControls.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title="Aucun contrôle terrain" subtitle={canCreate ? "Planifie une ronde ou une inspection et déroule sa check-list." : "Les contrôles seront gérés par l'équipe GRC."} />
      ) : filtered.length === 0 ? (
        <Card className="p-6 text-center text-[13px] text-slate-400">Aucun contrôle ne correspond au filtre.</Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {filtered.map((c) => (
            <ControlCard
              key={c.id}
              c={c}
              actions={capaActions.filter((a) => a.sourceType === "controle" && a.sourceId && c.items.some((it) => it.id === a.sourceId))}
              owner={profileById(c.inspectorId).nom}
              canEdit={!readOnly}
              onOpen={() => setEditId(c.id)}
              onAdvance={(status) => updateFieldControl(c.id, { status })}
            />
          ))}
        </div>
      )}

      {(creating || editing) && (
        <FieldControlModal control={editing} creating={creating} onClose={() => { setCreating(false); setEditId(null); }} />
      )}
    </div>
  );
}

function ControlCard({ c, actions, owner, canEdit, onOpen, onAdvance }: { c: FieldControl; actions: CapaAction[]; owner: string; canEdit: boolean; onOpen: () => void; onAdvance: (status: string) => void }) {
  const gaps = controlGaps(c).length;
  const prog = controlProgress(c);
  const conf = controlConformity(c);
  const openActions = actions.filter((a) => a.status !== "Clôturée").length;
  const lateActions = actions.filter((a) => isCapaLate(a, new Date())).length;
  const next = nextFieldStatus(c.status);
  const advanceLabel: Record<string, string> = { "En cours": "Démarrer", "Réalisé": "Marquer réalisé", "Clôturé": "Clôturer" };

  return (
    <div className="relative rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-soft p-4 hover:-translate-y-0.5 transition-transform">
      <button onClick={onOpen} className="absolute inset-0 rounded-2xl" aria-label={`Ouvrir le contrôle ${c.ref}`} />
      <div className="relative pointer-events-none">
        <div className="flex items-start gap-2 mb-1.5 flex-wrap">
          <Token>{c.ref}</Token>
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusTone[c.status] ?? "bg-slate-100 text-slate-500"}`}>{c.status}</span>
          {gaps > 0 && <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700"><AlertTriangle size={11} /> {gaps} point{gaps > 1 ? "s" : ""} bloquant{gaps > 1 ? "s" : ""}</span>}
          {openActions > 0 && <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700"><Wrench size={11} /> {openActions} action{openActions > 1 ? "s" : ""} à mener{lateActions > 0 ? ` · ${lateActions} en retard` : ""}</span>}
        </div>
        <div className="text-[14px] font-semibold text-slate-800 dark:text-slate-100 leading-snug">{c.title}</div>
        <div className="text-[11px] text-slate-400 mt-0.5">{[c.type, c.service, c.location].filter(Boolean).join(" · ")}</div>

        {/* Barre de progression du dépouillement */}
        <div className="mt-2.5">
          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
            <span>Dépouillement · {prog.done}/{prog.total || "—"} points</span>
            <span className="font-mono">{prog.pct}%{prog.done > 0 ? ` · ${conf}% conformes` : ""}</span>
          </div>
          <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${prog.pct >= 100 ? "bg-emerald-500" : prog.pct >= 50 ? "bg-sky-500" : "bg-amber-500"}`} style={{ width: `${prog.pct}%` }} />
          </div>
        </div>

        <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-400 flex-wrap">
          <span>{owner}</span>
          {c.date && <span>· {fmt(c.date)}</span>}
        </div>
      </div>

      {/* Bouton d'action rapide : faire avancer l'état */}
      {canEdit && next && (
        <div className="relative mt-2.5 flex justify-end">
          <button
            onClick={(e) => { e.stopPropagation(); onAdvance(next); }}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 border border-emerald-200 rounded-lg px-2.5 py-1 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
          >
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

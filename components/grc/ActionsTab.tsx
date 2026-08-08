"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Clock, Plus, Search, Wrench } from "lucide-react";
import {
  CAPA_PRIORITIES,
  CAPA_STATUS,
  CAPA_STATUS_TONE,
  CAPA_TYPES,
  fmt,
  isCapaLate,
  type CapaAction,
} from "@/lib/domain";
import { useApp } from "@/components/app-context";
import { Card, Token } from "@/components/atoms";
import { GrcTabHeader } from "@/components/grc/GrcTabHeader";
import { ActionsRapportPdf } from "@/components/grc/ActionsRapportPdf";
import { EmptyState } from "@/components/EmptyState";
import { CapaModal } from "@/components/CapaModal";

const priorityTone: Record<string, string> = {
  Basse: "bg-slate-100 text-slate-500",
  Normale: "bg-sky-100 text-sky-700",
  Haute: "bg-amber-100 text-amber-700",
  Critique: "bg-rose-100 text-rose-700",
};
const OPEN_STATUS = ["Ouverte", "En cours", "Réalisée", "Vérifiée"];

export function ActionsTab() {
  const { capaActions, profileById, readOnly } = useApp();
  const now = useMemo(() => new Date(), []);
  const [search, setSearch] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fType, setFType] = useState("");
  const [fPriority, setFPriority] = useState("");
  const [onlyLate, setOnlyLate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return capaActions.filter((a) =>
      (!q || a.title.toLowerCase().includes(q) || a.ref.toLowerCase().includes(q)) &&
      (!fStatus || a.status === fStatus) &&
      (!fType || a.type === fType) &&
      (!fPriority || a.priority === fPriority) &&
      (!onlyLate || isCapaLate(a, now))
    );
  }, [capaActions, search, fStatus, fType, fPriority, onlyLate, now]);

  const kpi = useMemo(() => {
    const open = capaActions.filter((a) => OPEN_STATUS.includes(a.status)).length;
    const late = capaActions.filter((a) => isCapaLate(a, now)).length;
    const done = capaActions.filter((a) => a.status === "Clôturée").length;
    return { total: capaActions.length, open, late, done };
  }, [capaActions, now]);

  const editing = editId ? capaActions.find((a) => a.id === editId) ?? null : null;
  const canCreate = !readOnly;

  return (
    <div className="space-y-5">
      <GrcTabHeader
        title="Plan d'actions (CAPA)"
        subtitle="Actions correctives &amp; préventives : responsable, échéance, statut et vérification d'efficacité."
        right={
          <div className="flex items-center gap-2">
            <ActionsRapportPdf />
            {canCreate && (
              <button onClick={() => setCreating(true)} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-slate-900 dark:bg-emerald-600 rounded-xl px-3.5 py-2 hover:-translate-y-0.5 transition-transform shadow-soft">
                <Plus size={15} /> Nouvelle action
              </button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Actions" value={`${kpi.total}`} tone="text-slate-700" />
        <Kpi label="Ouvertes" value={`${kpi.open}`} tone="text-sky-600" />
        <Kpi label="En retard" value={`${kpi.late}`} tone="text-rose-600" />
        <Kpi label="Clôturées" value={`${kpi.done}`} tone="text-emerald-600" />
      </div>

      <Card className="p-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[10rem]">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher…" className="w-full text-[13px] border border-slate-200 rounded-lg pl-8 pr-2 py-1.5 outline-none focus:border-emerald-400" />
          </div>
          <select value={fType} onChange={(e) => setFType(e.target.value)} aria-label="Nature" className="text-[12px] border border-slate-200 rounded-lg px-2 py-1.5 bg-white">
            <option value="">Toutes natures</option>
            {CAPA_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={fPriority} onChange={(e) => setFPriority(e.target.value)} aria-label="Priorité" className="text-[12px] border border-slate-200 rounded-lg px-2 py-1.5 bg-white">
            <option value="">Toutes priorités</option>
            {CAPA_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} aria-label="Statut" className="text-[12px] border border-slate-200 rounded-lg px-2 py-1.5 bg-white">
            <option value="">Tous statuts</option>
            {CAPA_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={() => setOnlyLate((v) => !v)} className={`inline-flex items-center gap-1 text-[12px] rounded-lg px-2.5 py-1.5 border ${onlyLate ? "bg-rose-50 border-rose-300 text-rose-700" : "border-slate-200 text-slate-500"}`}>
            <Clock size={13} /> En retard
          </button>
        </div>
      </Card>

      {capaActions.length === 0 ? (
        <EmptyState icon={Wrench} title="Aucune action" subtitle={canCreate ? "Crée une action, ou génère-la depuis un écart de contrôle terrain." : "Le plan d'actions sera géré par l'équipe GRC."} />
      ) : filtered.length === 0 ? (
        <Card className="p-6 text-center text-[13px] text-slate-400">Aucune action ne correspond au filtre.</Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((a) => {
            const late = isCapaLate(a, now);
            return (
              <button key={a.id} onClick={() => setEditId(a.id)} className="w-full text-left rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-soft p-3 hover:-translate-y-0.5 transition-transform">
                <div className="flex items-center gap-2 flex-wrap">
                  <Token>{a.ref}</Token>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${CAPA_STATUS_TONE[a.status] ?? "bg-slate-100 text-slate-500"}`}>{a.status}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${priorityTone[a.priority] ?? "bg-slate-100 text-slate-500"}`}>{a.priority}</span>
                  <span className="text-[10px] text-slate-400">{a.type}</span>
                  {late && <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700"><AlertTriangle size={11} /> en retard</span>}
                </div>
                <div className="text-[14px] font-semibold text-slate-800 leading-snug mt-1.5">{a.title}</div>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400 flex-wrap">
                  <span>{profileById(a.ownerId).nom}</span>
                  {a.dueDate && <span className={late ? "text-rose-600 font-medium" : ""}>· échéance {fmt(a.dueDate)}</span>}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {(creating || editing) && (
        <CapaModal capa={editing} creating={creating} onClose={() => { setCreating(false); setEditId(null); }} />
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

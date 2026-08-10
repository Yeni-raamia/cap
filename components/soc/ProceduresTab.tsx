"use client";

import { useMemo, useState } from "react";
import { ListChecks, Plus, Search } from "lucide-react";
import { RUNBOOK_STATUS_TONE, SOC_PROCEDURE_TYPES, SOC_PROCEDURE_TYPE_TONE, type SocProcedure } from "@/lib/domain";
import { useApp } from "@/components/app-context";
import { Card, Token } from "@/components/atoms";
import { GrcTabHeader } from "@/components/grc/GrcTabHeader";
import { EmptyState } from "@/components/EmptyState";
import { SocProcedureModal } from "@/components/SocProcedureModal";

export function ProceduresTab() {
  const { socProcedures, readOnly } = useApp();
  const [search, setSearch] = useState("");
  const [fType, setFType] = useState("");
  const [creating, setCreating] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return socProcedures.filter((p) =>
      (!q || p.title.toLowerCase().includes(q) || p.ref.toLowerCase().includes(q) || p.objective.toLowerCase().includes(q)) &&
      (!fType || p.type === fType)
    );
  }, [socProcedures, search, fType]);

  const editing = editId ? socProcedures.find((p) => p.id === editId) ?? null : null;
  const canCreate = !readOnly;

  return (
    <div className="space-y-5">
      <GrcTabHeader
        title="Procédures & checklists de routine"
        subtitle="Le « comment on travaille » du SOC : prise de poste, vérifications, triage, escalade, communication — pour ne rien laisser à la mémoire."
        right={canCreate ? (
          <button onClick={() => setCreating(true)} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-slate-900 dark:bg-emerald-600 rounded-xl px-3.5 py-2 hover:-translate-y-0.5 transition-transform shadow-soft">
            <Plus size={15} /> Nouvelle procédure
          </button>
        ) : undefined}
      />

      <Card className="p-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[10rem]">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher une procédure…" className="w-full text-[13px] border border-slate-200 rounded-lg pl-8 pr-2 py-1.5 outline-none focus:border-emerald-400" />
          </div>
          <select value={fType} onChange={(e) => setFType(e.target.value)} aria-label="Type" className="text-[12px] border border-slate-200 rounded-lg px-2 py-1.5 bg-white">
            <option value="">Tous types</option>
            {SOC_PROCEDURE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </Card>

      {socProcedures.length === 0 ? (
        <EmptyState icon={ListChecks} title="Aucune procédure" subtitle={canCreate ? "Crée une procédure ou repars de la bibliothèque de départ." : "Les procédures seront gérées par l'équipe SOC."} />
      ) : filtered.length === 0 ? (
        <Card className="p-6 text-center text-[13px] text-slate-400">Aucune procédure ne correspond au filtre.</Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {filtered.map((p) => <ProcedureCard key={p.id} p={p} onClick={() => setEditId(p.id)} />)}
        </div>
      )}

      {(creating || editing) && <SocProcedureModal procedure={editing} creating={creating} onClose={() => { setCreating(false); setEditId(null); }} />}
    </div>
  );
}

function ProcedureCard({ p, onClick }: { p: SocProcedure; onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-left rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-soft p-4 hover:-translate-y-0.5 transition-transform">
      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
        <Token>{p.ref}</Token>
        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${SOC_PROCEDURE_TYPE_TONE[p.type] ?? "bg-slate-100 text-slate-600"}`}>{p.type}</span>
        <span className={`text-[10px] px-2 py-0.5 rounded-full ${RUNBOOK_STATUS_TONE[p.status] ?? "bg-slate-100 text-slate-500"}`}>{p.status}</span>
      </div>
      <div className="text-[14px] font-semibold text-slate-800 dark:text-slate-100 leading-snug">{p.title}</div>
      {p.objective && <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{p.objective}</div>}
      <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-400 flex-wrap">
        <span>{p.frequency}</span>
        {p.items.length > 0 && <span>· {p.items.length} point{p.items.length > 1 ? "s" : ""}</span>}
      </div>
    </button>
  );
}

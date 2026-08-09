"use client";

import { useMemo, useState } from "react";
import { ClipboardList, FileUp, Plus, Search } from "lucide-react";
import { AUDIT_CATEGORIES, gridDomains, type AuditGrid } from "@/lib/domain";
import { useApp } from "@/components/app-context";
import { Card, Token } from "@/components/atoms";
import { GrcTabHeader } from "@/components/grc/GrcTabHeader";
import { EmptyState } from "@/components/EmptyState";
import { AuditGridModal } from "@/components/AuditGridModal";
import { ImportGridModal } from "@/components/audit/ImportGridModal";

export function GrillesTab() {
  const { auditGrids, audits, readOnly } = useApp();
  const [search, setSearch] = useState("");
  const [fCat, setFCat] = useState("");
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return auditGrids.filter((g) =>
      (!q || g.name.toLowerCase().includes(q) || g.ref.toLowerCase().includes(q)) &&
      (!fCat || g.category === fCat)
    );
  }, [auditGrids, search, fCat]);

  const usageCount = (gridId: string) => audits.filter((a) => a.gridId === gridId).length;
  const editing = editId ? auditGrids.find((g) => g.id === editId) ?? null : null;
  const canCreate = !readOnly;

  return (
    <div className="space-y-5">
      <GrcTabHeader
        title="Grilles d'audit"
        subtitle="Bibliothèque de référentiels réutilisables (questions Oui/Partiel/Non par domaine). Modifiables et déclinables en audits."
        right={canCreate ? (
          <div className="flex items-center gap-2">
            <button onClick={() => setImporting(true)} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800">
              <FileUp size={15} /> Importer JSON
            </button>
            <button onClick={() => setCreating(true)} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-slate-900 dark:bg-emerald-600 rounded-xl px-3.5 py-2 hover:-translate-y-0.5 transition-transform shadow-soft">
              <Plus size={15} /> Nouvelle grille
            </button>
          </div>
        ) : undefined}
      />

      <Card className="p-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[10rem]">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher une grille…" className="w-full text-[13px] border border-slate-200 rounded-lg pl-8 pr-2 py-1.5 outline-none focus:border-emerald-400" />
          </div>
          <select value={fCat} onChange={(e) => setFCat(e.target.value)} aria-label="Catégorie" className="text-[12px] border border-slate-200 rounded-lg px-2 py-1.5 bg-white">
            <option value="">Toutes catégories</option>
            {AUDIT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </Card>

      {auditGrids.length === 0 ? (
        <EmptyState icon={ClipboardList} title="Aucune grille" subtitle={canCreate ? "Crée une première grille d'audit ou repars de la bibliothèque de départ." : "Les grilles seront gérées par l'équipe d'audit."} />
      ) : filtered.length === 0 ? (
        <Card className="p-6 text-center text-[13px] text-slate-400">Aucune grille ne correspond au filtre.</Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {filtered.map((g) => <GridCard key={g.id} g={g} usage={usageCount(g.id)} onClick={() => setEditId(g.id)} />)}
        </div>
      )}

      {(creating || editing) && <AuditGridModal grid={editing} creating={creating} onClose={() => { setCreating(false); setEditId(null); }} />}
      {importing && <ImportGridModal onClose={() => setImporting(false)} />}
    </div>
  );
}

function GridCard({ g, usage, onClick }: { g: AuditGrid; usage: number; onClick: () => void }) {
  const domains = gridDomains(g.questions);
  return (
    <button onClick={onClick} className="text-left rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-soft p-4 hover:-translate-y-0.5 transition-transform">
      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
        <Token>{g.ref}</Token>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{g.category}</span>
        <span className="text-[10px] text-slate-400">{g.source}</span>
      </div>
      <div className="text-[14px] font-semibold text-slate-800 dark:text-slate-100 leading-snug">{g.name}</div>
      {g.description && <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{g.description}</div>}
      <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
        <span>{g.questions.length} question{g.questions.length > 1 ? "s" : ""}</span>
        <span>· {domains.length} domaine{domains.length > 1 ? "s" : ""}</span>
        {usage > 0 && <span>· {usage} audit{usage > 1 ? "s" : ""}</span>}
      </div>
    </button>
  );
}

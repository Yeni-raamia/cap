"use client";

import { useMemo, useState } from "react";
import { BookOpen, Plus, Search, ShieldAlert } from "lucide-react";
import { INCIDENT_SEVERITY_TONE, RUNBOOK_CATEGORIES, RUNBOOK_STATUS_TONE, type Runbook } from "@/lib/domain";
import { useApp } from "@/components/app-context";
import { Card, Token } from "@/components/atoms";
import { GrcTabHeader } from "@/components/grc/GrcTabHeader";
import { EmptyState } from "@/components/EmptyState";
import { RunbookModal } from "@/components/RunbookModal";

export function RunbooksTab() {
  const { runbooks, profileById, readOnly } = useApp();
  const [search, setSearch] = useState("");
  const [fCat, setFCat] = useState("");
  const [creating, setCreating] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return runbooks.filter((r) =>
      (!q || r.title.toLowerCase().includes(q) || r.ref.toLowerCase().includes(q) || r.trigger.toLowerCase().includes(q) || r.attackTechniques.some((t) => t.toLowerCase().includes(q))) &&
      (!fCat || r.category === fCat)
    );
  }, [runbooks, search, fCat]);

  const editing = editId ? runbooks.find((r) => r.id === editId) ?? null : null;
  const canCreate = !readOnly;

  return (
    <div className="space-y-5">
      <GrcTabHeader
        title="Runbooks de réponse"
        subtitle="Les procédures pas-à-pas pour réagir aux incidents courants (méthode NIST SP 800-61) — le réflexe de l'équipe au quotidien."
        right={canCreate ? (
          <button onClick={() => setCreating(true)} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-slate-900 dark:bg-emerald-600 rounded-xl px-3.5 py-2 hover:-translate-y-0.5 transition-transform shadow-soft">
            <Plus size={15} /> Nouveau runbook
          </button>
        ) : undefined}
      />

      <Card className="p-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[10rem]">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher (titre, déclencheur, technique ATT&CK…)" className="w-full text-[13px] border border-slate-200 rounded-lg pl-8 pr-2 py-1.5 outline-none focus:border-emerald-400" />
          </div>
          <select value={fCat} onChange={(e) => setFCat(e.target.value)} aria-label="Catégorie" className="text-[12px] border border-slate-200 rounded-lg px-2 py-1.5 bg-white">
            <option value="">Toutes catégories</option>
            {RUNBOOK_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </Card>

      {runbooks.length === 0 ? (
        <EmptyState icon={BookOpen} title="Aucun runbook" subtitle={canCreate ? "Crée un premier runbook ou repars de la bibliothèque de départ." : "Les runbooks seront gérés par l'équipe SOC."} />
      ) : filtered.length === 0 ? (
        <Card className="p-6 text-center text-[13px] text-slate-400">Aucun runbook ne correspond au filtre.</Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {filtered.map((r) => <RunbookCard key={r.id} r={r} owner={profileById(r.ownerId).nom} onClick={() => setEditId(r.id)} />)}
        </div>
      )}

      {(creating || editing) && <RunbookModal runbook={editing} creating={creating} onClose={() => { setCreating(false); setEditId(null); }} />}
    </div>
  );
}

function RunbookCard({ r, owner, onClick }: { r: Runbook; owner: string; onClick: () => void }) {
  const decisions = r.steps.filter((s) => s.decision).length;
  return (
    <button onClick={onClick} className="text-left rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-soft p-4 hover:-translate-y-0.5 transition-transform">
      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
        <Token>{r.ref}</Token>
        <span className={`text-[10px] px-2 py-0.5 rounded-full ${RUNBOOK_STATUS_TONE[r.status] ?? "bg-slate-100 text-slate-500"}`}>{r.status}</span>
        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${INCIDENT_SEVERITY_TONE[r.severity] ?? "bg-slate-100 text-slate-600"}`}>{r.severity}</span>
      </div>
      <div className="text-[14px] font-semibold text-slate-800 dark:text-slate-100 leading-snug">{r.title}</div>
      <div className="text-[11px] text-slate-400 mt-0.5">{r.category}</div>
      {r.trigger && <div className="text-[11px] text-slate-500 mt-1.5 line-clamp-2 flex items-start gap-1"><ShieldAlert size={12} className="mt-0.5 shrink-0 text-amber-500" /> {r.trigger}</div>}
      <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-400 flex-wrap">
        <span>{r.steps.length} étape{r.steps.length > 1 ? "s" : ""}</span>
        {decisions > 0 && <span>· {decisions} décision{decisions > 1 ? "s" : ""}</span>}
        {r.attackTechniques.length > 0 && <span className="font-mono text-indigo-500">· {r.attackTechniques.slice(0, 4).join(" ")}</span>}
        <span className="ml-auto">{owner}</span>
      </div>
    </button>
  );
}

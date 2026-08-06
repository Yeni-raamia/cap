"use client";

import { useMemo, useState } from "react";
import { Plus, Search, ShieldAlert, Link2 } from "lucide-react";
import Link from "next/link";
import {
  fmt,
  riskLevel,
  RISK_CATEGORIES,
  RISK_LEVEL_CELL,
  RISK_LEVEL_TONE,
  RISK_STATUTS,
  type Risk,
  type RiskLevel,
} from "@/lib/domain";
import { useApp } from "@/components/app-context";
import { Card, Token } from "@/components/atoms";
import { GrcTabHeader } from "@/components/grc/GrcTabHeader";
import { EmptyState } from "@/components/EmptyState";
import { RiskModal } from "@/components/RiskModal";
import { RisquesRapportPdf } from "@/components/RisquesRapportPdf";

const statusTone: Record<string, string> = {
  Identifié: "bg-slate-100 text-slate-600",
  "En traitement": "bg-sky-100 text-sky-700",
  Réduit: "bg-emerald-100 text-emerald-700",
  Accepté: "bg-violet-100 text-violet-700",
  Transféré: "bg-amber-100 text-amber-700",
  Clôturé: "bg-slate-200 text-slate-500",
};

export function RisquesTab() {
  const { risks, profileById, readOnly } = useApp();
  const [search, setSearch] = useState("");
  const [fLevel, setFLevel] = useState<RiskLevel | "">("");
  const [fStatus, setFStatus] = useState("");
  const [fCat, setFCat] = useState("");
  const [cell, setCell] = useState<{ p: number; i: number } | null>(null);
  const [mode, setMode] = useState<"residual" | "inherent">("residual");
  const [creating, setCreating] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Probabilité/impact selon le mode affiché (résiduel par défaut).
  const probOf = (r: (typeof risks)[number]) => (mode === "residual" ? r.residualProbability : r.probability);
  const impOf = (r: (typeof risks)[number]) => (mode === "residual" ? r.residualImpact : r.impact);

  const withLevel = useMemo(
    () => risks.map((r) => ({ r, inh: riskLevel(r.probability, r.impact), res: riskLevel(r.residualProbability, r.residualImpact) })),
    [risks]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return withLevel.filter(({ r, res }) =>
      (!q || r.title.toLowerCase().includes(q) || r.ref.toLowerCase().includes(q) || r.description.toLowerCase().includes(q)) &&
      (!fLevel || res === fLevel) &&
      (!fStatus || r.status === fStatus) &&
      (!fCat || r.category === fCat) &&
      (!cell || (probOf(r) === cell.p && impOf(r) === cell.i))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [withLevel, search, fLevel, fStatus, fCat, cell, mode]);

  const kpi = useMemo(() => {
    const open = withLevel.filter(({ r }) => r.status !== "Clôturé");
    return {
      total: risks.length,
      critique: open.filter((x) => x.res === "Critique").length,
      eleve: open.filter((x) => x.res === "Élevé").length,
      aRevoir: risks.filter((r) => r.reviewDate && r.reviewDate.getTime() < Date.now() && r.status !== "Clôturé").length,
    };
  }, [withLevel, risks]);

  // Matrice : lignes = impact (5 en haut → 1 en bas), colonnes = probabilité (1 → 5).
  const matrixCount = (p: number, i: number) => risks.filter((r) => probOf(r) === p && impOf(r) === i && r.status !== "Clôturé").length;

  const editing = editId ? risks.find((r) => r.id === editId) ?? null : null;
  const canCreate = !readOnly;

  return (
    <div className="space-y-5">
      <GrcTabHeader
        title="Registre des risques"
        subtitle="Identifier, évaluer (probabilité × impact) et traiter les risques — reliés aux autres modules pour croiser l'information."
        right={
          <div className="flex items-center gap-2">
            {risks.length > 0 && <RisquesRapportPdf />}
            {canCreate && (
              <button onClick={() => setCreating(true)} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-slate-900 dark:bg-emerald-600 rounded-xl px-3.5 py-2 hover:-translate-y-0.5 transition-transform shadow-soft">
                <Plus size={15} /> Nouveau risque
              </button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Risques" value={kpi.total} tone="text-slate-700" />
        <Kpi label="Critiques (ouverts)" value={kpi.critique} tone="text-rose-600" />
        <Kpi label="Élevés (ouverts)" value={kpi.eleve} tone="text-orange-600" />
        <Kpi label="Revue en retard" value={kpi.aRevoir} tone="text-amber-600" />
      </div>

      <div className="grid lg:grid-cols-[auto_1fr] gap-4">
        {/* Matrice de risques */}
        <Card className="p-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="text-[13px] font-semibold text-slate-700 flex items-center gap-2"><ShieldAlert size={15} className="text-rose-500" /> Matrice des risques</div>
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 text-[10px] bg-white">
              <button onClick={() => { setMode("inherent"); setCell(null); }} className={`px-2 py-0.5 rounded-md font-medium ${mode === "inherent" ? "bg-slate-700 text-white" : "text-slate-500"}`}>Inhérent</button>
              <button onClick={() => { setMode("residual"); setCell(null); }} className={`px-2 py-0.5 rounded-md font-medium ${mode === "residual" ? "bg-emerald-600 text-white" : "text-slate-500"}`}>Résiduel</button>
            </div>
          </div>
          <div className="flex gap-1.5">
            <div className="flex flex-col justify-around text-[9px] text-slate-400 font-medium pr-0.5" style={{ writingMode: "vertical-rl" }}>Impact →</div>
            <div>
              <div className="grid grid-cols-5 gap-1">
                {[5, 4, 3, 2, 1].map((i) =>
                  [1, 2, 3, 4, 5].map((p) => {
                    const lvl = riskLevel(p, i);
                    const n = matrixCount(p, i);
                    const active = cell?.p === p && cell?.i === i;
                    return (
                      <button
                        key={`${p}-${i}`}
                        onClick={() => setCell(active ? null : { p, i })}
                        title={`P${p} × I${i} — ${lvl}`}
                        className={`h-9 w-9 rounded grid place-items-center text-[12px] font-bold ${RISK_LEVEL_CELL[lvl]} ${active ? "ring-2 ring-slate-900 dark:ring-white" : ""} ${n === 0 ? "opacity-40" : ""}`}
                      >
                        {n || ""}
                      </button>
                    );
                  })
                )}
              </div>
              <div className="text-[9px] text-slate-400 font-medium text-center mt-1">Probabilité →</div>
            </div>
          </div>
          {cell && <button onClick={() => setCell(null)} className="text-[11px] text-emerald-700 hover:underline mt-2">Effacer le filtre matrice (P{cell.p}×I{cell.i})</button>}
        </Card>

        {/* Liste */}
        <div>
          <Card className="p-2.5 mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[10rem]">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher…" className="w-full text-[13px] border border-slate-200 rounded-lg pl-8 pr-2 py-1.5 outline-none focus:border-emerald-400" />
              </div>
              <select value={fLevel} onChange={(e) => setFLevel(e.target.value as RiskLevel | "")} aria-label="Niveau" className="text-[12px] border border-slate-200 rounded-lg px-2 py-1.5 bg-white">
                <option value="">Tous niveaux</option>
                {(["Critique", "Élevé", "Moyen", "Faible"] as RiskLevel[]).map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
              <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} aria-label="Statut" className="text-[12px] border border-slate-200 rounded-lg px-2 py-1.5 bg-white">
                <option value="">Tous statuts</option>
                {RISK_STATUTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={fCat} onChange={(e) => setFCat(e.target.value)} aria-label="Catégorie" className="text-[12px] border border-slate-200 rounded-lg px-2 py-1.5 bg-white">
                <option value="">Toutes catégories</option>
                {RISK_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </Card>

          {risks.length === 0 ? (
            <EmptyState icon={ShieldAlert} title="Aucun risque au registre" subtitle={canCreate ? "Ajoute un premier risque pour démarrer la cartographie." : "Le registre sera alimenté par l'équipe GRC."} />
          ) : filtered.length === 0 ? (
            <Card className="p-6 text-center text-[13px] text-slate-400">Aucun risque ne correspond au filtre.</Card>
          ) : (
            <Card className="divide-y divide-slate-100">
              {filtered.map(({ r, inh, res }) => (
                <button key={r.id} onClick={() => setEditId(r.id)} className="w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-slate-50">
                  <span className="mt-0.5 shrink-0 flex items-center gap-1">
                    <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 border ${RISK_LEVEL_TONE[inh]}`} title="Inhérent">{inh}</span>
                    <span className="text-slate-300 text-[10px]">→</span>
                    <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 border ${RISK_LEVEL_TONE[res]}`} title="Résiduel">{res}</span>
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Token>{r.ref}</Token>
                      <span className="text-[13px] font-medium text-slate-800 truncate">{r.title}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5 flex-wrap">
                      <span className={`px-1.5 py-0.5 rounded ${statusTone[r.status] ?? "bg-slate-100 text-slate-500"}`}>{r.status}</span>
                      {r.category && <span>{r.category}</span>}
                      {r.controls.length > 0 && <span className="inline-flex items-center gap-0.5 text-emerald-600">🛡 {r.controls.length}</span>}
                      <span>· {profileById(r.ownerId).nom}</span>
                      {r.links.length > 0 && <span className="inline-flex items-center gap-0.5 text-slate-400"><Link2 size={11} /> {r.links.length}</span>}
                      {r.reviewDate && <span className={r.reviewDate.getTime() < Date.now() && r.status !== "Clôturé" ? "text-amber-600 font-medium" : ""}>· revue {fmt(r.reviewDate)}</span>}
                    </div>
                  </div>
                  <Link href={`/relations?node=risque:${r.id}`} onClick={(e) => e.stopPropagation()} title="Voir les relations" className="shrink-0 text-slate-300 hover:text-emerald-600 mt-0.5">
                    <Link2 size={15} />
                  </Link>
                </button>
              ))}
            </Card>
          )}
        </div>
      </div>

      {(creating || editing) && (
        <RiskModal risk={editing} creating={creating} onClose={() => { setCreating(false); setEditId(null); }} />
      )}
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <Card className="p-3.5">
      <div className={`text-2xl font-bold ${tone}`}>{value}</div>
      <div className="text-[11px] text-slate-400 mt-0.5">{label}</div>
    </Card>
  );
}

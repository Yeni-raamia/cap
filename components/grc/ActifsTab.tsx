"use client";

import { useMemo, useState } from "react";
import { Boxes, Plus, Search } from "lucide-react";
import {
  assetCriticality,
  ASSET_TYPES,
  CRITICALITY_TONE,
  fmt,
  type AssetCriticality,
} from "@/lib/domain";
import { useApp } from "@/components/app-context";
import { Card, Token } from "@/components/atoms";
import { GrcTabHeader } from "@/components/grc/GrcTabHeader";
import { ActifsRapportPdf } from "@/components/grc/ActifsRapportPdf";
import { EmptyState } from "@/components/EmptyState";
import { AssetModal } from "@/components/AssetModal";

const CRIT_ORDER: AssetCriticality[] = ["Critique", "Élevé", "Modéré", "Faible"];

export function ActifsTab() {
  const { assets, profileById, readOnly } = useApp();
  const [search, setSearch] = useState("");
  const [fType, setFType] = useState("");
  const [fCrit, setFCrit] = useState<AssetCriticality | "">("");
  const [creating, setCreating] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const withCrit = useMemo(() => assets.map((a) => ({ a, crit: assetCriticality(a) })), [assets]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return withCrit.filter(({ a, crit }) =>
      (!q || a.name.toLowerCase().includes(q) || a.ref.toLowerCase().includes(q) || a.service.toLowerCase().includes(q)) &&
      (!fType || a.type === fType) &&
      (!fCrit || crit === fCrit)
    );
  }, [withCrit, search, fType, fCrit]);

  const kpi = useMemo(() => {
    const active = withCrit.filter(({ a }) => a.status !== "Retiré");
    return {
      total: assets.length,
      critiques: active.filter((x) => x.crit === "Critique").length,
      aRevoir: assets.filter((a) => a.reviewDate && a.reviewDate.getTime() < Date.now() && a.status !== "Retiré").length,
    };
  }, [withCrit, assets]);

  const editing = editId ? assets.find((a) => a.id === editId) ?? null : null;
  const canCreate = !readOnly;

  return (
    <div className="space-y-5">
      <GrcTabHeader
        title="Registre des actifs"
        subtitle="Ce que l'on protège, valorisé selon les besoins de sécurité C/I/D. La criticité alimente l'appréciation des risques."
        right={
          <div className="flex items-center gap-2">
            <ActifsRapportPdf />
            {canCreate && (
              <button onClick={() => setCreating(true)} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-slate-900 dark:bg-emerald-600 rounded-xl px-3.5 py-2 hover:-translate-y-0.5 transition-transform shadow-soft">
                <Plus size={15} /> Nouvel actif
              </button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-3 gap-3">
        <Kpi label="Actifs" value={kpi.total} tone="text-slate-700" />
        <Kpi label="Critiques" value={kpi.critiques} tone="text-rose-600" />
        <Kpi label="Revue en retard" value={kpi.aRevoir} tone="text-amber-600" />
      </div>

      <Card className="p-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[10rem]">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher…" className="w-full text-[13px] border border-slate-200 rounded-lg pl-8 pr-2 py-1.5 outline-none focus:border-emerald-400" />
          </div>
          <select value={fType} onChange={(e) => setFType(e.target.value)} aria-label="Type" className="text-[12px] border border-slate-200 rounded-lg px-2 py-1.5 bg-white">
            <option value="">Tous types</option>
            {ASSET_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={fCrit} onChange={(e) => setFCrit(e.target.value as AssetCriticality | "")} aria-label="Criticité" className="text-[12px] border border-slate-200 rounded-lg px-2 py-1.5 bg-white">
            <option value="">Toute criticité</option>
            {CRIT_ORDER.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </Card>

      {assets.length === 0 ? (
        <EmptyState icon={Boxes} title="Aucun actif au registre" subtitle={canCreate ? "Cartographie les actifs à protéger (données, systèmes, processus, tiers…)." : "Le registre sera alimenté par l'équipe GRC."} />
      ) : filtered.length === 0 ? (
        <Card className="p-6 text-center text-[13px] text-slate-400">Aucun actif ne correspond au filtre.</Card>
      ) : (
        <Card className="divide-y divide-slate-100">
          {filtered.map(({ a, crit }) => (
            <button key={a.id} onClick={() => setEditId(a.id)} className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
              <span className={`shrink-0 text-[10px] font-bold rounded-full px-2 py-0.5 border ${CRITICALITY_TONE[crit]}`}>{crit}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Token>{a.ref}</Token>
                  <span className="text-[13px] font-medium text-slate-800 truncate">{a.name}</span>
                  {a.status !== "Actif" && <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">{a.status}</span>}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5 flex-wrap">
                  <span>{a.type}</span>
                  {a.service && <span>· {a.service}</span>}
                  <span className="font-mono">· C{a.confidentiality} I{a.integrity} D{a.availability}</span>
                  <span>· {profileById(a.ownerId).nom}</span>
                  {a.reviewDate && <span className={a.reviewDate.getTime() < Date.now() && a.status !== "Retiré" ? "text-amber-600 font-medium" : ""}>· revue {fmt(a.reviewDate)}</span>}
                </div>
              </div>
            </button>
          ))}
        </Card>
      )}

      {(creating || editing) && (
        <AssetModal asset={editing} creating={creating} onClose={() => { setCreating(false); setEditId(null); }} />
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

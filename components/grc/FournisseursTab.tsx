"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Boxes, Plus, Search, Truck } from "lucide-react";
import {
  fmt,
  isSupplierReviewLate,
  DATA_ACCESS_TONE,
  SUPPLIER_CRITICALITIES,
  SUPPLIER_CRITICALITY_TONE,
  SUPPLIER_TYPES,
  type Supplier,
} from "@/lib/domain";
import { useApp } from "@/components/app-context";
import { Card, Token } from "@/components/atoms";
import { GrcTabHeader } from "@/components/grc/GrcTabHeader";
import { FournisseursRapportPdf } from "@/components/grc/FournisseursRapportPdf";
import { EmptyState } from "@/components/EmptyState";
import { SupplierModal } from "@/components/SupplierModal";

export function FournisseursTab() {
  const { suppliers, assetById, profileById, readOnly } = useApp();
  const now = useMemo(() => new Date(), []);
  const [search, setSearch] = useState("");
  const [fCrit, setFCrit] = useState("");
  const [fType, setFType] = useState("");
  const [creating, setCreating] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return suppliers.filter((s) =>
      (!q || s.name.toLowerCase().includes(q) || s.ref.toLowerCase().includes(q) || s.service.toLowerCase().includes(q)) &&
      (!fCrit || s.criticality === fCrit) &&
      (!fType || s.type === fType)
    );
  }, [suppliers, search, fCrit, fType]);

  const kpi = useMemo(() => {
    const active = suppliers.filter((s) => s.status !== "Résilié");
    return {
      total: suppliers.length,
      critiques: active.filter((s) => s.criticality === "Critique").length,
      donnees: active.filter((s) => s.dataAccess === "Données personnelles" || s.dataAccess === "Données sensibles").length,
      revues: active.filter((s) => isSupplierReviewLate(s, now)).length,
    };
  }, [suppliers, now]);

  const editing = editId ? suppliers.find((s) => s.id === editId) ?? null : null;
  const canCreate = !readOnly;

  return (
    <div className="space-y-5">
      <GrcTabHeader
        title="Fournisseurs & prestataires"
        subtitle="Recenser les tiers qui interagissent avec le SI — leur criticité, les données qu'ils accèdent, les actifs concernés et le suivi contractuel. Dépendances externes pour la CJA."
        right={
          <div className="flex items-center gap-2">
            <FournisseursRapportPdf />
            {canCreate && (
              <button onClick={() => setCreating(true)} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-slate-900 dark:bg-emerald-600 rounded-xl px-3.5 py-2 hover:-translate-y-0.5 transition-transform shadow-soft">
                <Plus size={15} /> Nouveau fournisseur
              </button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Fournisseurs" value={`${kpi.total}`} tone="text-orange-600" />
        <Kpi label="Critiques" value={`${kpi.critiques}`} tone="text-rose-600" />
        <Kpi label="Accès données pers./sens." value={`${kpi.donnees}`} tone="text-amber-600" />
        <Kpi label="Revues en retard" value={`${kpi.revues}`} tone="text-rose-600" />
      </div>

      <Card className="p-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[10rem]">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher…" className="w-full text-[13px] border border-slate-200 rounded-lg pl-8 pr-2 py-1.5 outline-none focus:border-emerald-400" />
          </div>
          <select value={fType} onChange={(e) => setFType(e.target.value)} aria-label="Type" className="text-[12px] border border-slate-200 rounded-lg px-2 py-1.5 bg-white">
            <option value="">Tous types</option>
            {SUPPLIER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={fCrit} onChange={(e) => setFCrit(e.target.value)} aria-label="Criticité" className="text-[12px] border border-slate-200 rounded-lg px-2 py-1.5 bg-white">
            <option value="">Toutes criticités</option>
            {SUPPLIER_CRITICALITIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </Card>

      {suppliers.length === 0 ? (
        <EmptyState icon={Truck} title="Aucun fournisseur" subtitle={canCreate ? "Recense les prestataires qui touchent au SI." : "Les fournisseurs seront gérés par l'équipe GRC."} />
      ) : filtered.length === 0 ? (
        <Card className="p-6 text-center text-[13px] text-slate-400">Aucun fournisseur ne correspond au filtre.</Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {filtered.map((s) => (
            <SupplierCard key={s.id} s={s} late={isSupplierReviewLate(s, now)} owner={s.ownerId ? profileById(s.ownerId).nom : "—"} assetNames={s.assetIds.map((id) => assetById(id)?.name ?? "?")} onClick={() => setEditId(s.id)} />
          ))}
        </div>
      )}

      {(creating || editing) && <SupplierModal supplier={editing} creating={creating} onClose={() => { setCreating(false); setEditId(null); }} />}
    </div>
  );
}

function SupplierCard({ s, late, owner, assetNames, onClick }: { s: Supplier; late: boolean; owner: string; assetNames: string[]; onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-left rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-soft p-4 hover:-translate-y-0.5 transition-transform">
      <div className="flex items-start gap-2 mb-1.5 flex-wrap">
        <Token>{s.ref}</Token>
        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${SUPPLIER_CRITICALITY_TONE[s.criticality] ?? ""}`}>{s.criticality}</span>
        {s.status !== "Actif" && <span className="text-[10px] text-slate-400">· {s.status}</span>}
      </div>
      <div className="text-[14px] font-semibold text-slate-800 dark:text-slate-100 leading-snug">{s.name}</div>
      <div className="text-[11px] text-slate-400 mt-0.5">{[s.type, s.service].filter(Boolean).join(" · ")}</div>
      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        <span className={`text-[10px] px-2 py-0.5 rounded-full ${DATA_ACCESS_TONE[s.dataAccess] ?? "bg-slate-100 text-slate-500"}`}>{s.dataAccess}</span>
        {assetNames.length > 0 && <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 bg-slate-100 dark:bg-slate-800 rounded-full px-2 py-0.5"><Boxes size={10} className="text-teal-500" /> {assetNames.length} actif{assetNames.length > 1 ? "s" : ""}</span>}
      </div>
      <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-400 flex-wrap">
        <span>{owner}</span>
        {s.contractEnd && <span>· contrat → {fmt(s.contractEnd)}</span>}
        {s.reviewDate && <span className={late ? "text-rose-600 font-medium inline-flex items-center gap-0.5" : ""}>{late && <AlertTriangle size={11} />} revue {fmt(s.reviewDate)}</span>}
      </div>
    </button>
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

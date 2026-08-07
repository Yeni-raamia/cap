"use client";

import { useMemo, useState } from "react";
import { FileLock2, Plus, Search, ShieldAlert, Truck } from "lucide-react";
import {
  fmt,
  isRopaReviewLate,
  LEGAL_BASES,
  piaOutstanding,
  PIA_RISK_TONE,
  type ProcessingActivity,
} from "@/lib/domain";
import { useApp } from "@/components/app-context";
import { Card, Token } from "@/components/atoms";
import { GrcTabHeader } from "@/components/grc/GrcTabHeader";
import { EmptyState } from "@/components/EmptyState";
import { ProcessingModal } from "@/components/ProcessingModal";

export function RgpdTab() {
  const { processing, incidents, suppliers, profileById, readOnly } = useApp();
  const now = useMemo(() => new Date(), []);
  const [search, setSearch] = useState("");
  const [fBasis, setFBasis] = useState("");
  const [creating, setCreating] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return processing.filter((p) =>
      (!q || p.name.toLowerCase().includes(q) || p.ref.toLowerCase().includes(q) || p.purpose.toLowerCase().includes(q)) &&
      (!fBasis || p.legalBasis === fBasis)
    );
  }, [processing, search, fBasis]);

  const kpi = useMemo(() => ({
    total: processing.length,
    sensitive: processing.filter((p) => p.sensitiveData && p.status !== "Clôturé").length,
    pia: processing.filter(piaOutstanding).length,
    review: processing.filter((p) => isRopaReviewLate(p, now)).length,
  }), [processing, now]);

  // Croisements : violations de données (incidents) + sous-traitants (fournisseurs).
  const breaches = useMemo(() => incidents.filter((i) => i.dataBreach), [incidents]);
  const processors = useMemo(() => suppliers.filter((s) => s.status !== "Résilié" && (s.dataAccess === "Données personnelles" || s.dataAccess === "Données sensibles")), [suppliers]);

  const editing = editId ? processing.find((p) => p.id === editId) ?? null : null;
  const canCreate = !readOnly;

  return (
    <div className="space-y-5">
      <GrcTabHeader
        title="RGPD — Traitements & AIPD"
        subtitle="Registre des activités de traitement (ROPA, art. 30) et analyses d'impact (AIPD/PIA, art. 35) — relié aux violations de données et aux sous-traitants."
        right={canCreate ? (
          <button onClick={() => setCreating(true)} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-slate-900 dark:bg-emerald-600 rounded-xl px-3.5 py-2 hover:-translate-y-0.5 transition-transform shadow-soft">
            <Plus size={15} /> Nouveau traitement
          </button>
        ) : undefined}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Traitements" value={`${kpi.total}`} tone="text-blue-600" />
        <Kpi label="Données sensibles" value={`${kpi.sensitive}`} tone="text-rose-600" />
        <Kpi label="AIPD à réaliser" value={`${kpi.pia}`} tone="text-amber-600" />
        <Kpi label="Revues en retard" value={`${kpi.review}`} tone="text-rose-600" />
      </div>

      {/* Croisements RGPD */}
      <div className="grid md:grid-cols-2 gap-3">
        <Card className="p-3.5">
          <div className="text-[12px] font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5"><ShieldAlert size={14} className="text-rose-500" /> Violations de données (incidents)</div>
          {breaches.length === 0 ? (
            <div className="text-[12px] text-slate-400">Aucune violation de données enregistrée.</div>
          ) : (
            <div className="space-y-1">
              {breaches.slice(0, 4).map((i) => (
                <div key={i.id} className="flex items-center gap-2 text-[12px]">
                  <span className="font-mono text-[10px] text-slate-400">{i.ref}</span>
                  <span className="flex-1 min-w-0 truncate text-slate-700 dark:text-slate-200">{i.title}</span>
                  <span className="text-[10px] text-slate-400">{i.status}</span>
                </div>
              ))}
              <div className="text-[10px] text-slate-400 mt-1">Rappel : une violation de données personnelles doit être notifiée à la CNIL sous 72 h.</div>
            </div>
          )}
        </Card>
        <Card className="p-3.5">
          <div className="text-[12px] font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5"><Truck size={14} className="text-orange-500" /> Sous-traitants (accès données pers./sens.)</div>
          {processors.length === 0 ? (
            <div className="text-[12px] text-slate-400">Aucun sous-traitant accédant à des données personnelles.</div>
          ) : (
            <div className="space-y-1">
              {processors.slice(0, 4).map((s) => (
                <div key={s.id} className="flex items-center gap-2 text-[12px]">
                  <span className="flex-1 min-w-0 truncate text-slate-700 dark:text-slate-200">{s.name}</span>
                  <span className="text-[10px] text-slate-400">{s.dataAccess}</span>
                </div>
              ))}
              <div className="text-[10px] text-slate-400 mt-1">Chaque sous-traitant doit être encadré par un contrat (art. 28).</div>
            </div>
          )}
        </Card>
      </div>

      <Card className="p-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[10rem]">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher…" className="w-full text-[13px] border border-slate-200 rounded-lg pl-8 pr-2 py-1.5 outline-none focus:border-emerald-400" />
          </div>
          <select value={fBasis} onChange={(e) => setFBasis(e.target.value)} aria-label="Base légale" className="text-[12px] border border-slate-200 rounded-lg px-2 py-1.5 bg-white">
            <option value="">Toutes bases légales</option>
            {LEGAL_BASES.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
      </Card>

      {processing.length === 0 ? (
        <EmptyState icon={FileLock2} title="Registre vide" subtitle={canCreate ? "Recense les traitements de données personnelles (obligation RGPD art. 30)." : "Le registre sera géré par l'équipe GRC."} />
      ) : filtered.length === 0 ? (
        <Card className="p-6 text-center text-[13px] text-slate-400">Aucun traitement ne correspond au filtre.</Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {filtered.map((p) => (
            <ProcessingCard key={p.id} p={p} owner={p.ownerId ? profileById(p.ownerId).nom : "—"} reviewLate={isRopaReviewLate(p, now)} piaTodo={piaOutstanding(p)} onClick={() => setEditId(p.id)} />
          ))}
        </div>
      )}

      {(creating || editing) && <ProcessingModal item={editing} creating={creating} onClose={() => { setCreating(false); setEditId(null); }} />}
    </div>
  );
}

function ProcessingCard({ p, owner, reviewLate, piaTodo, onClick }: { p: ProcessingActivity; owner: string; reviewLate: boolean; piaTodo: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-left rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-soft p-4 hover:-translate-y-0.5 transition-transform">
      <div className="flex items-start gap-2 mb-1.5 flex-wrap">
        <Token>{p.ref}</Token>
        {p.sensitiveData && <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">Données sensibles</span>}
        {p.piaRequired && <span className={`text-[10px] px-2 py-0.5 rounded-full border ${PIA_RISK_TONE[p.piaRisk] ?? "bg-slate-100 text-slate-500"}`}>AIPD · {p.piaStatus}</span>}
        {p.status !== "Actif" && <span className="text-[10px] text-slate-400">· {p.status}</span>}
      </div>
      <div className="text-[14px] font-semibold text-slate-800 dark:text-slate-100 leading-snug">{p.name}</div>
      {p.purpose && <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{p.purpose}</div>}
      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        <span className="text-[10px] text-slate-500 bg-slate-100 dark:bg-slate-800 rounded-full px-2 py-0.5">{p.legalBasis || "base légale ?"}</span>
        {p.dataCategories.slice(0, 3).map((c) => <span key={c} className="text-[10px] text-blue-600 bg-blue-50 rounded-full px-2 py-0.5">{c}</span>)}
        {p.dataCategories.length > 3 && <span className="text-[10px] text-slate-400">+{p.dataCategories.length - 3}</span>}
      </div>
      <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-400 flex-wrap">
        <span>{owner}</span>
        {p.service && <span>· {p.service}</span>}
        {piaTodo && <span className="text-amber-600 font-medium">· AIPD à réaliser</span>}
        {p.reviewDate && <span className={reviewLate ? "text-rose-600 font-medium" : ""}>· revue {fmt(p.reviewDate)}</span>}
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

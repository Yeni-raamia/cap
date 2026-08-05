"use client";

import { useMemo, useState } from "react";
import { Plus, ScrollText, Search, Users2 } from "lucide-react";
import {
  fmt,
  policyCoverage,
  POLICY_DOMAINS,
  POLICY_STATUTS,
  type Policy,
} from "@/lib/domain";
import { useApp } from "@/components/app-context";
import { Card, Token } from "@/components/atoms";
import { PageHero } from "@/components/PageHero";
import { EmptyState } from "@/components/EmptyState";
import { PolicyModal } from "@/components/PolicyModal";

const statusTone: Record<string, string> = {
  Brouillon: "bg-slate-100 text-slate-600",
  "En vigueur": "bg-emerald-100 text-emerald-700",
  Révisée: "bg-sky-100 text-sky-700",
  Retirée: "bg-slate-200 text-slate-400",
};

export default function PolitiquesPage() {
  const { policies, me, profileById, readOnly } = useApp();
  const [search, setSearch] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fDomain, setFDomain] = useState("");
  const [creating, setCreating] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return policies.filter((p) =>
      (!q || p.title.toLowerCase().includes(q) || p.ref.toLowerCase().includes(q) || p.reference.toLowerCase().includes(q)) &&
      (!fStatus || p.status === fStatus) &&
      (!fDomain || p.domain === fDomain)
    );
  }, [policies, search, fStatus, fDomain]);

  const kpi = useMemo(() => {
    const enVigueur = policies.filter((p) => p.status === "En vigueur");
    const covs = enVigueur.map((p) => policyCoverage(p)).filter((c) => c.total > 0);
    const avg = covs.length ? Math.round(covs.reduce((a, c) => a + c.pct, 0) / covs.length) : 0;
    const aRevoir = policies.filter((p) => p.reviewDate && p.reviewDate.getTime() < Date.now() && p.status !== "Retirée").length;
    return { total: policies.length, enVigueur: enVigueur.length, avg, aRevoir };
  }, [policies]);

  const editing = editId ? policies.find((p) => p.id === editId) ?? null : null;
  const canCreate = !readOnly;

  return (
    <div className="space-y-5 animate-float">
      <PageHero
        kicker="Gouvernance · Risque · Conformité"
        icon={ScrollText}
        title="Politiques de sécurité"
        subtitle="Diffuser les politiques et suivre, par direction/service, leur cycle : Diffusée → Consultée → Comprise → Applicable."
        right={canCreate ? (
          <button onClick={() => setCreating(true)} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-slate-900 dark:bg-emerald-600 rounded-xl px-3.5 py-2 hover:-translate-y-0.5 transition-transform shadow-soft">
            <Plus size={15} /> Nouvelle politique
          </button>
        ) : undefined}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Politiques" value={`${kpi.total}`} tone="text-slate-700" />
        <Kpi label="En vigueur" value={`${kpi.enVigueur}`} tone="text-emerald-600" />
        <Kpi label="Applicabilité moyenne" value={`${kpi.avg}%`} tone="text-sky-600" />
        <Kpi label="Revue en retard" value={`${kpi.aRevoir}`} tone="text-amber-600" />
      </div>

      <Card className="p-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[10rem]">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher…" className="w-full text-[13px] border border-slate-200 rounded-lg pl-8 pr-2 py-1.5 outline-none focus:border-emerald-400" />
          </div>
          <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} aria-label="Statut" className="text-[12px] border border-slate-200 rounded-lg px-2 py-1.5 bg-white">
            <option value="">Tous statuts</option>
            {POLICY_STATUTS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={fDomain} onChange={(e) => setFDomain(e.target.value)} aria-label="Domaine" className="text-[12px] border border-slate-200 rounded-lg px-2 py-1.5 bg-white">
            <option value="">Tous domaines</option>
            {POLICY_DOMAINS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </Card>

      {policies.length === 0 ? (
        <EmptyState icon={ScrollText} title="Aucune politique" subtitle={canCreate ? "Ajoute une première politique et suis sa diffusion par service." : "Les politiques seront gérées par l'équipe GRC."} />
      ) : filtered.length === 0 ? (
        <Card className="p-6 text-center text-[13px] text-slate-400">Aucune politique ne correspond au filtre.</Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {filtered.map((p) => {
            const cov = policyCoverage(p);
            return (
              <button key={p.id} onClick={() => setEditId(p.id)} className="text-left rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-soft p-4 hover:-translate-y-0.5 transition-transform">
                <div className="flex items-start gap-2 mb-1.5 flex-wrap">
                  <Token>{p.ref}</Token>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusTone[p.status] ?? "bg-slate-100 text-slate-500"}`}>{p.status}</span>
                  {p.version && <span className="text-[10px] text-slate-400">v{p.version}</span>}
                </div>
                <div className="text-[14px] font-semibold text-slate-800 leading-snug">{p.title}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{[p.domain, p.reference].filter(Boolean).join(" · ")}</div>
                {/* Barre d'applicabilité */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                    <span className="inline-flex items-center gap-1"><Users2 size={12} /> Applicabilité · {cov.applicable}/{cov.total} services</span>
                    <span className="font-mono">{cov.pct}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${cov.pct}%` }} />
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-400 flex-wrap">
                  <span>{profileById(p.ownerId).nom}</span>
                  {p.reviewDate && <span className={p.reviewDate.getTime() < Date.now() && p.status !== "Retirée" ? "text-amber-600 font-medium" : ""}>· revue {fmt(p.reviewDate)}</span>}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {(creating || editing) && (
        <PolicyModal policy={editing} creating={creating} onClose={() => { setCreating(false); setEditId(null); }} />
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

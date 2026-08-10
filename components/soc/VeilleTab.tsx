"use client";

import { useMemo, useState } from "react";
import { Plus, Radio, Search } from "lucide-react";
import { INCIDENT_SEVERITY_TONE, INTEL_KINDS, INTEL_STATUS_TONE, TLP_TONE, fmt, isIntelActive, type IntelItem } from "@/lib/domain";
import { useApp } from "@/components/app-context";
import { Card, Token } from "@/components/atoms";
import { GrcTabHeader } from "@/components/grc/GrcTabHeader";
import { EmptyState } from "@/components/EmptyState";
import { IntelModal } from "@/components/IntelModal";

export function VeilleTab() {
  const { intel, readOnly } = useApp();
  const now = useMemo(() => new Date(), []);
  const [search, setSearch] = useState("");
  const [fKind, setFKind] = useState("");
  const [fActive, setFActive] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return intel.filter((i) =>
      (!q || i.title.toLowerCase().includes(q) || i.value.toLowerCase().includes(q) || i.source.toLowerCase().includes(q) || i.attackTechniques.some((t) => t.toLowerCase().includes(q))) &&
      (!fKind || i.kind === fKind) &&
      (!fActive || isIntelActive(i, now))
    );
  }, [intel, search, fKind, fActive, now]);

  const actifs = intel.filter((i) => isIntelActive(i, now)).length;
  const critiques = intel.filter((i) => isIntelActive(i, now) && i.severity === "Critique").length;
  const iocs = intel.filter((i) => i.kind === "IOC").length;
  const editing = editId ? intel.find((i) => i.id === editId) ?? null : null;
  const canCreate = !readOnly;

  return (
    <div className="space-y-5">
      <GrcTabHeader
        title="Veille & threat intelligence"
        subtitle="Le registre des IOCs, avis (CERT-FR…) et vulnérabilités : ce qu'il faut surveiller, sa conduite à tenir et son lien avec ATT&CK."
        right={canCreate ? (
          <button onClick={() => setCreating(true)} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-slate-900 dark:bg-emerald-600 rounded-xl px-3.5 py-2 hover:-translate-y-0.5 transition-transform shadow-soft">
            <Plus size={15} /> Nouvel élément
          </button>
        ) : undefined}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Éléments" value={`${intel.length}`} tone="text-slate-700" />
        <Kpi label="Actifs" value={`${actifs}`} tone="text-rose-600" />
        <Kpi label="Actifs critiques" value={`${critiques}`} tone="text-rose-700" />
        <Kpi label="IOCs" value={`${iocs}`} tone="text-indigo-600" />
      </div>

      <Card className="p-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[10rem]">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher (valeur, source, T####…)" className="w-full text-[13px] border border-slate-200 rounded-lg pl-8 pr-2 py-1.5 outline-none focus:border-emerald-400" />
          </div>
          <select value={fKind} onChange={(e) => setFKind(e.target.value)} aria-label="Nature" className="text-[12px] border border-slate-200 rounded-lg px-2 py-1.5 bg-white">
            <option value="">Toutes natures</option>
            {INTEL_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
          <button onClick={() => setFActive((v) => !v)} className={`text-[12px] rounded-lg px-2.5 py-1.5 border ${fActive ? "bg-rose-50 border-rose-200 text-rose-700" : "border-slate-200 text-slate-500"}`}>Actifs</button>
        </div>
      </Card>

      {intel.length === 0 ? (
        <EmptyState icon={Radio} title="Aucun élément de veille" subtitle={canCreate ? "Ajoute un IOC, un avis CERT-FR ou une vulnérabilité à surveiller." : "La veille sera gérée par l'équipe SOC."} />
      ) : filtered.length === 0 ? (
        <Card className="p-6 text-center text-[13px] text-slate-400">Aucun élément ne correspond au filtre.</Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {filtered.map((i) => <IntelCard key={i.id} i={i} active={isIntelActive(i, now)} onClick={() => setEditId(i.id)} />)}
        </div>
      )}

      {(creating || editing) && <IntelModal item={editing} creating={creating} onClose={() => { setCreating(false); setEditId(null); }} />}
    </div>
  );
}

function IntelCard({ i, active, onClick }: { i: IntelItem; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`text-left rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-soft p-4 hover:-translate-y-0.5 transition-transform ${!active ? "opacity-70" : ""}`}>
      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
        <Token>{i.ref}</Token>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{i.kind === "IOC" ? i.iocType : i.kind}</span>
        <span className={`text-[10px] px-2 py-0.5 rounded-full ${INTEL_STATUS_TONE[i.status] ?? "bg-slate-100 text-slate-500"}`}>{i.status}</span>
        <span className={`ml-auto text-[9px] px-1.5 py-0.5 rounded-full border ${TLP_TONE[i.tlp] ?? ""}`}>{i.tlp}</span>
      </div>
      <div className="text-[14px] font-semibold text-slate-800 dark:text-slate-100 leading-snug">{i.title}</div>
      {i.value && <div className="text-[11px] font-mono text-rose-600 mt-0.5 truncate">{i.value}</div>}
      <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-400 flex-wrap">
        <span className={`px-1.5 py-0.5 rounded-full border ${INCIDENT_SEVERITY_TONE[i.severity] ?? ""}`}>{i.severity}</span>
        {i.source && <span>· {i.source}</span>}
        {i.attackTechniques.length > 0 && <span className="font-mono text-indigo-500">· {i.attackTechniques.slice(0, 3).join(" ")}</span>}
        {i.expiresAt && <span className="ml-auto">exp. {fmt(i.expiresAt)}</span>}
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

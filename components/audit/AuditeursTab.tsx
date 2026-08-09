"use client";

import { useMemo, useState } from "react";
import { Award, Plus, ShieldCheck, UserCheck } from "lucide-react";
import { AUDITOR_ROLE_TONE, type Auditor } from "@/lib/domain";
import { useApp } from "@/components/app-context";
import { Card, Token } from "@/components/atoms";
import { GrcTabHeader } from "@/components/grc/GrcTabHeader";
import { EmptyState } from "@/components/EmptyState";
import { AuditorModal } from "@/components/AuditorModal";

export function AuditeursTab() {
  const { auditors, audits, readOnly } = useApp();
  const [creating, setCreating] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Nombre d'audits menés par auditeur (via le profil rattaché).
  const auditCount = useMemo(() => {
    const m = new Map<string, number>();
    audits.forEach((a) => m.set(a.auditorId, (m.get(a.auditorId) ?? 0) + 1));
    return m;
  }, [audits]);

  const editing = editId ? auditors.find((a) => a.id === editId) ?? null : null;
  const canCreate = !readOnly;
  const actifs = auditors.filter((a) => a.status === "Actif").length;

  return (
    <div className="space-y-5">
      <GrcTabHeader
        title="Auditeurs & compétences"
        subtitle="Le registre de l'équipe d'audit : rôles, domaines de compétence, certifications et indépendance (ISO 19011 §7)."
        right={canCreate ? (
          <button onClick={() => setCreating(true)} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-slate-900 dark:bg-emerald-600 rounded-xl px-3.5 py-2 hover:-translate-y-0.5 transition-transform shadow-soft">
            <Plus size={15} /> Nouvel auditeur
          </button>
        ) : undefined}
      />

      <div className="grid grid-cols-3 gap-3">
        <Kpi label="Auditeurs" value={`${auditors.length}`} tone="text-slate-700" />
        <Kpi label="Actifs" value={`${actifs}`} tone="text-emerald-600" />
        <Kpi label="Auditeurs principaux" value={`${auditors.filter((a) => a.role === "Auditeur principal").length}`} tone="text-indigo-600" />
      </div>

      {auditors.length === 0 ? (
        <EmptyState icon={UserCheck} title="Aucun auditeur" subtitle={canCreate ? "Ajoute les membres de l'équipe d'audit et leurs domaines de compétence." : "Le registre des auditeurs sera géré par l'équipe."} />
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {auditors.map((a) => <AuditorCard key={a.id} a={a} audits={auditCount.get(a.profileId) ?? 0} onClick={() => setEditId(a.id)} />)}
        </div>
      )}

      {(creating || editing) && <AuditorModal auditor={editing} creating={creating} onClose={() => { setCreating(false); setEditId(null); }} />}
    </div>
  );
}

function AuditorCard({ a, audits, onClick }: { a: Auditor; audits: number; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`text-left rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-soft p-4 hover:-translate-y-0.5 transition-transform ${a.status !== "Actif" ? "opacity-70" : ""}`}>
      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
        <Token>{a.ref}</Token>
        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${AUDITOR_ROLE_TONE[a.role] ?? "bg-slate-100 text-slate-600"}`}>{a.role}</span>
        {a.status !== "Actif" && <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">Inactif</span>}
        {audits > 0 && <span className="ml-auto text-[11px] text-slate-400">{audits} audit{audits > 1 ? "s" : ""}</span>}
      </div>
      <div className="text-[14px] font-semibold text-slate-800 dark:text-slate-100">{a.name}</div>
      {a.certifications && <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1"><Award size={12} className="text-amber-500" /> {a.certifications}</div>}
      {a.competencies.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {a.competencies.slice(0, 6).map((c) => <span key={c} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-50 dark:bg-slate-800 text-slate-500 border border-slate-100 dark:border-slate-700">{c}</span>)}
          {a.competencies.length > 6 && <span className="text-[10px] text-slate-400">+{a.competencies.length - 6}</span>}
        </div>
      )}
      {a.independence && <div className="text-[11px] text-slate-400 mt-2 flex items-start gap-1"><ShieldCheck size={12} className="mt-0.5 shrink-0" /> {a.independence}</div>}
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

"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ClipboardCheck } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { AuditDashboardTab } from "@/components/audit/AuditDashboardTab";
import { ProgrammeTab } from "@/components/audit/ProgrammeTab";
import { GrillesTab } from "@/components/audit/GrillesTab";
import { AuditsTab } from "@/components/audit/AuditsTab";
import { ConstatsTab } from "@/components/audit/ConstatsTab";
import { AuditeursTab } from "@/components/audit/AuditeursTab";
import { AcademieTab } from "@/components/grc/AcademieTab";

const TABS = [
  { id: "dashboard", label: "Tableau de bord" },
  { id: "academie", label: "Académie" },
  { id: "programme", label: "Programme" },
  { id: "audits", label: "Audits" },
  { id: "constats", label: "Constats" },
  { id: "grilles", label: "Grilles" },
  { id: "auditeurs", label: "Auditeurs" },
];

function AuditInner() {
  const params = useSearchParams();
  const router = useRouter();
  const param = params.get("tab");
  const active = TABS.some((t) => t.id === param) ? (param as string) : "dashboard";
  const setTab = (id: string) => router.replace(`/audit?tab=${id}`, { scroll: false });

  return (
    <div className="space-y-5 animate-float">
      <PageHero
        kicker="Audits techniques"
        icon={ClipboardCheck}
        title="Audit"
        subtitle="Évaluer la configuration réelle du SI par des grilles de contrôle — score par domaine, radar et suivi dans le temps."
      />

      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3.5 py-2 text-[13px] font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
              active === t.id ? "border-emerald-500 text-emerald-700 dark:text-emerald-400" : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {active === "dashboard" && <AuditDashboardTab onTab={setTab} />}
      {active === "academie" && <AcademieTab track="audit" title="Académie Audit" subtitle="Monter en compétence sur la méthode d'audit (ISO 19011), les principes (indépendance, preuves, approche par les risques) et des cas d'études réels." levelLabel="Niveau de compétence Audit" />}
      {active === "programme" && <ProgrammeTab />}
      {active === "audits" && <AuditsTab />}
      {active === "constats" && <ConstatsTab />}
      {active === "grilles" && <GrillesTab />}
      {active === "auditeurs" && <AuditeursTab />}
    </div>
  );
}

export default function AuditPage() {
  return (
    <Suspense fallback={<div className="text-[13px] text-slate-400 py-10 text-center">Chargement du module Audit…</div>}>
      <AuditInner />
    </Suspense>
  );
}

"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { DashboardTab } from "@/components/grc/DashboardTab";
import { ActifsTab } from "@/components/grc/ActifsTab";
import { RisquesTab } from "@/components/grc/RisquesTab";
import { ConformiteTab } from "@/components/grc/ConformiteTab";
import { PolitiquesTab } from "@/components/grc/PolitiquesTab";
import { ControlesTab } from "@/components/grc/ControlesTab";
import { ActionsTab } from "@/components/grc/ActionsTab";
import { PlanTab } from "@/components/grc/PlanTab";
import { DistinctionsTab } from "@/components/grc/DistinctionsTab";

const TABS = [
  { id: "dashboard", label: "Tableau de bord" },
  { id: "plan", label: "Plan de travail" },
  { id: "actifs", label: "Actifs" },
  { id: "risques", label: "Risques" },
  { id: "conformite", label: "Conformité" },
  { id: "politiques", label: "Politiques" },
  { id: "controles", label: "Contrôles terrain" },
  { id: "actions", label: "Plan d'actions" },
  { id: "distinctions", label: "Distinctions" },
];

function GrcInner() {
  const params = useSearchParams();
  const router = useRouter();
  const param = params.get("tab");
  const active = TABS.some((t) => t.id === param) ? (param as string) : "dashboard";
  const setTab = (id: string) => router.replace(`/grc?tab=${id}`, { scroll: false });

  return (
    <div className="space-y-5 animate-float">
      <PageHero
        kicker="Gouvernance · Risque · Conformité"
        icon={ShieldCheck}
        title="GRC"
        subtitle="Piloter les actifs, les risques et la conformité de l'équipe — tout est relié pour croiser l'information."
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

      {active === "dashboard" && <DashboardTab onTab={setTab} />}
      {active === "plan" && <PlanTab />}
      {active === "actifs" && <ActifsTab />}
      {active === "risques" && <RisquesTab />}
      {active === "conformite" && <ConformiteTab />}
      {active === "politiques" && <PolitiquesTab />}
      {active === "controles" && <ControlesTab />}
      {active === "actions" && <ActionsTab />}
      {active === "distinctions" && <DistinctionsTab />}
    </div>
  );
}

export default function GrcPage() {
  return (
    <Suspense fallback={<div className="text-[13px] text-slate-400 py-10 text-center">Chargement du module GRC…</div>}>
      <GrcInner />
    </Suspense>
  );
}

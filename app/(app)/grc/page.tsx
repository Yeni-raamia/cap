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
import { JoyauxTab } from "@/components/grc/JoyauxTab";
import { DirectionsTab } from "@/components/grc/DirectionsTab";
import { AcademieTab } from "@/components/grc/AcademieTab";
import { MissionsTab } from "@/components/grc/MissionsTab";
import { FournisseursTab } from "@/components/grc/FournisseursTab";
import { ContinuiteTab } from "@/components/grc/ContinuiteTab";
import { IncidentsTab } from "@/components/grc/IncidentsTab";
import { RgpdTab } from "@/components/grc/RgpdTab";
import { RevueTab } from "@/components/grc/RevueTab";

const TABS = [
  { id: "dashboard", label: "Tableau de bord" },
  { id: "academie", label: "Entraînement" },
  { id: "plan", label: "Plan de travail" },
  { id: "directions", label: "Directions" },
  { id: "missions", label: "Missions" },
  { id: "continuite", label: "Continuité" },
  { id: "fournisseurs", label: "Fournisseurs" },
  { id: "actifs", label: "Actifs" },
  { id: "joyaux", label: "Joyaux" },
  { id: "risques", label: "Risques" },
  { id: "conformite", label: "Conformité" },
  { id: "rgpd", label: "RGPD" },
  { id: "politiques", label: "Politiques" },
  { id: "controles", label: "Contrôles terrain" },
  { id: "incidents", label: "Incidents" },
  { id: "actions", label: "Plan d'actions" },
  { id: "revue", label: "Revue de direction" },
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
      {active === "academie" && <AcademieTab />}
      {active === "plan" && <PlanTab />}
      {active === "directions" && <DirectionsTab />}
      {active === "missions" && <MissionsTab />}
      {active === "continuite" && <ContinuiteTab />}
      {active === "fournisseurs" && <FournisseursTab />}
      {active === "actifs" && <ActifsTab />}
      {active === "joyaux" && <JoyauxTab />}
      {active === "risques" && <RisquesTab />}
      {active === "conformite" && <ConformiteTab />}
      {active === "rgpd" && <RgpdTab />}
      {active === "politiques" && <PolitiquesTab />}
      {active === "controles" && <ControlesTab />}
      {active === "incidents" && <IncidentsTab />}
      {active === "actions" && <ActionsTab />}
      {active === "revue" && <RevueTab />}
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

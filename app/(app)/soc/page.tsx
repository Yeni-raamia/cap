"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Radar } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { SocDashboardTab } from "@/components/soc/SocDashboardTab";
import { RunbooksTab } from "@/components/soc/RunbooksTab";
import { ProceduresTab } from "@/components/soc/ProceduresTab";
import { AttackTab } from "@/components/soc/AttackTab";

const TABS = [
  { id: "dashboard", label: "Tableau de bord" },
  { id: "runbooks", label: "Runbooks" },
  { id: "procedures", label: "Procédures" },
  { id: "attack", label: "ATT&CK" },
];

function SocInner() {
  const params = useSearchParams();
  const router = useRouter();
  const param = params.get("tab");
  const active = TABS.some((t) => t.id === param) ? (param as string) : "dashboard";
  const setTab = (id: string) => router.replace(`/soc?tab=${id}`, { scroll: false });

  return (
    <div className="space-y-5 animate-float">
      <PageHero
        kicker="Centre opérationnel de sécurité — méthode & bonnes pratiques"
        icon={Radar}
        title="SOC"
        subtitle="La colonne vertébrale méthodologique de l'équipe : runbooks de réponse, procédures et montée en compétence — au-dessus des outils du SOC (Wazuh…)."
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

      {active === "dashboard" && <SocDashboardTab onTab={setTab} />}
      {active === "runbooks" && <RunbooksTab />}
      {active === "procedures" && <ProceduresTab />}
      {active === "attack" && <AttackTab />}
    </div>
  );
}

export default function SocPage() {
  return (
    <Suspense fallback={<div className="text-[13px] text-slate-400 py-10 text-center">Chargement du module SOC…</div>}>
      <SocInner />
    </Suspense>
  );
}

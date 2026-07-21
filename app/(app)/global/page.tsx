"use client";

import { Users } from "lucide-react";
import { useApp } from "@/components/app-context";
import { PageHero } from "@/components/PageHero";
import { SuiviExplorer } from "@/components/SuiviExplorer";

export default function VueGlobalePage() {
  const { items } = useApp();

  return (
    <div className="space-y-6 animate-float">
      <PageHero
        kicker="Supervision"
        icon={Users}
        title="Vue globale"
        subtitle="Le travail de toute l'équipe, en un coup d'œil."
      />
      <SuiviExplorer items={items} showResponsable showKpis />
    </div>
  );
}

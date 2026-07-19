"use client";

import { useApp } from "@/components/app-context";
import { SuiviExplorer } from "@/components/SuiviExplorer";

export default function VueGlobalePage() {
  const { items } = useApp();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Vue globale</h1>
        <p className="text-[13px] text-slate-500">
          Le travail de toute l&apos;équipe, en un coup d&apos;œil.
        </p>
      </div>
      <SuiviExplorer items={items} showResponsable showKpis />
    </div>
  );
}

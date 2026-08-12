"use client";

import { useMemo, useState } from "react";
import { AlertOctagon, ArrowRight, FileWarning, ShieldAlert } from "lucide-react";
import { isCapaLate } from "@/lib/domain";
import { useApp } from "@/components/app-context";
import { Card } from "@/components/atoms";
import { NegligencesPanel } from "./NegligencesPanel";
import { NonConformitesPanel } from "./NonConformitesPanel";

type Registre = "nonconformites" | "negligences";

/**
 * Onglet « Écarts & manquements » — les deux registres réunis.
 *
 * Non-conformités et négligences partagent le même modèle (gravité, risque,
 * transmission au DG, décision) : les séparer en deux entrées de menu les
 * rendait difficiles à croiser. Ici, la non-conformité retrouve en outre sa
 * place ISO 27001 §10.1, à côté des politiques, des contrôles et du plan
 * d'actions correctives.
 */
export function EcartsTab({ onTab }: { onTab?: (id: string) => void }) {
  const { negligences, nonConformites, capaActions, now } = useApp();
  const [registre, setRegistre] = useState<Registre>("nonconformites");

  const ouvert = (s: string) => s !== "Décision rendue" && s !== "Classée";

  const stats = useMemo(() => {
    const ncOuvertes = nonConformites.filter((n) => ouvert(n.status)).length;
    const negOuvertes = negligences.filter((n) => ouvert(n.status)).length;
    const graves = [...nonConformites, ...negligences].filter(
      (n) => n.gravite === "Grave" || n.gravite === "Critique"
    ).length;
    // Actions correctives nées d'une non-conformité (traçabilité ISO 27001 §10.1).
    const liees = capaActions.filter((a) => a.sourceType === "nonconformite");
    return {
      ncOuvertes,
      negOuvertes,
      graves,
      capaLiees: liees.length,
      capaRetard: liees.filter((a) => isCapaLate(a, now)).length,
    };
  }, [nonConformites, negligences, capaActions, now]);

  const REGISTRES: { key: Registre; label: string; icon: typeof FileWarning; count: number }[] = [
    { key: "nonconformites", label: "Non-conformités", icon: FileWarning, count: nonConformites.length },
    { key: "negligences", label: "Négligences", icon: AlertOctagon, count: negligences.length },
  ];

  return (
    <div className="space-y-4">
      {/* Repères communs aux deux registres */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="text-2xl font-semibold text-amber-600">{stats.ncOuvertes}</div>
          <div className="text-[12px] text-slate-500">Non-conformités à traiter</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-semibold text-amber-600">{stats.negOuvertes}</div>
          <div className="text-[12px] text-slate-500">Négligences à traiter</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-semibold text-rose-600">{stats.graves}</div>
          <div className="text-[12px] text-slate-500">Graves ou critiques</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-semibold text-slate-800 dark:text-slate-100">{stats.capaLiees}</div>
          <div className="text-[12px] text-slate-500">
            Actions correctives liées
            {stats.capaRetard > 0 && <span className="text-rose-600 font-medium"> · {stats.capaRetard} en retard</span>}
          </div>
        </Card>
      </div>

      {/* Rappel du circuit, avec accès direct au plan d'actions */}
      <div className="flex items-start gap-2 text-[12px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2">
        <ShieldAlert size={15} className="text-slate-400 mt-0.5 shrink-0" />
        <span className="flex-1">
          Un écart constaté se transmet au DG pour décision, puis se traite par une{" "}
          <b>action corrective</b> — c&apos;est la boucle demandée par l&apos;ISO 27001 §10.1. Depuis chaque fiche,
          le bouton « Action corrective » crée l&apos;action et conserve le lien vers l&apos;écart d&apos;origine.
        </span>
        {onTab && (
          <button
            onClick={() => onTab("actions")}
            className="shrink-0 inline-flex items-center gap-1 text-[12px] font-medium text-emerald-700 hover:underline"
          >
            Plan d&apos;actions <ArrowRight size={12} />
          </button>
        )}
      </div>

      {/* Choix du registre */}
      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 w-fit">
        {REGISTRES.map((r) => (
          <button
            key={r.key}
            onClick={() => setRegistre(r.key)}
            aria-pressed={registre === r.key}
            className={`inline-flex items-center gap-1.5 text-[12.5px] px-3 py-1.5 rounded-md transition ${
              registre === r.key
                ? "bg-white dark:bg-slate-700 shadow-sm font-medium text-slate-800 dark:text-slate-100"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <r.icon size={14} />
            {r.label}
            <span className="text-[11px] text-slate-400">{r.count}</span>
          </button>
        ))}
      </div>

      {registre === "nonconformites" ? <NonConformitesPanel /> : <NegligencesPanel />}
    </div>
  );
}

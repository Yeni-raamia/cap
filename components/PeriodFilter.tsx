"use client";

import { CalendarRange, X } from "lucide-react";
import { isPeriodActive, PERIOD_OPTIONS, type PeriodFilter as Period } from "@/lib/period";

/**
 * Barre de filtres temporels partagée (jour / semaine / mois / période
 * personnalisée / en retard / sans date). Utilisée par les tâches, les
 * projets et le planning pour offrir partout le même vocabulaire.
 */
export function PeriodFilter({
  value,
  onChange,
  className = "",
  compact = false,
}: {
  value: Period;
  onChange: (next: Period) => void;
  className?: string;
  /** Rend la barre plus discrète (dans un en-tête de carte). */
  compact?: boolean;
}) {
  const active = isPeriodActive(value);
  const pick = (key: Period["key"]) =>
    // Changer de préréglage efface les bornes personnalisées devenues sans objet.
    onChange(key === "perso" ? { key, from: value.from, to: value.to } : { key });

  return (
    <div className={`flex items-center gap-1.5 flex-wrap ${className}`}>
      {!compact && <CalendarRange size={14} className="text-slate-400 shrink-0" aria-hidden />}
      <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 flex-wrap">
        {PERIOD_OPTIONS.map((o) => (
          <button
            key={o.key}
            onClick={() => pick(o.key)}
            title={o.title}
            aria-pressed={value.key === o.key}
            className={`text-[12px] px-2.5 py-1 rounded-md transition whitespace-nowrap ${
              value.key === o.key
                ? "bg-white dark:bg-slate-700 shadow-sm font-medium text-slate-800 dark:text-slate-100"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {value.key === "perso" && (
        <div className="flex items-center gap-1">
          <input
            type="date"
            value={value.from ?? ""}
            onChange={(e) => onChange({ ...value, key: "perso", from: e.target.value || undefined })}
            aria-label="Début de la période"
            className="text-[12px] border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 bg-white dark:bg-slate-900"
          />
          <span className="text-[12px] text-slate-400">→</span>
          <input
            type="date"
            value={value.to ?? ""}
            onChange={(e) => onChange({ ...value, key: "perso", to: e.target.value || undefined })}
            aria-label="Fin de la période"
            className="text-[12px] border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 bg-white dark:bg-slate-900"
          />
        </div>
      )}

      {active && (
        <button
          onClick={() => onChange({ key: "tous" })}
          title="Retirer le filtre de période"
          className="inline-flex items-center gap-1 text-[11.5px] text-slate-500 hover:text-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1"
        >
          <X size={12} /> Effacer
        </button>
      )}
    </div>
  );
}

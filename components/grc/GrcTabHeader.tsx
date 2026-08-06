import type { ReactNode } from "react";

/** En-tête compact d'un onglet du module GRC (titre + sous-titre + action). */
export function GrcTabHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3 flex-wrap">
      <div className="min-w-0">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-tight">{title}</h2>
        {subtitle && <p className="text-[12.5px] text-slate-500 mt-0.5 max-w-2xl">{subtitle}</p>}
      </div>
      {right && <div className="flex items-center gap-2 flex-wrap shrink-0">{right}</div>}
    </div>
  );
}

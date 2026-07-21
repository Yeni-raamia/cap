import type { LucideIcon } from "lucide-react";

/** En-tête de page premium (titre éditorial + sous-titre + actions). */
export function PageHero({
  kicker,
  icon: Icon,
  title,
  subtitle,
  right,
}: {
  kicker?: string;
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 flex-wrap">
      <div className="min-w-0">
        {kicker && (
          <div className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-emerald-600 mb-1.5">
            {Icon && <Icon size={13} />} {kicker}
          </div>
        )}
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 leading-tight">{title}</h1>
        {subtitle && <p className="text-[13.5px] text-slate-500 mt-1.5 max-w-2xl">{subtitle}</p>}
      </div>
      {right && <div className="flex items-center gap-2 flex-wrap shrink-0">{right}</div>}
    </div>
  );
}

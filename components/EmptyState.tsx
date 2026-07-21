import type { LucideIcon } from "lucide-react";

/** État vide soigné : icône douce, titre, sous-titre, action optionnelle. */
export function EmptyState({
  icon: Icon,
  title,
  subtitle,
  action,
  compact,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? "py-6" : "py-10"}`}>
      <div className="relative mb-3">
        <span className="absolute inset-0 rounded-2xl bg-emerald-400/20 blur-xl" aria-hidden />
        <div className="relative h-12 w-12 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 grid place-items-center text-slate-400 dark:text-slate-500 ring-1 ring-black/5">
          <Icon size={22} />
        </div>
      </div>
      <div className="text-[14px] font-semibold text-slate-700">{title}</div>
      {subtitle && <div className="text-[12.5px] text-slate-400 mt-1 max-w-xs">{subtitle}</div>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

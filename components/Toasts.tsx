"use client";

import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { useApp } from "./app-context";

const META = {
  success: { icon: CheckCircle2, ring: "border-emerald-200 dark:border-emerald-500/30", dot: "text-emerald-500" },
  error: { icon: XCircle, ring: "border-rose-200 dark:border-rose-500/30", dot: "text-rose-500" },
  info: { icon: Info, ring: "border-sky-200 dark:border-sky-500/30", dot: "text-sky-500" },
} as const;

export function Toasts() {
  const { toasts, dismissToast } = useApp();
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-5 right-5 z-[70] flex flex-col gap-2 w-[320px] max-w-[calc(100vw-2.5rem)]">
      {toasts.map((t) => {
        const m = META[t.kind];
        return (
          <div
            key={t.id}
            role="status"
            className={`animate-slide-right flex items-start gap-2.5 bg-white dark:bg-slate-900 border ${m.ring} rounded-xl shadow-float px-3.5 py-3`}
          >
            <m.icon size={18} className={`${m.dot} mt-0.5 shrink-0`} />
            <span className="flex-1 text-[13px] text-slate-700 dark:text-slate-100 leading-snug">{t.message}</span>
            <button onClick={() => dismissToast(t.id)} aria-label="Fermer" className="text-slate-300 hover:text-slate-500 shrink-0">
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

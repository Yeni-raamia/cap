"use client";

import { useRouter } from "next/navigation";
import { Bell, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { useApp } from "./app-context";

const META = {
  success: { icon: CheckCircle2, ring: "border-emerald-200 dark:border-emerald-500/30", dot: "text-emerald-500" },
  error: { icon: XCircle, ring: "border-rose-200 dark:border-rose-500/30", dot: "text-rose-500" },
  info: { icon: Info, ring: "border-sky-200 dark:border-sky-500/30", dot: "text-sky-500" },
} as const;

export function Toasts() {
  const { toasts, dismissToast } = useApp();
  const router = useRouter();
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-5 right-5 z-[70] flex flex-col gap-2 w-[320px] max-w-[calc(100vw-2.5rem)]">
      {toasts.map((t) => {
        // Bulle « push » (notification entrante) : cloche indigo + cliquable si lien.
        const m = t.push
          ? { icon: Bell, ring: "border-indigo-200 dark:border-indigo-500/40", dot: "text-indigo-500" }
          : META[t.kind];
        const clickable = t.push && Boolean(t.href);
        return (
          <div
            key={t.id}
            role="status"
            onClick={clickable ? () => { router.push(t.href!); dismissToast(t.id); } : undefined}
            className={`animate-slide-right flex items-start gap-2.5 bg-white dark:bg-slate-900 border ${m.ring} rounded-xl shadow-float px-3.5 py-3 ${clickable ? "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60" : ""} ${t.push ? "ring-1 ring-indigo-100 dark:ring-indigo-500/20" : ""}`}
          >
            <m.icon size={18} className={`${m.dot} mt-0.5 shrink-0`} />
            <div className="flex-1 min-w-0">
              <span className="block text-[13px] text-slate-700 dark:text-slate-100 leading-snug">{t.message}</span>
              {clickable && <span className="block text-[11px] text-indigo-500 mt-0.5">Ouvrir →</span>}
            </div>
            <button onClick={(e) => { e.stopPropagation(); dismissToast(t.id); }} aria-label="Fermer" className="text-slate-300 hover:text-slate-500 shrink-0">
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

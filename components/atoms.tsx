"use client";

import { Flag } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { isUrgentType, toneBg, type Priorite, type Tone } from "@/lib/domain";
import { useApp } from "./app-context";

/* Référence en police mono — rappel du `//` de la charte documentaire */
export function Token({ children }: { children: ReactNode }) {
  return (
    <span className="font-mono text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
      {children}
    </span>
  );
}

export function TypeTag({ t }: { t: string }) {
  const { catalogue } = useApp();
  const urgent = isUrgentType(t, catalogue.types);
  return (
    <span
      className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
        urgent ? "bg-rose-600 text-white" : "bg-slate-800 text-white"
      }`}
    >
      {t}
    </span>
  );
}

export function MetierChip({ code }: { code: string }) {
  const { catalogue } = useApp();
  const tone: Tone = catalogue.metiers[code]?.tone ?? "slate";
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${toneBg[tone]}`}>
      {code}
    </span>
  );
}

export function Avatar({
  init,
  src,
  size = "h-8 w-8",
}: {
  init: string;
  src?: string;
  size?: string;
}) {
  if (src) {
    return (
      // Photo de profil (data URL) — eslint-disable pour <img> hors next/image (local, data URL).
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={init}
        className={`${size} rounded-full object-cover shrink-0 ring-1 ring-black/5 shadow-sm`}
      />
    );
  }
  return (
    <div
      className={`${size} rounded-full bg-gradient-to-br from-slate-700 to-slate-900 text-white grid place-items-center text-[11px] font-semibold shrink-0 ring-1 ring-black/5 shadow-sm`}
    >
      {init}
    </div>
  );
}

export function Priority({ p }: { p: Priorite }) {
  const c =
    p === "Critique" ? "text-rose-600" : p === "Élevé" ? "text-amber-600" : "text-slate-400";
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${c}`}>
      <Flag size={11} />
      {p}
    </span>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`bg-white border border-slate-200/80 rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-shadow duration-200 hover:shadow-[0_4px_16px_rgba(15,23,42,0.06)] ${className}`}
    >
      {children}
    </div>
  );
}

export function KPI({
  icon: Icon,
  label,
  value,
  tone = "slate",
  sub,
}: {
  icon: ComponentType<{ size?: number }>;
  label: string;
  value: ReactNode;
  tone?: Tone;
  sub?: string;
}) {
  return (
    <Card className="p-4 flex items-center gap-3 hover:-translate-y-0.5 transition-transform duration-200">
      <div className={`h-10 w-10 rounded-lg grid place-items-center ${toneBg[tone]}`}>
        <Icon size={18} />
      </div>
      <div>
        <div className="text-2xl font-semibold text-slate-800 leading-none tabular-nums">{value}</div>
        <div className="text-[12px] text-slate-500 mt-1">
          {label}
          {sub && <span className="text-slate-400"> · {sub}</span>}
        </div>
      </div>
    </Card>
  );
}

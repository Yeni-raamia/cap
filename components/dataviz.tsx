"use client";

import { useEffect, useRef, useState } from "react";

/* ---------- Compteur animé (count-up) ---------- */
export function CountUp({
  value,
  duration = 900,
  decimals = 0,
  suffix = "",
  className = "",
}: {
  value: number;
  duration?: number;
  decimals?: number;
  suffix?: string;
  className?: string;
}) {
  const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const [display, setDisplay] = useState(reduce ? value : 0);
  const startRef = useRef<number | null>(null);
  const fromRef = useRef(0);

  useEffect(() => {
    if (reduce) { setDisplay(value); return; }
    fromRef.current = display;
    startRef.current = null;
    let raf = 0;
    const step = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const p = Math.min(1, (ts - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setDisplay(fromRef.current + (value - fromRef.current) * eased);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return (
    <span className={`tabular-nums ${className}`}>
      {display.toLocaleString("fr-FR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </span>
  );
}

/* ---------- Sparkline (courbe + aire dégradée) ---------- */
export function Sparkline({
  data,
  width = 120,
  height = 34,
  stroke = "#10b981",
  className = "",
}: {
  data: number[];
  width?: number;
  height?: number;
  stroke?: string;
  className?: string;
}) {
  if (data.length === 0) data = [0, 0];
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const span = max - min || 1;
  const stepX = width / (data.length - 1 || 1);
  const pts = data.map((v, i) => [i * stepX, height - 3 - ((v - min) / span) * (height - 6)]);
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;
  const id = `sk-${stroke.replace("#", "")}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {pts.length > 0 && <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.6" fill={stroke} />}
    </svg>
  );
}

/* ---------- Jauge circulaire ---------- */
export function Ring({
  value,
  size = 64,
  stroke = 7,
  color = "#10b981",
  track = "rgba(148,163,184,0.22)",
  children,
}: {
  value: number; // 0..100
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const [dash, setDash] = useState(reduce ? Math.max(0, Math.min(100, value)) : 0);
  useEffect(() => {
    if (reduce) { setDash(Math.max(0, Math.min(100, value))); return; }
    const t = setTimeout(() => setDash(Math.max(0, Math.min(100, value))), 60);
    return () => clearTimeout(t);
  }, [value, reduce]);
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (dash / 100) * c}
          style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.2,0.8,0.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}

/* ---------- Mini barres ---------- */
export function MiniBars({ data, className = "", color = "#10b981" }: { data: number[]; className?: string; color?: string }) {
  const max = Math.max(...data, 1);
  return (
    <div className={`flex items-end gap-0.5 h-8 ${className}`}>
      {data.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm"
          style={{ height: `${Math.max(8, (v / max) * 100)}%`, background: color, opacity: 0.35 + 0.65 * (v / max) }}
        />
      ))}
    </div>
  );
}

/* ---------- Heatmap d'activité (type contributions) ---------- */
export function Heatmap({
  counts,
  weeks = 16,
  className = "",
}: {
  counts: Map<string, number>; // clé = YYYY-MM-DD
  weeks?: number;
  className?: string;
}) {
  // Construit une grille de `weeks` colonnes × 7 jours se terminant aujourd'hui.
  const days: { key: string; count: number }[] = [];
  const today = new Date();
  const total = weeks * 7;
  for (let i = total - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ key, count: counts.get(key) ?? 0 });
  }
  const max = Math.max(1, ...days.map((d) => d.count));
  const level = (c: number) => (c === 0 ? 0 : Math.min(4, Math.ceil((c / max) * 4)));
  const shade = ["bg-slate-100 dark:bg-slate-800/60", "bg-emerald-200/70", "bg-emerald-300", "bg-emerald-400", "bg-emerald-500"];
  // Colonnes de 7 jours.
  const cols: { key: string; count: number }[][] = [];
  for (let w = 0; w < weeks; w++) cols.push(days.slice(w * 7, w * 7 + 7));
  return (
    <div className={`flex gap-1 ${className}`}>
      {cols.map((col, ci) => (
        <div key={ci} className="flex flex-col gap-1">
          {col.map((d) => (
            <div
              key={d.key}
              title={`${d.key} · ${d.count}`}
              className={`h-2.5 w-2.5 rounded-[3px] ${shade[level(d.count)]}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

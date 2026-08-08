"use client";

/* ==================================================================
 *  ReportKit — briques partagées pour les rapports imprimables (PDF)
 *  du module GRC. Chrome commun (logo, titre, pied de page) + styles
 *  de tableau, encadrés KPI et barres, fiables à l'impression.
 *  Voir le patron d'origine dans RisquesRapportPdf.tsx / RapportPdf.tsx.
 * ================================================================== */
import { useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { FileDown } from "lucide-react";
import { fmt, fmtLong } from "@/lib/domain";
import { APP_NAME } from "@/lib/config";
import { useApp } from "@/components/app-context";

/** État d'ouverture + déclenchement de l'impression (laisse le portail se monter). */
export function usePrint() {
  const [open, setOpen] = useState(false);
  const trigger = () => {
    setOpen(true);
    setTimeout(() => window.print(), 150);
  };
  return { open, trigger };
}

/** Bouton « Rapport PDF » homogène pour les en-têtes d'onglets. */
export function ReportButton({ onClick, label = "Rapport PDF", title }: { onClick: () => void; label?: string; title?: string }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800"
      title={title ?? "Exporter en PDF"}
    >
      <FileDown size={15} /> {label}
    </button>
  );
}

/** Monte le document imprimable dans document.body quand `open` est vrai. */
export function ReportPortal({ open, heading, sub, children }: { open: boolean; heading: string; sub?: string; children: ReactNode }) {
  if (!open || typeof document === "undefined") return null;
  return createPortal(<ReportDoc heading={heading} sub={sub}>{children}</ReportDoc>, document.body);
}

function ReportDoc({ heading, sub, children }: { heading: string; sub?: string; children: ReactNode }) {
  const { orgName, orgLogo, now } = useApp();
  return (
    <div className="print-report">
      <div style={{ display: "flex", alignItems: "center", gap: 14, borderBottom: "2px solid #0f172a", paddingBottom: 10, marginBottom: 16 }}>
        {orgLogo && <img src={orgLogo} alt="" style={{ maxHeight: 56, maxWidth: 160, objectFit: "contain" }} />}
        <div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{APP_NAME} — {heading}</div>
          <div style={{ fontSize: 12, color: "#475569" }}>{orgName}{sub ? ` · ${sub}` : ""}</div>
          <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>Édité le {fmtLong(now)}</div>
        </div>
      </div>
      {children}
      <div style={{ marginTop: 24, fontSize: 10, color: "#94a3b8", borderTop: "1px solid #e2e8f0", paddingTop: 8 }}>
        {APP_NAME} · {heading} — document généré automatiquement, {fmt(now)}.
      </div>
    </div>
  );
}

/* ---------- Styles de tableau partagés ---------- */
export const thCls = "text-left text-[10px] uppercase tracking-wide text-slate-500 border-b border-slate-300 py-1 pr-2";
export const tdCls = "text-[11px] text-slate-800 border-b border-slate-100 py-1 pr-2 align-top";

/** Encadré KPI (valeur + libellé). */
export function KpiBox({ label, value, color }: { label: string; value: ReactNode; color?: string }) {
  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 12px" }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: color ?? "#0f172a" }}>{value}</div>
      <div style={{ fontSize: 11, color: "#64748b" }}>{label}</div>
    </div>
  );
}

export function KpiRow({ cols = 5, children }: { cols?: number; children: ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 8, marginBottom: 16 }}>{children}</div>;
}

export function SectionTitle({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ fontSize: 13, fontWeight: 600, margin: "16px 0 6px", ...style }}>{children}</div>;
}

/** Barre horizontale de progression, fiable à l'impression (couleur forcée). */
export function PrintBar({ pct, color = "#10b981", width = "100%" }: { pct: number; color?: string; width?: number | string }) {
  const p = Math.max(0, Math.min(100, pct));
  return (
    <div style={{ background: "#f1f5f9", borderRadius: 4, height: 10, width, WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
      <div style={{ background: color, height: 10, width: `${p}%`, borderRadius: 4, WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }} />
    </div>
  );
}

/** Barre empilée multi-segments (répartition par catégorie), fiable à l'impression. */
export function PrintStack({ segments, height = 12 }: { segments: { value: number; color: string; label?: string }[]; height?: number }) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  return (
    <div style={{ display: "flex", height, width: "100%", borderRadius: 4, overflow: "hidden", background: "#f1f5f9", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
      {segments.map((s, i) =>
        s.value > 0 ? (
          <div key={i} title={s.label} style={{ width: `${(s.value / total) * 100}%`, background: s.color, WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }} />
        ) : null
      )}
    </div>
  );
}

/** Puce colorée + libellé (légendes). */
export function Chip({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, color: "#475569" }}>
      <span style={{ width: 9, height: 9, borderRadius: 2, background: color, WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }} />
      {children}
    </span>
  );
}

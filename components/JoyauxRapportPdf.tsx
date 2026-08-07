"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { FileDown } from "lucide-react";
import { fmtLong, fmt, CID_LABELS, CONFIDENTIALITY_LABELS } from "@/lib/domain";
import { computeJewels, isJewel, type JewelBand } from "@/lib/grc/jewels";
import { APP_NAME } from "@/lib/config";
import { useApp } from "./app-context";

const BAND_HEX: Record<JewelBand, { bg: string; fg: string }> = {
  Prioritaire: { bg: "#ffe4e6", fg: "#be123c" },
  "À surveiller": { bg: "#fef3c7", fg: "#b45309" },
  "Maîtrisé": { bg: "#d1fae5", fg: "#047857" },
};
const exact: React.CSSProperties = { WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" };

/** Bouton + document imprimable de l'analyse des joyaux de la couronne (JCA). */
export function JoyauxRapportPdf() {
  const { assets, risks, fieldControls, missions, profileById, orgName, orgLogo, now } = useApp();
  const [open, setOpen] = useState(false);

  const build = () => {
    setOpen(true);
    setTimeout(() => window.print(), 150);
  };

  return (
    <>
      <button
        onClick={build}
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800"
        title="Exporter l'analyse des joyaux en PDF"
      >
        <FileDown size={15} /> Rapport PDF
      </button>
      {open && typeof document !== "undefined" && createPortal(<Doc />, document.body)}
    </>
  );

  function Doc() {
    const th = "text-left text-[10px] uppercase tracking-wide text-slate-500 border-b border-slate-300 py-1 pr-2";
    const td = "text-[11px] text-slate-800 border-b border-slate-100 py-1 pr-2 align-top";
    const jewels = computeJewels(assets, risks, fieldControls, missions).filter(isJewel);
    const prioritaires = jewels.filter((j) => j.band === "Prioritaire").length;
    const exposed = jewels.filter((j) => j.maxResidual === "Critique" || j.maxResidual === "Élevé").length;
    const noRisk = jewels.filter((j) => j.linkedRisks.length === 0).length;

    const kpi = (label: string, value: number, color?: string) => (
      <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 12px" }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: color ?? "#0f172a" }}>{value}</div>
        <div style={{ fontSize: 11, color: "#64748b" }}>{label}</div>
      </div>
    );

    return (
      <div className="print-report">
        <div style={{ display: "flex", alignItems: "center", gap: 14, borderBottom: "2px solid #0f172a", paddingBottom: 10, marginBottom: 16 }}>
          {orgLogo && <img src={orgLogo} alt="" style={{ maxHeight: 56, maxWidth: 160, objectFit: "contain" }} />}
          <div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{APP_NAME} — Analyse des joyaux de la couronne</div>
            <div style={{ fontSize: 12, color: "#475569" }}>{orgName} · méthode Crown Jewels Analysis (MITRE)</div>
            <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>Édité le {fmtLong(now)} · {jewels.length} joyau(x) sur {assets.filter((a) => a.status !== "Retiré").length} actif(s)</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>
          {kpi("Joyaux identifiés", jewels.length, "#4f46e5")}
          {kpi("Prioritaires", prioritaires, "#be123c")}
          {kpi("Exposition élevée+", exposed, "#c2410c")}
          {kpi("Sans analyse de risque", noRisk, "#b45309")}
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th className={th}>Réf.</th>
              <th className={th}>Joyau</th>
              <th className={th}>Service</th>
              <th className={th}>Criticité</th>
              <th className={th}>C/I/D</th>
              <th className={th}>Exposition</th>
              <th className={th}>Protection</th>
              <th className={th}>JRI</th>
              <th className={th}>Priorité</th>
            </tr>
          </thead>
          <tbody>
            {jewels.length === 0 ? (
              <tr><td className={td} colSpan={9}>Aucun joyau détecté.</td></tr>
            ) : (
              jewels.map((j) => {
                const b = BAND_HEX[j.band];
                return (
                  <tr key={j.asset.id}>
                    <td className={td} style={{ fontFamily: "monospace" }}>{j.asset.ref}</td>
                    <td className={td}>{j.asset.name}</td>
                    <td className={td}>{j.asset.service || "—"}</td>
                    <td className={td}>{j.criticality}</td>
                    <td className={td} title={`C:${CONFIDENTIALITY_LABELS[j.asset.confidentiality] ?? "—"} I:${CID_LABELS[j.asset.integrity] ?? "—"} D:${CID_LABELS[j.asset.availability] ?? "—"}`}>{j.asset.confidentiality}/{j.asset.integrity}/{j.asset.availability}</td>
                    <td className={td}>{j.maxResidual ?? "—"}{j.linkedRisks.length > 0 ? ` (${j.linkedRisks.length})` : ""}</td>
                    <td className={td}>{j.mitigations} mes. · {j.controlCoverage} ctrl</td>
                    <td className={td} style={{ fontWeight: 700 }}>{j.jri}</td>
                    <td className={td}><span style={{ ...exact, background: b.bg, color: b.fg, fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 4 }}>{j.band}</span></td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Recommandations détaillées par joyau prioritaire / à surveiller */}
        {jewels.some((j) => j.band !== "Maîtrisé") && (
          <>
            <div style={{ fontSize: 13, fontWeight: 600, margin: "20px 0 6px" }}>Recommandations</div>
            {jewels.filter((j) => j.band !== "Maîtrisé").map((j) => (
              <div key={j.asset.id} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{j.asset.ref} — {j.asset.name} <span style={{ color: "#64748b", fontWeight: 400 }}>(JRI {j.jri})</span></div>
                <ul style={{ margin: "2px 0 0 16px", padding: 0 }}>
                  {j.recommendations.map((r, i) => <li key={i} style={{ fontSize: 11, color: "#334155" }}>{r}</li>)}
                </ul>
              </div>
            ))}
          </>
        )}

        <div style={{ marginTop: 24, fontSize: 10, color: "#94a3b8", borderTop: "1px solid #e2e8f0", paddingTop: 8 }}>
          {APP_NAME} · Analyse des joyaux de la couronne (JCA) — document généré automatiquement, {fmt(new Date())}.
        </div>
      </div>
    );
  }
}

"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { FileDown } from "lucide-react";
import { fmt, fmtLong, riskLevel, type RiskLevel } from "@/lib/domain";
import { APP_NAME } from "@/lib/config";
import { useApp } from "./app-context";

/* Couleurs par niveau (inline, fiables à l'impression). */
const LEVEL_HEX: Record<RiskLevel, { bg: string; fg: string }> = {
  Faible: { bg: "#d1fae5", fg: "#047857" },
  Moyen: { bg: "#fef3c7", fg: "#b45309" },
  "Élevé": { bg: "#ffedd5", fg: "#c2410c" },
  Critique: { bg: "#ffe4e6", fg: "#be123c" },
};
const cellStyle = (lvl: RiskLevel): React.CSSProperties => ({
  background: LEVEL_HEX[lvl].bg,
  color: LEVEL_HEX[lvl].fg,
  WebkitPrintColorAdjust: "exact",
  printColorAdjust: "exact",
});

/** Bouton + document imprimable du registre des risques (export PDF via window.print). */
export function RisquesRapportPdf() {
  const { risks, profileById, assetById, orgName, orgLogo, now } = useApp();
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
        title="Exporter le registre des risques en PDF"
      >
        <FileDown size={15} /> Rapport PDF
      </button>
      {open && typeof document !== "undefined" &&
        createPortal(<RegistreDocument orgName={orgName} editedAt={fmtLong(now)} nowMs={now.getTime()} />, document.body)}
    </>
  );

  function RegistreDocument({ orgName, editedAt, nowMs }: { orgName: string; editedAt: string; nowMs: number }) {
    const th = "text-left text-[10px] uppercase tracking-wide text-slate-500 border-b border-slate-300 py-1 pr-2";
    const td = "text-[11px] text-slate-800 border-b border-slate-100 py-1 pr-2 align-top";

    const rows = risks.map((r) => ({
      r,
      inh: riskLevel(r.probability, r.impact),
      res: riskLevel(r.residualProbability, r.residualImpact),
    }));
    const open = rows.filter(({ r }) => r.status !== "Clôturé");
    const byRes = (lvl: RiskLevel) => open.filter((x) => x.res === lvl).length;
    const accepted = rows.filter(({ r }) => r.acceptedBy);
    const overdue = risks.filter((r) => r.reviewDate && r.reviewDate.getTime() < nowMs && r.status !== "Clôturé").length;

    // Ordre : niveau résiduel décroissant puis P×I.
    const order: Record<RiskLevel, number> = { Critique: 0, "Élevé": 1, Moyen: 2, Faible: 3 };
    const sorted = [...rows].sort((a, b) =>
      order[a.res] - order[b.res] || b.r.residualProbability * b.r.residualImpact - a.r.residualProbability * a.r.residualImpact
    );

    // Matrice résiduelle : compte par (probabilité, impact) hors clôturés.
    const matrixCount = (p: number, i: number) =>
      risks.filter((r) => r.residualProbability === p && r.residualImpact === i && r.status !== "Clôturé").length;

    const kpiBox = (label: string, value: number, color?: string) => (
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
            <div style={{ fontSize: 20, fontWeight: 700 }}>{APP_NAME} — Registre des risques</div>
            <div style={{ fontSize: 12, color: "#475569" }}>{orgName} · méthode ISO 27005 (inhérent → résiduel)</div>
            <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>Édité le {editedAt} · {risks.length} risque(s)</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 16 }}>
          {kpiBox("Risques", risks.length)}
          {kpiBox("Critiques (ouverts)", byRes("Critique"), "#be123c")}
          {kpiBox("Élevés (ouverts)", byRes("Élevé"), "#c2410c")}
          {kpiBox("Acceptés", accepted.length, "#7c3aed")}
          {kpiBox("Revue en retard", overdue, "#b45309")}
        </div>

        {/* Matrice résiduelle */}
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 20, marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Matrice résiduelle</div>
            <table style={{ borderCollapse: "collapse" }}>
              <tbody>
                {[5, 4, 3, 2, 1].map((i) => (
                  <tr key={i}>
                    <td style={{ fontSize: 9, color: "#94a3b8", paddingRight: 4, textAlign: "right" }}>I{i}</td>
                    {[1, 2, 3, 4, 5].map((p) => {
                      const lvl = riskLevel(p, i);
                      const n = matrixCount(p, i);
                      return (
                        <td key={p} style={{ ...cellStyle(lvl), width: 26, height: 26, textAlign: "center", fontSize: 11, fontWeight: 700, border: "1px solid #fff" }}>
                          {n || ""}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr>
                  <td></td>
                  {[1, 2, 3, 4, 5].map((p) => <td key={p} style={{ fontSize: 9, color: "#94a3b8", textAlign: "center" }}>P{p}</td>)}
                </tr>
              </tbody>
            </table>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Répartition (résiduel, ouverts)</div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {(["Critique", "Élevé", "Moyen", "Faible"] as RiskLevel[]).map((lvl) => {
                  const n = byRes(lvl);
                  const pct = open.length ? Math.round((n / open.length) * 100) : 0;
                  return (
                    <tr key={lvl}>
                      <td style={{ ...cellStyle(lvl), fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 4, width: 60 }}>{lvl}</td>
                      <td style={{ padding: "2px 8px" }}>
                        <div style={{ background: "#f1f5f9", borderRadius: 4, height: 10, width: "100%", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
                          <div style={{ background: LEVEL_HEX[lvl].fg, height: 10, width: `${pct}%`, borderRadius: 4, WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }} />
                        </div>
                      </td>
                      <td style={{ fontSize: 11, color: "#475569", textAlign: "right", width: 60 }}>{n} · {pct}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tableau complet du registre */}
        <div style={{ fontSize: 13, fontWeight: 600, margin: "8px 0 6px" }}>Détail du registre</div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th className={th}>Réf.</th>
              <th className={th}>Intitulé</th>
              <th className={th}>Catégorie</th>
              <th className={th}>Actif</th>
              <th className={th}>Inhérent</th>
              <th className={th}>Résiduel</th>
              <th className={th}>Traitement</th>
              <th className={th}>Statut</th>
              <th className={th}>Responsable</th>
              <th className={th}>Revue</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr><td className={td} colSpan={10}>Registre vide.</td></tr>
            ) : (
              sorted.map(({ r, inh, res }) => (
                <tr key={r.id}>
                  <td className={td} style={{ fontFamily: "monospace" }}>{r.ref}</td>
                  <td className={td}>{r.title}</td>
                  <td className={td}>{r.category || "—"}</td>
                  <td className={td}>{r.assetId ? assetById(r.assetId)?.name ?? "—" : "—"}</td>
                  <td className={td}><span style={{ ...cellStyle(inh), fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 4 }}>{inh}</span></td>
                  <td className={td}><span style={{ ...cellStyle(res), fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 4 }}>{res}</span></td>
                  <td className={td}>{r.treatment || "—"}{r.controls.length > 0 ? ` (${r.controls.length} mesure${r.controls.length > 1 ? "s" : ""})` : ""}</td>
                  <td className={td}>{r.status}</td>
                  <td className={td}>{profileById(r.ownerId).nom}</td>
                  <td className={td}>{r.reviewDate ? fmt(r.reviewDate) : "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Acceptations formelles */}
        {accepted.length > 0 && (
          <>
            <div style={{ fontSize: 13, fontWeight: 600, margin: "20px 0 6px" }}>Acceptations formelles du risque</div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th className={th}>Réf.</th>
                  <th className={th}>Risque</th>
                  <th className={th}>Accepté par</th>
                  <th className={th}>Le</th>
                  <th className={th}>Jusqu&apos;au</th>
                  <th className={th}>Justification</th>
                </tr>
              </thead>
              <tbody>
                {accepted.map(({ r }) => (
                  <tr key={r.id}>
                    <td className={td} style={{ fontFamily: "monospace" }}>{r.ref}</td>
                    <td className={td}>{r.title}</td>
                    <td className={td}>{r.acceptedBy ? profileById(r.acceptedBy).nom : "—"}</td>
                    <td className={td}>{r.acceptedAt ? fmt(r.acceptedAt) : "—"}</td>
                    <td className={td}>{r.acceptUntil ? fmt(r.acceptUntil) : "—"}</td>
                    <td className={td}>{r.acceptanceJustification || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <div style={{ marginTop: 24, fontSize: 10, color: "#94a3b8", borderTop: "1px solid #e2e8f0", paddingTop: 8 }}>
          {APP_NAME} · Registre des risques (ISO 27005) — document généré automatiquement, {fmt(new Date())}.
        </div>
      </div>
    );
  }
}

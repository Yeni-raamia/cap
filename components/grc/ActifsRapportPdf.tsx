"use client";

import { assetCriticality, CID_LABELS, fmt, type AssetCriticality } from "@/lib/domain";
import { useApp } from "@/components/app-context";
import { KpiBox, KpiRow, ReportButton, ReportPortal, SectionTitle, tdCls, thCls, usePrint } from "@/components/grc/ReportKit";

const CRIT_HEX: Record<AssetCriticality, { bg: string; fg: string }> = {
  Faible: { bg: "#d1fae5", fg: "#047857" },
  "Modéré": { bg: "#fef3c7", fg: "#b45309" },
  "Élevé": { bg: "#ffedd5", fg: "#c2410c" },
  Critique: { bg: "#ffe4e6", fg: "#be123c" },
};
const critBadge = (c: AssetCriticality) => ({ background: CRIT_HEX[c].bg, color: CRIT_HEX[c].fg, fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 4, WebkitPrintColorAdjust: "exact" as const, printColorAdjust: "exact" as const });
const ORDER: Record<AssetCriticality, number> = { Critique: 0, "Élevé": 1, "Modéré": 2, Faible: 3 };

/** Rapport imprimable : registre des actifs (valorisation C/I/D, ISO 27005). */
export function ActifsRapportPdf() {
  const { assets, profileById } = useApp();
  const { open, trigger } = usePrint();

  const rows = assets.map((a) => ({ a, crit: assetCriticality(a) as AssetCriticality }));
  const sorted = [...rows].sort((x, y) => ORDER[x.crit] - ORDER[y.crit] || y.a.confidentiality + y.a.integrity + y.a.availability - (x.a.confidentiality + x.a.integrity + x.a.availability));
  const countBy = (c: AssetCriticality) => rows.filter((r) => r.crit === c).length;

  return (
    <>
      <ReportButton onClick={trigger} title="Exporter le registre des actifs en PDF" />
      <ReportPortal open={open} heading="Registre des actifs" sub="valorisation C/I/D (ISO 27005)">
        <KpiRow cols={5}>
          <KpiBox label="Actifs" value={assets.length} />
          <KpiBox label="Critiques" value={countBy("Critique")} color="#be123c" />
          <KpiBox label="Élevés" value={countBy("Élevé")} color="#c2410c" />
          <KpiBox label="Modérés" value={countBy("Modéré")} color="#b45309" />
          <KpiBox label="Faibles" value={countBy("Faible")} color="#047857" />
        </KpiRow>

        <SectionTitle>Détail du registre</SectionTitle>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th className={thCls}>Réf.</th>
              <th className={thCls}>Actif</th>
              <th className={thCls}>Type</th>
              <th className={thCls}>Service</th>
              <th className={thCls}>C</th>
              <th className={thCls}>I</th>
              <th className={thCls}>D</th>
              <th className={thCls}>Criticité</th>
              <th className={thCls}>Propriétaire</th>
              <th className={thCls}>Statut</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr><td className={tdCls} colSpan={10}>Registre vide.</td></tr>
            ) : (
              sorted.map(({ a, crit }) => (
                <tr key={a.id}>
                  <td className={tdCls} style={{ fontFamily: "monospace" }}>{a.ref}</td>
                  <td className={tdCls}>{a.name}</td>
                  <td className={tdCls}>{a.type || "—"}</td>
                  <td className={tdCls}>{a.service || "—"}</td>
                  <td className={tdCls}>{CID_LABELS[a.confidentiality] ?? a.confidentiality}</td>
                  <td className={tdCls}>{CID_LABELS[a.integrity] ?? a.integrity}</td>
                  <td className={tdCls}>{CID_LABELS[a.availability] ?? a.availability}</td>
                  <td className={tdCls}><span style={critBadge(crit)}>{crit}</span></td>
                  <td className={tdCls}>{profileById(a.ownerId).nom}</td>
                  <td className={tdCls}>{a.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </ReportPortal>
    </>
  );
}

"use client";

import { controlConformity, controlGaps, controlProgress, fmt, type FieldControl } from "@/lib/domain";
import { useApp } from "@/components/app-context";
import { KpiBox, KpiRow, PrintBar, ReportButton, ReportPortal, SectionTitle, tdCls, thCls, usePrint } from "@/components/grc/ReportKit";

const REALISED = new Set(["Réalisé", "Clôturé"]);
const confColor = (pct: number) => (pct >= 80 ? "#047857" : pct >= 50 ? "#b45309" : "#be123c");

/** Rapport imprimable : contrôles terrain (rondes, inspections, audits) + écarts. */
export function ControlesRapportPdf() {
  const { fieldControls, profileById } = useApp();
  const { open, trigger } = usePrint();

  const realises = fieldControls.filter((c) => REALISED.has(c.status)).length;
  const ecarts = fieldControls.reduce((n, c) => n + controlGaps(c).length, 0);
  const confs = fieldControls.filter((c) => REALISED.has(c.status)).map(controlConformity).filter((v) => v > 0);
  const tauxMoyen = confs.length ? Math.round(confs.reduce((a, v) => a + v, 0) / confs.length) : 0;

  const sorted = [...fieldControls].sort((a, b) => (b.date?.getTime() ?? b.createdAt.getTime()) - (a.date?.getTime() ?? a.createdAt.getTime()));

  return (
    <>
      <ReportButton onClick={trigger} title="Exporter les contrôles terrain en PDF" />
      <ReportPortal open={open} heading="Contrôles terrain" sub="rondes, inspections & audits internes">
        <KpiRow cols={4}>
          <KpiBox label="Contrôles" value={fieldControls.length} />
          <KpiBox label="Réalisés" value={realises} color="#047857" />
          <KpiBox label="Écarts ouverts" value={ecarts} color="#be123c" />
          <KpiBox label="Conformité moyenne" value={`${tauxMoyen}%`} color={confColor(tauxMoyen)} />
        </KpiRow>

        <SectionTitle>Détail des contrôles</SectionTitle>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th className={thCls}>Réf.</th>
              <th className={thCls}>Intitulé</th>
              <th className={thCls}>Type</th>
              <th className={thCls}>Service</th>
              <th className={thCls}>Date</th>
              <th className={thCls}>Statut</th>
              <th className={thCls} style={{ width: "16%" }}>Avancement</th>
              <th className={thCls}>Conformité</th>
              <th className={thCls}>Écarts</th>
              <th className={thCls}>Contrôleur</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr><td className={tdCls} colSpan={10}>Aucun contrôle.</td></tr>
            ) : (
              sorted.map((c: FieldControl) => {
                const prog = controlProgress(c);
                const conf = controlConformity(c);
                const gaps = controlGaps(c).length;
                return (
                  <tr key={c.id}>
                    <td className={tdCls} style={{ fontFamily: "monospace" }}>{c.ref}</td>
                    <td className={tdCls}>{c.title}</td>
                    <td className={tdCls}>{c.type}</td>
                    <td className={tdCls}>{c.service || "—"}</td>
                    <td className={tdCls}>{c.date ? fmt(c.date) : "—"}</td>
                    <td className={tdCls}>{c.status}</td>
                    <td className={tdCls}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <PrintBar pct={prog.pct} color="#0ea5e9" width={54} />
                        <span style={{ fontSize: 10, color: "#475569" }}>{prog.pct}%</span>
                      </div>
                    </td>
                    <td className={tdCls} style={{ color: confColor(conf), fontWeight: 600 }}>{REALISED.has(c.status) || prog.done > 0 ? `${conf}%` : "—"}</td>
                    <td className={tdCls} style={gaps > 0 ? { color: "#be123c", fontWeight: 600 } : undefined}>{gaps || "—"}</td>
                    <td className={tdCls}>{profileById(c.inspectorId).nom}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </ReportPortal>
    </>
  );
}

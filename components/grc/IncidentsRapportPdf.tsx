"use client";

import { fmt, incidentResolutionHours, INCIDENT_SEVERITIES, isIncidentOpen, type Incident } from "@/lib/domain";
import { useApp } from "@/components/app-context";
import { KpiBox, KpiRow, ReportButton, ReportPortal, SectionTitle, tdCls, thCls, usePrint } from "@/components/grc/ReportKit";

const SEV_HEX: Record<string, { bg: string; fg: string }> = {
  Mineur: { bg: "#f1f5f9", fg: "#475569" },
  "Modéré": { bg: "#e0f2fe", fg: "#0369a1" },
  Majeur: { bg: "#fef3c7", fg: "#b45309" },
  Critique: { bg: "#ffe4e6", fg: "#be123c" },
};
const sevBadge = (s: string) => ({ background: SEV_HEX[s]?.bg ?? "#f1f5f9", color: SEV_HEX[s]?.fg ?? "#475569", fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 4, WebkitPrintColorAdjust: "exact" as const, printColorAdjust: "exact" as const });

/** Rapport imprimable : registre des incidents (cycle ISO 27035). */
export function IncidentsRapportPdf() {
  const { incidents, profileById } = useApp();
  const { open, trigger } = usePrint();

  const ouverts = incidents.filter(isIncidentOpen).length;
  const critiques = incidents.filter((i) => i.severity === "Critique").length;
  const violations = incidents.filter((i) => i.dataBreach).length;
  const mttrs = incidents.map(incidentResolutionHours).filter((h): h is number => h !== null);
  const mttr = mttrs.length ? Math.round(mttrs.reduce((a, h) => a + h, 0) / mttrs.length) : null;

  const sorted = [...incidents].sort((a, b) => {
    const oa = isIncidentOpen(a) ? 0 : 1, ob = isIncidentOpen(b) ? 0 : 1;
    if (oa !== ob) return oa - ob;
    return (b.detectedAt?.getTime() ?? b.createdAt.getTime()) - (a.detectedAt?.getTime() ?? a.createdAt.getTime());
  });
  const bySeverity = (s: string) => incidents.filter((i) => i.severity === s).length;

  return (
    <>
      <ReportButton onClick={trigger} title="Exporter le registre des incidents en PDF" />
      <ReportPortal open={open} heading="Gestion des incidents" sub="cycle ISO 27035">
        <KpiRow cols={5}>
          <KpiBox label="Incidents" value={incidents.length} />
          <KpiBox label="Ouverts" value={ouverts} color="#b45309" />
          <KpiBox label="Critiques" value={critiques} color="#be123c" />
          <KpiBox label="Violations de données" value={violations} color="#be123c" />
          <KpiBox label="MTTR moyen" value={mttr === null ? "—" : `${mttr} h`} color="#0369a1" />
        </KpiRow>

        <SectionTitle style={{ marginTop: 8 }}>Répartition par gravité</SectionTitle>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
          {INCIDENT_SEVERITIES.map((s) => (
            <span key={s} style={{ ...sevBadge(s), padding: "3px 10px" }}>{s} · {bySeverity(s)}</span>
          ))}
        </div>

        <SectionTitle>Détail du registre</SectionTitle>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th className={thCls}>Réf.</th>
              <th className={thCls}>Intitulé</th>
              <th className={thCls}>Type</th>
              <th className={thCls}>Gravité</th>
              <th className={thCls}>Statut</th>
              <th className={thCls}>RGPD</th>
              <th className={thCls}>Détecté</th>
              <th className={thCls}>Résolu</th>
              <th className={thCls}>Responsable</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr><td className={tdCls} colSpan={9}>Aucun incident.</td></tr>
            ) : (
              sorted.map((i: Incident) => (
                <tr key={i.id}>
                  <td className={tdCls} style={{ fontFamily: "monospace" }}>{i.ref}</td>
                  <td className={tdCls}>{i.title}</td>
                  <td className={tdCls}>{i.type}</td>
                  <td className={tdCls}><span style={sevBadge(i.severity)}>{i.severity}</span></td>
                  <td className={tdCls}>{i.status}</td>
                  <td className={tdCls}>{i.dataBreach ? "Violation" : "—"}</td>
                  <td className={tdCls}>{i.detectedAt ? fmt(i.detectedAt) : "—"}</td>
                  <td className={tdCls}>{i.resolvedAt ? fmt(i.resolvedAt) : "—"}</td>
                  <td className={tdCls}>{profileById(i.ownerId).nom}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </ReportPortal>
    </>
  );
}

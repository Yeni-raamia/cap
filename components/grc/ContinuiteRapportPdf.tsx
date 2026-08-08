"use client";

import { fmt, hasContinuityGap, isPlanTestStale, type ContinuityPlan } from "@/lib/domain";
import { useApp } from "@/components/app-context";
import { KpiBox, KpiRow, ReportButton, ReportPortal, SectionTitle, tdCls, thCls, usePrint } from "@/components/grc/ReportKit";

const CRIT_HEX: Record<string, { bg: string; fg: string }> = {
  Vitale: { bg: "#ffe4e6", fg: "#be123c" },
  Essentielle: { bg: "#ffedd5", fg: "#c2410c" },
  Importante: { bg: "#fef3c7", fg: "#b45309" },
  Secondaire: { bg: "#f1f5f9", fg: "#475569" },
};
const critBadge = (c: string) => ({ background: CRIT_HEX[c]?.bg ?? "#f1f5f9", color: CRIT_HEX[c]?.fg ?? "#475569", fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 4, WebkitPrintColorAdjust: "exact" as const, printColorAdjust: "exact" as const });
const CRIT_ORDER: Record<string, number> = { Vitale: 0, Essentielle: 1, Importante: 2, Secondaire: 3 };

/** Rapport imprimable : plans de continuité (BIA + PCA/PRA). */
export function ContinuiteRapportPdf() {
  const { continuityPlans, profileById, missionById, now } = useApp();
  const { open, trigger } = usePrint();

  const aTester = continuityPlans.filter((p) => isPlanTestStale(p, now)).length;
  const ecarts = continuityPlans.filter(hasContinuityGap).length;
  const valides = continuityPlans.filter((p) => p.status === "Validé").length;

  const sorted = [...continuityPlans].sort((a, b) => (CRIT_ORDER[a.criticality] ?? 9) - (CRIT_ORDER[b.criticality] ?? 9));

  return (
    <>
      <ReportButton onClick={trigger} title="Exporter les plans de continuité en PDF" />
      <ReportPortal open={open} heading="Continuité d'activité" sub="BIA & PCA/PRA">
        <KpiRow cols={4}>
          <KpiBox label="Plans" value={continuityPlans.length} />
          <KpiBox label="Validés" value={valides} color="#047857" />
          <KpiBox label="À tester" value={aTester} color="#b45309" />
          <KpiBox label="Écarts RTO/DMIA" value={ecarts} color="#be123c" />
        </KpiRow>

        <SectionTitle>Détail des plans</SectionTitle>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th className={thCls}>Réf.</th>
              <th className={thCls}>Activité</th>
              <th className={thCls}>Mission</th>
              <th className={thCls}>Criticité</th>
              <th className={thCls}>DMIA</th>
              <th className={thCls}>RTO</th>
              <th className={thCls}>RPO</th>
              <th className={thCls}>Statut</th>
              <th className={thCls}>Dernier test</th>
              <th className={thCls}>Responsable</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr><td className={tdCls} colSpan={10}>Aucun plan de continuité.</td></tr>
            ) : (
              sorted.map((p: ContinuityPlan) => {
                const gap = hasContinuityGap(p);
                const stale = isPlanTestStale(p, now);
                return (
                  <tr key={p.id}>
                    <td className={tdCls} style={{ fontFamily: "monospace" }}>{p.ref}</td>
                    <td className={tdCls}>{p.activity}</td>
                    <td className={tdCls}>{p.missionId ? missionById(p.missionId)?.name ?? "—" : "—"}</td>
                    <td className={tdCls}><span style={critBadge(p.criticality)}>{p.criticality}</span></td>
                    <td className={tdCls}>{p.mtpd || "—"}</td>
                    <td className={tdCls} style={gap ? { color: "#be123c", fontWeight: 600 } : undefined}>{p.rto || "—"}</td>
                    <td className={tdCls}>{p.rpo || "—"}</td>
                    <td className={tdCls}>{p.status}</td>
                    <td className={tdCls} style={stale ? { color: "#b45309", fontWeight: 600 } : undefined}>{p.lastTestDate ? fmt(p.lastTestDate) : "jamais"}</td>
                    <td className={tdCls}>{profileById(p.ownerId).nom}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 6 }}>
          DMIA = durée max d&apos;interruption admissible · RTO = objectif de temps de reprise · RPO = objectif de point de reprise. En rouge : RTO plus long que la DMIA (écart) ou test dépassé.
        </div>
      </ReportPortal>
    </>
  );
}

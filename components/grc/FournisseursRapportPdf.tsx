"use client";

import { fmt, isSupplierReviewLate, type Supplier } from "@/lib/domain";
import { useApp } from "@/components/app-context";
import { KpiBox, KpiRow, ReportButton, ReportPortal, SectionTitle, tdCls, thCls, usePrint } from "@/components/grc/ReportKit";

const CRIT_HEX: Record<string, { bg: string; fg: string }> = {
  Critique: { bg: "#ffe4e6", fg: "#be123c" },
  Important: { bg: "#fef3c7", fg: "#b45309" },
  Standard: { bg: "#f1f5f9", fg: "#475569" },
};
const critBadge = (c: string) => ({ background: CRIT_HEX[c]?.bg ?? "#f1f5f9", color: CRIT_HEX[c]?.fg ?? "#475569", fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 4, WebkitPrintColorAdjust: "exact" as const, printColorAdjust: "exact" as const });
const CRIT_ORDER: Record<string, number> = { Critique: 0, Important: 1, Standard: 2 };
const DATA_SENSITIVE = new Set(["Données personnelles", "Données sensibles"]);

/** Rapport imprimable : fournisseurs & prestataires (tiers du SI). */
export function FournisseursRapportPdf() {
  const { suppliers, profileById, now } = useApp();
  const { open, trigger } = usePrint();

  const critiques = suppliers.filter((s) => s.criticality === "Critique").length;
  const accesDonnees = suppliers.filter((s) => DATA_SENSITIVE.has(s.dataAccess)).length;
  const revuesRetard = suppliers.filter((s) => isSupplierReviewLate(s, now)).length;
  const sorted = [...suppliers].sort((a, b) => (CRIT_ORDER[a.criticality] ?? 9) - (CRIT_ORDER[b.criticality] ?? 9));

  return (
    <>
      <ReportButton onClick={trigger} title="Exporter les fournisseurs & prestataires en PDF" />
      <ReportPortal open={open} heading="Fournisseurs & prestataires" sub="tiers du système d'information">
        <KpiRow cols={4}>
          <KpiBox label="Tiers" value={suppliers.length} />
          <KpiBox label="Critiques" value={critiques} color="#be123c" />
          <KpiBox label="Accès données perso/sensibles" value={accesDonnees} color="#c2410c" />
          <KpiBox label="Revues en retard" value={revuesRetard} color="#b45309" />
        </KpiRow>

        <SectionTitle>Détail des tiers</SectionTitle>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th className={thCls}>Réf.</th>
              <th className={thCls}>Fournisseur</th>
              <th className={thCls}>Type</th>
              <th className={thCls}>Criticité</th>
              <th className={thCls}>Accès données</th>
              <th className={thCls}>Fin de contrat</th>
              <th className={thCls}>Prochaine revue</th>
              <th className={thCls}>Statut</th>
              <th className={thCls}>Responsable</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr><td className={tdCls} colSpan={9}>Aucun fournisseur.</td></tr>
            ) : (
              sorted.map((s: Supplier) => {
                const late = isSupplierReviewLate(s, now);
                return (
                  <tr key={s.id}>
                    <td className={tdCls} style={{ fontFamily: "monospace" }}>{s.ref}</td>
                    <td className={tdCls}>{s.name}</td>
                    <td className={tdCls}>{s.type}</td>
                    <td className={tdCls}><span style={critBadge(s.criticality)}>{s.criticality}</span></td>
                    <td className={tdCls} style={DATA_SENSITIVE.has(s.dataAccess) ? { color: "#c2410c", fontWeight: 600 } : undefined}>{s.dataAccess}</td>
                    <td className={tdCls}>{s.contractEnd ? fmt(s.contractEnd) : "—"}</td>
                    <td className={tdCls} style={late ? { color: "#b45309", fontWeight: 600 } : undefined}>{s.reviewDate ? fmt(s.reviewDate) : "—"}</td>
                    <td className={tdCls}>{s.status}</td>
                    <td className={tdCls}>{profileById(s.ownerId).nom}</td>
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

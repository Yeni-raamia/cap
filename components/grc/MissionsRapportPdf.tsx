"use client";

import { type Mission } from "@/lib/domain";
import { useApp } from "@/components/app-context";
import { KpiBox, KpiRow, ReportButton, ReportPortal, SectionTitle, tdCls, thCls, usePrint } from "@/components/grc/ReportKit";

const VAL_HEX: Record<string, { bg: string; fg: string }> = {
  Vitale: { bg: "#ffe4e6", fg: "#be123c" },
  Essentielle: { bg: "#ffedd5", fg: "#c2410c" },
  Importante: { bg: "#fef3c7", fg: "#b45309" },
  Secondaire: { bg: "#f1f5f9", fg: "#475569" },
};
const valBadge = (v: string) => ({ background: VAL_HEX[v]?.bg ?? "#f1f5f9", color: VAL_HEX[v]?.fg ?? "#475569", fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 4, WebkitPrintColorAdjust: "exact" as const, printColorAdjust: "exact" as const });
const VAL_ORDER: Record<string, number> = { Vitale: 0, Essentielle: 1, Importante: 2, Secondaire: 3 };

/** Rapport imprimable : missions de l'organisation & dépendances (base de la CJA). */
export function MissionsRapportPdf() {
  const { missions, profileById } = useApp();
  const { open, trigger } = usePrint();

  const active = missions.filter((m) => m.status !== "Retirée");
  const vitales = missions.filter((m) => m.value === "Vitale").length;
  const regaliennes = missions.filter((m) => m.type === "Régalienne").length;
  const sorted = [...missions].sort((a, b) => (VAL_ORDER[a.value] ?? 9) - (VAL_ORDER[b.value] ?? 9));

  return (
    <>
      <ReportButton onClick={trigger} title="Exporter les missions & dépendances en PDF" />
      <ReportPortal open={open} heading="Missions & dépendances" sub="socle de l'analyse des joyaux (CJA)">
        <KpiRow cols={4}>
          <KpiBox label="Missions" value={missions.length} />
          <KpiBox label="Actives" value={active.length} color="#047857" />
          <KpiBox label="Vitales" value={vitales} color="#be123c" />
          <KpiBox label="Régaliennes" value={regaliennes} color="#0369a1" />
        </KpiRow>

        <SectionTitle>Détail des missions</SectionTitle>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th className={thCls}>Réf.</th>
              <th className={thCls}>Mission</th>
              <th className={thCls}>Type</th>
              <th className={thCls}>Valeur</th>
              <th className={thCls}>Actifs</th>
              <th className={thCls}>Personnes</th>
              <th className={thCls}>Dépendances</th>
              <th className={thCls}>Statut</th>
              <th className={thCls}>Responsable</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr><td className={tdCls} colSpan={9}>Aucune mission.</td></tr>
            ) : (
              sorted.map((m: Mission) => (
                <tr key={m.id}>
                  <td className={tdCls} style={{ fontFamily: "monospace" }}>{m.ref}</td>
                  <td className={tdCls}>{m.name}</td>
                  <td className={tdCls}>{m.type}</td>
                  <td className={tdCls}><span style={valBadge(m.value)}>{m.value}</span></td>
                  <td className={tdCls}>{m.assetIds.length || "—"}</td>
                  <td className={tdCls}>{m.peopleIds.length || "—"}</td>
                  <td className={tdCls}>{m.dependencies.length || "—"}</td>
                  <td className={tdCls}>{m.status}</td>
                  <td className={tdCls}>{profileById(m.ownerId).nom}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </ReportPortal>
    </>
  );
}

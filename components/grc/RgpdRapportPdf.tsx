"use client";

import { fmt, isRopaReviewLate, piaOutstanding, type ProcessingActivity } from "@/lib/domain";
import { useApp } from "@/components/app-context";
import { KpiBox, KpiRow, ReportButton, ReportPortal, SectionTitle, tdCls, thCls, usePrint } from "@/components/grc/ReportKit";

const PIA_HEX: Record<string, { bg: string; fg: string }> = {
  Faible: { bg: "#d1fae5", fg: "#047857" },
  Moyen: { bg: "#fef3c7", fg: "#b45309" },
  "Élevé": { bg: "#ffe4e6", fg: "#be123c" },
};

/** Rapport imprimable : registre des traitements RGPD (ROPA, art. 30) + AIPD. */
export function RgpdRapportPdf() {
  const { processing, profileById, now } = useApp();
  const { open, trigger } = usePrint();

  const sensibles = processing.filter((p) => p.sensitiveData).length;
  const aipd = processing.filter(piaOutstanding).length;
  const transferts = processing.filter((p) => p.transfersOutsideEU).length;
  const revuesRetard = processing.filter((p) => isRopaReviewLate(p, now)).length;

  return (
    <>
      <ReportButton onClick={trigger} title="Exporter le registre des traitements (ROPA) en PDF" />
      <ReportPortal open={open} heading="RGPD — Registre des traitements" sub="ROPA (art. 30) & AIPD (art. 35)">
        <KpiRow cols={5}>
          <KpiBox label="Traitements" value={processing.length} />
          <KpiBox label="Données sensibles" value={sensibles} color="#be123c" />
          <KpiBox label="AIPD à réaliser" value={aipd} color="#b45309" />
          <KpiBox label="Transferts hors UE" value={transferts} color="#c2410c" />
          <KpiBox label="Revues en retard" value={revuesRetard} color="#b45309" />
        </KpiRow>

        <SectionTitle>Détail du registre</SectionTitle>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th className={thCls}>Réf.</th>
              <th className={thCls}>Traitement</th>
              <th className={thCls}>Finalité</th>
              <th className={thCls}>Base légale</th>
              <th className={thCls}>Sensibles</th>
              <th className={thCls}>Conservation</th>
              <th className={thCls}>Hors UE</th>
              <th className={thCls}>AIPD</th>
              <th className={thCls}>Responsable</th>
            </tr>
          </thead>
          <tbody>
            {processing.length === 0 ? (
              <tr><td className={tdCls} colSpan={9}>Registre vide.</td></tr>
            ) : (
              processing.map((p: ProcessingActivity) => {
                const pia = piaOutstanding(p);
                return (
                  <tr key={p.id}>
                    <td className={tdCls} style={{ fontFamily: "monospace" }}>{p.ref}</td>
                    <td className={tdCls}>{p.name}</td>
                    <td className={tdCls}>{p.purpose || "—"}</td>
                    <td className={tdCls}>{p.legalBasis || "—"}</td>
                    <td className={tdCls} style={p.sensitiveData ? { color: "#be123c", fontWeight: 600 } : undefined}>{p.sensitiveData ? "Oui (art. 9)" : "—"}</td>
                    <td className={tdCls}>{p.retention || "—"}</td>
                    <td className={tdCls}>{p.transfersOutsideEU ? "Oui" : "—"}</td>
                    <td className={tdCls}>
                      {p.piaRequired ? (
                        <span style={{ ...(PIA_HEX[p.piaRisk] ? { background: PIA_HEX[p.piaRisk].bg, color: PIA_HEX[p.piaRisk].fg } : {}), fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 4, WebkitPrintColorAdjust: "exact", printColorAdjust: "exact", color: pia ? "#b45309" : undefined }}>
                          {p.piaStatus}{p.piaRisk && p.piaStatus === "Réalisée" ? ` · ${p.piaRisk}` : ""}
                        </span>
                      ) : "Non requise"}
                    </td>
                    <td className={tdCls}>{profileById(p.ownerId).nom}</td>
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

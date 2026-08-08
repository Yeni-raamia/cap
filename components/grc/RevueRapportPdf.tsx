"use client";

import { useMemo } from "react";
import { fmt, type DirectionReview } from "@/lib/domain";
import { computeGrcKpis, grcPosture } from "@/lib/grc/kpis";
import { useApp } from "@/components/app-context";
import { KpiBox, KpiRow, ReportButton, ReportPortal, SectionTitle, tdCls, thCls, usePrint } from "@/components/grc/ReportKit";

const KPI_LABELS: Record<string, string> = {
  conformite: "Conformité %", risquesCritiques: "Risques critiques", capaEnRetard: "Actions en retard",
  incidentsOuverts: "Incidents ouverts", violationsDonnees: "Violations de données", aipdARealiser: "AIPD à réaliser",
  ecartsOuverts: "Écarts terrain", applicabilitePolitiques: "Applicabilité pol. %", joyauxPrioritaires: "Joyaux prioritaires", continuiteATester: "Continuité à tester",
};

/** Rapport imprimable : revue de direction (ISO 27001 §9.3) + posture GRC courante. */
export function RevueRapportPdf() {
  const app = useApp();
  const { reviews, profileById, now } = app;
  const { open, trigger } = usePrint();

  const kpis = useMemo(
    () => computeGrcKpis({ risks: app.risks, controlAssessments: app.controlAssessments, fieldControls: app.fieldControls, capaActions: app.capaActions, incidents: app.incidents, processing: app.processing, policies: app.policies, continuityPlans: app.continuityPlans, missions: app.missions, assets: app.assets, now }),
    [app.risks, app.controlAssessments, app.fieldControls, app.capaActions, app.incidents, app.processing, app.policies, app.continuityPlans, app.missions, app.assets, now]
  );
  const posture = grcPosture(kpis);

  const Block = ({ label, value }: { label: string; value: string }) =>
    value?.trim() ? (
      <div style={{ marginBottom: 6 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>{label}</div>
        <div style={{ fontSize: 11, color: "#1e293b", whiteSpace: "pre-wrap" }}>{value}</div>
      </div>
    ) : null;

  return (
    <>
      <ReportButton onClick={trigger} title="Exporter la revue de direction en PDF" />
      <ReportPortal open={open} heading="Revue de direction" sub="ISO 27001 §9.3 & posture GRC">
        <SectionTitle style={{ marginTop: 0 }}>Posture GRC à date · indice {posture}/100</SectionTitle>
        <KpiRow cols={5}>
          <KpiBox label="Conformité" value={`${kpis.conformite}%`} color="#0369a1" />
          <KpiBox label="Risques critiques" value={kpis.risquesCritiques} color="#be123c" />
          <KpiBox label="Actions en retard" value={kpis.capaEnRetard} color="#be123c" />
          <KpiBox label="Incidents ouverts" value={kpis.incidentsOuverts} color="#b45309" />
          <KpiBox label="AIPD à réaliser" value={kpis.aipdARealiser} color="#b45309" />
        </KpiRow>

        <SectionTitle>Revues de direction · {reviews.length}</SectionTitle>
        {reviews.length === 0 ? (
          <div style={{ fontSize: 11, color: "#94a3b8" }}>Aucune revue enregistrée.</div>
        ) : (
          reviews.map((r: DirectionReview) => {
            const snapKeys = Object.keys(r.kpiSnapshot ?? {});
            return (
              <div key={r.id} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 12, marginBottom: 12, breakInside: "avoid" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, borderBottom: "1px solid #f1f5f9", paddingBottom: 6, marginBottom: 8 }}>
                  <div>
                    <span style={{ fontFamily: "monospace", fontSize: 11, color: "#64748b" }}>{r.ref}</span>{" "}
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{r.title}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#475569" }}>{[r.status, r.period, r.date ? fmt(r.date) : null].filter(Boolean).join(" · ")}</div>
                </div>
                {r.participantIds.length > 0 && (
                  <div style={{ fontSize: 11, color: "#475569", marginBottom: 8 }}>
                    <b>Participants :</b> {r.participantIds.map((id) => profileById(id).nom).join(", ")}
                    {r.nextReviewDate ? ` · Prochaine revue : ${fmt(r.nextReviewDate)}` : ""}
                  </div>
                )}

                {snapKeys.length > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6, marginBottom: 10 }}>
                    {snapKeys.map((k) => (
                      <div key={k} style={{ border: "1px solid #f1f5f9", borderRadius: 6, padding: "4px 6px", textAlign: "center" }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#334155" }}>{r.kpiSnapshot[k]}</div>
                        <div style={{ fontSize: 8.5, color: "#94a3b8" }}>{KPI_LABELS[k] ?? k}</div>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#334155", marginBottom: 4 }}>Éléments d&apos;entrée</div>
                    <Block label="Évolutions du contexte" value={r.contextChanges} />
                    <Block label="Bilan des risques" value={r.riskReview} />
                    <Block label="Conformité & audits" value={r.complianceReview} />
                    <Block label="Incidents & non-conformités" value={r.incidentsReview} />
                    <Block label="Objectifs & plan d'action" value={r.objectivesReview} />
                    <Block label="Retours des parties intéressées" value={r.feedback} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#334155", marginBottom: 4 }}>Éléments de sortie</div>
                    <Block label="Décisions & orientations" value={r.decisions} />
                    <Block label="Actions & moyens décidés" value={r.actions} />
                  </div>
                </div>
              </div>
            );
          })
        )}

        <SectionTitle>Synthèse des revues</SectionTitle>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th className={thCls}>Réf.</th>
              <th className={thCls}>Revue</th>
              <th className={thCls}>Période</th>
              <th className={thCls}>Date</th>
              <th className={thCls}>Statut</th>
              <th className={thCls}>Participants</th>
              <th className={thCls}>Prochaine</th>
            </tr>
          </thead>
          <tbody>
            {reviews.length === 0 ? (
              <tr><td className={tdCls} colSpan={7}>Aucune revue.</td></tr>
            ) : (
              reviews.map((r) => (
                <tr key={r.id}>
                  <td className={tdCls} style={{ fontFamily: "monospace" }}>{r.ref}</td>
                  <td className={tdCls}>{r.title}</td>
                  <td className={tdCls}>{r.period || "—"}</td>
                  <td className={tdCls}>{r.date ? fmt(r.date) : "—"}</td>
                  <td className={tdCls}>{r.status}</td>
                  <td className={tdCls}>{r.participantIds.length}</td>
                  <td className={tdCls}>{r.nextReviewDate ? fmt(r.nextReviewDate) : "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </ReportPortal>
    </>
  );
}

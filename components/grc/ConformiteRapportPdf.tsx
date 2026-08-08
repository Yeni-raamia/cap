"use client";

import { fmt, MATURITY_LABELS, type ControlAssessment } from "@/lib/domain";
import { FRAMEWORKS } from "@/lib/grc/frameworks";
import { scoreFramework } from "@/lib/grc/scoring";
import { useApp } from "@/components/app-context";
import { KpiBox, KpiRow, PrintBar, ReportButton, ReportPortal, SectionTitle, tdCls, thCls, usePrint } from "@/components/grc/ReportKit";

const confColor = (pct: number) => (pct >= 70 ? "#047857" : pct >= 40 ? "#b45309" : "#be123c");

/** Rapport imprimable : posture de conformité par référentiel + écarts + SoA. */
export function ConformiteRapportPdf() {
  const { controlAssessments, profileById } = useApp();
  const { open, trigger } = usePrint();

  const perFw = FRAMEWORKS.map((fw) => {
    const byCode = new Map<string, ControlAssessment>();
    controlAssessments.filter((a) => a.frameworkId === fw.id).forEach((a) => byCode.set(a.controlCode, a));
    return { fw, score: scoreFramework(fw, byCode) };
  });
  const avg = perFw.length ? Math.round(perFw.reduce((s, x) => s + x.score.conformity, 0) / perFw.length) : 0;
  const applicable = perFw.reduce((s, x) => s + x.score.applicable, 0);
  const assessed = perFw.reduce((s, x) => s + x.score.assessed, 0);
  const implemented = perFw.reduce((s, x) => s + x.score.implemented, 0);

  // Écarts : mesures évaluées mais non pleinement implémentées.
  const gaps = controlAssessments
    .filter((a) => a.applicable !== false && a.status !== "Non évalué" && a.status !== "Implémenté")
    .sort((a, b) => a.maturity - b.maturity);
  const fwShort = (id: string) => FRAMEWORKS.find((f) => f.id === id)?.short ?? id;

  return (
    <>
      <ReportButton onClick={trigger} title="Exporter la posture de conformité en PDF" />
      <ReportPortal open={open} heading="Conformité" sub="posture vs référentiels (ISO 27001, NIST CSF, CIS, RGPD/NIS2)">
        <KpiRow cols={4}>
          <KpiBox label="Conformité moyenne" value={`${avg}%`} color={confColor(avg)} />
          <KpiBox label="Mesures applicables" value={applicable} />
          <KpiBox label="Mesures évaluées" value={assessed} color="#0369a1" />
          <KpiBox label="Mesures implémentées" value={implemented} color="#047857" />
        </KpiRow>

        <SectionTitle>Posture par référentiel</SectionTitle>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th className={thCls}>Référentiel</th>
              <th className={thCls}>Version</th>
              <th className={thCls} style={{ width: "26%" }}>Conformité</th>
              <th className={thCls}>Applicables</th>
              <th className={thCls}>Évaluées</th>
              <th className={thCls}>Couverture</th>
            </tr>
          </thead>
          <tbody>
            {perFw.map(({ fw, score }) => (
              <tr key={fw.id}>
                <td className={tdCls}>{fw.short}</td>
                <td className={tdCls}>{fw.version}</td>
                <td className={tdCls}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <PrintBar pct={score.conformity} color={confColor(score.conformity)} width={90} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: confColor(score.conformity) }}>{score.conformity}%</span>
                  </div>
                </td>
                <td className={tdCls}>{score.applicable}{score.excluded ? ` (+${score.excluded} exclues)` : ""}</td>
                <td className={tdCls}>{score.assessed}</td>
                <td className={tdCls}>{score.coverage}%</td>
              </tr>
            ))}
          </tbody>
        </table>

        <SectionTitle>Principaux écarts (mesures évaluées non implémentées) · {gaps.length}</SectionTitle>
        {gaps.length === 0 ? (
          <div style={{ fontSize: 11, color: "#94a3b8" }}>Aucun écart : les mesures évaluées sont implémentées.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th className={thCls}>Réf.</th>
                <th className={thCls}>Mesure</th>
                <th className={thCls}>Statut</th>
                <th className={thCls}>Maturité</th>
                <th className={thCls}>Responsable</th>
                <th className={thCls}>Prochaine revue</th>
              </tr>
            </thead>
            <tbody>
              {gaps.map((a) => (
                <tr key={a.id}>
                  <td className={tdCls} style={{ fontFamily: "monospace" }}>{fwShort(a.frameworkId)} · {a.controlCode}</td>
                  <td className={tdCls}>{a.justification || a.note || "—"}</td>
                  <td className={tdCls}>{a.status}</td>
                  <td className={tdCls}>{a.maturity}/5 · {MATURITY_LABELS[a.maturity] ?? "—"}</td>
                  <td className={tdCls}>{a.responsibleId ? profileById(a.responsibleId).nom : "—"}</td>
                  <td className={tdCls}>{a.nextReviewAt ? fmt(a.nextReviewAt) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </ReportPortal>
    </>
  );
}

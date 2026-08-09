"use client";

import { useMemo } from "react";
import {
  assetCriticality, fmt, incidentResolutionHours, isIncidentOpen, riskResidualLevel,
  type AssetCriticality, type ControlAssessment, type RiskLevel,
} from "@/lib/domain";
import { FRAMEWORKS } from "@/lib/grc/frameworks";
import { scoreFramework } from "@/lib/grc/scoring";
import { computeGrcKpis, grcPosture } from "@/lib/grc/kpis";
import { useApp } from "@/components/app-context";
import { Chip, KpiBox, KpiRow, PrintBar, ReportButton, ReportPortal, SectionTitle, tdCls, thCls, usePrint } from "@/components/grc/ReportKit";
import { directionPolicyRows, STAGE_HEX } from "@/components/grc/PolitiquesParDirection";

const confColor = (pct: number) => (pct >= 70 ? "#047857" : pct >= 40 ? "#b45309" : "#be123c");
const RISK_HEX: Record<RiskLevel, string> = { Critique: "#be123c", "Élevé": "#c2410c", Moyen: "#b45309", Faible: "#047857" };
const CRIT_ORDER: Record<AssetCriticality, number> = { Critique: 0, "Élevé": 1, "Modéré": 2, Faible: 3 };

/** Rapport GLOBAL du module GRC : posture consolidée + synthèse de tous les onglets. */
export function GrcRapportGlobalPdf() {
  const app = useApp();
  const { open, trigger } = usePrint();
  const { risks, assets, policies, incidents, missions, suppliers, continuityPlans, reviews, directions, profileById, now } = app;

  const kpis = useMemo(
    () => computeGrcKpis({ risks, controlAssessments: app.controlAssessments, fieldControls: app.fieldControls, capaActions: app.capaActions, incidents, processing: app.processing, policies, continuityPlans, missions, assets, now }),
    [risks, app.controlAssessments, app.fieldControls, app.capaActions, incidents, app.processing, policies, continuityPlans, missions, assets, now]
  );
  const posture = grcPosture(kpis);
  const postureLabel = posture >= 70 ? "Maîtrisée" : posture >= 45 ? "À consolider" : "Sous tension";

  // Conformité par référentiel.
  const perFw = FRAMEWORKS.map((fw) => {
    const byCode = new Map<string, ControlAssessment>();
    app.controlAssessments.filter((a) => a.frameworkId === fw.id).forEach((a) => byCode.set(a.controlCode, a));
    return { fw, score: scoreFramework(fw, byCode) };
  });

  // Risques par niveau résiduel (ouverts) + top 5.
  const openRisks = risks.filter((r) => r.status !== "Clôturé").map((r) => ({ r, level: riskResidualLevel(r) }));
  const riskByLevel: Record<RiskLevel, number> = { Critique: 0, "Élevé": 0, Moyen: 0, Faible: 0 };
  openRisks.forEach(({ level }) => (riskByLevel[level] += 1));
  const topRisks = [...openRisks].sort((a, b) => b.r.residualProbability * b.r.residualImpact - a.r.residualProbability * a.r.residualImpact).slice(0, 5);

  // Actifs par criticité.
  const assetByCrit: Record<AssetCriticality, number> = { Critique: 0, "Élevé": 0, "Modéré": 0, Faible: 0 };
  assets.filter((a) => a.status !== "Retiré").forEach((a) => (assetByCrit[assetCriticality(a) as AssetCriticality] += 1));

  // Incidents.
  const incOuverts = incidents.filter(isIncidentOpen).length;
  const mttrs = incidents.map(incidentResolutionHours).filter((h): h is number => h !== null);
  const mttr = mttrs.length ? Math.round(mttrs.reduce((a, h) => a + h, 0) / mttrs.length) : null;

  // Politiques par direction (top 6).
  const dirRows = directionPolicyRows(directions, policies).slice(0, 6);
  const stages = ["Diffusée", "Consultée", "Comprise", "Applicable", "Non applicable"];

  const lastReview = reviews[0] ?? null; // listReviews trie par date décroissante

  const twoCol: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" };

  return (
    <>
      <ReportButton onClick={trigger} label="Rapport global" title="Rapport consolidé de tout le module GRC" />
      <ReportPortal open={open} heading="Rapport global GRC" sub="synthèse consolidée du module (gouvernance · risque · conformité)">
        {/* Posture */}
        <SectionTitle style={{ marginTop: 0 }}>Posture GRC · indice {posture}/100 — {postureLabel}</SectionTitle>
        <KpiRow cols={5}>
          <KpiBox label="Conformité moyenne" value={`${kpis.conformite}%`} color={confColor(kpis.conformite)} />
          <KpiBox label="Risques critiques" value={kpis.risquesCritiques} color="#be123c" />
          <KpiBox label="Actions en retard" value={kpis.capaEnRetard} color="#be123c" />
          <KpiBox label="Incidents ouverts" value={kpis.incidentsOuverts} color="#b45309" />
          <KpiBox label="AIPD à réaliser" value={kpis.aipdARealiser} color="#b45309" />
        </KpiRow>
        <KpiRow cols={5}>
          <KpiBox label="Écarts terrain ouverts" value={kpis.ecartsOuverts} color="#b45309" />
          <KpiBox label="Violations de données" value={kpis.violationsDonnees} color="#be123c" />
          <KpiBox label="Applicabilité politiques" value={`${kpis.applicabilitePolitiques}%`} color="#0369a1" />
          <KpiBox label="Continuité à tester" value={kpis.continuiteATester} color="#b45309" />
          <KpiBox label="Joyaux prioritaires" value={kpis.joyauxPrioritaires} color="#7c3aed" />
        </KpiRow>

        {/* Conformité */}
        <SectionTitle>Conformité par référentiel</SectionTitle>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th className={thCls}>Référentiel</th>
              <th className={thCls} style={{ width: "34%" }}>Conformité</th>
              <th className={thCls}>Applicables</th>
              <th className={thCls}>Évaluées</th>
              <th className={thCls}>Couverture</th>
            </tr>
          </thead>
          <tbody>
            {perFw.map(({ fw, score }) => (
              <tr key={fw.id}>
                <td className={tdCls}>{fw.short} <span style={{ color: "#94a3b8" }}>({fw.version})</span></td>
                <td className={tdCls}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <PrintBar pct={score.conformity} color={confColor(score.conformity)} width={110} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: confColor(score.conformity) }}>{score.conformity}%</span>
                  </div>
                </td>
                <td className={tdCls}>{score.applicable}</td>
                <td className={tdCls}>{score.assessed}</td>
                <td className={tdCls}>{score.coverage}%</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Risques + Actifs côte à côte */}
        <div style={twoCol}>
          <div>
            <SectionTitle>Risques ouverts par niveau résiduel · {openRisks.length}</SectionTitle>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {(["Critique", "Élevé", "Moyen", "Faible"] as RiskLevel[]).map((lvl) => {
                  const n = riskByLevel[lvl];
                  const pct = openRisks.length ? Math.round((n / openRisks.length) * 100) : 0;
                  return (
                    <tr key={lvl}>
                      <td className={tdCls} style={{ width: 64 }}><span style={{ background: RISK_HEX[lvl], color: "#fff", fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 4, WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>{lvl}</span></td>
                      <td className={tdCls}><PrintBar pct={pct} color={RISK_HEX[lvl]} /></td>
                      <td className={tdCls} style={{ width: 60, textAlign: "right" }}>{n} · {pct}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div>
            <SectionTitle>Actifs par criticité · {assets.length}</SectionTitle>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {(["Critique", "Élevé", "Modéré", "Faible"] as AssetCriticality[]).sort((a, b) => CRIT_ORDER[a] - CRIT_ORDER[b]).map((c) => (
                  <tr key={c}>
                    <td className={tdCls}>{c}</td>
                    <td className={tdCls} style={{ textAlign: "right", fontWeight: 600 }}>{assetByCrit[c]}</td>
                  </tr>
                ))}
                <tr><td className={tdCls} style={{ color: "#7c3aed", fontWeight: 600 }}>Joyaux prioritaires (JCA)</td><td className={tdCls} style={{ textAlign: "right", fontWeight: 700, color: "#7c3aed" }}>{kpis.joyauxPrioritaires}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Top risques */}
        {topRisks.length > 0 && (
          <>
            <SectionTitle>Risques résiduels les plus élevés</SectionTitle>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th className={thCls}>Réf.</th>
                  <th className={thCls}>Risque</th>
                  <th className={thCls}>Niveau</th>
                  <th className={thCls}>Traitement</th>
                  <th className={thCls}>Responsable</th>
                </tr>
              </thead>
              <tbody>
                {topRisks.map(({ r, level }) => (
                  <tr key={r.id}>
                    <td className={tdCls} style={{ fontFamily: "monospace" }}>{r.ref}</td>
                    <td className={tdCls}>{r.title}</td>
                    <td className={tdCls}><span style={{ background: RISK_HEX[level], color: "#fff", fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 4, WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>{level}</span></td>
                    <td className={tdCls}>{r.treatment || "—"}</td>
                    <td className={tdCls}>{profileById(r.ownerId).nom}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* Opérations : contrôles, actions, incidents */}
        <SectionTitle>Contrôles, actions & incidents</SectionTitle>
        <KpiRow cols={6}>
          <KpiBox label="Contrôles réalisés" value={kpis.controlesRealises} />
          <KpiBox label="Conformité contrôles" value={`${kpis.tauxConformiteControles}%`} color={confColor(kpis.tauxConformiteControles)} />
          <KpiBox label="Actions ouvertes" value={kpis.capaOuvertes} color="#0369a1" />
          <KpiBox label="Actions en retard" value={kpis.capaEnRetard} color="#be123c" />
          <KpiBox label="Incidents ouverts" value={incOuverts} color="#b45309" />
          <KpiBox label="MTTR moyen" value={mttr === null ? "—" : `${mttr} h`} color="#0369a1" />
        </KpiRow>

        {/* RGPD, Continuité, Missions, Fournisseurs */}
        <SectionTitle>RGPD, continuité & dépendances</SectionTitle>
        <KpiRow cols={6}>
          <KpiBox label="Traitements (ROPA)" value={kpis.traitements} />
          <KpiBox label="AIPD à réaliser" value={kpis.aipdARealiser} color="#b45309" />
          <KpiBox label="Plans de continuité" value={continuityPlans.length} />
          <KpiBox label="Continuité à tester" value={kpis.continuiteATester} color="#b45309" />
          <KpiBox label="Missions" value={missions.length} />
          <KpiBox label="Fournisseurs" value={suppliers.length} />
        </KpiRow>

        {/* Politiques par direction */}
        <SectionTitle>Acceptation des politiques par direction</SectionTitle>
        {dirRows.length === 0 ? (
          <div style={{ fontSize: 11, color: "#94a3b8" }}>Aucune diffusion rattachée à une direction de l&apos;organigramme.</div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 4 }}>
              {stages.map((s) => <Chip key={s} color={STAGE_HEX[s]}>{s}</Chip>)}
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr><th className={thCls}>Direction</th><th className={thCls} style={{ width: "50%" }}>Répartition</th><th className={thCls}>Applicables</th><th className={thCls}>Taux</th></tr>
              </thead>
              <tbody>
                {dirRows.map(({ dir, roll }) => {
                  const total = stages.reduce((a, s) => a + (roll.byStage[s] ?? 0), 0) || 1;
                  return (
                    <tr key={dir.id}>
                      <td className={tdCls}>{dir.code || dir.name}</td>
                      <td className={tdCls}>
                        <div style={{ display: "flex", height: 12, width: "100%", borderRadius: 4, overflow: "hidden", background: "#f1f5f9", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
                          {stages.map((s) => (roll.byStage[s] ? <div key={s} style={{ width: `${((roll.byStage[s] ?? 0) / total) * 100}%`, background: STAGE_HEX[s], WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }} /> : null))}
                        </div>
                      </td>
                      <td className={tdCls}>{roll.applicable}/{roll.total}</td>
                      <td className={tdCls} style={{ fontWeight: 700, color: confColor(roll.pct) }}>{roll.pct}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}

        {/* Dernière revue de direction */}
        <SectionTitle>Gouvernance — revue de direction</SectionTitle>
        {lastReview ? (
          <div style={{ fontSize: 11, color: "#334155" }}>
            <b>Dernière revue :</b> {lastReview.ref} — {lastReview.title} ({[lastReview.status, lastReview.period, lastReview.date ? fmt(lastReview.date) : null].filter(Boolean).join(" · ")}).
            {lastReview.nextReviewDate ? ` Prochaine revue prévue le ${fmt(lastReview.nextReviewDate)}.` : ""}
            {lastReview.decisions ? <div style={{ marginTop: 4 }}><b>Décisions :</b> {lastReview.decisions}</div> : null}
          </div>
        ) : (
          <div style={{ fontSize: 11, color: "#94a3b8" }}>Aucune revue de direction enregistrée.</div>
        )}
      </ReportPortal>
    </>
  );
}

"use client";

import { useMemo } from "react";
import { computeAuditScore, type Audit, type AuditResponse } from "@/lib/domain";
import { useApp } from "@/components/app-context";
import { KpiBox, KpiRow, PrintBar, ReportButton, ReportPortal, SectionTitle, tdCls, thCls, usePrint } from "@/components/grc/ReportKit";

const confColor = (pct: number) => (pct >= 80 ? "#047857" : pct >= 50 ? "#b45309" : "#be123c");
const SEV_HEX: Record<string, string> = { Majeure: "#be123c", Mineure: "#b45309", Observation: "#0369a1" };

type Finding = { auditRef: string; auditTitle: string; question: string; domain: string; answer: string; severity: string; recommendation: string };

/** Rapport GLOBAL du module Audit : couverture, scores consolidés, constats et grilles. */
export function AuditRapportGlobalPdf() {
  const { audits, auditGrids, assetById, profileById } = useApp();
  const { open, trigger } = usePrint();

  const d = useMemo(() => {
    const scored = audits.map((a) => ({ a, s: computeAuditScore(a.questions, a.responses) }));
    const withAnswers = scored.filter((x) => x.s.answered > 0);
    const avg = withAnswers.length ? Math.round(withAnswers.reduce((sum, x) => sum + x.s.global, 0) / withAnswers.length) : 0;
    const gaps = scored.reduce((n, x) => n + x.s.gaps, 0);
    const criticalGaps = scored.reduce((n, x) => n + x.s.criticalGaps, 0);
    const evaluated = withAnswers.length;

    // Score moyen par catégorie.
    const byCat = new Map<string, { sum: number; n: number }>();
    withAnswers.forEach(({ a, s }) => {
      const c = byCat.get(a.category) ?? { sum: 0, n: 0 };
      c.sum += s.global; c.n += 1; byCat.set(a.category, c);
    });
    const catScores = [...byCat.entries()].map(([category, v]) => ({ category, score: Math.round(v.sum / v.n), n: v.n })).sort((x, y) => x.score - y.score);

    // Constats critiques (question critique en écart Non/Partiel), toutes campagnes confondues.
    const findings: Finding[] = [];
    for (const a of audits) {
      const byId = new Map<string, AuditResponse>(a.responses.map((r) => [r.questionId, r]));
      for (const q of a.questions) {
        const r = byId.get(q.id);
        if (r && q.critical && (r.answer === "Non" || r.answer === "Partiel")) {
          findings.push({ auditRef: a.ref, auditTitle: a.title, question: q.text, domain: q.domain.trim() || "Général", answer: r.answer, severity: r.severity || "Majeure", recommendation: r.recommendation });
        }
      }
    }
    return { scored, avg, gaps, criticalGaps, evaluated, catScores, findings };
  }, [audits]);

  const targetName = (a: Audit) => (a.targetAssetId ? assetById(a.targetAssetId)?.name ?? a.targetLabel : a.targetLabel) || "—";

  return (
    <>
      <ReportButton onClick={trigger} label="Rapport global" title="Rapport consolidé de tout le module Audit" />
      <ReportPortal open={open} heading="Rapport global Audit" sub="synthèse consolidée des audits techniques">
        <SectionTitle style={{ marginTop: 0 }}>Couverture & posture</SectionTitle>
        <KpiRow cols={5}>
          <KpiBox label="Audits" value={audits.length} />
          <KpiBox label="Score moyen" value={`${d.avg}%`} color={confColor(d.avg)} />
          <KpiBox label="Constats" value={d.gaps} color="#b45309" />
          <KpiBox label="Constats critiques" value={d.criticalGaps} color="#be123c" />
          <KpiBox label="Grilles" value={auditGrids.length} color="#0369a1" />
        </KpiRow>

        <SectionTitle>Score moyen par catégorie</SectionTitle>
        {d.catScores.length === 0 ? (
          <div style={{ fontSize: 11, color: "#94a3b8" }}>Aucun audit évalué à ce jour.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th className={thCls}>Catégorie</th><th className={thCls} style={{ width: "45%" }}>Score</th><th className={thCls}>Audits</th></tr></thead>
            <tbody>
              {d.catScores.map((c) => (
                <tr key={c.category}>
                  <td className={tdCls}>{c.category}</td>
                  <td className={tdCls}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <PrintBar pct={c.score} color={confColor(c.score)} width={140} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: confColor(c.score) }}>{c.score}%</span>
                    </div>
                  </td>
                  <td className={tdCls}>{c.n}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <SectionTitle>Inventaire des audits · {audits.length}</SectionTitle>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th className={thCls}>Réf.</th><th className={thCls}>Audit</th><th className={thCls}>Cible</th><th className={thCls}>Auditeur</th><th className={thCls}>Statut</th><th className={thCls}>Score</th><th className={thCls}>Constats</th></tr></thead>
          <tbody>
            {audits.length === 0 ? <tr><td className={tdCls} colSpan={7}>Aucun audit.</td></tr> :
              d.scored.map(({ a, s }) => (
                <tr key={a.id}>
                  <td className={tdCls} style={{ fontFamily: "monospace" }}>{a.ref}</td>
                  <td className={tdCls}>{a.title}</td>
                  <td className={tdCls}>{targetName(a)}</td>
                  <td className={tdCls}>{a.auditorId ? profileById(a.auditorId).nom : "—"}</td>
                  <td className={tdCls}>{a.status}</td>
                  <td className={tdCls} style={{ fontWeight: 700, color: s.answered ? confColor(s.global) : "#94a3b8" }}>{s.answered ? `${s.global}%` : "—"}</td>
                  <td className={tdCls}>{s.gaps}{s.criticalGaps > 0 ? ` (${s.criticalGaps} crit.)` : ""}</td>
                </tr>
              ))}
          </tbody>
        </table>

        {d.findings.length > 0 && (
          <>
            <SectionTitle>Constats critiques · {d.findings.length}</SectionTitle>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th className={thCls}>Audit</th><th className={thCls}>Domaine</th><th className={thCls}>Point de contrôle</th><th className={thCls}>Réponse</th><th className={thCls}>Cotation</th><th className={thCls}>Recommandation</th></tr></thead>
              <tbody>
                {d.findings.map((f, i) => (
                  <tr key={i}>
                    <td className={tdCls} style={{ fontFamily: "monospace" }}>{f.auditRef}</td>
                    <td className={tdCls}>{f.domain}</td>
                    <td className={tdCls}>{f.question}</td>
                    <td className={tdCls}>{f.answer}</td>
                    <td className={tdCls}><span style={{ background: SEV_HEX[f.severity] ?? "#64748b", color: "#fff", fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 4, WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>{f.severity}</span></td>
                    <td className={tdCls}>{f.recommendation || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <SectionTitle>Grilles de contrôle disponibles · {auditGrids.length}</SectionTitle>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th className={thCls}>Réf.</th><th className={thCls}>Grille</th><th className={thCls}>Catégorie</th><th className={thCls}>Source</th><th className={thCls}>Points</th></tr></thead>
          <tbody>
            {auditGrids.map((g) => (
              <tr key={g.id}>
                <td className={tdCls} style={{ fontFamily: "monospace" }}>{g.ref}</td>
                <td className={tdCls}>{g.name}</td>
                <td className={tdCls}>{g.category}</td>
                <td className={tdCls}>{g.source}</td>
                <td className={tdCls}>{g.questions.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ReportPortal>
    </>
  );
}

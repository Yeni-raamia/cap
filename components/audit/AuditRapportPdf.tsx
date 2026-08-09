"use client";

import { computeAuditScore, fmt, gridDomains, previousAudit, type Audit } from "@/lib/domain";
import { useApp } from "@/components/app-context";
import { KpiBox, KpiRow, PrintBar, ReportButton, ReportPortal, SectionTitle, tdCls, thCls, usePrint } from "@/components/grc/ReportKit";

const scoreColor = (pct: number) => (pct >= 80 ? "#047857" : pct >= 50 ? "#b45309" : "#be123c");
const ANSWER_HEX: Record<string, { bg: string; fg: string }> = {
  Oui: { bg: "#d1fae5", fg: "#047857" },
  Partiel: { bg: "#fef3c7", fg: "#b45309" },
  Non: { bg: "#ffe4e6", fg: "#be123c" },
  "Non applicable": { bg: "#f1f5f9", fg: "#64748b" },
  "À vérifier": { bg: "#f1f5f9", fg: "#64748b" },
};
const ansBadge = (a: string) => ({ background: ANSWER_HEX[a]?.bg ?? "#f1f5f9", color: ANSWER_HEX[a]?.fg ?? "#64748b", fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 4, WebkitPrintColorAdjust: "exact" as const, printColorAdjust: "exact" as const });

/** Rapport imprimable d'un audit : score par domaine, constats et détail. */
export function AuditRapportPdf({ audit }: { audit: Audit }) {
  const { audits, assetById, profileById } = useApp();
  const { open, trigger } = usePrint();

  const score = computeAuditScore(audit.questions, audit.responses);
  const byId = new Map(audit.responses.map((r) => [r.questionId, r]));
  const targetName = (audit.targetAssetId ? assetById(audit.targetAssetId)?.name ?? audit.targetLabel : audit.targetLabel) || "—";

  const prev = previousAudit(audit, audits);
  const prevScore = prev ? computeAuditScore(prev.questions, prev.responses).global : null;
  const delta = prevScore !== null ? score.global - prevScore : null;

  const gaps = audit.questions
    .map((q) => ({ q, r: byId.get(q.id) }))
    .filter(({ r }) => r && (r.answer === "Non" || r.answer === "Partiel"));

  return (
    <>
      <ReportButton onClick={trigger} title="Exporter cet audit en PDF" />
      <ReportPortal open={open} heading={`Audit — ${audit.title}`} sub={`${audit.gridName} · cible : ${targetName}`}>
        <div style={{ fontSize: 12, color: "#475569", marginBottom: 12 }}>
          {audit.ref} · Statut : {audit.status}{audit.date ? ` · Réalisé le ${fmt(audit.date)}` : ""} · Auditeur : {profileById(audit.auditorId).nom}
        </div>

        <KpiRow cols={4}>
          <KpiBox label="Score global" value={`${score.global}%`} color={scoreColor(score.global)} />
          <KpiBox label="Couverture" value={`${score.coverage}%`} />
          <KpiBox label="Constats" value={score.gaps} color="#b45309" />
          <KpiBox label="Constats critiques" value={score.criticalGaps} color="#be123c" />
        </KpiRow>

        {delta !== null && (
          <div style={{ fontSize: 12, color: "#334155", marginBottom: 8 }}>
            <b>Ré-audit :</b> {delta > 0 ? "progression" : delta < 0 ? "régression" : "stable"} de{" "}
            <span style={{ fontWeight: 700, color: delta >= 0 ? "#047857" : "#be123c" }}>{delta > 0 ? "+" : ""}{delta} pts</span>{" "}
            par rapport à l&apos;audit précédent ({prevScore}%{prev?.date ? `, ${fmt(prev.date)}` : ""}).
          </div>
        )}

        <SectionTitle>Score par domaine</SectionTitle>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            {score.byDomain.map((d) => (
              <tr key={d.domain}>
                <td className={tdCls} style={{ width: "28%" }}>{d.domain}</td>
                <td className={tdCls}><PrintBar pct={d.score} color={scoreColor(d.score)} /></td>
                <td className={tdCls} style={{ width: 90, textAlign: "right", fontWeight: 700, color: scoreColor(d.score) }}>{d.score}% <span style={{ color: "#94a3b8", fontWeight: 400 }}>({d.answered}/{d.total})</span></td>
              </tr>
            ))}
          </tbody>
        </table>

        {gaps.length > 0 && (
          <>
            <SectionTitle>Constats · {gaps.length}</SectionTitle>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th className={thCls}>Domaine</th>
                  <th className={thCls}>Point de contrôle</th>
                  <th className={thCls}>Réponse</th>
                  <th className={thCls}>Cotation</th>
                  <th className={thCls}>Observation</th>
                  <th className={thCls}>Recommandation</th>
                  <th className={thCls}>Réponse managériale</th>
                </tr>
              </thead>
              <tbody>
                {gaps.map(({ q, r }) => (
                  <tr key={q.id}>
                    <td className={tdCls}>{q.domain}</td>
                    <td className={tdCls}>{q.critical ? "★ " : ""}{q.text}</td>
                    <td className={tdCls}><span style={ansBadge(r!.answer)}>{r!.answer}</span></td>
                    <td className={tdCls}>{r!.severity || "—"}</td>
                    <td className={tdCls}>{r!.note || "—"}</td>
                    <td className={tdCls}>{r!.recommendation || "—"}</td>
                    <td className={tdCls}>{r!.mgmtResponse || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <SectionTitle>Détail des réponses</SectionTitle>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th className={thCls}>Domaine</th>
              <th className={thCls}>Point de contrôle</th>
              <th className={thCls}>Poids</th>
              <th className={thCls}>Réponse</th>
            </tr>
          </thead>
          <tbody>
            {gridDomains(audit.questions).flatMap((dom) =>
              audit.questions.filter((q) => (q.domain.trim() || "Général") === dom).map((q) => {
                const r = byId.get(q.id);
                return (
                  <tr key={q.id}>
                    <td className={tdCls}>{dom}</td>
                    <td className={tdCls}>{q.critical ? "★ " : ""}{q.text}</td>
                    <td className={tdCls}>{q.weight}</td>
                    <td className={tdCls}><span style={ansBadge(r?.answer ?? "À vérifier")}>{r?.answer ?? "À vérifier"}</span></td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {audit.summary && (
          <>
            <SectionTitle>Synthèse</SectionTitle>
            <div style={{ fontSize: 11, color: "#1e293b", whiteSpace: "pre-wrap" }}>{audit.summary}</div>
          </>
        )}
      </ReportPortal>
    </>
  );
}

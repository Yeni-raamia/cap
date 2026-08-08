"use client";

import { fmt, policyCoverage, POLICY_STAGES, POLICY_STAGE_NA } from "@/lib/domain";
import { useApp } from "@/components/app-context";
import { Chip, KpiBox, KpiRow, PrintBar, PrintStack, ReportButton, ReportPortal, SectionTitle, tdCls, thCls, usePrint } from "@/components/grc/ReportKit";
import { directionPolicyRows, STAGE_HEX } from "@/components/grc/PolitiquesParDirection";

/** Rapport imprimable : politiques de sécurité + avancement de l'acceptation par direction. */
export function PolitiquesRapportPdf() {
  const { policies, directions, profileById } = useApp();
  const { open, trigger } = usePrint();

  const enVigueur = policies.filter((p) => p.status === "En vigueur");
  const covs = enVigueur.map((p) => policyCoverage(p)).filter((c) => c.total > 0);
  const avg = covs.length ? Math.round(covs.reduce((a, c) => a + c.pct, 0) / covs.length) : 0;
  const aRevoir = policies.filter((p) => p.reviewDate && p.reviewDate.getTime() < Date.now() && p.status !== "Retirée").length;

  const dirRows = directionPolicyRows(directions, policies);
  const stages = [...POLICY_STAGES, POLICY_STAGE_NA];

  return (
    <>
      <ReportButton onClick={trigger} title="Exporter les politiques et l'acceptation par direction en PDF" />
      <ReportPortal open={open} heading="Politiques de sécurité" sub="diffusion & acceptation par direction">
        <KpiRow cols={4}>
          <KpiBox label="Politiques" value={policies.length} />
          <KpiBox label="En vigueur" value={enVigueur.length} color="#047857" />
          <KpiBox label="Applicabilité moyenne" value={`${avg}%`} color="#0369a1" />
          <KpiBox label="Revue en retard" value={aRevoir} color="#b45309" />
        </KpiRow>

        {/* Avancement de l'acceptation par direction */}
        <SectionTitle>Avancement de l&apos;acceptation par direction</SectionTitle>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 6 }}>
          {stages.map((s) => <Chip key={s} color={STAGE_HEX[s]}>{s}</Chip>)}
        </div>
        {dirRows.length === 0 ? (
          <div style={{ fontSize: 11, color: "#94a3b8", padding: "6px 0" }}>Aucune diffusion rattachée à une direction de l&apos;organigramme.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th className={thCls}>Direction</th>
                <th className={thCls} style={{ width: "42%" }}>Répartition des diffusions</th>
                <th className={thCls}>Comprises</th>
                <th className={thCls}>Applicables</th>
                <th className={thCls}>Taux</th>
              </tr>
            </thead>
            <tbody>
              {dirRows.map(({ dir, roll }) => (
                <tr key={dir.id}>
                  <td className={tdCls}>
                    <div style={{ fontWeight: 600 }}>{dir.code || dir.name}</div>
                    {dir.code && <div style={{ fontSize: 10, color: "#94a3b8" }}>{dir.name}</div>}
                  </td>
                  <td className={tdCls}>
                    <PrintStack segments={stages.map((s) => ({ value: roll.byStage[s] ?? 0, color: STAGE_HEX[s], label: s }))} />
                  </td>
                  <td className={tdCls}>{roll.comprises}/{roll.total}</td>
                  <td className={tdCls}>{roll.applicable}/{roll.total}</td>
                  <td className={tdCls} style={{ fontWeight: 700, color: roll.pct >= 70 ? "#047857" : roll.pct >= 40 ? "#b45309" : "#be123c" }}>{roll.pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Détail des politiques */}
        <SectionTitle>Détail des politiques</SectionTitle>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th className={thCls}>Réf.</th>
              <th className={thCls}>Intitulé</th>
              <th className={thCls}>Domaine</th>
              <th className={thCls}>Statut</th>
              <th className={thCls}>Version</th>
              <th className={thCls} style={{ width: "18%" }}>Applicabilité</th>
              <th className={thCls}>Responsable</th>
              <th className={thCls}>Revue</th>
            </tr>
          </thead>
          <tbody>
            {policies.length === 0 ? (
              <tr><td className={tdCls} colSpan={8}>Aucune politique.</td></tr>
            ) : (
              policies.map((p) => {
                const cov = policyCoverage(p);
                const late = p.reviewDate && p.reviewDate.getTime() < Date.now() && p.status !== "Retirée";
                return (
                  <tr key={p.id}>
                    <td className={tdCls} style={{ fontFamily: "monospace" }}>{p.ref}</td>
                    <td className={tdCls}>{p.title}</td>
                    <td className={tdCls}>{p.domain || "—"}</td>
                    <td className={tdCls}>{p.status}</td>
                    <td className={tdCls}>{p.version ? `v${p.version}` : "—"}</td>
                    <td className={tdCls}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <PrintBar pct={cov.pct} width={70} />
                        <span style={{ fontSize: 10, color: "#475569" }}>{cov.pct}% · {cov.applicable}/{cov.total}</span>
                      </div>
                    </td>
                    <td className={tdCls}>{profileById(p.ownerId).nom}</td>
                    <td className={tdCls} style={late ? { color: "#b45309", fontWeight: 600 } : undefined}>{p.reviewDate ? fmt(p.reviewDate) : "—"}</td>
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

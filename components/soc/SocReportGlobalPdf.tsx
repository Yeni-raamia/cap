"use client";

import { useMemo } from "react";
import { computeSocKpis, currentOnCall, fmt, isIntelActive } from "@/lib/domain";
import { ATTACK_TECHNIQUES } from "@/lib/data/attack";
import { useApp } from "@/components/app-context";
import { KpiBox, KpiRow, ReportButton, ReportPortal, SectionTitle, tdCls, thCls, usePrint } from "@/components/grc/ReportKit";

const pctColor = (p: number) => (p >= 70 ? "#047857" : p >= 40 ? "#b45309" : "#be123c");

/** Rapport global du module SOC : préparation, capitalisation et posture. */
export function SocReportGlobalPdf() {
  const app = useApp();
  const { open, trigger } = usePrint();
  const now = useMemo(() => new Date(), []);
  const k = useMemo(
    () => computeSocKpis({ runbooks: app.runbooks, socProcedures: app.socProcedures, attackTechniqueIds: ATTACK_TECHNIQUES.map((t) => t.id), attackCoverage: app.attackCoverage, intel: app.intel, onCall: app.onCall, incidents: app.incidents, now }),
    [app.runbooks, app.socProcedures, app.attackCoverage, app.intel, app.onCall, app.incidents, now]
  );
  const veilleActive = app.intel.filter((i) => isIntelActive(i, now));
  const deGarde = currentOnCall(app.onCall, now);

  return (
    <>
      <ReportButton onClick={trigger} label="Rapport global" title="Rapport consolidé du module SOC" />
      <ReportPortal open={open} heading="Rapport global SOC" sub="méthode & bonnes pratiques">
        <SectionTitle style={{ marginTop: 0 }}>Préparation méthodologique · indice {k.readiness}/100</SectionTitle>
        <KpiRow cols={4}>
          <KpiBox label="Runbooks validés" value={`${k.runbookValidationPct}%`} color={pctColor(k.runbookValidationPct)} />
          <KpiBox label="Procédures validées" value={`${k.procValidationPct}%`} color={pctColor(k.procValidationPct)} />
          <KpiBox label="Couverture ATT&CK" value={`${k.attackCoveragePct}%`} color={pctColor(k.attackCoveragePct)} />
          <KpiBox label="Techniques reliées" value={`${k.attackReliees}/${k.attackTotal}`} color="#4f46e5" />
        </KpiRow>
        <KpiRow cols={4}>
          <KpiBox label="Veille active" value={k.veilleActive} color="#b45309" />
          <KpiBox label="Incidents ouverts (GRC)" value={k.incidentsOuverts} color="#be123c" />
          <KpiBox label="MTTR moyen" value={k.mttrHeures === null ? "—" : `${k.mttrHeures} h`} color="#0369a1" />
          <KpiBox label="De garde" value={k.deGarde} color="#047857" />
        </KpiRow>

        <SectionTitle>Runbooks de réponse · {app.runbooks.length}</SectionTitle>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th className={thCls}>Réf.</th><th className={thCls}>Runbook</th><th className={thCls}>Catégorie</th><th className={thCls}>Gravité</th><th className={thCls}>Statut</th><th className={thCls}>Étapes</th></tr></thead>
          <tbody>
            {app.runbooks.length === 0 ? <tr><td className={tdCls} colSpan={6}>Aucun runbook.</td></tr> :
              app.runbooks.map((r) => (
                <tr key={r.id}><td className={tdCls} style={{ fontFamily: "monospace" }}>{r.ref}</td><td className={tdCls}>{r.title}</td><td className={tdCls}>{r.category}</td><td className={tdCls}>{r.severity}</td><td className={tdCls}>{r.status}</td><td className={tdCls}>{r.steps.length}</td></tr>
              ))}
          </tbody>
        </table>

        <SectionTitle>Procédures & checklists · {app.socProcedures.length}</SectionTitle>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th className={thCls}>Réf.</th><th className={thCls}>Procédure</th><th className={thCls}>Type</th><th className={thCls}>Fréquence</th><th className={thCls}>Statut</th></tr></thead>
          <tbody>
            {app.socProcedures.map((p) => (
              <tr key={p.id}><td className={tdCls} style={{ fontFamily: "monospace" }}>{p.ref}</td><td className={tdCls}>{p.title}</td><td className={tdCls}>{p.type}</td><td className={tdCls}>{p.frequency}</td><td className={tdCls}>{p.status}</td></tr>
            ))}
          </tbody>
        </table>

        {veilleActive.length > 0 && (
          <>
            <SectionTitle>Veille active · {veilleActive.length}</SectionTitle>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th className={thCls}>Réf.</th><th className={thCls}>Élément</th><th className={thCls}>Valeur</th><th className={thCls}>TLP</th><th className={thCls}>Gravité</th><th className={thCls}>Statut</th></tr></thead>
              <tbody>
                {veilleActive.map((i) => (
                  <tr key={i.id}><td className={tdCls} style={{ fontFamily: "monospace" }}>{i.ref}</td><td className={tdCls}>{i.title}</td><td className={tdCls} style={{ fontFamily: "monospace" }}>{i.value || "—"}</td><td className={tdCls}>{i.tlp}</td><td className={tdCls}>{i.severity}</td><td className={tdCls}>{i.status}</td></tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <SectionTitle>Astreinte</SectionTitle>
        <div style={{ fontSize: 11, color: "#334155" }}>
          {deGarde.length === 0 ? "Personne de garde à l'instant de l'édition." :
            <><b>De garde :</b> {deGarde.map((s) => `${app.profileById(s.personId).nom} (${s.role}${s.contact ? " · " + s.contact : ""})`).join(" ; ")}.</>}
        </div>

        <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 14 }}>
          La gestion des incidents (registre ISO 27035) est assurée dans le module GRC — édité le {fmt(now)}.
        </div>
      </ReportPortal>
    </>
  );
}

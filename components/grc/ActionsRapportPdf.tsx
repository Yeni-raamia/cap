"use client";

import { fmt, isCapaLate, type CapaAction } from "@/lib/domain";
import { useApp } from "@/components/app-context";
import { KpiBox, KpiRow, ReportButton, ReportPortal, SectionTitle, tdCls, thCls, usePrint } from "@/components/grc/ReportKit";

const PRIO_HEX: Record<string, { bg: string; fg: string }> = {
  Critique: { bg: "#ffe4e6", fg: "#be123c" },
  Haute: { bg: "#ffedd5", fg: "#c2410c" },
  Normale: { bg: "#e0f2fe", fg: "#0369a1" },
  Basse: { bg: "#f1f5f9", fg: "#475569" },
};
const prioBadge = (p: string) => ({ background: PRIO_HEX[p]?.bg ?? "#f1f5f9", color: PRIO_HEX[p]?.fg ?? "#475569", fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 4, WebkitPrintColorAdjust: "exact" as const, printColorAdjust: "exact" as const });
const SOURCE_LABEL: Record<string, string> = { controle: "Contrôle", nonconformite: "Non-conformité", risque: "Risque", incident: "Incident", audit: "Audit", manuel: "Manuel" };

/** Rapport imprimable : plan d'actions correctives et préventives (CAPA). */
export function ActionsRapportPdf() {
  const { capaActions, profileById, now } = useApp();
  const { open, trigger } = usePrint();

  const ouvertes = capaActions.filter((a) => a.status !== "Clôturée").length;
  const enRetard = capaActions.filter((a) => isCapaLate(a, now)).length;
  const cloturees = capaActions.filter((a) => a.status === "Clôturée").length;

  // En retard d'abord, puis par échéance croissante.
  const sorted = [...capaActions].sort((a, b) => {
    const la = isCapaLate(a, now) ? 0 : 1, lb = isCapaLate(b, now) ? 0 : 1;
    if (la !== lb) return la - lb;
    return (a.dueDate?.getTime() ?? Infinity) - (b.dueDate?.getTime() ?? Infinity);
  });

  return (
    <>
      <ReportButton onClick={trigger} title="Exporter le plan d'actions (CAPA) en PDF" />
      <ReportPortal open={open} heading="Plan d'actions (CAPA)" sub="actions correctives & préventives">
        <KpiRow cols={4}>
          <KpiBox label="Actions" value={capaActions.length} />
          <KpiBox label="Ouvertes" value={ouvertes} color="#0369a1" />
          <KpiBox label="En retard" value={enRetard} color="#be123c" />
          <KpiBox label="Clôturées" value={cloturees} color="#047857" />
        </KpiRow>

        <SectionTitle>Détail du plan d&apos;actions</SectionTitle>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th className={thCls}>Réf.</th>
              <th className={thCls}>Intitulé</th>
              <th className={thCls}>Type</th>
              <th className={thCls}>Origine</th>
              <th className={thCls}>Priorité</th>
              <th className={thCls}>Statut</th>
              <th className={thCls}>Échéance</th>
              <th className={thCls}>Responsable</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr><td className={tdCls} colSpan={8}>Aucune action.</td></tr>
            ) : (
              sorted.map((a: CapaAction) => {
                const late = isCapaLate(a, now);
                return (
                  <tr key={a.id}>
                    <td className={tdCls} style={{ fontFamily: "monospace" }}>{a.ref}</td>
                    <td className={tdCls}>{a.title}</td>
                    <td className={tdCls}>{a.type}</td>
                    <td className={tdCls}>{SOURCE_LABEL[a.sourceType] ?? a.sourceType}</td>
                    <td className={tdCls}><span style={prioBadge(a.priority)}>{a.priority}</span></td>
                    <td className={tdCls}>{a.status}</td>
                    <td className={tdCls} style={late ? { color: "#be123c", fontWeight: 600 } : undefined}>{a.dueDate ? fmt(a.dueDate) : "—"}</td>
                    <td className={tdCls}>{profileById(a.ownerId).nom}</td>
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

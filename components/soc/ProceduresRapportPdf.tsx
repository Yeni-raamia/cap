"use client";

import { SOC_PROCEDURE_TYPES, type SocProcedure } from "@/lib/domain";
import { useApp } from "@/components/app-context";
import { ReportButton, ReportPortal, SectionTitle, usePrint } from "@/components/grc/ReportKit";

/** Rapport imprimable : recueil des procédures & checklists de routine du SOC. */
export function ProceduresRapportPdf() {
  const { socProcedures, profileById } = useApp();
  const { open, trigger } = usePrint();

  // Regroupées par type, dans l'ordre du référentiel.
  const byType = SOC_PROCEDURE_TYPES
    .map((type) => ({ type, items: socProcedures.filter((p) => p.type === type) }))
    .filter((g) => g.items.length > 0);

  return (
    <>
      <ReportButton onClick={trigger} title="Exporter le recueil des procédures en PDF" />
      <ReportPortal open={open} heading="Procédures & checklists du SOC" sub="recueil de routine">
        <div style={{ fontSize: 12, color: "#475569", marginBottom: 12 }}>{socProcedures.length} procédure(s).</div>
        {byType.map(({ type, items }) => (
          <div key={type}>
            <SectionTitle>{type}</SectionTitle>
            {items.map((p: SocProcedure) => (
              <div key={p.id} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 12, marginBottom: 10, breakInside: "avoid" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, borderBottom: "1px solid #f1f5f9", paddingBottom: 6, marginBottom: 8 }}>
                  <div><span style={{ fontFamily: "monospace", fontSize: 11, color: "#64748b" }}>{p.ref}</span> <span style={{ fontSize: 13, fontWeight: 700 }}>{p.title}</span></div>
                  <div style={{ fontSize: 11, color: "#475569" }}>{[p.frequency, p.status, p.ownerId ? profileById(p.ownerId).nom : null].filter(Boolean).join(" · ")}</div>
                </div>
                {p.objective && <div style={{ fontSize: 11, color: "#475569", marginBottom: 6 }}><b>Objectif :</b> {p.objective}</div>}
                {p.content && <div style={{ fontSize: 11, color: "#1e293b", whiteSpace: "pre-wrap", marginBottom: 6 }}>{p.content}</div>}
                {p.items.length > 0 && (
                  <div style={{ marginTop: 4 }}>
                    {p.items.map((it) => (
                      <div key={it.id} style={{ fontSize: 11, color: "#1e293b", marginBottom: 2 }}>
                        <span style={{ color: "#94a3b8", marginRight: 6 }}>☐</span>{it.label}
                        {it.guidance && <span style={{ color: "#94a3b8" }}> — {it.guidance}</span>}
                      </div>
                    ))}
                  </div>
                )}
                {p.references && <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 6 }}>Réf. : {p.references}</div>}
              </div>
            ))}
          </div>
        ))}
      </ReportPortal>
    </>
  );
}

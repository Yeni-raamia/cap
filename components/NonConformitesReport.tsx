"use client";

import { createPortal } from "react-dom";
import { type NonConformite } from "@/lib/domain";
import { APP_NAME } from "@/lib/config";
import { useApp } from "./app-context";

/** Rapport consolidé de TOUTES les non-conformités à la politique de sécurité. */
export function NonConformitesReport({ ncs }: { ncs: NonConformite[] }) {
  const { items, profileById, orgName, refLists } = useApp();
  if (typeof document === "undefined") return null;

  const th = { textAlign: "left" as const, fontSize: 11, textTransform: "uppercase" as const, color: "#64748b", borderBottom: "1px solid #cbd5e1", padding: "4px 6px" };
  const td = { fontSize: 12, borderBottom: "1px solid #e2e8f0", padding: "4px 6px", verticalAlign: "top" as const };

  return createPortal(
    <div className="print-report">
      <div style={{ borderBottom: "2px solid #0f172a", paddingBottom: 10, marginBottom: 14 }}>
        <div style={{ fontSize: 20, fontWeight: 700 }}>{APP_NAME} — Rapport des non-conformités</div>
        <div style={{ fontSize: 12, color: "#475569" }}>{orgName} · Écarts à la politique de sécurité — document confidentiel</div>
        <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>Édité le {new Date().toLocaleDateString("fr-FR")} · {ncs.length} fiche(s)</div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 16 }}>
        <thead>
          <tr>
            <th style={th}>#</th>
            <th style={th}>Objet</th>
            <th style={th}>Service concerné</th>
            <th style={th}>Personne / entité</th>
            <th style={th}>Gravité</th>
            <th style={th}>Risque</th>
            <th style={th}>Ouvert par</th>
          </tr>
        </thead>
        <tbody>
          {ncs.map((n, i) => {
            const it = n.itemId ? items.find((x) => x.id === n.itemId) : null;
            const owner = it ? profileById(it.ownerId).nom : n.createdBy ? profileById(n.createdBy).nom : "—";
            return (
              <tr key={n.id}>
                <td style={td}>{i + 1}</td>
                <td style={td}>{n.objet || it?.objet || "—"}</td>
                <td style={td}>{n.service || "—"}</td>
                <td style={td}>{n.concerne || "—"}</td>
                <td style={td}>{n.gravite}</td>
                <td style={td}>{n.risque}</td>
                <td style={td}>{owner}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={{ fontSize: 15, fontWeight: 700, margin: "6px 0 8px" }}>Décisions</div>
      <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8 }}>
        Pour chaque fiche, cocher les décisions retenues (☑ = déjà saisie dans l&apos;outil).
      </div>

      {ncs.map((n, i) => {
        const it = n.itemId ? items.find((x) => x.id === n.itemId) : null;
        return (
          <div key={n.id} style={{ pageBreakInside: "avoid", border: "1px solid #e2e8f0", borderRadius: 6, padding: 10, marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              {i + 1}. {n.objet || it?.objet || "—"}
              <span style={{ fontWeight: 400, color: "#64748b" }}> — {n.service || "service ?"} · {n.concerne || "personne ?"} · gravité {n.gravite}</span>
            </div>
            {n.impact && <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}><b>Impact :</b> {n.impact}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 16px", marginTop: 6 }}>
              {refLists.decisions.map((d) => (
                <div key={d} style={{ fontSize: 12 }}>
                  {n.decisions.includes(d) ? "☑" : "☐"} {d}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <div style={{ marginTop: 30, fontSize: 12, color: "#475569" }}>
        Fait à ……………………, le ……………………
        <div style={{ marginTop: 40, textAlign: "right" }}>Le Directeur général<br />(signature)</div>
      </div>
    </div>,
    document.body
  );
}

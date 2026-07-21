"use client";

import { createPortal } from "react-dom";
import { fmt, type Negligence } from "@/lib/domain";
import { APP_NAME } from "@/lib/config";
import { useApp } from "./app-context";

/** Fiche de négligence imprimable (PDF) — rendue hors de l'app via portail. */
export function NegligencePrint({ neg }: { neg: Negligence }) {
  const { items, profileById, orgName } = useApp();
  if (typeof document === "undefined") return null;

  const item = items.find((i) => i.id === neg.itemId);
  const owner = item ? profileById(item.ownerId) : null;

  return createPortal(
    <div className="print-report">
      <div style={{ borderBottom: "2px solid #0f172a", paddingBottom: 10, marginBottom: 16 }}>
        <div style={{ fontSize: 20, fontWeight: 700 }}>{APP_NAME} — Fiche de négligence</div>
        <div style={{ fontSize: 12, color: "#475569" }}>
          {orgName} · Document confidentiel — à l&apos;attention du Directeur général
        </div>
        <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>Édité le {fmt(neg.updatedAt)}</div>
      </div>
      <div style={{ marginBottom: 14, fontSize: 13 }}>
        <div><b>Objet :</b> {neg.objet || (item ? item.objet : "—")}</div>
        {item && <div><b>Suivi de mail concerné :</b> [{item.ref}] {item.objet}</div>}
        <div><b>Suivi par :</b> {owner?.nom ?? "—"}</div>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 14, fontSize: 13 }}>
        <tbody>
          <tr><td style={{ padding: "4px 8px", fontWeight: 600, width: 180 }}>Service en cause</td><td style={{ padding: "4px 8px" }}>{neg.service || "—"}</td></tr>
          <tr><td style={{ padding: "4px 8px", fontWeight: 600 }}>Personne concernée</td><td style={{ padding: "4px 8px" }}>{neg.concerne || "—"}</td></tr>
          <tr><td style={{ padding: "4px 8px", fontWeight: 600 }}>Statut</td><td style={{ padding: "4px 8px" }}>{neg.status}</td></tr>
          <tr><td style={{ padding: "4px 8px", fontWeight: 600 }}>Gravité</td><td style={{ padding: "4px 8px" }}>{neg.gravite}</td></tr>
          <tr><td style={{ padding: "4px 8px", fontWeight: 600 }}>Risque institution</td><td style={{ padding: "4px 8px" }}>{neg.risque}</td></tr>
          <tr><td style={{ padding: "4px 8px", fontWeight: 600, verticalAlign: "top" }}>Impact</td><td style={{ padding: "4px 8px", whiteSpace: "pre-wrap" }}>{neg.impact || "—"}</td></tr>
          <tr><td style={{ padding: "4px 8px", fontWeight: 600, verticalAlign: "top" }}>Description</td><td style={{ padding: "4px 8px", whiteSpace: "pre-wrap" }}>{neg.description || "—"}</td></tr>
        </tbody>
      </table>
      <div style={{ fontSize: 14, fontWeight: 700, margin: "10px 0 6px" }}>Décisions du Directeur général</div>
      {neg.decisions.length === 0 ? (
        <div style={{ fontSize: 13, color: "#64748b" }}>Aucune décision rendue à ce jour.</div>
      ) : (
        <ul style={{ fontSize: 13, paddingLeft: 18 }}>
          {neg.decisions.map((d) => (<li key={d} style={{ marginBottom: 3 }}>{d}</li>))}
        </ul>
      )}
      <div style={{ marginTop: 40, display: "flex", justifyContent: "space-between", fontSize: 12, color: "#475569" }}>
        <div>Le responsable du suivi de mail<br />{owner?.nom ?? "—"}</div>
        <div style={{ textAlign: "right" }}>Le Directeur général<br />{neg.decidedBy ? profileById(neg.decidedBy).nom : "…"}</div>
      </div>
    </div>,
    document.body
  );
}

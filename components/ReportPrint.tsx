"use client";

import { createPortal } from "react-dom";
import { fmt, reportKindDef, type Report } from "@/lib/domain";
import { APP_NAME } from "@/lib/config";
import { useApp } from "./app-context";

/**
 * Compte rendu imprimable (export PDF) — rendu hors de l'application via un
 * portail, comme le PV de réunion. Accepte un ou plusieurs comptes rendus :
 * un seul pour l'export unitaire, toute la série pour un recueil.
 */
export function ReportPrint({ reports, refLabel }: { reports: Report[]; refLabel: string }) {
  const { profileById, orgName } = useApp();
  if (typeof document === "undefined") return null;

  const section = (label: string, body: string) =>
    body.trim() ? (
      <>
        <div style={{ fontSize: 13, fontWeight: 700, margin: "10px 0 3px" }}>{label}</div>
        <div style={{ fontSize: 12.5, whiteSpace: "pre-wrap", lineHeight: 1.45 }}>{body}</div>
      </>
    ) : null;

  return createPortal(
    <div className="print-report">
      <div style={{ borderBottom: "2px solid #0f172a", paddingBottom: 10, marginBottom: 14 }}>
        <div style={{ fontSize: 20, fontWeight: 700 }}>
          {APP_NAME} — {reports.length > 1 ? "Recueil de comptes rendus" : "Compte rendu"}
        </div>
        <div style={{ fontSize: 12, color: "#475569" }}>{orgName}</div>
      </div>

      <div style={{ marginBottom: 16, fontSize: 13 }}>
        <div><b>Objet :</b> {refLabel}</div>
        <div><b>Édité le :</b> {new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}</div>
        {reports.length > 1 && <div><b>Comptes rendus :</b> {reports.length}</div>}
      </div>

      {reports.map((r, i) => {
        const def = reportKindDef(r.kind);
        const author = r.authorId ? profileById(r.authorId) : null;
        return (
          <div
            key={r.id}
            style={{
              marginBottom: 20,
              paddingBottom: 14,
              borderBottom: i < reports.length - 1 ? "1px solid #cbd5e1" : "none",
              // Évite qu'un compte rendu soit coupé en deux par un saut de page.
              breakInside: "avoid",
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 700 }}>{r.title || def.label}</div>
            <div style={{ fontSize: 12, color: "#475569", marginBottom: 4 }}>
              {def.label}
              {r.periodStart && r.periodEnd && <> · période du {fmt(r.periodStart)} au {fmt(r.periodEnd)}</>}
              {author && <> · {author.nom}</>}
              <> · rédigé le {fmt(r.createdAt)}</>
            </div>
            <div style={{ fontSize: 12, marginBottom: 2 }}>
              <b>Avancement déclaré :</b> {r.progress} %
            </div>

            {section(def.sections.done, r.done)}
            {section(def.sections.difficulties, r.difficulties)}
            {section(def.sections.nextSteps, r.nextSteps)}
          </div>
        );
      })}

      {reports.length === 0 && <div style={{ fontSize: 13 }}>Aucun compte rendu.</div>}
    </div>,
    document.body
  );
}

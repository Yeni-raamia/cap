"use client";

import { createPortal } from "react-dom";
import { contactDisplayName, MEETING_LINK_TYPES, type Meeting, type MeetingLink } from "@/lib/domain";
import { APP_NAME } from "@/lib/config";
import { useApp } from "./app-context";

/** Compte-rendu de réunion imprimable (PDF) — rendu hors de l'app via portail. */
export function MeetingPrint({ meeting }: { meeting: Meeting }) {
  const { profileById, contacts, items, projects, tasks, negligences, nonConformites, objectives, orgName } = useApp();
  if (typeof document === "undefined") return null;

  const linkLabel = (l: MeetingLink): string => {
    const kind = MEETING_LINK_TYPES.find((t) => t.type === l.type)?.label ?? l.type;
    const label =
      l.type === "item" ? (() => { const it = items.find((i) => i.id === l.id); return it ? `${it.ref} — ${it.objet}` : "—"; })()
      : l.type === "project" ? projects.find((x) => x.id === l.id)?.name ?? "—"
      : l.type === "task" ? tasks.find((x) => x.id === l.id)?.title ?? "—"
      : l.type === "negligence" ? negligences.find((x) => x.id === l.id)?.objet ?? "—"
      : l.type === "nonconformite" ? nonConformites.find((x) => x.id === l.id)?.objet ?? "—"
      : objectives.find((x) => x.id === l.id)?.title ?? "—";
    return `${kind} — ${label}`;
  };

  const th = { textAlign: "left" as const, fontSize: 11, textTransform: "uppercase" as const, color: "#64748b", borderBottom: "1px solid #cbd5e1", padding: "4px 6px" };
  const td = { fontSize: 12, borderBottom: "1px solid #e2e8f0", padding: "4px 6px", verticalAlign: "top" as const };

  return createPortal(
    <div className="print-report">
      <div style={{ borderBottom: "2px solid #0f172a", paddingBottom: 10, marginBottom: 14 }}>
        <div style={{ fontSize: 20, fontWeight: 700 }}>{APP_NAME} — Compte-rendu de réunion</div>
        <div style={{ fontSize: 12, color: "#475569" }}>{orgName}</div>
      </div>

      <div style={{ marginBottom: 12, fontSize: 13 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{meeting.title}</div>
        <div><b>Date :</b> {meeting.date ? meeting.date.toLocaleString("fr-FR") : "—"}</div>
        {meeting.location && <div><b>Lieu :</b> {meeting.location}</div>}
        {meeting.visioUrl && <div><b>Visio :</b> {meeting.visioUrl}</div>}
        <div><b>Statut :</b> {meeting.status}</div>
      </div>

      <div style={{ fontSize: 14, fontWeight: 700, margin: "8px 0 4px" }}>Participants ({meeting.participants.length})</div>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 14 }}>
        <thead><tr><th style={th}>Nom</th><th style={th}>Type</th><th style={th}>Présence</th></tr></thead>
        <tbody>
          {meeting.participants.map((p, i) => (
            <tr key={i}>
              <td style={td}>{p.kind === "member" ? profileById(p.id).nom : contactDisplayName(contacts.find((c) => c.id === p.id) ?? {}) || "—"}</td>
              <td style={td}>{p.kind === "member" ? "Membre" : "Contact"}</td>
              <td style={td}>{p.presence}</td>
            </tr>
          ))}
          {meeting.participants.length === 0 && <tr><td style={td} colSpan={3}>Aucun participant.</td></tr>}
        </tbody>
      </table>

      {meeting.agenda && (<><div style={{ fontSize: 14, fontWeight: 700, margin: "8px 0 4px" }}>Ordre du jour</div><div style={{ fontSize: 13, whiteSpace: "pre-wrap", marginBottom: 12 }}>{meeting.agenda}</div></>)}

      <div style={{ fontSize: 14, fontWeight: 700, margin: "8px 0 4px" }}>Compte-rendu</div>
      <div style={{ fontSize: 13, whiteSpace: "pre-wrap", marginBottom: 12 }}>{meeting.notes || "—"}</div>

      <div style={{ fontSize: 14, fontWeight: 700, margin: "8px 0 4px" }}>Décisions</div>
      {meeting.decisions.length === 0 ? (
        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>Aucune décision consignée.</div>
      ) : (
        <ul style={{ fontSize: 13, paddingLeft: 18, marginBottom: 12 }}>{meeting.decisions.map((d, i) => <li key={i} style={{ marginBottom: 3 }}>{d}</li>)}</ul>
      )}

      {meeting.links.length > 0 && (
        <>
          <div style={{ fontSize: 14, fontWeight: 700, margin: "8px 0 4px" }}>Sujets reliés</div>
          <ul style={{ fontSize: 13, paddingLeft: 18 }}>{meeting.links.map((l, i) => <li key={i} style={{ marginBottom: 3 }}>{linkLabel(l)}</li>)}</ul>
        </>
      )}

      <div style={{ marginTop: 30, fontSize: 12, color: "#475569" }}>Édité le {new Date().toLocaleDateString("fr-FR")}</div>
    </div>,
    document.body
  );
}

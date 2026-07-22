"use client";

import { createPortal } from "react-dom";
import { fmt, OBJECTIVE_STATUT_LABEL, type Objective } from "@/lib/domain";
import { APP_NAME } from "@/lib/config";
import { useApp } from "./app-context";

const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

/** Roadmap annuelle imprimable (PDF) — rendue hors de l'app via portail. */
export function RoadmapPrint({ year, rows }: { year: number; rows: { o: Objective; progress: number }[] }) {
  const { profileById, orgName } = useApp();
  if (typeof document === "undefined") return null;

  const yearStart = new Date(year, 0, 1).getTime();
  const yearEnd = new Date(year, 11, 31, 23, 59, 59).getTime();
  const yearMs = yearEnd - yearStart;

  return createPortal(
    <div className="print-report">
      <div style={{ borderBottom: "2px solid #0f172a", paddingBottom: 10, marginBottom: 16 }}>
        <div style={{ fontSize: 20, fontWeight: 700 }}>{APP_NAME} — Plan de l&apos;année {year}</div>
        <div style={{ fontSize: 12, color: "#475569" }}>{orgName} · édité le {fmt(new Date())}</div>
      </div>

      {/* Gantt */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", paddingLeft: 190 }}>
          {MONTHS.map((m, i) => (
            <div key={i} style={{ flex: 1, fontSize: 9, color: "#94a3b8", textAlign: "center" }}>{m}</div>
          ))}
        </div>
        {rows.map(({ o, progress }) => {
          const cs = Math.max(o.startDate.getTime(), yearStart);
          const ce = Math.min(o.endDate.getTime(), yearEnd);
          const left = ((cs - yearStart) / yearMs) * 100;
          const width = Math.max(1.5, ((ce - cs) / yearMs) * 100);
          const downgraded = o.status === "declasse";
          return (
            <div key={o.id} style={{ display: "flex", alignItems: "center", height: 26 }}>
              <div style={{ width: 190, fontSize: 10, color: downgraded ? "#94a3b8" : "#0f172a", paddingRight: 8, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                {o.title}
              </div>
              <div style={{ position: "relative", flex: 1, height: "100%" }}>
                <div style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", height: 12, left: `${left}%`, width: `${width}%`, background: downgraded ? "#e2e8f0" : `${o.color}33`, border: `1px solid ${downgraded ? "#cbd5e1" : o.color}`, borderRadius: 6 }}>
                  {!downgraded && <div style={{ height: "100%", width: `${progress}%`, background: o.color, borderRadius: 6 }} />}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Détail */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #cbd5e1", color: "#475569" }}>
            <th style={{ padding: "4px 6px" }}>Objectif</th>
            <th style={{ padding: "4px 6px" }}>Responsable</th>
            <th style={{ padding: "4px 6px" }}>Période</th>
            <th style={{ padding: "4px 6px" }}>Avanc.</th>
            <th style={{ padding: "4px 6px" }}>Statut</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ o, progress }) => (
            <tr key={o.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
              <td style={{ padding: "4px 6px", fontWeight: 600 }}>{o.title}</td>
              <td style={{ padding: "4px 6px" }}>{profileById(o.ownerId).nom}</td>
              <td style={{ padding: "4px 6px", whiteSpace: "nowrap" }}>{fmt(o.startDate)} → {fmt(o.endDate)}</td>
              <td style={{ padding: "4px 6px" }}>{o.status === "declasse" ? "—" : `${progress}%`}</td>
              <td style={{ padding: "4px 6px" }}>{OBJECTIVE_STATUT_LABEL[o.status]}{o.status === "declasse" && o.downgradeReason ? ` — ${o.downgradeReason}` : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>,
    document.body
  );
}

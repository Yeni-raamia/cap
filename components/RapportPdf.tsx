"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Download } from "lucide-react";
import { fmt, fmtLong, type Item } from "@/lib/domain";
import { computeBreakdowns, type CauseStat, type CritStat, type DestStat } from "@/lib/stats";
import { APP_NAME, ORG_NAME } from "@/lib/config";
import { useApp } from "./app-context";

type Preset = "hebdo" | "mensuel" | "trimestriel" | "annuel" | "perso";
const PRESETS: { value: Preset; label: string; days?: number }[] = [
  { value: "hebdo", label: "Hebdomadaire (7 j)", days: 7 },
  { value: "mensuel", label: "Mensuel (30 j)", days: 30 },
  { value: "trimestriel", label: "Trimestriel (90 j)", days: 90 },
  { value: "annuel", label: "Annuel (365 j)", days: 365 },
  { value: "perso", label: "Période personnalisée", days: undefined },
];

interface AgentRow {
  nom: string;
  created: number;
  reponses: number;
  relances: number;
  clotures: number;
}
interface Report {
  fromLabel: string;
  toLabel: string;
  editedAt: string;
  created: number;
  reponses: number;
  relances: number;
  clotures: number;
  actifs: number;
  enRetard: number;
  bloques: number;
  parAgent: AgentRow[];
  parMetier: { code: string; label: string; created: number }[];
  statuts: { statut: string; n: number }[];
  classement: { nom: string; score: number }[];
  parDestinataire: DestStat[];
  parCriticite: CritStat[];
  causes: CauseStat[];
}

export function RapportPdf() {
  const { items, profiles, catalogue, now, rs, scores, profileById } = useApp();
  const [preset, setPreset] = useState<Preset>("mensuel");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [report, setReport] = useState<Report | null>(null);

  const build = () => {
    let fromT: number;
    let toT = now.getTime();
    if (preset === "perso") {
      fromT = from ? new Date(`${from}T00:00:00`).getTime() : 0;
      toT = to ? new Date(`${to}T23:59:59`).getTime() : now.getTime();
    } else {
      const days = PRESETS.find((p) => p.value === preset)?.days ?? 30;
      fromT = now.getTime() - days * 864e5;
    }
    const inRange = (d: Date) => d.getTime() >= fromT && d.getTime() <= toT;

    const agents = profiles.filter((u) => u.role === "agent");
    const agentMap = new Map<string, AgentRow>();
    agents.forEach((u) => agentMap.set(u.id, { nom: u.nom, created: 0, reponses: 0, relances: 0, clotures: 0 }));
    const metierMap = new Map<string, number>();

    let created = 0;
    let reponses = 0;
    let relances = 0;
    let clotures = 0;

    items.forEach((i: Item) => {
      const a = agentMap.get(i.ownerId);
      if (inRange(i.dateCreation)) {
        created++;
        metierMap.set(i.metier, (metierMap.get(i.metier) ?? 0) + 1);
        if (a) a.created++;
      }
      i.timeline.forEach((e) => {
        if (!inRange(e.date)) return;
        if (e.kind === "relance") {
          relances++;
          if (a) a.relances++;
        } else if (e.kind === "reponse") {
          reponses++;
          if (a) a.reponses++;
        } else if (e.kind === "cloture") {
          clotures++;
          if (a) a.clotures++;
        }
      });
    });

    const actifs = items.filter((i) => i.statut !== "Clôturé").length;
    const enRetard = items.filter((i) => rs(i).level === "escalade").length;
    const bloques = items.filter((i) => i.statut === "Bloqué").length;

    const statuts = Array.from(new Set(items.map((i) => i.statut))).map((s) => ({
      statut: s,
      n: items.filter((i) => i.statut === s).length,
    }));

    const bd = computeBreakdowns(items, profiles, now, catalogue.types);

    setReport({
      fromLabel: fmtLong(new Date(fromT)),
      toLabel: fmtLong(new Date(toT)),
      editedAt: fmtLong(now),
      created,
      reponses,
      relances,
      clotures,
      actifs,
      enRetard,
      bloques,
      parAgent: [...agentMap.values()].filter((a) => a.created || a.reponses || a.relances || a.clotures),
      parMetier: [...metierMap.entries()]
        .map(([code, n]) => ({ code, label: catalogue.metiers[code]?.label ?? code, created: n }))
        .sort((a, b) => b.created - a.created),
      statuts,
      classement: scores.slice(0, 5).map((s) => ({ nom: profileById(s.id).nom, score: s.score })),
      parDestinataire: bd.parDestinataire.slice(0, 12),
      parCriticite: bd.parCriticite,
      causes: bd.causes,
    });

    // Laisse le portail se peindre avant d'ouvrir la boîte d'impression.
    setTimeout(() => window.print(), 150);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <select
        value={preset}
        onChange={(e) => setPreset(e.target.value as Preset)}
        aria-label="Période du rapport"
        className="text-[12px] border border-slate-200 rounded-lg px-2 py-1.5 bg-white"
      >
        {PRESETS.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>
      {preset === "perso" && (
        <>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            aria-label="Du"
            className="text-[12px] border border-slate-200 rounded-lg px-2 py-1.5"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            aria-label="Au"
            className="text-[12px] border border-slate-200 rounded-lg px-2 py-1.5"
          />
        </>
      )}
      <button
        onClick={build}
        className="inline-flex items-center gap-1.5 text-[12px] font-medium text-white bg-slate-800 rounded-lg px-3 py-1.5 hover:bg-slate-700"
      >
        <Download size={14} />
        Télécharger le rapport (PDF)
      </button>

      {report &&
        typeof document !== "undefined" &&
        createPortal(<ReportDocument report={report} />, document.body)}
    </div>
  );
}

/* Document imprimable — HTML simple (fiable à l'impression, sans graphiques). */
function ReportDocument({ report }: { report: Report }) {
  const th = "text-left text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-300 py-1 pr-3";
  const td = "text-[12px] text-slate-800 border-b border-slate-100 py-1 pr-3";
  const kpi = (label: string, value: number) => (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 12px" }}>
      <div style={{ fontSize: 20, fontWeight: 600 }}>{value}</div>
      <div style={{ fontSize: 11, color: "#64748b" }}>{label}</div>
    </div>
  );
  return (
    <div className="print-report">
      <div style={{ borderBottom: "2px solid #0f172a", paddingBottom: 10, marginBottom: 16 }}>
        <div style={{ fontSize: 20, fontWeight: 700 }}>{APP_NAME} — Rapport d&apos;activité</div>
        <div style={{ fontSize: 12, color: "#475569" }}>{ORG_NAME}</div>
        <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>
          Période : du {report.fromLabel} au {report.toLabel} · Édité le {report.editedAt}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>
        {kpi("Suivis créés", report.created)}
        {kpi("Réponses reçues", report.reponses)}
        {kpi("Relances effectuées", report.relances)}
        {kpi("Clôtures", report.clotures)}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 20 }}>
        {kpi("Suivis actifs (à ce jour)", report.actifs)}
        {kpi("En retard (à ce jour)", report.enRetard)}
        {kpi("Bloqués (à ce jour)", report.bloques)}
      </div>

      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Activité par agent (sur la période)</div>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20 }}>
        <thead>
          <tr>
            <th className={th}>Agent</th>
            <th className={th}>Créés</th>
            <th className={th}>Réponses</th>
            <th className={th}>Relances</th>
            <th className={th}>Clôtures</th>
          </tr>
        </thead>
        <tbody>
          {report.parAgent.length === 0 ? (
            <tr>
              <td className={td} colSpan={5}>Aucune activité sur la période.</td>
            </tr>
          ) : (
            report.parAgent.map((a) => (
              <tr key={a.nom}>
                <td className={td}>{a.nom}</td>
                <td className={td}>{a.created}</td>
                <td className={td}>{a.reponses}</td>
                <td className={td}>{a.relances}</td>
                <td className={td}>{a.clotures}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Volume par métier (créés)</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {report.parMetier.length === 0 ? (
                <tr>
                  <td className={td}>—</td>
                </tr>
              ) : (
                report.parMetier.map((m) => (
                  <tr key={m.code}>
                    <td className={td}>
                      {m.code} — {m.label}
                    </td>
                    <td className={td} style={{ textAlign: "right" }}>{m.created}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Répartition des statuts (à ce jour)</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {report.statuts.map((s) => (
                <tr key={s.statut}>
                  <td className={td}>{s.statut}</td>
                  <td className={td} style={{ textAlign: "right" }}>{s.n}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ fontSize: 13, fontWeight: 600, margin: "16px 0 6px" }}>Classement (top 5)</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {report.classement.map((c, i) => (
                <tr key={c.nom}>
                  <td className={td}>
                    {i + 1}. {c.nom}
                  </td>
                  <td className={td} style={{ textAlign: "right" }}>{c.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ fontSize: 13, fontWeight: 600, margin: "20px 0 6px" }}>
        Imputabilité par destinataire (à ce jour)
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20 }}>
        <thead>
          <tr>
            <th className={th}>Destinataire</th>
            <th className={th}>Reçus</th>
            <th className={th}>Relances</th>
            <th className={th}>Réponses</th>
            <th className={th}>Retards</th>
            <th className={th}>Bloqués</th>
          </tr>
        </thead>
        <tbody>
          {report.parDestinataire.length === 0 ? (
            <tr><td className={td} colSpan={6}>Aucun destinataire renseigné.</td></tr>
          ) : (
            report.parDestinataire.map((d) => (
              <tr key={d.name}>
                <td className={td}>{d.name}</td>
                <td className={td}>{d.suivis}</td>
                <td className={td}>{d.relances}</td>
                <td className={td}>{d.reponses}</td>
                <td className={td}>{d.retards}</td>
                <td className={td}>{d.bloques}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Par criticité (à ce jour)</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th className={th}>Priorité</th>
                <th className={th}>Suivis</th>
                <th className={th}>Retards</th>
                <th className={th}>Bloqués</th>
                <th className={th}>Tx rép.</th>
              </tr>
            </thead>
            <tbody>
              {report.parCriticite.map((c) => (
                <tr key={c.priorite}>
                  <td className={td}>{c.priorite}</td>
                  <td className={td}>{c.suivis}</td>
                  <td className={td}>{c.retards}</td>
                  <td className={td}>{c.bloques}</td>
                  <td className={td}>{c.tauxReponse}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Causes de blocage</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {report.causes.length === 0 ? (
                <tr><td className={td}>Aucun blocage.</td></tr>
              ) : (
                report.causes.map((c) => (
                  <tr key={c.cause}>
                    <td className={td}>{c.cause}</td>
                    <td className={td} style={{ textAlign: "right" }}>{c.n}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: 24, fontSize: 10, color: "#94a3b8", borderTop: "1px solid #e2e8f0", paddingTop: 8 }}>
        {APP_NAME} · Aucun mail sans trace — rapport généré automatiquement, {fmt(new Date())}.
      </div>
    </div>
  );
}

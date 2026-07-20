"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertOctagon, ArrowLeft, ExternalLink, Gavel, Printer, Send } from "lucide-react";
import {
  fmt,
  NEGLIGENCE_GRAVITES,
  NEGLIGENCE_RISQUES,
  NEGLIGENCE_STATUTS,
} from "@/lib/domain";
import { APP_NAME } from "@/lib/config";
import { useApp } from "@/components/app-context";
import { Avatar, Card, MetierChip, Token, TypeTag } from "@/components/atoms";
import { graviteBadge, statusBadge } from "../page";

export default function NegligenceDetailPage() {
  const params = useParams();
  const id = String(params.id);
  const {
    demo,
    me,
    orgName,
    items,
    refLists,
    negligenceById,
    profileById,
    openItem,
    updateNegligence,
    setNegligenceStatus,
    setNegligenceDecisions,
  } = useApp();

  const neg = negligenceById(id);
  const [err, setErr] = useState<string | null>(null);

  if (!neg) {
    return (
      <div className="space-y-4">
        <Link href="/negligences" className="inline-flex items-center gap-1 text-[13px] text-emerald-700"><ArrowLeft size={15} /> Négligences</Link>
        <Card className="p-10 text-center text-[13px] text-slate-400">Fiche introuvable.</Card>
      </div>
    );
  }

  const item = items.find((i) => i.id === neg.itemId);
  const owner = item ? profileById(item.ownerId) : null;
  const canEdit = !demo && (me.role === "directeur" || me.role === "admin" || item?.ownerId === me.id);
  const isDG = !demo && (me.role === "directeur" || me.role === "admin");

  const run = async (p: Promise<string | null>) => {
    setErr(null);
    const e = await p;
    if (e) setErr(e);
  };
  const toggleDecision = (d: string) => {
    const next = neg.decisions.includes(d) ? neg.decisions.filter((x) => x !== d) : [...neg.decisions, d];
    run(setNegligenceDecisions(neg.id, next));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Link href="/negligences" className="inline-flex items-center gap-1 text-[13px] text-emerald-700 hover:underline"><ArrowLeft size={15} /> Négligences</Link>
        <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 text-[12px] font-medium text-white bg-slate-800 rounded-lg px-3 py-1.5 hover:bg-slate-700">
          <Printer size={14} /> Imprimer (PDF)
        </button>
      </div>

      {err && <div className="text-[12px] text-rose-600">{err}</div>}
      {demo && <div className="text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">Mode démo : les modifications ne sont pas persistées.</div>}

      {/* En-tête : objet concerné */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <AlertOctagon size={18} className="text-rose-600" />
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${statusBadge[neg.status] ?? ""}`}>{neg.status}</span>
          <span className={`text-[11px] px-2 py-0.5 rounded ${graviteBadge[neg.gravite] ?? ""}`}>Gravité : {neg.gravite}</span>
        </div>
        {item ? (
          <>
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              <MetierChip code={item.metier} />
              <TypeTag t={item.type} />
              <Token>{item.ref}</Token>
            </div>
            <div className="text-[15px] font-semibold text-slate-800">{item.objet}</div>
            <div className="flex items-center gap-3 mt-2 text-[12px] text-slate-500 flex-wrap">
              {owner && <span className="flex items-center gap-1"><Avatar init={owner.init} size="h-5 w-5" />{owner.nom}</span>}
              <button onClick={() => openItem(item)} className="inline-flex items-center gap-1 text-emerald-700 hover:underline"><ExternalLink size={13} />Ouvrir le suivi</button>
            </div>
          </>
        ) : (
          <div className="text-[13px] text-slate-400">Suivi associé supprimé.</div>
        )}
      </Card>

      {/* Évaluation */}
      <Card className="p-4 space-y-3">
        <div className="text-[13px] font-semibold text-slate-700">Évaluation de la négligence</div>
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="text-[12px] text-slate-500">Gravité</label>
            {canEdit ? (
              <select value={neg.gravite} onChange={(e) => run(updateNegligence(neg.id, { gravite: e.target.value }))} className="w-full mt-1 text-[13px] border border-slate-200 rounded-lg px-2 py-2 bg-white">
                {NEGLIGENCE_GRAVITES.map((g) => (<option key={g}>{g}</option>))}
              </select>
            ) : <div className="text-[13px] text-slate-700 mt-1">{neg.gravite}</div>}
          </div>
          <div>
            <label className="text-[12px] text-slate-500">Risque pour l&apos;institution</label>
            {canEdit ? (
              <select value={neg.risque} onChange={(e) => run(updateNegligence(neg.id, { risque: e.target.value }))} className="w-full mt-1 text-[13px] border border-slate-200 rounded-lg px-2 py-2 bg-white">
                {NEGLIGENCE_RISQUES.map((r) => (<option key={r}>{r}</option>))}
              </select>
            ) : <div className="text-[13px] text-slate-700 mt-1">{neg.risque}</div>}
          </div>
        </div>
        <div>
          <label className="text-[12px] text-slate-500">Impact</label>
          {canEdit ? (
            <textarea defaultValue={neg.impact} onBlur={(e) => { if (e.target.value !== neg.impact) run(updateNegligence(neg.id, { impact: e.target.value })); }} rows={2} placeholder="Conséquences concrètes du manquement…" className="w-full mt-1 text-[13px] border border-slate-200 rounded-lg px-2 py-2" />
          ) : <div className="text-[13px] text-slate-700 mt-1 whitespace-pre-wrap">{neg.impact || "—"}</div>}
        </div>
        <div>
          <label className="text-[12px] text-slate-500">Description / circonstances</label>
          {canEdit ? (
            <textarea defaultValue={neg.description} onBlur={(e) => { if (e.target.value !== neg.description) run(updateNegligence(neg.id, { description: e.target.value })); }} rows={3} placeholder="Description des faits, contexte, personnes concernées…" className="w-full mt-1 text-[13px] border border-slate-200 rounded-lg px-2 py-2" />
          ) : <div className="text-[13px] text-slate-700 mt-1 whitespace-pre-wrap">{neg.description || "—"}</div>}
        </div>
        {canEdit && (
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
            <span className="text-[12px] text-slate-500">Statut :</span>
            <select value={neg.status} onChange={(e) => run(setNegligenceStatus(neg.id, e.target.value))} className="text-[12px] border border-slate-200 rounded-lg px-2 py-1 bg-white">
              {NEGLIGENCE_STATUTS.map((s) => (<option key={s}>{s}</option>))}
            </select>
            {neg.status === "Ouverte" && (
              <button onClick={() => run(setNegligenceStatus(neg.id, "Transmise au DG"))} className="inline-flex items-center gap-1 text-[12px] font-medium text-white bg-amber-600 rounded-lg px-2.5 py-1.5">
                <Send size={13} /> Transmettre au DG
              </button>
            )}
          </div>
        )}
      </Card>

      {/* Cadran de décisions du DG */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <Gavel size={15} className="text-slate-600" />
          <div className="text-[13px] font-semibold text-slate-700">Décisions du Directeur général</div>
        </div>
        <p className="text-[12px] text-slate-500 mb-3">
          {isDG ? "Coche les décisions retenues." : "Réservé au directeur — décisions rendues ci-dessous."}
        </p>
        <div className="grid md:grid-cols-2 gap-2">
          {refLists.decisions.map((d) => {
            const checked = neg.decisions.includes(d);
            return (
              <label key={d} className={`flex items-center gap-2 text-[13px] border rounded-lg px-3 py-2 ${checked ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "border-slate-200 text-slate-600"} ${isDG ? "cursor-pointer" : "opacity-80"}`}>
                <input type="checkbox" checked={checked} disabled={!isDG} onChange={() => toggleDecision(d)} className="h-4 w-4 accent-emerald-600" />
                {d}
              </label>
            );
          })}
        </div>
        {neg.decidedBy && neg.decidedAt && (
          <div className="text-[11px] text-slate-400 mt-3">Décision rendue par {profileById(neg.decidedBy).nom} · {fmt(neg.decidedAt)}</div>
        )}
      </Card>

      {/* Version imprimable (PDF) */}
      {typeof document !== "undefined" &&
        createPortal(
          <div className="print-report">
            <div style={{ borderBottom: "2px solid #0f172a", paddingBottom: 10, marginBottom: 16 }}>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{APP_NAME} — Fiche de négligence</div>
              <div style={{ fontSize: 12, color: "#475569" }}>{orgName} · Document confidentiel — à l&apos;attention du Directeur général</div>
              <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>Édité le {fmt(neg.updatedAt)}</div>
            </div>
            {item && (
              <div style={{ marginBottom: 14, fontSize: 13 }}>
                <div><b>Suivi concerné :</b> [{item.ref}] {item.objet}</div>
                <div><b>Responsable :</b> {owner?.nom ?? "—"}</div>
                <div><b>Cause du blocage :</b> {item.blocageCause ?? "—"}</div>
              </div>
            )}
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 14, fontSize: 13 }}>
              <tbody>
                <tr><td style={{ padding: "4px 8px", fontWeight: 600, width: 160 }}>Statut</td><td style={{ padding: "4px 8px" }}>{neg.status}</td></tr>
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
              <div>Le responsable du suivi<br />{owner?.nom ?? "—"}</div>
              <div style={{ textAlign: "right" }}>Le Directeur général<br />{neg.decidedBy ? profileById(neg.decidedBy).nom : "…"}</div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

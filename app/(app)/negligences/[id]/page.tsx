"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertOctagon, ArrowLeft, ExternalLink, Gavel, Printer, Send } from "lucide-react";
import {
  fmt,
  NEGLIGENCE_GRAVITES,
  NEGLIGENCE_RISQUES,
  NEGLIGENCE_STATUTS,
} from "@/lib/domain";
import { useApp } from "@/components/app-context";
import { Avatar, Card, MetierChip, Token, TypeTag } from "@/components/atoms";
import { NegligencePrint } from "@/components/NegligencePrint";
import { Discussion } from "@/components/Discussion";
import { graviteBadge, statusBadge } from "../page";

export default function NegligenceDetailPage() {
  const params = useParams();
  const id = String(params.id);
  const {
    demo,
    me,
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
  const isDG = !demo && (me.role === "directeur" || me.role === "admin");
  const canEdit =
    !demo &&
    (isDG || (item ? item.ownerId === me.id : me.role === "dsi" || me.role === "manager"));

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
        <div className="text-[15px] font-semibold text-slate-800">{neg.objet || item?.objet || "—"}</div>
        <div className="flex items-center gap-3 mt-2 text-[12px] text-slate-500 flex-wrap">
          {neg.service && <span className="text-slate-700"><b>Service en cause :</b> {neg.service}</span>}
          {neg.concerne && <span className="text-slate-700"><b>Personne :</b> {neg.concerne}</span>}
        </div>
        {item ? (
          <div className="flex items-center gap-2 mt-2 flex-wrap text-[12px]">
            <MetierChip code={item.metier} />
            <TypeTag t={item.type} />
            <Token>{item.ref}</Token>
            {owner && <span className="flex items-center gap-1 text-slate-500"><Avatar init={owner.init} size="h-5 w-5" />{owner.nom}</span>}
            <button onClick={() => openItem(item)} className="inline-flex items-center gap-1 text-emerald-700 hover:underline"><ExternalLink size={13} />Ouvrir le suivi</button>
          </div>
        ) : (
          <div className="text-[11px] text-slate-400 mt-2">Fiche autonome (non liée à un suivi).</div>
        )}
      </Card>

      {/* Évaluation */}
      <Card className="p-4 space-y-3">
        <div className="text-[13px] font-semibold text-slate-700">Évaluation de la négligence</div>
        <div>
          <label className="text-[12px] text-slate-500">Objet</label>
          {canEdit ? (
            <input defaultValue={neg.objet} onBlur={(e) => { if (e.target.value !== neg.objet) run(updateNegligence(neg.id, { objet: e.target.value })); }} className="w-full mt-1 text-[13px] border border-slate-200 rounded-lg px-2 py-2" />
          ) : <div className="text-[13px] text-slate-700 mt-1">{neg.objet || "—"}</div>}
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="text-[12px] text-slate-500">Service en cause</label>
            {canEdit ? (
              <select value={neg.service} onChange={(e) => run(updateNegligence(neg.id, { service: e.target.value }))} className="w-full mt-1 text-[13px] border border-slate-200 rounded-lg px-2 py-2 bg-white">
                <option value="">— service —</option>
                {refLists.services.map((s) => (<option key={s}>{s}</option>))}
              </select>
            ) : <div className="text-[13px] text-slate-700 mt-1">{neg.service || "—"}</div>}
          </div>
          <div>
            <label className="text-[12px] text-slate-500">Personne concernée (responsable)</label>
            {canEdit ? (
              <input defaultValue={neg.concerne} onBlur={(e) => { if (e.target.value !== neg.concerne) run(updateNegligence(neg.id, { concerne: e.target.value })); }} className="w-full mt-1 text-[13px] border border-slate-200 rounded-lg px-2 py-2" />
            ) : <div className="text-[13px] text-slate-700 mt-1">{neg.concerne || "—"}</div>}
          </div>
        </div>
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

      {/* Discussion de la négligence */}
      <Card className="p-3">
        <div className="text-[13px] font-semibold text-slate-700 mb-2">Discussion</div>
        <Discussion target={{ refType: "negligence", refId: neg.id }} height="h-56" />
      </Card>

      {/* Version imprimable (PDF) */}
      <NegligencePrint neg={neg} />
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ExternalLink, FileWarning, Gavel, Printer, Send } from "lucide-react";
import { fmt, NEGLIGENCE_GRAVITES, NEGLIGENCE_RISQUES, NEGLIGENCE_STATUTS } from "@/lib/domain";
import { useApp } from "@/components/app-context";
import { Avatar, Card, MetierChip, Token, TypeTag } from "@/components/atoms";
import { NonConformitePrint } from "@/components/NonConformitePrint";
import { ncGraviteBadge, ncStatusBadge } from "../page";

export default function NonConformiteDetailPage() {
  const params = useParams();
  const id = String(params.id);
  const {
    demo, me, items, refLists, nonConformiteById, profileById, openItem,
    updateNonConformite, setNonConformiteStatus, setNonConformiteDecisions,
  } = useApp();

  const nc = nonConformiteById(id);
  const [err, setErr] = useState<string | null>(null);

  if (!nc) {
    return (
      <div className="space-y-4">
        <Link href="/non-conformites" className="inline-flex items-center gap-1 text-[13px] text-emerald-700"><ArrowLeft size={15} /> Non-conformités</Link>
        <Card className="p-10 text-center text-[13px] text-slate-400">Fiche introuvable.</Card>
      </div>
    );
  }

  const item = items.find((i) => i.id === nc.itemId);
  const owner = item ? profileById(item.ownerId) : null;
  const isDG = !demo && (me.role === "directeur" || me.role === "admin");
  const canEdit = !demo && (isDG || (item ? item.ownerId === me.id : me.role === "dsi" || me.role === "manager"));

  const run = async (p: Promise<string | null>) => {
    setErr(null);
    const e = await p;
    if (e) setErr(e);
  };
  const toggleDecision = (d: string) => {
    const next = nc.decisions.includes(d) ? nc.decisions.filter((x) => x !== d) : [...nc.decisions, d];
    run(setNonConformiteDecisions(nc.id, next));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Link href="/non-conformites" className="inline-flex items-center gap-1 text-[13px] text-emerald-700 hover:underline"><ArrowLeft size={15} /> Non-conformités</Link>
        <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 text-[12px] font-medium text-white bg-slate-800 rounded-lg px-3 py-1.5 hover:bg-slate-700">
          <Printer size={14} /> Imprimer (PDF)
        </button>
      </div>

      {err && <div className="text-[12px] text-rose-600">{err}</div>}
      {demo && <div className="text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">Mode démo : les modifications ne sont pas persistées.</div>}

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <FileWarning size={18} className="text-orange-600" />
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${ncStatusBadge[nc.status] ?? ""}`}>{nc.status}</span>
          <span className={`text-[11px] px-2 py-0.5 rounded ${ncGraviteBadge[nc.gravite] ?? ""}`}>Gravité : {nc.gravite}</span>
        </div>
        <div className="text-[15px] font-semibold text-slate-800">{nc.objet || item?.objet || "—"}</div>
        <div className="flex items-center gap-3 mt-2 text-[12px] text-slate-500 flex-wrap">
          {nc.service && <span className="text-slate-700"><b>Service concerné :</b> {nc.service}</span>}
          {nc.concerne && <span className="text-slate-700"><b>Personne :</b> {nc.concerne}</span>}
        </div>
        {item ? (
          <div className="flex items-center gap-2 mt-2 flex-wrap text-[12px]">
            <MetierChip code={item.metier} />
            <TypeTag t={item.type} />
            <Token>{item.ref}</Token>
            {owner && <span className="flex items-center gap-1 text-slate-500"><Avatar init={owner.init} size="h-5 w-5" />{owner.nom}</span>}
            <button onClick={() => openItem(item)} className="inline-flex items-center gap-1 text-emerald-700 hover:underline"><ExternalLink size={13} />Ouvrir le suivi de mail</button>
          </div>
        ) : (
          <div className="text-[11px] text-slate-400 mt-2">Fiche autonome (non liée à un suivi de mail).</div>
        )}
      </Card>

      <Card className="p-4 space-y-3">
        <div className="text-[13px] font-semibold text-slate-700">Évaluation de la non-conformité</div>
        <div>
          <label className="text-[12px] text-slate-500">Objet</label>
          {canEdit ? (
            <input defaultValue={nc.objet} onBlur={(e) => { if (e.target.value !== nc.objet) run(updateNonConformite(nc.id, { objet: e.target.value })); }} className="w-full mt-1 text-[13px] border border-slate-200 rounded-lg px-2 py-2" />
          ) : <div className="text-[13px] text-slate-700 mt-1">{nc.objet || "—"}</div>}
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="text-[12px] text-slate-500">Service concerné</label>
            {canEdit ? (
              <select value={nc.service} onChange={(e) => run(updateNonConformite(nc.id, { service: e.target.value }))} className="w-full mt-1 text-[13px] border border-slate-200 rounded-lg px-2 py-2 bg-white">
                <option value="">— service —</option>
                {refLists.services.map((s) => (<option key={s}>{s}</option>))}
              </select>
            ) : <div className="text-[13px] text-slate-700 mt-1">{nc.service || "—"}</div>}
          </div>
          <div>
            <label className="text-[12px] text-slate-500">Personne / entité concernée</label>
            {canEdit ? (
              <input defaultValue={nc.concerne} onBlur={(e) => { if (e.target.value !== nc.concerne) run(updateNonConformite(nc.id, { concerne: e.target.value })); }} className="w-full mt-1 text-[13px] border border-slate-200 rounded-lg px-2 py-2" />
            ) : <div className="text-[13px] text-slate-700 mt-1">{nc.concerne || "—"}</div>}
          </div>
        </div>
        <div>
          <label className="text-[12px] text-slate-500">Politique / article / contrôle violé</label>
          {canEdit ? (
            <select value={nc.policy} onChange={(e) => run(updateNonConformite(nc.id, { policy: e.target.value }))} className="w-full mt-1 text-[13px] border border-slate-200 rounded-lg px-2 py-2 bg-white">
              <option value="">— aucune / non précisée —</option>
              {nc.policy && !refLists.policies.includes(nc.policy) && <option value={nc.policy}>{nc.policy}</option>}
              {refLists.policies.map((p) => (<option key={p} value={p}>{p}</option>))}
            </select>
          ) : <div className="text-[13px] text-slate-700 mt-1">{nc.policy || "—"}</div>}
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="text-[12px] text-slate-500">Gravité</label>
            {canEdit ? (
              <select value={nc.gravite} onChange={(e) => run(updateNonConformite(nc.id, { gravite: e.target.value }))} className="w-full mt-1 text-[13px] border border-slate-200 rounded-lg px-2 py-2 bg-white">
                {NEGLIGENCE_GRAVITES.map((g) => (<option key={g}>{g}</option>))}
              </select>
            ) : <div className="text-[13px] text-slate-700 mt-1">{nc.gravite}</div>}
          </div>
          <div>
            <label className="text-[12px] text-slate-500">Risque pour l&apos;institution</label>
            {canEdit ? (
              <select value={nc.risque} onChange={(e) => run(updateNonConformite(nc.id, { risque: e.target.value }))} className="w-full mt-1 text-[13px] border border-slate-200 rounded-lg px-2 py-2 bg-white">
                {NEGLIGENCE_RISQUES.map((r) => (<option key={r}>{r}</option>))}
              </select>
            ) : <div className="text-[13px] text-slate-700 mt-1">{nc.risque}</div>}
          </div>
        </div>
        <div>
          <label className="text-[12px] text-slate-500">Impact</label>
          {canEdit ? (
            <textarea defaultValue={nc.impact} onBlur={(e) => { if (e.target.value !== nc.impact) run(updateNonConformite(nc.id, { impact: e.target.value })); }} rows={2} placeholder="Conséquences concrètes…" className="w-full mt-1 text-[13px] border border-slate-200 rounded-lg px-2 py-2" />
          ) : <div className="text-[13px] text-slate-700 mt-1 whitespace-pre-wrap">{nc.impact || "—"}</div>}
        </div>
        <div>
          <label className="text-[12px] text-slate-500">Description / circonstances</label>
          {canEdit ? (
            <textarea defaultValue={nc.description} onBlur={(e) => { if (e.target.value !== nc.description) run(updateNonConformite(nc.id, { description: e.target.value })); }} rows={3} placeholder="Description des faits, contexte…" className="w-full mt-1 text-[13px] border border-slate-200 rounded-lg px-2 py-2" />
          ) : <div className="text-[13px] text-slate-700 mt-1 whitespace-pre-wrap">{nc.description || "—"}</div>}
        </div>
        {canEdit && (
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
            <span className="text-[12px] text-slate-500">Statut :</span>
            <select value={nc.status} onChange={(e) => run(setNonConformiteStatus(nc.id, e.target.value))} className="text-[12px] border border-slate-200 rounded-lg px-2 py-1 bg-white">
              {NEGLIGENCE_STATUTS.map((s) => (<option key={s}>{s}</option>))}
            </select>
            {nc.status === "Ouverte" && (
              <button onClick={() => run(setNonConformiteStatus(nc.id, "Transmise au DG"))} className="inline-flex items-center gap-1 text-[12px] font-medium text-white bg-amber-600 rounded-lg px-2.5 py-1.5">
                <Send size={13} /> Transmettre au DG
              </button>
            )}
          </div>
        )}
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <Gavel size={15} className="text-slate-600" />
          <div className="text-[13px] font-semibold text-slate-700">Décisions du Directeur général</div>
        </div>
        <p className="text-[12px] text-slate-500 mb-3">{isDG ? "Coche les décisions retenues." : "Réservé au directeur — décisions rendues ci-dessous."}</p>
        <div className="grid md:grid-cols-2 gap-2">
          {refLists.decisions.map((d) => {
            const checked = nc.decisions.includes(d);
            return (
              <label key={d} className={`flex items-center gap-2 text-[13px] border rounded-lg px-3 py-2 ${checked ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "border-slate-200 text-slate-600"} ${isDG ? "cursor-pointer" : "opacity-80"}`}>
                <input type="checkbox" checked={checked} disabled={!isDG} onChange={() => toggleDecision(d)} className="h-4 w-4 accent-emerald-600" />
                {d}
              </label>
            );
          })}
        </div>
        {nc.decidedBy && nc.decidedAt && (
          <div className="text-[11px] text-slate-400 mt-3">Décision rendue par {profileById(nc.decidedBy).nom} · {fmt(nc.decidedAt)}</div>
        )}
      </Card>

      <NonConformitePrint nc={nc} />
    </div>
  );
}

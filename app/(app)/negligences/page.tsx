"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertOctagon, Filter, FileText, Gavel, Plus, Printer, X } from "lucide-react";
import {
  NEGLIGENCE_GRAVITES,
  NEGLIGENCE_RISQUES,
  NEGLIGENCE_STATUTS,
  type Negligence,
} from "@/lib/domain";
import { useApp } from "@/components/app-context";
import { PageHero } from "@/components/PageHero";
import { Avatar, Card, MetierChip, Token } from "@/components/atoms";
import { NegligencePrint } from "@/components/NegligencePrint";
import { NegligencesReport } from "@/components/NegligencesReport";

export const graviteBadge: Record<string, string> = {
  Faible: "bg-slate-100 text-slate-600",
  Modérée: "bg-amber-100 text-amber-700",
  Grave: "bg-rose-100 text-rose-700",
  Critique: "bg-rose-600 text-white",
};
export const statusBadge: Record<string, string> = {
  Ouverte: "bg-slate-100 text-slate-600",
  "Transmise au DG": "bg-amber-100 text-amber-700",
  "Décision rendue": "bg-emerald-100 text-emerald-700",
  Classée: "bg-slate-100 text-slate-500",
};

export default function NegligencesPage() {
  const { negligences, items, me, refLists, profileById, createNegligence, setNegligenceDecisions, readOnly } = useApp();
  const [search, setSearch] = useState("");
  const [fGravite, setFGravite] = useState("Tous");
  const [fStatut, setFStatut] = useState("Tous");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [printNeg, setPrintNeg] = useState<Negligence | null>(null);
  const [reportOn, setReportOn] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Formulaire de nouvelle négligence
  const [showNew, setShowNew] = useState(false);
  const [fItem, setFItem] = useState("");
  const [objet, setObjet] = useState("");
  const [service, setService] = useState("");
  const [concerne, setConcerne] = useState("");
  const [gravite, setGravite] = useState("Modérée");
  const [risque, setRisque] = useState("Moyen");
  const [impact, setImpact] = useState("");
  const [description, setDescription] = useState("");

  const isDG = me.role === "directeur" || me.role === "admin";
  const canDecide = isDG && !readOnly;
  const itemOf = (n: Negligence) => (n.itemId ? items.find((i) => i.id === n.itemId) : null);
  const negItemIds = new Set(negligences.map((n) => n.itemId).filter(Boolean));
  const attachables = items.filter((i) => !negItemIds.has(i.id));

  useEffect(() => {
    if (!printNeg) return;
    const t = setTimeout(() => { window.print(); setPrintNeg(null); }, 150);
    return () => clearTimeout(t);
  }, [printNeg]);
  useEffect(() => {
    if (!reportOn) return;
    const t = setTimeout(() => { window.print(); setReportOn(false); }, 200);
    return () => clearTimeout(t);
  }, [reportOn]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return negligences.filter((n) => {
      if (fGravite !== "Tous" && n.gravite !== fGravite) return false;
      if (fStatut !== "Tous" && n.status !== fStatut) return false;
      if (q) {
        const it = itemOf(n);
        if (!`${n.objet} ${n.service} ${n.concerne} ${it?.ref ?? ""}`.toLowerCase().includes(q)) return false;
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [negligences, search, fGravite, fStatut, items]);

  const aTraiter = negligences.filter((n) => n.status !== "Décision rendue" && n.status !== "Classée").length;
  const selectCls = "text-[12px] border border-slate-200 rounded-lg px-2 py-1 bg-white";

  const onPickItem = (id: string) => {
    setFItem(id);
    const it = items.find((i) => i.id === id);
    if (it) {
      setObjet(it.objet);
      const dest = it.personnes.find((p) => p.kind === "destinataire");
      setService(dest?.service ?? "");
      setConcerne(dest?.name ?? "");
    }
  };

  const create = async () => {
    setErr(null);
    if (!objet.trim() && !fItem) return setErr("Renseigne au moins l'objet de la négligence.");
    const e = await createNegligence({ itemId: fItem || null, objet: objet.trim(), service, concerne: concerne.trim(), gravite, risque, impact: impact.trim(), description: description.trim() });
    if (e) return setErr(e);
    setShowNew(false);
    setFItem(""); setObjet(""); setService(""); setConcerne(""); setGravite("Modérée"); setRisque("Moyen"); setImpact(""); setDescription("");
  };
  const toggle = (n: Negligence, d: string) => {
    const next = n.decisions.includes(d) ? n.decisions.filter((x) => x !== d) : [...n.decisions, d];
    setNegligenceDecisions(n.id, next);
  };

  return (
    <div className="space-y-6 animate-float">
      <PageHero
        kicker="Conformité"
        icon={AlertOctagon}
        title="Négligences"
        subtitle="Fiches transmises au DG (qui décide sur document imprimé). Le service / la personne en cause y figure."
        right={
          <>
            <button onClick={() => setReportOn(true)} disabled={filtered.length === 0} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors">
              <FileText size={15} /> Rapport (toutes) PDF
            </button>
            {readOnly ? (
              <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Lecture seule
              </span>
            ) : (
              <button onClick={() => setShowNew((v) => !v)} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-rose-600 rounded-xl px-3.5 py-2 hover:-translate-y-0.5 transition-transform shadow-soft">
                <Plus size={16} /> Nouvelle négligence
              </button>
            )}
          </>
        }
      />

      {err && <div className="text-[12px] text-rose-600">{err}</div>}

      {showNew && (
        <Card className="p-4 space-y-3">
          <div className="text-[13px] font-semibold text-slate-700">Nouvelle fiche de négligence</div>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="text-[12px] text-slate-500">Suivi de mail lié (facultatif)</label>
              <select value={fItem} onChange={(e) => onPickItem(e.target.value)} className="w-full mt-1 text-[13px] border border-slate-200 rounded-lg px-2 py-2 bg-white">
                <option value="">Aucun (négligence autonome)</option>
                {attachables.map((i) => (<option key={i.id} value={i.id}>{i.ref} — {i.objet.slice(0, 50)}</option>))}
              </select>
            </div>
            <div>
              <label className="text-[12px] text-slate-500">Objet *</label>
              <input value={objet} onChange={(e) => setObjet(e.target.value)} placeholder="En quoi consiste la négligence" className="w-full mt-1 text-[13px] border border-slate-200 rounded-lg px-2 py-2" />
            </div>
            <div>
              <label className="text-[12px] text-slate-500">Service en cause</label>
              <select value={service} onChange={(e) => setService(e.target.value)} className="w-full mt-1 text-[13px] border border-slate-200 rounded-lg px-2 py-2 bg-white">
                <option value="">— service —</option>
                {refLists.services.map((s) => (<option key={s}>{s}</option>))}
              </select>
            </div>
            <div>
              <label className="text-[12px] text-slate-500">Personne concernée (responsable)</label>
              <input value={concerne} onChange={(e) => setConcerne(e.target.value)} placeholder="Nom de la personne" className="w-full mt-1 text-[13px] border border-slate-200 rounded-lg px-2 py-2" />
            </div>
            <div>
              <label className="text-[12px] text-slate-500">Gravité</label>
              <select value={gravite} onChange={(e) => setGravite(e.target.value)} className="w-full mt-1 text-[13px] border border-slate-200 rounded-lg px-2 py-2 bg-white">
                {NEGLIGENCE_GRAVITES.map((g) => (<option key={g}>{g}</option>))}
              </select>
            </div>
            <div>
              <label className="text-[12px] text-slate-500">Risque pour l&apos;institution</label>
              <select value={risque} onChange={(e) => setRisque(e.target.value)} className="w-full mt-1 text-[13px] border border-slate-200 rounded-lg px-2 py-2 bg-white">
                {NEGLIGENCE_RISQUES.map((r) => (<option key={r}>{r}</option>))}
              </select>
            </div>
          </div>
          <textarea value={impact} onChange={(e) => setImpact(e.target.value)} rows={2} placeholder="Impact (conséquences concrètes)" className="w-full text-[13px] border border-slate-200 rounded-lg px-2 py-2" />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Description / circonstances" className="w-full text-[13px] border border-slate-200 rounded-lg px-2 py-2" />
          <div className="flex gap-2">
            <button onClick={() => setShowNew(false)} className="text-[13px] text-slate-600 border border-slate-200 rounded-lg px-3 py-1.5 inline-flex items-center gap-1"><X size={13} />Annuler</button>
            <button onClick={create} className="text-[13px] font-medium text-white bg-rose-600 rounded-lg px-3 py-1.5 hover:bg-rose-700">Créer la fiche</button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card className="p-4"><div className="text-2xl font-semibold text-slate-800">{negligences.length}</div><div className="text-[12px] text-slate-500">Fiches</div></Card>
        <Card className="p-4"><div className="text-2xl font-semibold text-amber-600">{aTraiter}</div><div className="text-[12px] text-slate-500">En attente de décision</div></Card>
        <Card className="p-4"><div className="text-2xl font-semibold text-rose-600">{negligences.filter((n) => n.gravite === "Critique" || n.gravite === "Grave").length}</div><div className="text-[12px] text-slate-500">Graves / critiques</div></Card>
      </div>

      <Card className="p-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={15} className="text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher (objet, service, personne)…" aria-label="Rechercher" className="text-[12px] border border-slate-200 rounded-lg px-2 py-1 flex-1 min-w-[10rem]" />
          <select value={fGravite} onChange={(e) => setFGravite(e.target.value)} aria-label="Gravité" className={selectCls}>
            <option value="Tous">Toutes gravités</option>
            {NEGLIGENCE_GRAVITES.map((g) => (<option key={g}>{g}</option>))}
          </select>
          <select value={fStatut} onChange={(e) => setFStatut(e.target.value)} aria-label="Statut" className={selectCls}>
            <option value="Tous">Tous statuts</option>
            {NEGLIGENCE_STATUTS.map((s) => (<option key={s}>{s}</option>))}
          </select>
          <span className="ml-auto text-[12px] text-slate-400">{filtered.length}</span>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card className="p-10 text-center text-[13px] text-slate-400">
          {negligences.length === 0 ? "Aucune négligence signalée." : "Aucune fiche ne correspond à ces filtres."}
        </Card>
      ) : (
        <Card>
          <div className="hidden md:flex items-center gap-3 px-4 py-2 border-b border-slate-100 bg-slate-50/60 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            <span className="w-28 shrink-0">Suivi par</span>
            <span className="flex-1">Objet</span>
            <span className="w-40 shrink-0">Service / personne</span>
            <span className="w-16 shrink-0">Gravité</span>
            <span className="w-24 shrink-0">Statut</span>
            <span className="w-24 text-right shrink-0">Actions</span>
          </div>
          <div className="divide-y divide-slate-100">
            {filtered.map((n) => {
              const it = itemOf(n);
              const owner = it ? profileById(it.ownerId) : profileById(n.createdBy);
              return (
                <div key={n.id}>
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="w-28 shrink-0 flex items-center gap-2">
                      <Avatar init={owner.init} size="h-7 w-7" />
                      <span className="text-[12px] text-slate-600 truncate hidden md:block">{owner.nom}</span>
                    </div>
                    <Link href={`/negligences/${n.id}`} className="flex-1 min-w-0 hover:underline">
                      <div className="flex items-center gap-1.5">
                        {it && <MetierChip code={it.metier} />}
                        <span className="text-[13px] text-slate-800 truncate">{n.objet || it?.objet || "—"}</span>
                      </div>
                      {it ? <Token>{it.ref}</Token> : <span className="text-[10px] text-slate-400">fiche autonome</span>}
                    </Link>
                    <span className="w-40 shrink-0 text-[12px] text-slate-600 truncate hidden md:block">
                      {n.service || "—"}{n.concerne ? ` · ${n.concerne}` : ""}
                    </span>
                    <span className="w-16 shrink-0"><span className={`text-[10px] px-1.5 py-0.5 rounded ${graviteBadge[n.gravite] ?? ""}`}>{n.gravite}</span></span>
                    <span className="w-24 shrink-0"><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusBadge[n.status] ?? "bg-slate-100 text-slate-600"}`}>{n.status}</span></span>
                    <div className="w-24 shrink-0 flex items-center justify-end gap-1">
                      {canDecide && (
                        <button onClick={() => setExpanded(expanded === n.id ? null : n.id)} title="Décisions du DG" className={`inline-flex items-center gap-1 text-[11px] rounded px-1.5 py-1 border ${n.decisions.length ? "border-emerald-200 text-emerald-700 bg-emerald-50" : "border-slate-200 text-slate-500"}`}>
                          <Gavel size={13} />{n.decisions.length || ""}
                        </button>
                      )}
                      <button onClick={() => setPrintNeg(n)} title="Imprimer cette fiche" className="text-slate-400 hover:text-slate-700 border border-slate-200 rounded px-1.5 py-1"><Printer size={13} /></button>
                    </div>
                  </div>

                  {canDecide && expanded === n.id && (
                    <div className="px-4 pb-3 pl-10">
                      <div className="text-[11px] text-slate-500 mb-1.5 flex items-center gap-1"><Gavel size={12} /> Décisions du DG — coche les décisions retenues (transcription du document signé)</div>
                      <div className="grid md:grid-cols-2 gap-1.5">
                        {refLists.decisions.map((d) => {
                          const checked = n.decisions.includes(d);
                          return (
                            <label key={d} className={`flex items-center gap-2 text-[12px] border rounded-lg px-2.5 py-1.5 cursor-pointer ${checked ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "border-slate-200 text-slate-600"}`}>
                              <input type="checkbox" checked={checked} onChange={() => toggle(n, d)} className="h-3.5 w-3.5 accent-emerald-600" />
                              {d}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {printNeg && <NegligencePrint neg={printNeg} />}
      {reportOn && <NegligencesReport negs={filtered} />}
    </div>
  );
}

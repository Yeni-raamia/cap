"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertOctagon, Filter, Gavel, Plus, Printer, Search, X } from "lucide-react";
import { NEGLIGENCE_GRAVITES, NEGLIGENCE_STATUTS, type Negligence } from "@/lib/domain";
import { useApp } from "@/components/app-context";
import { Avatar, Card, MetierChip, Token } from "@/components/atoms";
import { NegligencePrint } from "@/components/NegligencePrint";

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
  const { negligences, items, me, refLists, profileById, createNegligence, setNegligenceDecisions } = useApp();
  const [search, setSearch] = useState("");
  const [fGravite, setFGravite] = useState("Tous");
  const [fStatut, setFStatut] = useState("Tous");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [printNeg, setPrintNeg] = useState<Negligence | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Ajout manuel
  const [showNew, setShowNew] = useState(false);
  const [pick, setPick] = useState("");

  const isDG = me.role === "directeur" || me.role === "admin";
  const itemOf = (n: Negligence) => items.find((i) => i.id === n.itemId);
  const negItemIds = new Set(negligences.map((n) => n.itemId));
  const attachables = items.filter((i) => !negItemIds.has(i.id));

  useEffect(() => {
    if (!printNeg) return;
    const t = setTimeout(() => {
      window.print();
      setPrintNeg(null);
    }, 150);
    return () => clearTimeout(t);
  }, [printNeg]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return negligences.filter((n) => {
      if (fGravite !== "Tous" && n.gravite !== fGravite) return false;
      if (fStatut !== "Tous" && n.status !== fStatut) return false;
      if (q) {
        const it = itemOf(n);
        if (!`${it?.objet ?? ""} ${it?.ref ?? ""}`.toLowerCase().includes(q)) return false;
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [negligences, search, fGravite, fStatut, items]);

  const aTraiter = negligences.filter((n) => n.status !== "Décision rendue" && n.status !== "Classée").length;
  const selectCls = "text-[12px] border border-slate-200 rounded-lg px-2 py-1 bg-white";

  const create = async () => {
    setErr(null);
    if (!pick) return;
    const e = await createNegligence(pick);
    if (e) return setErr(e);
    setPick("");
    setShowNew(false);
  };
  const toggle = (n: Negligence, d: string) => {
    const next = n.decisions.includes(d) ? n.decisions.filter((x) => x !== d) : [...n.decisions, d];
    setNegligenceDecisions(n.id, next);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
            <AlertOctagon size={20} className="text-rose-600" /> Négligences
          </h1>
          <p className="text-[13px] text-slate-500">
            Ouvertes automatiquement quand un motif de blocage est « Négligence ». Transmises au DG pour décision.
          </p>
        </div>
        <button onClick={() => setShowNew((v) => !v)} className="flex items-center gap-1.5 text-[13px] font-medium text-white bg-rose-600 rounded-lg px-3 py-2 hover:bg-rose-700">
          <Plus size={16} /> Nouvelle négligence
        </button>
      </div>

      {err && <div className="text-[12px] text-rose-600">{err}</div>}

      {showNew && (
        <Card className="p-4 space-y-2">
          <div className="text-[13px] font-semibold text-slate-700">Signaler une négligence sur un suivi</div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[16rem]">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <select value={pick} onChange={(e) => setPick(e.target.value)} className="w-full text-[13px] border border-slate-200 rounded-lg pl-8 pr-2 py-2 bg-white">
                <option value="">Choisir un suivi…</option>
                {attachables.map((i) => (
                  <option key={i.id} value={i.id}>{i.ref} — {i.objet.slice(0, 60)}</option>
                ))}
              </select>
            </div>
            <button onClick={create} disabled={!pick} className="text-[13px] font-medium text-white bg-rose-600 rounded-lg px-3 py-2 disabled:opacity-40">Ouvrir la fiche</button>
            <button onClick={() => setShowNew(false)} className="text-[13px] text-slate-500 inline-flex items-center gap-1"><X size={13} />Annuler</button>
          </div>
          <p className="text-[11px] text-slate-400">Le suivi sera marqué « Négligence » et une fiche transmise au DG sera créée.</p>
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
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher…" aria-label="Rechercher" className="text-[12px] border border-slate-200 rounded-lg px-2 py-1 flex-1 min-w-[10rem]" />
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
            <span className="w-32 shrink-0">Responsable</span>
            <span className="flex-1">Objet</span>
            <span className="w-20 shrink-0">Gravité</span>
            <span className="w-16 shrink-0">Risque</span>
            <span className="w-28 shrink-0">Statut</span>
            <span className="w-28 text-right shrink-0">Actions</span>
          </div>
          <div className="divide-y divide-slate-100">
            {filtered.map((n) => {
              const it = itemOf(n);
              const owner = it ? profileById(it.ownerId) : null;
              return (
                <div key={n.id}>
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="w-32 shrink-0 flex items-center gap-2">
                      {owner && <Avatar init={owner.init} size="h-7 w-7" />}
                      <span className="text-[12px] text-slate-600 truncate hidden md:block">{owner?.nom ?? "—"}</span>
                    </div>
                    <Link href={`/negligences/${n.id}`} className="flex-1 min-w-0 hover:underline">
                      <div className="flex items-center gap-1.5">
                        {it && <MetierChip code={it.metier} />}
                        <span className="text-[13px] text-slate-800 truncate">{it?.objet ?? "Suivi supprimé"}</span>
                      </div>
                      {it && <Token>{it.ref}</Token>}
                    </Link>
                    <span className="w-20 shrink-0"><span className={`text-[10px] px-1.5 py-0.5 rounded ${graviteBadge[n.gravite] ?? ""}`}>{n.gravite}</span></span>
                    <span className="w-16 shrink-0 text-[12px] text-slate-500 hidden md:block">{n.risque}</span>
                    <span className="w-28 shrink-0"><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusBadge[n.status] ?? "bg-slate-100 text-slate-600"}`}>{n.status}</span></span>
                    <div className="w-28 shrink-0 flex items-center justify-end gap-1">
                      {isDG && (
                        <button onClick={() => setExpanded(expanded === n.id ? null : n.id)} title="Décisions du DG" className={`inline-flex items-center gap-1 text-[11px] rounded px-1.5 py-1 border ${n.decisions.length ? "border-emerald-200 text-emerald-700 bg-emerald-50" : "border-slate-200 text-slate-500"}`}>
                          <Gavel size={13} />{n.decisions.length || ""}
                        </button>
                      )}
                      <button onClick={() => setPrintNeg(n)} title="Imprimer (PDF)" className="text-slate-400 hover:text-slate-700 border border-slate-200 rounded px-1.5 py-1"><Printer size={13} /></button>
                    </div>
                  </div>

                  {isDG && expanded === n.id && (
                    <div className="px-4 pb-3 pl-10">
                      <div className="text-[11px] text-slate-500 mb-1.5 flex items-center gap-1"><Gavel size={12} /> Décisions du Directeur général — coche les décisions retenues</div>
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
                      {n.decidedBy && n.decidedAt && (
                        <div className="text-[10px] text-slate-400 mt-2">Décision rendue par {profileById(n.decidedBy).nom}.</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {printNeg && <NegligencePrint neg={printNeg} />}
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertOctagon, Filter, Gavel } from "lucide-react";
import { fmt, NEGLIGENCE_GRAVITES, NEGLIGENCE_STATUTS, type Negligence } from "@/lib/domain";
import { useApp } from "@/components/app-context";
import { Avatar, Card, MetierChip, Token } from "@/components/atoms";

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
  const { negligences, items, profileById } = useApp();
  const [search, setSearch] = useState("");
  const [fGravite, setFGravite] = useState("Tous");
  const [fStatut, setFStatut] = useState("Tous");

  const itemOf = (n: Negligence) => items.find((i) => i.id === n.itemId);

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
          <AlertOctagon size={20} className="text-rose-600" /> Négligences
        </h1>
        <p className="text-[13px] text-slate-500">
          Ouvertes automatiquement quand un motif de blocage est qualifié de « Négligence ». Transmises au DG pour décision.
        </p>
      </div>

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
          <div className="divide-y divide-slate-100">
            {filtered.map((n) => {
              const it = itemOf(n);
              const owner = it ? profileById(it.ownerId) : null;
              return (
                <Link key={n.id} href={`/negligences/${n.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
                  {owner && <Avatar init={owner.init} size="h-7 w-7" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {it && <MetierChip code={it.metier} />}
                      <span className="text-[13px] text-slate-800 truncate">{it?.objet ?? "Suivi supprimé"}</span>
                    </div>
                    {it && <Token>{it.ref}</Token>}
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${graviteBadge[n.gravite] ?? ""}`}>{n.gravite}</span>
                  <span className="text-[11px] text-slate-500 w-16 text-right hidden sm:block">Risque {n.risque}</span>
                  {n.decisions.length > 0 && (
                    <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-emerald-700"><Gavel size={12} />{n.decisions.length}</span>
                  )}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusBadge[n.status] ?? "bg-slate-100 text-slate-600"}`}>{n.status}</span>
                </Link>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

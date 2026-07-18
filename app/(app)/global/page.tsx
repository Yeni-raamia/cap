"use client";

import { useState } from "react";
import { ArrowUp, Filter, Inbox, ShieldAlert, TrendingUp } from "lucide-react";
import { useApp } from "@/components/app-context";
import { Avatar, Card, KPI, MetierChip, Token, TypeTag } from "@/components/atoms";

export default function VueGlobalePage() {
  const { items, openItem, profiles, profileById, catalogue, rs } = useApp();
  const [fMetier, setFMetier] = useState("Tous");
  const [fAgent, setFAgent] = useState("Tous");

  const actifs = items.filter((i) => i.statut !== "Clôturé");
  const enRetard = actifs.filter((i) => rs(i).level === "escalade").length;
  const bloques = actifs.filter((i) => i.statut === "Bloqué").length;
  const repondus = items.filter((i) => i.timeline.some((e) => e.kind === "reponse")).length;
  const taux = items.length ? Math.round((repondus / items.length) * 100) : 0;
  const rows = actifs.filter(
    (i) =>
      (fMetier === "Tous" || i.metier === fMetier) &&
      (fAgent === "Tous" || i.ownerId === fAgent)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Vue globale</h1>
        <p className="text-[13px] text-slate-500">
          Le travail de toute l&apos;équipe, en un coup d&apos;œil.
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI icon={Inbox} label="Suivis actifs" value={actifs.length} tone="sky" />
        <KPI icon={ArrowUp} label="En retard" value={enRetard} tone="rose" />
        <KPI icon={ShieldAlert} label="Bloqués" value={bloques} tone="amber" />
        <KPI icon={TrendingUp} label="Taux de réponse" value={taux + "%"} tone="emerald" />
      </div>

      <Card>
        <div className="flex items-center gap-2 p-3 border-b border-slate-100 flex-wrap">
          <Filter size={15} className="text-slate-400" />
          <select
            value={fMetier}
            onChange={(e) => setFMetier(e.target.value)}
            aria-label="Filtrer par métier"
            className="text-[12px] border border-slate-200 rounded-lg px-2 py-1"
          >
            <option>Tous</option>
            {Object.keys(catalogue.metiers).map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
          <select
            value={fAgent}
            onChange={(e) => setFAgent(e.target.value)}
            aria-label="Filtrer par agent"
            className="text-[12px] border border-slate-200 rounded-lg px-2 py-1"
          >
            <option value="Tous">Tous les agents</option>
            {profiles.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nom}
              </option>
            ))}
          </select>
          <span className="ml-auto text-[12px] text-slate-400">{rows.length} suivis</span>
        </div>
        <div className="divide-y divide-slate-100">
          {rows.map((i) => {
            const state = rs(i);
            const owner = profileById(i.ownerId);
            return (
              <button
                key={i.id}
                onClick={() => openItem(i)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left"
              >
                <div className="flex items-center gap-2 w-36 shrink-0">
                  <Avatar init={owner.init} size="h-7 w-7" />
                  <span className="text-[12px] text-slate-600 truncate">{owner.nom}</span>
                </div>
                <div className="flex items-center gap-2 w-32 shrink-0">
                  <MetierChip code={i.metier} />
                  <TypeTag t={i.type} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] text-slate-800 truncate">{i.objet}</div>
                  <Token>{i.ref}</Token>
                </div>
                <div className="text-[12px] text-slate-500 w-24 text-right hidden md:block">
                  {i.statut}
                </div>
                <div className="w-28 text-right">
                  {state.level === "escalade" && (
                    <span className="text-[11px] text-rose-600 font-medium">En retard J+{state.days}</span>
                  )}
                  {state.level === "relance" && (
                    <span className="text-[11px] text-amber-600 font-medium">Relance due</span>
                  )}
                  {state.level === "bloque" && (
                    <span className="text-[11px] text-rose-600 font-medium">Bloqué</span>
                  )}
                  {state.level === "ok" && <span className="text-[11px] text-slate-400">à jour</span>}
                  {state.level === "none" && <span className="text-[11px] text-slate-300">—</span>}
                </div>
              </button>
            );
          })}
          {rows.length === 0 && (
            <div className="p-8 text-center text-[13px] text-slate-400">
              Aucun suivi pour ce filtre.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

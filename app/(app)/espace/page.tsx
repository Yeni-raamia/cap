"use client";

import { Bell, Plus } from "lucide-react";
import { fmtLong } from "@/lib/domain";
import { useApp } from "@/components/app-context";
import { Card } from "@/components/atoms";
import { ItemCard } from "@/components/ItemCard";

export default function MonEspacePage() {
  const { items, now, me, scores, rs, setShowNew } = useApp();

  const mine = items.filter((i) => i.ownerId === me.id);
  const attends = mine.filter((i) => ["relance", "escalade"].includes(rs(i).level));
  const actifs = mine.filter((i) => i.statut !== "Clôturé");
  const rank = scores.findIndex((s) => s.id === me.id);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Bonjour, {me.nom}</h1>
          <p className="text-[13px] text-slate-500">
            {fmtLong(now)} · {actifs.length} suivis actifs
            {rank >= 0 && ` · ${rank + 1}ᵉ au classement`}
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 text-[13px] font-medium text-white bg-emerald-600 rounded-lg px-3 py-2 hover:bg-emerald-700"
        >
          <Plus size={16} />
          Nouveau suivi
        </button>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <Bell size={15} className="text-amber-500" />
          <h2 className="text-[13px] font-semibold text-slate-700 uppercase tracking-wide">
            Ce qui t&apos;attend
          </h2>
          <span className="text-[11px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
            {attends.length}
          </span>
        </div>
        {attends.length === 0 ? (
          <Card className="p-6 text-center text-[13px] text-slate-400">
            Rien ne t&apos;attend. Tout est à jour.
          </Card>
        ) : (
          <div className="space-y-3">
            {attends.map((i) => (
              <ItemCard key={i.id} item={i} />
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-[13px] font-semibold text-slate-700 uppercase tracking-wide mb-2">
          Mes suivis actifs
        </h2>
        {actifs.length === 0 ? (
          <Card className="p-6 text-center text-[13px] text-slate-400">
            Aucun suivi actif. Crée-en un pour commencer.
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {actifs.map((i) => (
              <ItemCard key={i.id} item={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

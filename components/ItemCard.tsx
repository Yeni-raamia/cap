"use client";

import { ArrowUp, CalendarClock, RotateCcw, ShieldAlert } from "lucide-react";
import { fmt, type Item } from "@/lib/domain";
import { useApp } from "./app-context";
import { Avatar, MetierChip, Priority, Token, TypeTag } from "./atoms";
import { Fil } from "./Fil";

const barByLevel: Record<string, string> = {
  relance: "border-l-amber-400",
  escalade: "border-l-rose-500",
  bloque: "border-l-rose-500",
  ok: "border-l-emerald-400",
  none: "border-l-slate-200",
};

export function ItemCard({ item }: { item: Item }) {
  const { openItem, profileById, rs: rsFor } = useApp();
  const rs = rsFor(item);
  const owner = profileById(item.ownerId);

  return (
    <button
      onClick={() => openItem(item)}
      className={`w-full text-left bg-white border border-slate-200 border-l-[3px] ${barByLevel[rs.level]} rounded-xl p-4 hover:shadow-sm transition`}
    >
      <div className="flex items-center gap-2 mb-2">
        <MetierChip code={item.metier} />
        <TypeTag t={item.type} />
        <Token>{item.ref}</Token>
        <div className="ml-auto">
          <Priority p={item.priorite} />
        </div>
      </div>
      <div className="text-[14px] font-medium text-slate-800 mb-3 leading-snug">{item.objet}</div>
      <Fil item={item} compact />
      <div className="flex items-center gap-2 mt-3 text-[11px] text-slate-500">
        <Avatar init={owner.init} size="h-5 w-5" />
        <span>{owner.nom}</span>
        <span className="text-slate-300">·</span>
        <span className="text-slate-500">{item.statut}</span>
        {rs.level === "relance" && (
          <span className="ml-auto inline-flex items-center gap-1 text-amber-600 font-medium">
            <RotateCcw size={12} />
            Relance due (J+{rs.days})
          </span>
        )}
        {rs.level === "escalade" && (
          <span className="ml-auto inline-flex items-center gap-1 text-rose-600 font-medium">
            <ArrowUp size={12} />
            Escaladé (J+{rs.days})
          </span>
        )}
        {rs.level === "bloque" && (
          <span className="ml-auto inline-flex items-center gap-1 text-rose-600 font-medium">
            <ShieldAlert size={12} />
            {item.blocageCause}
          </span>
        )}
        {rs.level === "ok" && rs.dueIn !== undefined && rs.dueIn >= 0 && (
          <span className="ml-auto text-slate-400">Relance dans {rs.dueIn}j</span>
        )}
      </div>
      {item.dateRelancePrevue && (
        <div className="mt-2 inline-flex items-center gap-1 text-[11px] text-sky-700 bg-sky-50 border border-sky-200 rounded px-1.5 py-0.5">
          <CalendarClock size={12} />
          Relance prévue le {fmt(item.dateRelancePrevue)}
        </div>
      )}
    </button>
  );
}

"use client";

import { ShieldAlert } from "lucide-react";
import { reminderState } from "@/lib/domain";
import { useApp } from "@/components/app-context";
import { Avatar, Card, MetierChip, Token, TypeTag } from "@/components/atoms";

export default function BlocagesPage() {
  const { items, now, openItem, profileById } = useApp();

  const risk = items
    .filter((i) => {
      const l = reminderState(i, now).level;
      return l === "escalade" || l === "bloque";
    })
    .sort((a, b) => reminderState(b, now).days - reminderState(a, now).days);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Ce qui ne bouge pas</h1>
        <p className="text-[13px] text-slate-500">
          Les suivis à risque, du plus ancien au plus récent — et pourquoi.
        </p>
      </div>
      {risk.length === 0 ? (
        <Card className="p-8 text-center text-[13px] text-slate-400">
          Rien de bloqué. Tout avance.
        </Card>
      ) : (
        risk.map((i) => {
          const rs = reminderState(i, now);
          const owner = profileById(i.ownerId);
          return (
            <Card key={i.id} className="p-4 border-l-[3px] border-l-rose-500">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <MetierChip code={i.metier} />
                <TypeTag t={i.type} />
                <Token>{i.ref}</Token>
                <span className="ml-auto text-[12px] font-medium text-rose-600">
                  Sans mouvement depuis {rs.days}j
                </span>
              </div>
              <div className="text-[14px] font-medium text-slate-800 mb-2">{i.objet}</div>
              <div className="flex items-center gap-3 text-[12px] text-slate-500 flex-wrap">
                <span className="flex items-center gap-1">
                  <Avatar init={owner.init} size="h-5 w-5" />
                  {owner.nom}
                </span>
                <span className="flex items-center gap-1 text-rose-600 font-medium">
                  <ShieldAlert size={13} />
                  {i.blocageCause || "Escaladé — sans réponse"}
                </span>
                <button
                  onClick={() => openItem(i)}
                  className="ml-auto text-[12px] text-emerald-700 font-medium hover:underline"
                >
                  Ouvrir →
                </button>
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}

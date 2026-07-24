"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Pencil, X } from "lucide-react";
import type { Item } from "@/lib/domain";
import { useApp } from "./app-context";
import { MetierChip, Token, TypeTag } from "./atoms";
import { SuiviDetail } from "./SuiviDetail";

export function Drawer() {
  const { open, items, closeItem, me } = useApp();
  const router = useRouter();
  const [editing, setEditing] = useState(false);

  // Sortir du mode édition quand on change de suivi (ou qu'on ferme).
  useEffect(() => setEditing(false), [open?.id]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeItem();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closeItem]);

  if (!open) return null;

  // Objet « live » : reflète les mises à jour (planification de relance, etc.).
  const item: Item = items.find((x) => x.id === open.id) ?? open;
  const canEdit = me.role === "agent" ? item.ownerId === me.id : true;

  const openAsPage = () => {
    closeItem();
    router.push(`/items/${item.id}`);
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm animate-fade" onClick={closeItem} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Détail du suivi de mail ${item.ref}`}
        className="relative w-full max-w-md bg-slate-50 h-full overflow-y-auto shadow-2xl animate-slide-right"
      >
        <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-start gap-2 z-10">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <MetierChip code={item.metier} />
              <TypeTag t={item.type} />
              <Token>{item.ref}</Token>
            </div>
            <div className="text-[15px] font-semibold text-slate-800 leading-snug">{item.objet}</div>
          </div>
          <button
            onClick={openAsPage}
            aria-label="Ouvrir en page (lien partageable)"
            title="Ouvrir en page (lien partageable)"
            className="shrink-0 text-slate-400 hover:text-slate-600"
          >
            <ExternalLink size={16} />
          </button>
          {canEdit && (
            <button
              onClick={() => setEditing((v) => !v)}
              aria-label={editing ? "Fermer l'édition" : "Éditer le suivi"}
              title={editing ? "Fermer l'édition" : "Éditer le suivi"}
              className={`shrink-0 ${editing ? "text-emerald-600" : "text-slate-400 hover:text-slate-600"}`}
            >
              <Pencil size={16} />
            </button>
          )}
          <button onClick={closeItem} aria-label="Fermer" className="shrink-0 text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <div className="p-4">
          <SuiviDetail item={item} editing={editing} setEditing={setEditing} />
        </div>
      </div>
    </div>
  );
}

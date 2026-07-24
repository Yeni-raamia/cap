"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Check, Link2, Pencil } from "lucide-react";
import { useApp } from "@/components/app-context";
import { Card, MetierChip, Token, TypeTag } from "@/components/atoms";
import { SuiviDetail } from "@/components/SuiviDetail";

export default function ItemPage() {
  const params = useParams();
  const id = String(params.id);
  const { items, me } = useApp();
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  const item = items.find((x) => x.id === id);

  if (!item) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Link href="/cockpit" className="inline-flex items-center gap-1 text-[13px] text-emerald-700 hover:underline">
          <ArrowLeft size={15} /> Cockpit
        </Link>
        <Card className="p-10 text-center text-[13px] text-slate-400">
          Suivi introuvable. Il a peut-être été clôturé ou supprimé.
        </Card>
      </div>
    );
  }

  const canEdit = me.role === "agent" ? item.ownerId === me.id : true;

  const copyLink = () => {
    if (typeof window === "undefined") return;
    navigator.clipboard?.writeText(window.location.href).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      },
      () => {}
    );
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4 animate-page">
      <Link href="/cockpit" className="inline-flex items-center gap-1 text-[13px] text-emerald-700 hover:underline">
        <ArrowLeft size={15} /> Cockpit
      </Link>

      {/* En-tête du suivi */}
      <Card className="p-4 flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <MetierChip code={item.metier} />
            <TypeTag t={item.type} />
            <Token>{item.ref}</Token>
          </div>
          <h1 className="text-[17px] font-semibold text-slate-800 leading-snug">{item.objet}</h1>
        </div>
        <button
          onClick={copyLink}
          aria-label="Copier le lien du suivi"
          title="Copier le lien du suivi"
          className={`shrink-0 inline-flex items-center gap-1 text-[12px] border rounded-lg px-2.5 py-1.5 ${
            copied
              ? "text-emerald-700 border-emerald-200 bg-emerald-50"
              : "text-slate-500 border-slate-200 hover:bg-slate-50"
          }`}
        >
          {copied ? <Check size={13} /> : <Link2 size={13} />}
          {copied ? "Lien copié" : "Copier le lien"}
        </button>
        {canEdit && (
          <button
            onClick={() => setEditing((v) => !v)}
            aria-label={editing ? "Fermer l'édition" : "Éditer le suivi"}
            title={editing ? "Fermer l'édition" : "Éditer le suivi"}
            className={`shrink-0 inline-flex items-center justify-center h-[30px] w-[30px] border rounded-lg ${
              editing ? "text-emerald-600 border-emerald-200 bg-emerald-50" : "text-slate-500 border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Pencil size={14} />
          </button>
        )}
      </Card>

      <SuiviDetail item={item} editing={editing} setEditing={setEditing} />
    </div>
  );
}

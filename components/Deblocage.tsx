"use client";

import { useState } from "react";
import { ArrowUp, CalendarClock, Flag, Mail, MessageCircle, Phone, Users, X } from "lucide-react";
import {
  APPRECIATIONS,
  BLOCAGE_ACTIONS,
  blocageActionLabel,
  fmt,
  type BlocageActionKind,
  type Item,
} from "@/lib/domain";
import { useApp } from "./app-context";

const ACT_ICON: Record<string, typeof Phone> = { Phone, Mail, ArrowUp, MessageCircle, Users, CalendarClock, Flag };

/** Bloc de déblocage : appréciation du motif + démarches menées (édition). */
export function Deblocage({ item }: { item: Item }) {
  const { me, addBlocageAction, setAppreciation, profileById } = useApp();
  const canEdit = me.role === "agent" ? item.ownerId === me.id : true;

  const defaultConcerne = item.personnes.find((p) => p.kind === "destinataire")?.name ?? "";
  const [kind, setKind] = useState<BlocageActionKind>("appel");
  const [concerne, setConcerne] = useState(defaultConcerne);
  const [note, setNote] = useState("");
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-3">
      {/* Appréciation */}
      <div className="flex items-center gap-2 text-[12px] flex-wrap">
        <span className="text-slate-500">Appréciation du motif :</span>
        {canEdit ? (
          <select
            value={item.appreciation ?? ""}
            onChange={(e) => setAppreciation(item, e.target.value || null)}
            aria-label="Appréciation du motif"
            className="text-[12px] border border-slate-200 rounded-lg px-2 py-1 bg-white"
          >
            <option value="">— à qualifier —</option>
            {APPRECIATIONS.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        ) : (
          <span className="font-medium text-slate-700">{item.appreciation ?? "—"}</span>
        )}
      </div>

      {/* Démarches */}
      <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">
        <div className="text-[11px] uppercase tracking-wide text-slate-400 mb-2">
          Démarches menées ({item.blocageActions.length})
        </div>
        {item.blocageActions.length === 0 ? (
          <div className="text-[12px] text-slate-400">Aucune démarche enregistrée — dossier à prendre en main.</div>
        ) : (
          <div className="space-y-2">
            {item.blocageActions.map((a) => {
              const meta = BLOCAGE_ACTIONS.find((x) => x.kind === a.kind);
              const Icon = ACT_ICON[meta?.icon ?? "Flag"] ?? Flag;
              return (
                <div key={a.id} className="flex gap-2 text-[12px]">
                  <Icon size={14} className="text-slate-500 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-slate-700">
                      <span className="font-medium">{blocageActionLabel(a.kind)}</span> — {a.concerne}
                    </div>
                    {a.note && <div className="text-slate-500">{a.note}</div>}
                    <div className="text-[10px] text-slate-400">
                      {profileById(a.authorId).nom} · {fmt(a.createdAt)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {canEdit && (
          <div className="mt-2">
            {!showForm ? (
              <button onClick={() => setShowForm(true)} className="text-[12px] text-emerald-700 font-medium hover:underline">
                + Enregistrer une démarche
              </button>
            ) : (
              <div className="space-y-2 border-t border-slate-200 pt-2">
                <select value={kind} onChange={(e) => setKind(e.target.value as BlocageActionKind)} aria-label="Type de démarche" className="w-full text-[12px] border border-slate-200 rounded-lg px-2 py-1.5 bg-white">
                  {BLOCAGE_ACTIONS.map((a) => (
                    <option key={a.kind} value={a.kind}>{a.label}</option>
                  ))}
                </select>
                <input value={concerne} onChange={(e) => setConcerne(e.target.value)} placeholder="Personne concernée (nommée) *" className="w-full text-[12px] border border-slate-200 rounded-lg px-2 py-1.5" />
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Compte rendu / message (rapport pour le DG, contenu de la relance…)" className="w-full text-[12px] border border-slate-200 rounded-lg px-2 py-1.5" />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (!concerne.trim()) return;
                      addBlocageAction(item, kind, concerne.trim(), note.trim());
                      setNote("");
                      setShowForm(false);
                    }}
                    disabled={!concerne.trim()}
                    className="text-[12px] font-medium text-white bg-emerald-600 rounded-lg px-3 py-1.5 disabled:opacity-40"
                  >
                    Enregistrer la démarche
                  </button>
                  <button onClick={() => setShowForm(false)} className="text-[12px] text-slate-500 inline-flex items-center gap-1">
                    <X size={13} />Annuler
                  </button>
                </div>
                <p className="text-[10px] text-slate-400">La personne concernée doit toujours être nommée.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, type ComponentType } from "react";
import {
  ArrowUp,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Circle,
  Inbox,
  RotateCcw,
  Send,
  ShieldAlert,
  UserCircle2,
  X,
} from "lucide-react";
import {
  daysBetween,
  fmt,
  STATUTS,
  type EventKind,
  type Item,
} from "@/lib/domain";
import { useApp } from "./app-context";
import { Avatar, Card, MetierChip, Token, TypeTag } from "./atoms";
import { Fil } from "./Fil";
import { Deblocage } from "./Deblocage";
import { Discussion } from "./Discussion";

const evMeta: Record<EventKind, { icon: ComponentType<{ size?: number; className?: string }>; c: string }> = {
  creation: { icon: Circle, c: "text-slate-400" },
  envoi: { icon: Send, c: "text-sky-500" },
  relance: { icon: RotateCcw, c: "text-amber-500" },
  reponse: { icon: Inbox, c: "text-emerald-500" },
  statut: { icon: ChevronRight, c: "text-slate-500" },
  note: { icon: Circle, c: "text-slate-400" },
  cloture: { icon: CheckCircle2, c: "text-emerald-600" },
  escalade: { icon: ArrowUp, c: "text-rose-500" },
};

export function Drawer() {
  const { open, items, now, closeItem, act, setRelanceDate, rs, me, profileById, refLists } = useApp();
  const [cause, setCause] = useState(refLists.causes[0] ?? "");

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
  const relanceValue = item.dateRelancePrevue
    ? new Date(item.dateRelancePrevue).toISOString().slice(0, 10)
    : "";
  const owner = profileById(item.ownerId);
  const tl = [...item.timeline].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm animate-fade" onClick={closeItem} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Détail du suivi ${item.ref}`}
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
            onClick={closeItem}
            aria-label="Fermer"
            className="text-slate-400 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <Card className="p-4">
            <Fil item={item} />
            <div className="flex items-center justify-between mt-3 text-[12px]">
              <span className="text-slate-500">
                Statut : <span className="font-medium text-slate-700">{item.statut}</span>
              </span>
              <span className="font-mono text-slate-400">{STATUTS[item.statut].pct}%</span>
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <Card className="p-3">
              <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-1">Responsable</div>
              <div className="flex items-center gap-2">
                <Avatar init={owner.init} size="h-6 w-6" />
                <span className="text-[13px] font-medium text-slate-700">{owner.nom}</span>
              </div>
            </Card>
            <Card className="p-3">
              <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-1">Relances</div>
              <div className="text-[13px] font-medium text-slate-700">
                {item.relancesCount} · maj il y a {daysBetween(item.dateMaj, now)}j
              </div>
            </Card>
          </div>

          <Card className="p-3">
            <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-2">
              Personnes impliquées
            </div>
            <div className="space-y-1.5">
              {item.personnes.map((p, i) => (
                <div key={i} className="flex items-center gap-2 text-[12px]">
                  <UserCircle2 size={14} className="text-slate-400" />
                  <span className="text-slate-700">{p.name}</span>
                  <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                    {p.kind}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-3">
            <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-2">Points clés</div>
            <ul className="space-y-1">
              {item.pointsCles.map((k, i) => (
                <li key={i} className="text-[12px] text-slate-700 flex gap-2">
                  <span className="text-emerald-500 mt-0.5">▸</span>
                  {k}
                </li>
              ))}
            </ul>
          </Card>

          {item.statut === "Bloqué" && (
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-[12px] text-rose-700 flex items-center gap-2">
              <ShieldAlert size={15} /> Bloqué — {item.blocageCause}
            </div>
          )}

          {/* Déblocage : motif + démarches (l'agent renseigne ici) */}
          {["bloque", "escalade"].includes(rs(item).level) && (
            <Card className="p-3">
              <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-2">Déblocage</div>
              <Deblocage item={item} />
            </Card>
          )}

          <Card className="p-3">
            <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-3">Timeline</div>
            <div className="space-y-3">
              {tl.map((e, i) => {
                const M = evMeta[e.kind] || evMeta.note;
                return (
                  <div key={i} className="flex gap-3">
                    <M.icon size={15} className={`${M.c} mt-0.5 shrink-0`} />
                    <div className="flex-1">
                      <div className="text-[12px] text-slate-700">{e.label}</div>
                      <div className="text-[10px] text-slate-400">
                        {fmt(e.date)} · {profileById(e.author).nom}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {item.statut !== "Clôturé" && (
            <Card className="p-3">
              <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-2 flex items-center gap-1">
                <CalendarClock size={12} /> Relance planifiée
              </div>
              {canEdit ? (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    aria-label="Date de relance planifiée"
                    value={relanceValue}
                    onChange={(e) => setRelanceDate(item, e.target.value || null)}
                    className="flex-1 text-[13px] border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700"
                  />
                  {relanceValue && (
                    <button
                      onClick={() => setRelanceDate(item, null)}
                      className="text-[12px] text-slate-500 hover:text-rose-600 px-2 py-1.5"
                    >
                      Effacer
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-[12px] text-slate-600">
                  {relanceValue
                    ? `Relance prévue le ${fmt(new Date(item.dateRelancePrevue!))}`
                    : "Aucune relance planifiée."}
                </div>
              )}
              <p className="text-[10px] text-slate-400 mt-2">
                À l&apos;échéance, une notification est envoyée au responsable.
              </p>
            </Card>
          )}

          {canEdit && item.statut !== "Clôturé" && (
            <Card className="p-3 space-y-2">
              <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-1">Actions</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => act(item, "relance")}
                  className="flex items-center justify-center gap-1.5 text-[12px] font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded-lg py-2 hover:bg-amber-100"
                >
                  <RotateCcw size={14} />
                  Relancer
                </button>
                <button
                  onClick={() => act(item, "reponse")}
                  className="flex items-center justify-center gap-1.5 text-[12px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg py-2 hover:bg-emerald-100"
                >
                  <Inbox size={14} />
                  Réponse reçue
                </button>
                <button
                  onClick={() => act(item, "bloque", cause)}
                  className="flex items-center justify-center gap-1.5 text-[12px] font-medium bg-rose-50 text-rose-700 border border-rose-200 rounded-lg py-2 hover:bg-rose-100"
                >
                  <ShieldAlert size={14} />
                  Marquer bloqué
                </button>
                <button
                  onClick={() => act(item, "cloture")}
                  className="flex items-center justify-center gap-1.5 text-[12px] font-medium bg-slate-800 text-white rounded-lg py-2 hover:bg-slate-700"
                >
                  <CheckCircle2 size={14} />
                  Clôturer
                </button>
              </div>
              <select
                value={cause}
                onChange={(e) => setCause(e.target.value)}
                aria-label="Cause de blocage"
                className="w-full text-[12px] border border-slate-200 rounded-lg px-2 py-1.5 text-slate-600"
              >
                {refLists.causes.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Card>
          )}

          {/* Discussion du suivi */}
          <Card className="p-3">
            <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-2">Discussion</div>
            <Discussion target={{ refType: "item", refId: item.id }} height="h-52" />
          </Card>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, type ComponentType } from "react";
import Link from "next/link";
import {
  AlertOctagon,
  ArrowUp,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock,
  FileWarning,
  Inbox,
  RotateCcw,
  Send,
  ShieldAlert,
  UserCircle2,
} from "lucide-react";
import { customDeadline, daysBetween, fmt, isLateByDuration, STATUTS, type EventKind, type Item } from "@/lib/domain";
import { toDayInput } from "@/lib/period";
import { useApp } from "./app-context";
import { Avatar, Card } from "./atoms";
import { Fil } from "./Fil";
import { EditSuivi } from "./EditSuivi";
import { Deblocage } from "./Deblocage";
import { Discussion } from "./Discussion";
import { TemplatePicker } from "./TemplatePicker";
import { Attachments } from "./Attachments";

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

/**
 * Corps de détail d'un suivi de mail — partagé entre le panneau latéral
 * (Drawer, en superposition) et la page dédiée `/items/[id]`. L'en-tête
 * (métier/type/réf/objet) et le bouton d'édition sont fournis par le conteneur ;
 * le mode édition est piloté via `editing` / `setEditing`.
 */
export function SuiviDetail({
  item,
  editing,
  setEditing,
}: {
  item: Item;
  editing: boolean;
  setEditing: (v: boolean) => void;
}) {
  const {
    now, act, setRelanceDate, rs, me, profileById, refLists,
    createNegligence, createNonConformite, setItemLate, negligenceByItem, nonConformiteByItem,
  } = useApp();
  const [cause, setCause] = useState(refLists.causes[0] ?? "");

  const canEdit = me.role === "agent" ? item.ownerId === me.id : true;
  const late = isLateByDuration(item, now);
  const deadline = customDeadline(item);
  const neg = negligenceByItem(item.id);
  const nc = nonConformiteByItem(item.id);
  const relanceValue = item.dateRelancePrevue
    ? toDayInput(new Date(item.dateRelancePrevue))
    : "";
  const owner = profileById(item.ownerId);
  const tl = [...item.timeline].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <Fil item={item} />
        <div className="flex items-center justify-between mt-3 text-[12px]">
          <span className="text-slate-500">
            Statut : <span className="font-medium text-slate-700">{item.statut}</span>
          </span>
          <span className="font-mono text-slate-400">{STATUTS[item.statut].pct}%</span>
        </div>
      </Card>

      {late && (
        <Card className="p-4 border-orange-300 bg-orange-50/70 ring-1 ring-orange-200">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-orange-800">
            <Clock size={16} /> Durée de traitement dépassée
          </div>
          <p className="text-[12px] text-orange-700 mt-1">
            {deadline
              ? `Échéance de traitement : ${fmt(deadline)} (durée acceptable : ${item.dueDurationDays} j).`
              : "Ce suivi a été marqué « En retard »."}
            {item.markedLate && deadline ? " · marqué en retard" : ""}
          </p>
          {canEdit && item.statut !== "Clôturé" && (
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <button onClick={() => act(item, "relance")} className="inline-flex items-center gap-1 text-[12px] font-medium bg-amber-100 text-amber-800 border border-amber-300 rounded-lg px-2.5 py-1.5 hover:bg-amber-200">
                <RotateCcw size={13} /> Relancer
              </button>
              {neg ? (
                <Link href={`/negligences/${neg.id}`} className="inline-flex items-center gap-1 text-[12px] font-medium text-rose-700 border border-rose-200 rounded-lg px-2.5 py-1.5 hover:bg-rose-50">
                  <ShieldAlert size={13} /> Voir la négligence
                </Link>
              ) : (
                <button onClick={() => createNegligence({ itemId: item.id })} className="inline-flex items-center gap-1 text-[12px] font-medium text-rose-700 border border-rose-200 rounded-lg px-2.5 py-1.5 hover:bg-rose-50">
                  <AlertOctagon size={13} /> Basculer en négligence
                </button>
              )}
              {nc ? (
                <Link href={`/non-conformites/${nc.id}`} className="inline-flex items-center gap-1 text-[12px] font-medium text-orange-700 border border-orange-300 rounded-lg px-2.5 py-1.5 hover:bg-orange-100">
                  <FileWarning size={13} /> Voir la non-conformité
                </Link>
              ) : (
                <button onClick={() => createNonConformite({ itemId: item.id })} className="inline-flex items-center gap-1 text-[12px] font-medium text-orange-700 border border-orange-300 rounded-lg px-2.5 py-1.5 hover:bg-orange-100">
                  <FileWarning size={13} /> Basculer en non-conformité
                </button>
              )}
              <button onClick={() => setItemLate(item, !item.markedLate)} className="inline-flex items-center gap-1 text-[12px] font-medium text-slate-600 border border-slate-300 rounded-lg px-2.5 py-1.5 hover:bg-slate-100">
                {item.markedLate ? "Lever le retard" : "Marquer « En retard »"}
              </button>
            </div>
          )}
        </Card>
      )}

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

      {editing ? (
        <EditSuivi item={item} onDone={() => setEditing(false)} />
      ) : (
        <>
          <Card className="p-3">
            <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-2">Personnes impliquées</div>
            <div className="space-y-1.5">
              {item.personnes.map((p, i) => (
                <div key={i} className="flex items-center gap-2 text-[12px]">
                  <UserCircle2 size={14} className="text-slate-400" />
                  <span className="text-slate-700">{p.name}</span>
                  {p.service && <span className="text-[10px] text-slate-400">· {p.service}</span>}
                  {p.email && <span className="text-[10px] text-slate-400 truncate">· {p.email}</span>}
                  <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 shrink-0">{p.kind}</span>
                </div>
              ))}
              {item.personnes.length === 0 && (
                <div className="text-[11px] text-slate-400">Aucune personne renseignée.</div>
              )}
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
        </>
      )}

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

      {/* Pièces jointes / preuves */}
      <Attachments itemId={item.id} canWrite={canEdit} />

      {/* Modèles de relance : aperçu + copie */}
      {item.statut !== "Clôturé" && <TemplatePicker item={item} />}

      {/* Discussion du suivi */}
      <Card className="p-3">
        <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-2">Discussion</div>
        <Discussion target={{ refType: "item", refId: item.id }} height="h-52" />
      </Card>
    </div>
  );
}

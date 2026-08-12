"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { GripVertical } from "lucide-react";
import { sameDay } from "@/lib/period";
import {
  dayDropId,
  dayKey,
  EVENT_KINDS,
  HOUR_SLOTS,
  slotId,
  type PlanEvent,
} from "@/lib/planning";

const DAY_NAMES = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

/** Chip d'événement déplaçable. */
export function DraggableEvent({
  e,
  onOpen,
  compact = false,
}: {
  e: PlanEvent;
  onOpen: (e: PlanEvent) => void;
  compact?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `ev:${e.id}`, data: { event: e } });
  const kind = EVENT_KINDS.find((k) => k.key === e.kind)!;
  const heure = e.timed ? e.date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : null;

  return (
    <div
      ref={setNodeRef}
      className={`group/ev flex items-center gap-1 rounded border px-1 py-0.5 bg-white dark:bg-slate-900 ${
        e.late ? "border-rose-300" : "border-slate-200 dark:border-slate-700"
      } ${isDragging ? "opacity-40" : ""}`}
    >
      {/* Poignée dédiée : le reste du chip reste cliquable pour ouvrir la fiche. */}
      <span
        {...listeners}
        {...attributes}
        className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 shrink-0"
        title="Glisser pour déplacer"
        aria-label={`Déplacer ${e.title}`}
      >
        <GripVertical size={11} />
      </span>
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${e.late ? "bg-rose-500" : kind.dot}`} />
      <button
        onClick={() => onOpen(e)}
        className={`flex-1 min-w-0 text-left truncate ${compact ? "text-[10.5px]" : "text-[11px]"} ${
          e.done ? "text-slate-400 line-through" : e.late ? "text-rose-600" : "text-slate-700 dark:text-slate-200"
        }`}
        title={`${e.title}${e.context ? ` — ${e.context}` : ""}`}
      >
        {heure && <span className="font-mono text-slate-400 mr-1">{heure}</span>}
        {e.title}
      </button>
    </div>
  );
}

/** Zone de dépôt (bandeau « toute la journée » ou créneau horaire). */
function DropZone({
  id,
  className,
  children,
}: {
  id: string;
  className: string;
  children?: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`${className} ${isOver ? "bg-emerald-50 dark:bg-emerald-500/10 ring-1 ring-emerald-300" : ""}`}>
      {children}
    </div>
  );
}

/**
 * Vue semaine en créneaux horaires.
 *
 * Deux natures d'objets cohabitent : les réunions ont une heure et se posent
 * dans la grille ; les échéances (tâches, projets) n'en ont pas et vivent dans
 * un bandeau « toute la journée ». On peut glisser les unes et les autres —
 * déposer sur un créneau donne une heure, déposer sur le bandeau n'en donne pas.
 */
export function PlanningWeek({
  days,
  eventsOf,
  now,
  onOpen,
  onCreate,
}: {
  days: Date[];
  eventsOf: (d: Date) => PlanEvent[];
  now: Date;
  onOpen: (e: PlanEvent) => void;
  onCreate: (d: Date, hour?: number) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[52rem]">
        {/* En-têtes de jours */}
        <div className="grid grid-cols-[3.5rem_repeat(7,1fr)] gap-1 mb-1">
          <div />
          {days.map((d, i) => {
            const isToday = sameDay(d, now);
            return (
              <div key={dayKey(d)} className={`text-center py-1 rounded-lg ${isToday ? "bg-emerald-50 dark:bg-emerald-500/10" : ""}`}>
                <div className="text-[11px] text-slate-400">{DAY_NAMES[i]}</div>
                <div className={`text-[13px] font-semibold ${isToday ? "text-emerald-700" : "text-slate-700 dark:text-slate-200"}`}>
                  {d.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bandeau « toute la journée » : échéances sans heure */}
        <div className="grid grid-cols-[3.5rem_repeat(7,1fr)] gap-1 mb-1">
          <div className="text-[10px] text-slate-400 text-right pr-1 pt-1">journée</div>
          {days.map((d) => {
            const allDay = eventsOf(d).filter((e) => !e.timed);
            return (
              <DropZone
                key={`allday-${dayKey(d)}`}
                id={dayDropId(d)}
                className="min-h-[3rem] rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/20 p-1 space-y-0.5 transition"
              >
                {allDay.map((e) => <DraggableEvent key={e.id} e={e} onOpen={onOpen} compact />)}
              </DropZone>
            );
          })}
        </div>

        {/* Grille horaire */}
        <div className="space-y-1">
          {HOUR_SLOTS.map((h) => (
            <div key={h} className="grid grid-cols-[3.5rem_repeat(7,1fr)] gap-1">
              <div className="text-[10.5px] text-slate-400 text-right pr-1 pt-1 font-mono">
                {String(h).padStart(2, "0")}:00
              </div>
              {days.map((d) => {
                const slotEvents = eventsOf(d).filter((e) => e.timed && e.date.getHours() === h);
                return (
                  <DropZone
                    key={slotId(d, h)}
                    id={slotId(d, h)}
                    className="group/slot relative min-h-[2.25rem] rounded-lg border border-slate-100 dark:border-slate-800 p-1 space-y-0.5 transition hover:border-slate-200"
                  >
                    {slotEvents.map((e) => <DraggableEvent key={e.id} e={e} onOpen={onOpen} compact />)}
                    {slotEvents.length === 0 && (
                      <button
                        onClick={() => onCreate(d, h)}
                        aria-label={`Créer à ${h}h le ${d.toLocaleDateString("fr-FR")}`}
                        title="Créer sur ce créneau"
                        className="absolute inset-0 w-full h-full opacity-0 group-hover/slot:opacity-100 grid place-items-center text-[11px] text-emerald-700 hover:bg-emerald-50/60 dark:hover:bg-emerald-500/5 rounded-lg transition"
                      >
                        +
                      </button>
                    )}
                  </DropZone>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

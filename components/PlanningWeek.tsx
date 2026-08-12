"use client";

import { useState } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { GripVertical } from "lucide-react";
import { formatDuration } from "@/lib/domain";
import { sameDay } from "@/lib/period";
import {
  dayDropId,
  dayKey,
  EVENT_KINDS,
  eventStartMinutes,
  MIN_DURATION,
  resizedDuration,
  RESIZE_STEP,
  positionEvents,
  SLOT_MINUTES,
  SLOTS,
  slotId,
  slotLabel,
  type PlanEvent,
} from "@/lib/planning";

const DAY_NAMES = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
/** Hauteur d'un créneau de 30 minutes, en pixels. */
const SLOT_H = 26;

/** Chip d'événement déplaçable (bandeau « journée » et vue mois). */
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

  return (
    <div
      ref={setNodeRef}
      className={`flex items-center gap-1 rounded border px-1 py-0.5 bg-white dark:bg-slate-900 ${
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
        {e.title}
      </button>
    </div>
  );
}

/** Bloc d'une réunion, dimensionné à sa durée réelle et redimensionnable. */
function TimedBlock({
  e,
  offset,
  span,
  lane,
  lanes,
  onOpen,
  onResize,
  canResize,
}: {
  e: PlanEvent;
  offset: number;
  span: number;
  lane: number;
  lanes: number;
  onOpen: (e: PlanEvent) => void;
  onResize: (e: PlanEvent, minutes: number) => void;
  canResize: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `ev:${e.id}`, data: { event: e } });
  // Durée affichée pendant le geste : le bloc suit la souris avant l'enregistrement.
  const [preview, setPreview] = useState<number | null>(null);
  const duree = preview ?? e.durationMinutes;
  const affSpan = preview !== null ? preview / SLOT_MINUTES : span;

  const debut = e.date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  // Sous ~45 min, le bloc est trop bas pour deux lignes de texte.
  const serre = affSpan <= 1.5;

  /**
   * Redimensionnement à la souris, en événements de pointeur bruts plutôt
   * qu'via dnd-kit : on veut suivre le curseur en continu, pas déposer sur
   * une cible. `setPointerCapture` garde le geste même si le curseur sort du
   * bloc, y compris hors de la colonne.
   */
  const startResize = (ev: React.PointerEvent) => {
    ev.preventDefault();
    ev.stopPropagation(); // ne pas déclencher le capteur de déplacement
    const startY = ev.clientY;
    const startDuration = e.durationMinutes;
    const startAt = eventStartMinutes(e);
    const el = ev.currentTarget as HTMLElement;
    el.setPointerCapture(ev.pointerId);

    const move = (m: PointerEvent) => {
      const deltaMinutes = ((m.clientY - startY) / SLOT_H) * SLOT_MINUTES;
      setPreview(resizedDuration(startDuration, deltaMinutes, startAt));
    };
    const up = (m: PointerEvent) => {
      el.releasePointerCapture(m.pointerId);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      const deltaMinutes = ((m.clientY - startY) / SLOT_H) * SLOT_MINUTES;
      const next = resizedDuration(startDuration, deltaMinutes, startAt);
      setPreview(null);
      if (next !== startDuration) onResize(e, next);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        top: offset * SLOT_H + 2,
        height: Math.max(SLOT_H - 4, affSpan * SLOT_H - 4),
        left: `calc(${(lane / lanes) * 100}% + 2px)`,
        width: `calc(${100 / lanes}% - 4px)`,
      }}
      className={`group/blk absolute rounded-md border px-1 py-0.5 overflow-hidden ${
        e.done
          ? "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
          : "bg-amber-50 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/40"
      } ${isDragging ? "opacity-40" : ""} ${preview !== null ? "ring-1 ring-amber-400" : ""}`}
    >
      <div className="flex items-start gap-0.5">
        <span
          {...listeners}
          {...attributes}
          className="cursor-grab active:cursor-grabbing text-amber-400 hover:text-amber-600 shrink-0"
          title="Glisser pour déplacer"
          aria-label={`Déplacer ${e.title}`}
        >
          <GripVertical size={11} />
        </span>
        <button onClick={() => onOpen(e)} className="flex-1 min-w-0 text-left">
          <div className={`text-[10.5px] leading-tight truncate ${e.done ? "text-slate-400 line-through" : "text-amber-900 dark:text-amber-200"}`}>
            {serre && <span className="font-mono mr-1">{debut}</span>}
            {e.title}
          </div>
          {!serre && (
            <div className="text-[9.5px] text-amber-700/80 dark:text-amber-300/70 font-mono">
              {debut} · {formatDuration(duree)}
            </div>
          )}
        </button>
      </div>

      {canResize && (
        <div
          onPointerDown={startResize}
          role="slider"
          tabIndex={0}
          aria-label={`Durée de ${e.title}`}
          aria-valuemin={MIN_DURATION}
          aria-valuenow={duree}
          aria-valuetext={formatDuration(duree)}
          onKeyDown={(k) => {
            // Accessible au clavier : flèches haut/bas par pas de 15 minutes.
            if (k.key !== "ArrowUp" && k.key !== "ArrowDown") return;
            k.preventDefault();
            const next = resizedDuration(e.durationMinutes, k.key === "ArrowDown" ? RESIZE_STEP : -RESIZE_STEP, eventStartMinutes(e));
            if (next !== e.durationMinutes) onResize(e, next);
          }}
          title="Tirer pour changer la durée"
          className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize flex items-end justify-center"
        >
          <span className="h-1 w-6 rounded-full bg-amber-400/60 opacity-0 group-hover/blk:opacity-100 transition-opacity mb-0.5" />
        </div>
      )}

      {preview !== null && (
        <span className="absolute right-1 bottom-1 text-[9.5px] font-mono text-amber-800 dark:text-amber-200 bg-white/80 dark:bg-slate-900/80 rounded px-1">
          {formatDuration(duree)}
        </span>
      )}
    </div>
  );
}

/** Zone de dépôt d'un créneau, en fond de colonne. */
function SlotZone({ id, top, onCreate }: { id: string; top: number; onCreate: () => void }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const demiHeure = top % 60 !== 0;
  return (
    <div
      ref={setNodeRef}
      style={{ top: (top - SLOTS[0]) / SLOT_MINUTES * SLOT_H, height: SLOT_H }}
      className={`absolute inset-x-0 group/slot border-t ${
        demiHeure ? "border-slate-50 dark:border-slate-800/50" : "border-slate-100 dark:border-slate-800"
      } ${isOver ? "bg-emerald-100/70 dark:bg-emerald-500/15" : ""}`}
    >
      <button
        onClick={onCreate}
        aria-label={`Créer à ${slotLabel(top)}`}
        title={`Créer à ${slotLabel(top)}`}
        className="w-full h-full opacity-0 group-hover/slot:opacity-100 text-[10px] text-emerald-700 hover:bg-emerald-50/60 dark:hover:bg-emerald-500/5 transition"
      >
        +
      </button>
    </div>
  );
}

/**
 * Vue semaine en créneaux de 30 minutes.
 *
 * Deux natures d'objets cohabitent : les réunions ont une heure et une durée,
 * et occupent un bloc à leur taille réelle ; les échéances (tâches, projets)
 * n'ont pas d'heure et vivent dans un bandeau « journée ». Les réunions qui se
 * chevauchent se partagent la largeur plutôt que de se masquer.
 */
export function PlanningWeek({
  days,
  eventsOf,
  now,
  onOpen,
  onCreate,
  onResize,
  canResize,
}: {
  days: Date[];
  eventsOf: (d: Date) => PlanEvent[];
  now: Date;
  onOpen: (e: PlanEvent) => void;
  onCreate: (d: Date, minutes?: number) => void;
  onResize: (e: PlanEvent, minutes: number) => void;
  canResize: boolean;
}) {
  const gridHeight = SLOTS.length * SLOT_H;

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

        {/* Bandeau « journée » : échéances sans heure */}
        <div className="grid grid-cols-[3.5rem_repeat(7,1fr)] gap-1 mb-1">
          <div className="text-[10px] text-slate-400 text-right pr-1 pt-1">journée</div>
          {days.map((d) => (
            <AllDayZone key={`allday-${dayKey(d)}`} d={d} events={eventsOf(d).filter((e) => !e.timed)} onOpen={onOpen} />
          ))}
        </div>

        {/* Grille horaire */}
        <div className="grid grid-cols-[3.5rem_repeat(7,1fr)] gap-1">
          {/* Colonne des heures : un libellé par heure pleine */}
          <div className="relative" style={{ height: gridHeight }}>
            {SLOTS.filter((m) => m % 60 === 0).map((m) => (
              <div
                key={m}
                style={{ top: ((m - SLOTS[0]) / SLOT_MINUTES) * SLOT_H }}
                className="absolute right-1 -translate-y-1/2 text-[10.5px] text-slate-400 font-mono"
              >
                {slotLabel(m)}
              </div>
            ))}
          </div>

          {days.map((d) => {
            const positioned = positionEvents(eventsOf(d));
            return (
              <div
                key={`col-${dayKey(d)}`}
                className="relative rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900"
                style={{ height: gridHeight }}
              >
                {SLOTS.map((m) => (
                  <SlotZone key={slotId(d, m)} id={slotId(d, m)} top={m} onCreate={() => onCreate(d, m)} />
                ))}
                {positioned.map((p) => (
                  <TimedBlock
                    key={p.event.id}
                    e={p.event}
                    offset={p.offset}
                    span={p.span}
                    lane={p.lane}
                    lanes={p.lanes}
                    onOpen={onOpen}
                    onResize={onResize}
                    canResize={canResize}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AllDayZone({ d, events, onOpen }: { d: Date; events: PlanEvent[]; onOpen: (e: PlanEvent) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: dayDropId(d) });
  return (
    <div
      ref={setNodeRef}
      className={`min-h-[3rem] rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/20 p-1 space-y-0.5 transition ${
        isOver ? "bg-emerald-50 dark:bg-emerald-500/10 ring-1 ring-emerald-300" : ""
      }`}
    >
      {events.map((e) => (
        <DraggableEvent key={e.id} e={e} onOpen={onOpen} compact />
      ))}
    </div>
  );
}

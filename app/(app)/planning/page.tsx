"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, LayoutList, Plus, Rows3 } from "lucide-react";
import { fmt, isPublished } from "@/lib/domain";
import { sameDay, startOfDay, toDayInput } from "@/lib/period";
import { buildPlanEvents, EVENT_KINDS, groupByDay, inMonth, monthGrid, weekGrid, type PlanEvent, type PlanEventKind } from "@/lib/planning";
import { useApp } from "@/components/app-context";
import { Avatar, Card } from "@/components/atoms";
import { EmptyState } from "@/components/EmptyState";
import { PageHero } from "@/components/PageHero";
import { QuickCreateModal } from "@/components/QuickCreateModal";

type ViewMode = "mois" | "semaine" | "liste";

const DAY_NAMES = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export default function PlanningPage() {
  const { tasks: allTasks, projects: allProjects, meetings, profiles, me, now, profileById, setOpenTaskId } = useApp();

  const tasks = useMemo(() => allTasks.filter(isPublished), [allTasks]);
  const projects = useMemo(() => allProjects.filter(isPublished), [allProjects]);

  const [view, setView] = useState<ViewMode>("mois");
  const [anchor, setAnchor] = useState<Date>(() => startOfDay(now));
  const [person, setPerson] = useState<string>("");
  const [kinds, setKinds] = useState<PlanEventKind[]>(EVENT_KINDS.map((k) => k.key));
  const [hideDone, setHideDone] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  /** Jour pour lequel on ouvre la création (clic sur « + », ou double-clic). */
  const [createOn, setCreateOn] = useState<Date | null>(null);

  const allEvents = useMemo(
    () => buildPlanEvents({ tasks, projects, meetings, now }),
    [tasks, projects, meetings, now]
  );

  const events = useMemo(
    () =>
      allEvents.filter(
        (e) =>
          kinds.includes(e.kind) &&
          (!person || e.personId === person) &&
          (!hideDone || !e.done)
      ),
    [allEvents, kinds, person, hideDone]
  );

  const byDay = useMemo(() => groupByDay(events), [events]);
  const eventsOf = (d: Date) => byDay.get(toDayInput(d)) ?? [];

  const days = view === "semaine" ? weekGrid(anchor) : monthGrid(anchor);

  // Vue liste : les échéances à venir (et les retards), à partir d'aujourd'hui.
  const upcoming = useMemo(() => {
    const today = startOfDay(now).getTime();
    return events.filter((e) => e.late || e.date.getTime() >= today).slice(0, 200);
  }, [events, now]);

  const shift = (dir: -1 | 1) => {
    const d = new Date(anchor);
    if (view === "semaine") d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setAnchor(startOfDay(d));
    setSelectedDay(null);
  };

  const toggleKind = (k: PlanEventKind) =>
    setKinds((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));

  const heading =
    view === "semaine"
      ? `Semaine du ${days[0].toLocaleDateString("fr-FR", { day: "2-digit", month: "long" })}`
      : anchor.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  const counts = useMemo(() => {
    const late = events.filter((e) => e.late).length;
    const today = events.filter((e) => sameDay(e.date, now) && !e.done).length;
    return { late, today, total: events.length };
  }, [events, now]);

  const VIEWS: { id: ViewMode; label: string; icon: typeof Rows3 }[] = [
    { id: "mois", label: "Mois", icon: CalendarDays },
    { id: "semaine", label: "Semaine", icon: Rows3 },
    { id: "liste", label: "Liste", icon: LayoutList },
  ];

  return (
    <div className="space-y-5 animate-float">
      <PageHero
        kicker="Vue temporelle"
        icon={CalendarDays}
        title="Planning"
        subtitle="Toutes les échéances au même endroit : tâches, tâches de projet, projets et réunions."
        right={
          <>
            <button
              onClick={() => setCreateOn(selectedDay ?? now)}
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-slate-900 dark:bg-emerald-600 rounded-xl px-3.5 py-2 hover:-translate-y-0.5 transition-transform shadow-soft"
            >
              <Plus size={16} /> Nouveau
            </button>
            <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 text-[12px] bg-white dark:bg-slate-900">
              {VIEWS.map((v) => (
              <button
                key={v.id}
                onClick={() => setView(v.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-medium transition ${
                  view === v.id ? "bg-emerald-600 text-white" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <v.icon size={14} />
                <span className="hidden sm:inline">{v.label}</span>
              </button>
              ))}
            </div>
          </>
        }
      />

      {/* Barre de contrôle */}
      <Card className="p-3 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          {view !== "liste" && (
            <>
              <button onClick={() => shift(-1)} aria-label="Période précédente" className="text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg p-1.5">
                <ChevronLeft size={15} />
              </button>
              <button onClick={() => shift(1)} aria-label="Période suivante" className="text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg p-1.5">
                <ChevronRight size={15} />
              </button>
              <span className="text-[13.5px] font-semibold text-slate-800 capitalize min-w-[11rem]">{heading}</span>
              <button
                onClick={() => {
                  setAnchor(startOfDay(now));
                  setSelectedDay(null);
                }}
                className="text-[12px] text-slate-600 border border-slate-200 rounded-lg px-2.5 py-1 hover:bg-slate-50"
              >
                Aujourd&apos;hui
              </button>
            </>
          )}
          <select
            value={person}
            onChange={(e) => setPerson(e.target.value)}
            aria-label="Filtrer par personne"
            className="text-[12px] border border-slate-200 rounded-lg px-2 py-1 bg-white ml-auto"
          >
            <option value="">Toute l&apos;équipe</option>
            <option value={me.id}>Moi</option>
            {profiles.filter((p) => p.id !== me.id).map((p) => (
              <option key={p.id} value={p.id}>{p.nom}</option>
            ))}
          </select>
          <label className="inline-flex items-center gap-1.5 text-[12px] text-slate-600 cursor-pointer">
            <input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} className="h-3.5 w-3.5 accent-emerald-600" />
            Masquer ce qui est fait
          </label>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-100 dark:border-slate-800">
          {EVENT_KINDS.map((k) => (
            <button
              key={k.key}
              onClick={() => toggleKind(k.key)}
              aria-pressed={kinds.includes(k.key)}
              className={`inline-flex items-center gap-1.5 text-[11.5px] rounded-full border px-2.5 py-1 transition ${
                kinds.includes(k.key) ? k.chip : "bg-white dark:bg-slate-900 border-slate-200 text-slate-400"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${kinds.includes(k.key) ? k.dot : "bg-slate-300"}`} />
              {k.label}
            </button>
          ))}
          <span className="ml-auto text-[11.5px] text-slate-400">
            {counts.total} échéance{counts.total > 1 ? "s" : ""}
            {counts.today > 0 && <span className="text-slate-600"> · {counts.today} aujourd&apos;hui</span>}
            {counts.late > 0 && <span className="text-rose-600 font-medium"> · {counts.late} en retard</span>}
          </span>
        </div>
      </Card>

      {view === "liste" ? (
        <Card>
          {upcoming.length === 0 ? (
            <EmptyState icon={CalendarDays} title="Rien à l'horizon" subtitle="Aucune échéance ne correspond aux filtres actifs." compact />
          ) : (
            <div className="divide-y divide-slate-100">
              {upcoming.map((e) => (
                <EventRow key={e.id} e={e} onOpenTask={setOpenTaskId} profileById={profileById} showDate />
              ))}
            </div>
          )}
        </Card>
      ) : (
        <>
          <Card className="p-2">
            <div className="grid grid-cols-7 gap-1 mb-1">
              {DAY_NAMES.map((d) => (
                <div key={d} className="text-[11px] font-medium text-slate-400 text-center py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {days.map((d) => {
                const dayEvents = eventsOf(d);
                const isToday = sameDay(d, now);
                const dim = view === "mois" && !inMonth(d, anchor);
                const isSelected = selectedDay && sameDay(d, selectedDay);
                return (
                  <button
                    key={d.toISOString()}
                    onClick={() => setSelectedDay(isSelected ? null : d)}
                    onDoubleClick={() => setCreateOn(d)}
                    title="Cliquer pour voir le détail, double-cliquer pour créer"
                    className={`relative group text-left rounded-lg border p-1.5 transition ${
                      view === "semaine" ? "min-h-[8rem]" : "min-h-[5.5rem]"
                    } ${
                      isSelected
                        ? "border-emerald-400 bg-emerald-50/60"
                        : isToday
                          ? "border-emerald-300 bg-emerald-50/30"
                          : "border-slate-100 hover:border-slate-200 bg-white dark:bg-slate-900"
                    } ${dim ? "opacity-40" : ""}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[11.5px] font-medium ${isToday ? "text-emerald-700" : "text-slate-500"}`}>
                        {d.getDate()}
                      </span>
                      {dayEvents.length > 0 && (
                        <span className="text-[10px] text-slate-400 group-hover:hidden">{dayEvents.length}</span>
                      )}
                      {/* Créer directement sur ce jour — la date est reprise dans le formulaire. */}
                      <span
                        role="button"
                        tabIndex={0}
                        aria-label={`Créer un élément le ${d.toLocaleDateString("fr-FR")}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCreateOn(d);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            e.stopPropagation();
                            setCreateOn(d);
                          }
                        }}
                        className="hidden group-hover:grid place-items-center h-4 w-4 rounded text-emerald-700 hover:bg-emerald-100 cursor-pointer"
                        title="Créer une tâche ou une réunion ce jour-là"
                      >
                        <Plus size={12} />
                      </span>
                    </div>
                    <div className="space-y-0.5 mt-1">
                      {dayEvents.slice(0, view === "semaine" ? 6 : 3).map((e) => {
                        const kind = EVENT_KINDS.find((k) => k.key === e.kind)!;
                        return (
                          <div key={e.id} className="flex items-center gap-1 min-w-0">
                            <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${e.late ? "bg-rose-500" : kind.dot}`} />
                            <span className={`text-[10.5px] truncate ${e.done ? "text-slate-400 line-through" : e.late ? "text-rose-600" : "text-slate-600"}`}>
                              {e.title}
                            </span>
                          </div>
                        );
                      })}
                      {dayEvents.length > (view === "semaine" ? 6 : 3) && (
                        <div className="text-[10px] text-slate-400">+ {dayEvents.length - (view === "semaine" ? 6 : 3)} autre(s)</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Détail du jour sélectionné */}
          {selectedDay && (
            <div>
              <h2 className="text-[13px] font-semibold text-slate-700 uppercase tracking-wide mb-2">
                {selectedDay.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long" })}
              </h2>
              <Card>
                {eventsOf(selectedDay).length === 0 ? (
                  <div className="p-6 text-center text-[13px] text-slate-400">Aucune échéance ce jour-là.</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {eventsOf(selectedDay).map((e) => (
                      <EventRow key={e.id} e={e} onOpenTask={setOpenTaskId} profileById={profileById} />
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}
        </>
      )}

      {createOn && <QuickCreateModal day={createOn} onClose={() => setCreateOn(null)} />}
    </div>
  );
}

function EventRow({
  e,
  onOpenTask,
  profileById,
  showDate = false,
}: {
  e: PlanEvent;
  onOpenTask: (id: string) => void;
  profileById: (id: string) => { nom: string; init: string };
  showDate?: boolean;
}) {
  const kind = EVENT_KINDS.find((k) => k.key === e.kind)!;
  const who = e.personId ? profileById(e.personId) : null;

  const body = (
    <div className="flex items-center gap-2.5 px-4 py-2.5 w-full">
      <span className={`h-2 w-2 rounded-full shrink-0 ${e.late ? "bg-rose-500" : kind.dot}`} />
      <div className="flex-1 min-w-0">
        <div className={`text-[13px] truncate ${e.done ? "text-slate-400 line-through" : "text-slate-800"}`}>{e.title}</div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 flex-wrap">
          <span>{kind.label}</span>
          {e.context && <span>· {e.context}</span>}
          {e.late && <span className="text-rose-600 font-medium">· en retard</span>}
        </div>
      </div>
      {who && (
        <span className="hidden sm:flex items-center gap-1 text-[11px] text-slate-500 shrink-0">
          <Avatar init={who.init} size="h-5 w-5" /> {who.nom}
        </span>
      )}
      {showDate && <span className={`text-[11px] shrink-0 ${e.late ? "text-rose-600 font-medium" : "text-slate-400"}`}>{fmt(e.date)}</span>}
    </div>
  );

  if (e.taskId) {
    return (
      <button onClick={() => onOpenTask(e.taskId!)} className="w-full text-left hover:bg-slate-50 dark:hover:bg-slate-800/40">
        {body}
      </button>
    );
  }
  if (e.href) {
    return (
      <Link href={e.href} className="block hover:bg-slate-50 dark:hover:bg-slate-800/40">
        {body}
      </Link>
    );
  }
  return body;
}

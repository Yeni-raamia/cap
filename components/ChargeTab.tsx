"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, Gauge, HelpCircle } from "lucide-react";
import { fmt, formatWorkload, isPublished } from "@/lib/domain";
import { startOfWeek } from "@/lib/period";
import {
  buildWorkload,
  loadLevel,
  loadRatio,
  WEEK_CAPACITY_MINUTES,
  weeksFrom,
  type CellLoad,
  type LoadItem,
} from "@/lib/workload";
import { useApp } from "./app-context";
import { Avatar, Card } from "./atoms";

const WEEKS_SHOWN = 6;

const LEVEL_STYLE: Record<string, string> = {
  vide: "bg-slate-50 dark:bg-slate-800/30 text-slate-300",
  normal: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30",
  charge: "bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-500/40",
  surcharge: "bg-rose-100 dark:bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-500/40",
};

/**
 * Charge prévisionnelle : qui est chargé, et quand.
 *
 * La lecture repose sur les estimations saisies. Les tâches non estimées ne
 * sont pas comptées en minutes — elles apparaissent en nombre, pour qu'une
 * semaine pleine de travail non chiffré ne passe pas pour une semaine calme.
 */
export function ChargeTab() {
  const { tasks: allTasks, projects: allProjects, profiles, now, profileById, setOpenTaskId } = useApp();

  const tasks = useMemo(() => allTasks.filter(isPublished), [allTasks]);
  const projects = useMemo(() => allProjects.filter(isPublished), [allProjects]);

  const [offset, setOffset] = useState(0); // en semaines, depuis la semaine en cours
  const [open, setOpen] = useState<{ personId: string; label: string; items: LoadItem[] } | null>(null);

  const anchor = useMemo(() => {
    const d = startOfWeek(now);
    d.setDate(d.getDate() + offset * 7);
    return d;
  }, [now, offset]);

  const weeks = useMemo(() => weeksFrom(anchor, WEEKS_SHOWN, now), [anchor, now]);
  const people = useMemo(() => profiles.filter((p) => p.id).map((p) => p.id), [profiles]);
  const rows = useMemo(
    () => buildWorkload({ people, tasks, projects, weeks, now }),
    [people, tasks, projects, weeks, now]
  );

  // Repères d'équipe sur la période affichée.
  const resume = useMemo(() => {
    let surcharges = 0;
    let nonEstimees = 0;
    let retard = 0;
    rows.forEach((r) => {
      r.cells.forEach((c) => {
        if (loadLevel(c) === "surcharge") surcharges += 1;
        nonEstimees += c.unestimated;
      });
      nonEstimees += r.undated.unestimated + r.overdue.unestimated;
      retard += r.overdue.items.length;
    });
    return { surcharges, nonEstimees, retard };
  }, [rows]);

  const cellLabel = (c: CellLoad) => {
    if (c.estimated === 0 && c.unestimated === 0) return "—";
    if (c.estimated === 0) return `${c.unestimated} ?`;
    return formatWorkload(c.minutes);
  };

  return (
    <div className="space-y-4">
      {/* Repères */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="text-2xl font-semibold text-slate-800 dark:text-slate-100">{formatWorkload(WEEK_CAPACITY_MINUTES)}</div>
          <div className="text-[12px] text-slate-500">Capacité par personne et par semaine</div>
        </Card>
        <Card className="p-4">
          <div className={`text-2xl font-semibold ${resume.surcharges ? "text-rose-600" : "text-emerald-600"}`}>{resume.surcharges}</div>
          <div className="text-[12px] text-slate-500">Semaines en surcharge</div>
        </Card>
        <Card className="p-4">
          <div className={`text-2xl font-semibold ${resume.nonEstimees ? "text-amber-600" : "text-slate-800 dark:text-slate-100"}`}>{resume.nonEstimees}</div>
          <div className="text-[12px] text-slate-500">Travaux non estimés</div>
        </Card>
        <Card className="p-4">
          <div className={`text-2xl font-semibold ${resume.retard ? "text-rose-600" : "text-slate-800 dark:text-slate-100"}`}>{resume.retard}</div>
          <div className="text-[12px] text-slate-500">Déjà en retard</div>
        </Card>
      </div>

      {resume.nonEstimees > 0 && (
        <div className="flex items-start gap-2 text-[12px] text-amber-900 dark:text-amber-200 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl px-3 py-2">
          <HelpCircle size={15} className="mt-0.5 shrink-0" />
          <span>
            <b>{resume.nonEstimees} travaux ne sont pas estimés</b> et ne comptent donc pas dans les minutes affichées : ils
            apparaissent sous la forme « <span className="font-mono">n ?</span> ». Une semaine peut sembler calme et ne pas
            l&apos;être — renseignez la charge estimée dans la fiche des tâches concernées.
          </span>
        </div>
      )}

      {/* Navigation dans le temps */}
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => setOffset((o) => o - 1)} aria-label="Semaines précédentes" className="text-slate-500 hover:text-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5">
          <ChevronLeft size={15} />
        </button>
        <button onClick={() => setOffset((o) => o + 1)} aria-label="Semaines suivantes" className="text-slate-500 hover:text-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5">
          <ChevronRight size={15} />
        </button>
        {offset !== 0 && (
          <button onClick={() => setOffset(0)} className="text-[12px] text-slate-600 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 hover:bg-slate-50">
            Revenir à cette semaine
          </button>
        )}
        <span className="text-[12px] text-slate-400 ml-auto inline-flex items-center gap-1">
          <Gauge size={13} /> vert &lt; 80 % · orange ≥ 80 % · rouge &gt; 100 % de la capacité
        </span>
      </div>

      {/* Grille personnes × semaines */}
      <Card className="overflow-x-auto">
        <table className="w-full text-[12px] min-w-[54rem]">
          <thead className="text-slate-400 border-b border-slate-100 dark:border-slate-800">
            <tr className="text-left">
              <th className="px-3 py-2 font-medium sticky left-0 bg-white dark:bg-slate-900">Personne</th>
              <th className="px-2 py-2 font-medium text-center" title="Travaux en retard, antérieurs aux semaines affichées">Retard</th>
              {weeks.map((w) => (
                <th key={w.key} className={`px-2 py-2 font-medium text-center ${w.isCurrent ? "text-emerald-700" : ""}`}>
                  <div>S{w.weekNumber}</div>
                  <div className="text-[10px] font-normal">{w.label}</div>
                </th>
              ))}
              <th className="px-2 py-2 font-medium text-center" title="Travaux sans échéance : ils n'appartiennent à aucune semaine">Sans date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
            {rows.map((row) => {
              const p = profileById(row.personId);
              return (
                <tr key={row.personId}>
                  <td className="px-3 py-2 sticky left-0 bg-white dark:bg-slate-900">
                    <div className="flex items-center gap-2">
                      <Avatar init={p.init} size="h-7 w-7" />
                      <div className="min-w-0">
                        <div className="font-medium text-slate-800 dark:text-slate-100 truncate">{p.nom}</div>
                        <div className="text-[10px] text-slate-400">{p.poste || p.role}</div>
                      </div>
                    </div>
                  </td>

                  <Cell
                    cell={row.overdue}
                    tone={row.overdue.items.length ? "bg-rose-100 text-rose-800 border-rose-300" : ""}
                    onOpen={() => setOpen({ personId: row.personId, label: "En retard", items: row.overdue.items })}
                    label={cellLabel(row.overdue)}
                  />

                  {row.cells.map((c, i) => {
                    const lvl = loadLevel(c);
                    const pct = Math.round(loadRatio(c.minutes) * 100);
                    return (
                      <Cell
                        key={weeks[i].key}
                        cell={c}
                        tone={`${LEVEL_STYLE[lvl]} ${weeks[i].isCurrent ? "ring-1 ring-emerald-300" : ""}`}
                        label={cellLabel(c)}
                        sub={c.estimated > 0 ? `${pct} %` : undefined}
                        onOpen={() => setOpen({ personId: row.personId, label: `Semaine ${weeks[i].weekNumber}`, items: c.items })}
                      />
                    );
                  })}

                  <Cell
                    cell={row.undated}
                    tone={row.undated.items.length ? "bg-slate-100 text-slate-700 border-slate-300" : ""}
                    label={cellLabel(row.undated)}
                    onOpen={() => setOpen({ personId: row.personId, label: "Sans échéance", items: row.undated.items })}
                  />
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={weeks.length + 3} className="px-3 py-6 text-center text-slate-400">Aucun membre.</td></tr>
            )}
          </tbody>
        </table>
      </Card>

      {/* Détail d'une case */}
      {open && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Avatar init={profileById(open.personId).init} size="h-7 w-7" />
            <span className="text-[13.5px] font-semibold text-slate-800 dark:text-slate-100">
              {profileById(open.personId).nom} · {open.label}
            </span>
            <span className="text-[12px] text-slate-400">{open.items.length} travaux</span>
            <button onClick={() => setOpen(null)} className="ml-auto text-[12px] text-slate-500 hover:text-slate-700">Fermer</button>
          </div>
          {open.items.length === 0 ? (
            <div className="text-[12.5px] text-slate-400 py-2">Rien sur cette période.</div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {open.items.map((it) => (
                <div key={`${it.kind}-${it.id}`} className="flex items-center gap-2 py-1.5">
                  <span className={`h-2 w-2 rounded-full shrink-0 ${it.kind === "tache" ? "bg-violet-500" : "bg-sky-500"}`} />
                  {it.kind === "tache" ? (
                    <button onClick={() => setOpenTaskId(it.id)} className="flex-1 min-w-0 text-left text-[13px] text-slate-800 dark:text-slate-100 truncate hover:text-violet-700">
                      {it.title}
                    </button>
                  ) : (
                    <span className="flex-1 min-w-0 text-[13px] text-slate-800 dark:text-slate-100 truncate">
                      {it.title}
                      {it.context && <span className="text-[11px] text-emerald-700"> · {it.context}</span>}
                    </span>
                  )}
                  {it.late && <AlertTriangle size={13} className="text-rose-500 shrink-0" aria-label="En retard" />}
                  {it.dueDate && <span className="text-[11px] text-slate-400 shrink-0">{fmt(it.dueDate)}</span>}
                  <span className={`text-[11.5px] font-mono shrink-0 ${it.minutes === null ? "text-amber-600" : "text-slate-600"}`}>
                    {it.minutes === null ? "non estimée" : formatWorkload(it.minutes)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function Cell({
  cell,
  tone,
  label,
  sub,
  onOpen,
}: {
  cell: CellLoad;
  tone: string;
  label: string;
  sub?: string;
  onOpen: () => void;
}) {
  const vide = cell.items.length === 0;
  return (
    <td className="px-1 py-1.5 text-center">
      <button
        onClick={onOpen}
        disabled={vide}
        className={`w-full rounded-lg border px-1.5 py-1 transition ${vide ? "border-transparent text-slate-300" : `${tone} hover:brightness-95`}`}
        title={vide ? undefined : `${cell.estimated} estimé(s), ${cell.unestimated} non estimé(s)`}
      >
        <div className="font-medium tabular-nums">{label}</div>
        {sub && <div className="text-[9.5px] opacity-70 tabular-nums">{sub}</div>}
        {cell.unestimated > 0 && cell.estimated > 0 && (
          <div className="text-[9.5px] text-amber-700 dark:text-amber-300">+{cell.unestimated} ?</div>
        )}
      </button>
    </td>
  );
}

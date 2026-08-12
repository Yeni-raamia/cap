"use client";

import { useState } from "react";
import { Pause, Pencil, Play, Plus, Repeat, Users2 } from "lucide-react";
import { RECURRENCE_ASSIGN_MODES, type TaskRecurrence } from "@/lib/domain";
import { describeFrequency, nextOccurrence } from "@/lib/recurrence";
import { useApp } from "./app-context";
import { Avatar, Card } from "./atoms";
import { RecurrenceModal } from "./RecurrenceModal";

/**
 * Liste des tâches récurrentes (gabarits) : rythme, mode d'attribution,
 * prochaine occurrence, activation/suspension et édition.
 */
export function RecurrencesPanel() {
  const { recurrences, recurrenceCounts, me, now, profileById, recurrenceAction } = useApp();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TaskRecurrence | null>(null);
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const run = async (p: Promise<string | null>) => {
    const e = await p;
    setErr(e);
  };

  const canEdit = (r: TaskRecurrence) =>
    r.createdBy === me.id || ["manager", "directeur", "admin"].includes(me.role);

  const activeCount = recurrences.filter((r) => r.active).length;

  return (
    <div>
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <Repeat size={15} className="text-violet-500" />
        <h2 className="text-[13px] font-semibold text-slate-700 uppercase tracking-wide">Tâches récurrentes</h2>
        <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">{activeCount}</span>
        <button
          onClick={() => setOpen((v) => !v)}
          className="text-[12px] text-slate-500 hover:text-slate-700 underline decoration-dotted"
        >
          {open ? "Masquer" : "Afficher"}
        </button>
        <button
          onClick={() => {
            setOpen(true);
            setCreating(true);
          }}
          className="ml-auto inline-flex items-center gap-1 text-[12px] font-medium text-violet-700 border border-violet-200 hover:bg-violet-50 rounded-lg px-2.5 py-1.5"
        >
          <Plus size={14} /> Nouvelle série
        </button>
      </div>

      {open && (
        <Card>
          {err && <div className="m-3 text-[12px] text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{err}</div>}
          {recurrences.length === 0 ? (
            <div className="p-6 text-center text-[13px] text-slate-400">
              Aucune tâche récurrente. Créez-en une pour les travaux à refaire chaque jour, chaque semaine ou chaque mois.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recurrences.map((r) => {
                const counts = recurrenceCounts[r.id] ?? { total: 0, open: 0 };
                const next = nextOccurrence(r, now);
                const mode = RECURRENCE_ASSIGN_MODES.find((m) => m.key === r.assignMode);
                const who = r.assignMode === "fixe" && r.assigneeId ? profileById(r.assigneeId) : null;
                return (
                  <div key={r.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className={`h-2 w-2 rounded-full shrink-0 ${r.active ? "bg-emerald-500" : "bg-slate-300"}`} title={r.active ? "Active" : "Suspendue"} />
                    <div className="flex-1 min-w-0">
                      <div className={`text-[13px] truncate ${r.active ? "text-slate-800 dark:text-slate-100" : "text-slate-400"}`}>
                        {r.title}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 flex-wrap">
                        <span>{describeFrequency(r)}</span>
                        <span>· {mode?.label}</span>
                        {who && <span className="inline-flex items-center gap-1">· <Avatar init={who.init} size="h-4 w-4" /> {who.nom}</span>}
                        {r.assignMode === "rotation" && (
                          <span className="inline-flex items-center gap-1">
                            · <Users2 size={11} /> {r.rotationIds.length} personne{r.rotationIds.length > 1 ? "s" : ""}
                          </span>
                        )}
                        {counts.total > 0 && <span>· {counts.total} engendrée{counts.total > 1 ? "s" : ""}{counts.open > 0 && `, ${counts.open} à faire`}</span>}
                        {r.active && next && <span className="text-violet-600">· prochaine {next.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}</span>}
                        {r.active && !next && <span>· série achevée</span>}
                        {!r.active && <span className="text-amber-600">· suspendue</span>}
                      </div>
                    </div>
                    {canEdit(r) && (
                      <>
                        <button
                          onClick={() => run(recurrenceAction("toggle", { id: r.id }))}
                          title={r.active ? "Suspendre la série" : "Réactiver la série"}
                          aria-label={r.active ? "Suspendre" : "Réactiver"}
                          className="text-slate-300 hover:text-amber-600"
                        >
                          {r.active ? <Pause size={15} /> : <Play size={15} />}
                        </button>
                        <button
                          onClick={() => setEditing(r)}
                          title="Modifier"
                          aria-label="Modifier"
                          className="text-slate-300 hover:text-emerald-600"
                        >
                          <Pencil size={15} />
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
            Les occurrences naissent le jour prévu, à l&apos;ouverture de l&apos;application ou au passage des rappels.
            Après une longue interruption, seuls les 14 derniers jours sont rattrapés.
          </div>
        </Card>
      )}

      {(creating || editing) && (
        <RecurrenceModal
          recurrence={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { CalendarDays, ListTodo, Plus, X } from "lucide-react";
import { MEETING_STATUTS, type MeetingStatus } from "@/lib/domain";
import { toDayInput } from "@/lib/period";
import { useApp } from "./app-context";
import { NewTaskForm } from "./NewTaskForm";

type Kind = "tache" | "reunion";

/**
 * Création rapide depuis n'importe où — bandeau d'accueil, planning.
 *
 * Le formulaire s'ouvre directement, entièrement paramétrable : on ne clique
 * pas sur un bouton pour atterrir sur un champ vide qu'il faut ensuite aller
 * compléter ailleurs. Une date peut être imposée (clic sur une case du
 * calendrier), auquel cas elle pré-remplit les deux formulaires.
 */
export function QuickCreateModal({
  day,
  defaultKind = "tache",
  onClose,
}: {
  /** Jour choisi dans le planning ; par défaut, aujourd'hui. */
  day?: Date | null;
  defaultKind?: Kind;
  onClose: () => void;
}) {
  const { me, now, createMeeting, toast } = useApp();
  const [kind, setKind] = useState<Kind>(defaultKind);
  const [err, setErr] = useState<string | null>(null);

  const canAssignOthers = ["manager", "directeur", "admin"].includes(me.role);
  const target = day ?? now;

  // Réunion : date + heure, calées à 9 h sur le jour choisi.
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState(`${toDayInput(target)}T09:00`);
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState<MeetingStatus>("planifiée");
  const [agenda, setAgenda] = useState("");
  const [busy, setBusy] = useState(false);

  const saveMeeting = async () => {
    if (!title.trim()) return setErr("Titre requis.");
    setBusy(true);
    setErr(null);
    const e = await createMeeting({
      title: title.trim(),
      date: when || null,
      location: location.trim(),
      status,
      agenda: agenda.trim(),
    });
    setBusy(false);
    if (e) return setErr(e);
    toast("Réunion planifiée.", "success");
    onClose();
  };

  const inputCls =
    "w-full text-[13px] border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 bg-white dark:bg-slate-900 focus:border-emerald-400 outline-none";
  const labelCls = "block text-[11px] font-medium text-slate-500 mb-1";

  const KINDS: { key: Kind; label: string; icon: typeof ListTodo }[] = [
    { key: "tache", label: "Tâche", icon: ListTodo },
    { key: "reunion", label: "Réunion", icon: CalendarDays },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto animate-fade" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl my-8 max-h-[90vh] overflow-y-auto animate-pop" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3 p-4 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
          <Plus size={20} className="text-emerald-600 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-semibold text-slate-800 dark:text-slate-100">Nouvel élément</div>
            <div className="text-[11.5px] text-slate-400">
              {day
                ? `Le ${target.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long" })}`
                : "Choisissez ce que vous voulez créer, puis paramétrez-le ici."}
            </div>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        <div className="p-4 space-y-3">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 w-fit">
            {KINDS.map((k) => (
              <button
                key={k.key}
                onClick={() => setKind(k.key)}
                aria-pressed={kind === k.key}
                className={`inline-flex items-center gap-1.5 text-[12.5px] px-3 py-1.5 rounded-md transition ${
                  kind === k.key
                    ? "bg-white dark:bg-slate-700 shadow-sm font-medium text-slate-800 dark:text-slate-100"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                <k.icon size={14} /> {k.label}
              </button>
            ))}
          </div>

          {err && <div className="text-[12px] text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{err}</div>}

          {kind === "tache" ? (
            <NewTaskForm
              canAssignOthers={canAssignOthers}
              defaultDueDate={day ? toDayInput(target) : undefined}
              onCreate={async (p) => {
                const e = await p;
                if (e) setErr(e);
                else {
                  toast("Tâche créée.", "success");
                  onClose();
                }
              }}
            />
          ) : (
            <div className="space-y-3">
              <div>
                <label className={labelCls} htmlFor="qc-title">Titre</label>
                <input id="qc-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Point d'avancement hebdomadaire" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls} htmlFor="qc-when">Date et heure</label>
                  <input id="qc-when" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls} htmlFor="qc-status">Statut</label>
                  <select id="qc-status" value={status} onChange={(e) => setStatus(e.target.value as MeetingStatus)} className={inputCls}>
                    {MEETING_STATUTS.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls} htmlFor="qc-loc">Lieu</label>
                <input id="qc-loc" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Salle de réunion, visio…" className={inputCls} />
              </div>
              <div>
                <label className={labelCls} htmlFor="qc-agenda">Ordre du jour</label>
                <textarea id="qc-agenda" value={agenda} onChange={(e) => setAgenda(e.target.value)} rows={3} className={inputCls} />
              </div>
              <div className="flex items-center gap-2">
                <button onClick={saveMeeting} disabled={busy || !title.trim()} className="inline-flex items-center gap-1 text-[13px] font-semibold text-white bg-emerald-600 rounded-lg px-4 py-2 hover:bg-emerald-700 disabled:opacity-40">
                  Planifier la réunion
                </button>
                <button onClick={onClose} className="text-[13px] text-slate-500 px-3 py-2">Annuler</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

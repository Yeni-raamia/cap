"use client";

import { useState } from "react";
import { Camera, ClipboardList, Trash2, Users2, X } from "lucide-react";
import { REVIEW_STATUS, type DirectionReview } from "@/lib/domain";
import { toDayInput } from "@/lib/period";
import { useApp } from "./app-context";

/* Formatage en heure locale : `toISOString()` bascule en UTC et affiche la
 * veille en fin de journée — réenregistrer reculait alors la date d'un jour. */
const toDateInput = (d: Date | null | undefined) => toDayInput(d ?? null);
const inputCls = "w-full text-[13px] border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 bg-white dark:bg-slate-900 outline-none focus:border-emerald-400";
const labelCls = "block text-[11px] font-medium text-slate-500 mb-1";

function Section({ label, value, set, disabled }: { label: string; value: string; set: (v: string) => void; disabled: boolean }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <textarea value={value} onChange={(e) => set(e.target.value)} disabled={disabled} rows={2} className={inputCls} />
    </div>
  );
}

const KPI_LABELS: Record<string, string> = {
  conformite: "Conformité %", risquesCritiques: "Risques critiques", capaEnRetard: "Actions en retard",
  incidentsOuverts: "Incidents ouverts", violationsDonnees: "Violations de données", aipdARealiser: "AIPD à réaliser",
  ecartsOuverts: "Écarts terrain", applicabilitePolitiques: "Applicabilité pol. %", joyauxPrioritaires: "Joyaux prioritaires", continuiteATester: "Continuité à tester",
  nonConformitesOuvertes: "Non-conformités ouvertes", negligencesOuvertes: "Négligences ouvertes", manquementsGraves: "Manquements graves",
};

/** Fiche d'une revue de direction (ISO 27001 §9.3) : entrées, sorties, instantané KPI. */
export function ReviewModal({ review, creating, liveKpis, onClose }: { review: DirectionReview | null; creating: boolean; liveKpis: Record<string, number>; onClose: () => void }) {
  const { demo, profiles, createReview, updateReview, deleteReview } = useApp();
  const canEdit = !demo;

  const [title, setTitle] = useState(review?.title ?? "");
  const [date, setDate] = useState(toDateInput(review?.date) || toDayInput(new Date()));
  const [period, setPeriod] = useState(review?.period ?? "");
  const [participantIds, setParticipants] = useState<string[]>(review?.participantIds ?? []);
  const [status, setStatus] = useState(review?.status ?? "Préparée");
  const [nextReviewDate, setNext] = useState(toDateInput(review?.nextReviewDate));
  const [contextChanges, setContext] = useState(review?.contextChanges ?? "");
  const [riskReview, setRisk] = useState(review?.riskReview ?? "");
  const [complianceReview, setCompliance] = useState(review?.complianceReview ?? "");
  const [incidentsReview, setIncidents] = useState(review?.incidentsReview ?? "");
  const [objectivesReview, setObjectives] = useState(review?.objectivesReview ?? "");
  const [feedback, setFeedback] = useState(review?.feedback ?? "");
  const [decisions, setDecisions] = useState(review?.decisions ?? "");
  const [actions, setActions] = useState(review?.actions ?? "");
  const [snapshot, setSnapshot] = useState<Record<string, number>>(review?.kpiSnapshot ?? {});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const toggleParticipant = (id: string) => setParticipants((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));
  const capture = () => setSnapshot({ ...liveKpis });

  const save = async () => {
    if (!title.trim()) return;
    setBusy(true); setErr(null);
    const payload = { title: title.trim(), date: date || null, period, participantIds, status, nextReviewDate: nextReviewDate || null, contextChanges, riskReview, complianceReview, incidentsReview, objectivesReview, feedback, decisions, actions, kpiSnapshot: snapshot };
    const e = creating ? await createReview(payload) : review ? await updateReview(review.id, payload) : "—";
    setBusy(false);
    if (e) setErr(e); else onClose();
  };
  const remove = async () => {
    if (!review || (typeof window !== "undefined" && !window.confirm(`Supprimer la revue « ${review.ref} » ?`))) return;
    setBusy(true);
    const e = await deleteReview(review.id);
    setBusy(false);
    if (e) setErr(e); else onClose();
  };

  const snapKeys = Object.keys(snapshot);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto animate-fade" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl my-8 max-h-[92vh] overflow-y-auto animate-pop" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3 p-4 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
          <ClipboardList size={20} className="text-emerald-600 mt-1 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-semibold text-slate-800 dark:text-slate-100">{creating ? "Nouvelle revue de direction" : review?.ref}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">ISO 27001 §9.3 — entrées & sorties</div>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        <div className="p-4 space-y-3">
          {err && <div className="text-[12px] text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{err}</div>}
          <div>
            <label className={labelCls}>Titre</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} disabled={!canEdit} placeholder="Ex. Revue de direction — 1er semestre" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div><label className={labelCls}>Date</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={!canEdit} className={inputCls} /></div>
            <div><label className={labelCls}>Période</label><input value={period} onChange={(e) => setPeriod(e.target.value)} disabled={!canEdit} placeholder="S1 2026" className={inputCls} /></div>
            <div><label className={labelCls}>Prochaine</label><input type="date" value={nextReviewDate} onChange={(e) => setNext(e.target.value)} disabled={!canEdit} className={inputCls} /></div>
            <div><label className={labelCls}>Statut</label><select value={status} onChange={(e) => setStatus(e.target.value)} disabled={!canEdit} className={inputCls}>{REVIEW_STATUS.map((s) => <option key={s}>{s}</option>)}</select></div>
          </div>
          <div>
            <label className={labelCls}><Users2 size={11} className="inline" /> Participants</label>
            <div className="flex flex-wrap gap-1.5">
              {profiles.map((p) => <button key={p.id} onClick={() => canEdit && toggleParticipant(p.id)} className={`text-[11px] rounded-full px-2 py-0.5 border ${participantIds.includes(p.id) ? "bg-emerald-100 border-emerald-300 text-emerald-800" : "border-slate-200 text-slate-500"}`}>{p.nom}</button>)}
            </div>
          </div>

          {/* Instantané des indicateurs */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[11px] font-medium text-slate-500 uppercase">Indicateurs à la date de revue</div>
              {canEdit && <button onClick={capture} className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 hover:underline"><Camera size={12} /> Capturer les indicateurs actuels</button>}
            </div>
            {snapKeys.length === 0 ? (
              <div className="text-[12px] text-slate-400">Aucun instantané. Clique sur « Capturer » pour figer les KPIs du moment.</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {snapKeys.map((k) => (
                  <div key={k} className="rounded-lg bg-slate-50 dark:bg-slate-800 p-2 text-center">
                    <div className="text-[15px] font-bold text-slate-700 dark:text-slate-200">{snapshot[k]}</div>
                    <div className="text-[9.5px] text-slate-400 leading-tight">{KPI_LABELS[k] ?? k}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Éléments d'entrée (ISO 9.3.2) */}
          <div className="text-[11px] font-semibold text-slate-500 uppercase pt-1">Éléments d&apos;entrée</div>
          <Section label="Évolutions du contexte" value={contextChanges} set={setContext} disabled={!canEdit} />
          <Section label="Bilan des risques" value={riskReview} set={setRisk} disabled={!canEdit} />
          <Section label="Conformité & audits" value={complianceReview} set={setCompliance} disabled={!canEdit} />
          <Section label="Incidents & non-conformités" value={incidentsReview} set={setIncidents} disabled={!canEdit} />
          <Section label="Objectifs & plan d'action" value={objectivesReview} set={setObjectives} disabled={!canEdit} />
          <Section label="Retours des parties intéressées" value={feedback} set={setFeedback} disabled={!canEdit} />

          {/* Éléments de sortie (ISO 9.3.3) */}
          <div className="text-[11px] font-semibold text-slate-500 uppercase pt-1">Éléments de sortie</div>
          <Section label="Décisions & orientations" value={decisions} set={setDecisions} disabled={!canEdit} />
          <Section label="Actions & moyens décidés" value={actions} set={setActions} disabled={!canEdit} />
        </div>

        {canEdit && (
          <div className="flex items-center gap-2 p-4 border-t border-slate-100 dark:border-slate-800">
            <button onClick={save} disabled={busy || !title.trim()} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-slate-900 dark:bg-emerald-600 rounded-xl px-4 py-2 disabled:opacity-50"><ClipboardList size={15} /> {creating ? "Créer la revue" : "Enregistrer"}</button>
            {!creating && review && <button onClick={remove} disabled={busy} className="ml-auto inline-flex items-center gap-1 text-[12px] text-rose-600 border border-rose-200 rounded-lg px-3 py-2 hover:bg-rose-50"><Trash2 size={14} /> Supprimer</button>}
          </div>
        )}
      </div>
    </div>
  );
}

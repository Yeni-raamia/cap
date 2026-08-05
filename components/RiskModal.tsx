"use client";

import { useMemo, useState } from "react";
import { ShieldAlert, Trash2, X } from "lucide-react";
import {
  riskLevel,
  RISK_CATEGORIES,
  RISK_IMPACT_LABELS,
  RISK_LEVEL_TONE,
  RISK_PROBA_LABELS,
  RISK_STATUTS,
  RISK_TREATMENTS,
  type Risk,
  type RiskLink,
  type RiskLinkKind,
} from "@/lib/domain";
import { useApp } from "./app-context";

const toDateInput = (d: Date | null | undefined) => (d ? new Date(d).toISOString().slice(0, 10) : "");

/** Fiche de création / édition d'un risque (matrice P×I + croisements inter-modules). */
export function RiskModal({ risk, creating, onClose }: { risk: Risk | null; creating: boolean; onClose: () => void }) {
  const { demo, me, profiles, items, projects, negligences, nonConformites, objectives, createRisk, updateRisk, deleteRisk } = useApp();
  const canEdit = !demo;

  const [title, setTitle] = useState(risk?.title ?? "");
  const [description, setDescription] = useState(risk?.description ?? "");
  const [category, setCategory] = useState(risk?.category ?? RISK_CATEGORIES[0]);
  const [probability, setProbability] = useState(risk?.probability ?? 3);
  const [impact, setImpact] = useState(risk?.impact ?? 3);
  const [treatment, setTreatment] = useState(risk?.treatment ?? "Réduire");
  const [treatmentPlan, setTreatmentPlan] = useState(risk?.treatmentPlan ?? "");
  const [status, setStatus] = useState(risk?.status ?? "Identifié");
  const [ownerId, setOwnerId] = useState(risk?.ownerId ?? me.id);
  const [review, setReview] = useState(toDateInput(risk?.reviewDate));
  const [links, setLinks] = useState<RiskLink[]>(risk?.links ?? []);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const level = riskLevel(probability, impact);
  const hasLink = (kind: RiskLinkKind, refId: string) => links.some((l) => l.kind === kind && l.refId === refId);
  const toggleLink = (kind: RiskLinkKind, refId: string) =>
    setLinks((prev) => (hasLink(kind, refId) ? prev.filter((l) => !(l.kind === kind && l.refId === refId)) : [...prev, { kind, refId }]));

  const linkGroups = useMemo(
    () => [
      { kind: "item" as RiskLinkKind, label: "Suivis", entries: items.slice(0, 60).map((i) => ({ id: i.id, name: `${i.ref} — ${i.objet}` })) },
      { kind: "project" as RiskLinkKind, label: "Projets", entries: projects.map((p) => ({ id: p.id, name: p.name })) },
      { kind: "nonconformite" as RiskLinkKind, label: "Non-conformités", entries: nonConformites.map((n) => ({ id: n.id, name: n.objet || "Non-conformité" })) },
      { kind: "negligence" as RiskLinkKind, label: "Négligences", entries: negligences.map((n) => ({ id: n.id, name: n.objet || "Négligence" })) },
      { kind: "objective" as RiskLinkKind, label: "Objectifs", entries: objectives.map((o) => ({ id: o.id, name: o.title })) },
    ],
    [items, projects, nonConformites, negligences, objectives]
  );

  const save = async () => {
    if (!title.trim()) return;
    setBusy(true);
    setErr(null);
    const payload = { title: title.trim(), description, category, probability, impact, treatment, treatmentPlan, status, ownerId, reviewDate: review || null, links };
    const e = creating ? await createRisk(payload) : risk ? await updateRisk(risk.id, payload) : "—";
    setBusy(false);
    if (e) setErr(e);
    else onClose();
  };

  const remove = async () => {
    if (!risk || (typeof window !== "undefined" && !window.confirm(`Supprimer définitivement le risque « ${risk.ref} » ?`))) return;
    setBusy(true);
    const e = await deleteRisk(risk.id);
    setBusy(false);
    if (e) setErr(e);
    else onClose();
  };

  const inputCls = "w-full text-[13px] border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 bg-white dark:bg-slate-900 focus:border-emerald-400 outline-none";
  const labelCls = "block text-[11px] font-medium text-slate-500 mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto animate-fade" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl my-8 max-h-[90vh] overflow-y-auto animate-pop" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3 p-4 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
          <ShieldAlert size={20} className="text-rose-600 mt-1 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-semibold text-slate-800 dark:text-slate-100">{creating ? "Nouveau risque" : risk?.ref}</div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`inline-flex items-center text-[11px] font-medium rounded-full px-2 py-0.5 border ${RISK_LEVEL_TONE[level]}`}>Niveau {level}</span>
              <span className="text-[11px] text-slate-400">score {probability * impact}/25 (P{probability} × I{impact})</span>
            </div>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        <div className="p-4 space-y-3">
          {err && <div className="text-[12px] text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{err}</div>}

          <div>
            <label className={labelCls}>Intitulé du risque</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} disabled={!canEdit} placeholder="Ex. Fuite de données via un poste non chiffré…" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Description / scénario</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} disabled={!canEdit} rows={2} placeholder="Cause, événement redouté, conséquence…" className={inputCls} />
          </div>

          {/* Évaluation Probabilité × Impact */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Probabilité</label>
              <select value={probability} onChange={(e) => setProbability(Number(e.target.value))} disabled={!canEdit} className={inputCls}>
                {RISK_PROBA_LABELS.map((l, i) => <option key={i} value={i + 1}>{i + 1} · {l}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Impact</label>
              <select value={impact} onChange={(e) => setImpact(Number(e.target.value))} disabled={!canEdit} className={inputCls}>
                {RISK_IMPACT_LABELS.map((l, i) => <option key={i} value={i + 1}>{i + 1} · {l}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Catégorie</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} disabled={!canEdit} className={inputCls}>
                {RISK_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Traitement</label>
              <select value={treatment} onChange={(e) => setTreatment(e.target.value)} disabled={!canEdit} className={inputCls}>
                {RISK_TREATMENTS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Statut</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} disabled={!canEdit} className={inputCls}>
                {RISK_STATUTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Responsable</label>
              <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} disabled={!canEdit} className={inputCls}>
                {profiles.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Date de revue</label>
              <input type="date" value={review} onChange={(e) => setReview(e.target.value)} disabled={!canEdit} className={inputCls} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Plan d&apos;action / mesures</label>
            <textarea value={treatmentPlan} onChange={(e) => setTreatmentPlan(e.target.value)} disabled={!canEdit} rows={2} placeholder="Mesures de réduction, contrôles, échéances…" className={inputCls} />
          </div>

          {/* Croisements inter-modules */}
          <div>
            <div className="text-[11px] font-medium text-slate-500 uppercase mb-1.5">Éléments reliés <span className="normal-case font-normal text-slate-400">· croise l&apos;information (visible dans le graphe)</span></div>
            <div className="space-y-2">
              {linkGroups.map((g) => (
                g.entries.length > 0 && (
                  <div key={g.kind}>
                    <div className="text-[10px] text-slate-400 mb-1">{g.label}</div>
                    <div className="flex flex-wrap gap-1.5">
                      {g.entries.map((e) => {
                        const on = hasLink(g.kind, e.id);
                        return (
                          <button key={e.id} disabled={!canEdit} onClick={() => toggleLink(g.kind, e.id)} title={e.name}
                            className={`text-[11px] rounded-full px-2 py-0.5 border max-w-[220px] truncate transition-colors ${on ? "bg-rose-600 text-white border-rose-600" : "border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
                            {e.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )
              ))}
            </div>
          </div>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2 p-4 border-t border-slate-100 dark:border-slate-800">
            <button onClick={save} disabled={busy || !title.trim()} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-slate-900 dark:bg-emerald-600 rounded-xl px-4 py-2 hover:-translate-y-0.5 transition-transform shadow-soft disabled:opacity-50">
              <ShieldAlert size={15} /> {creating ? "Créer le risque" : "Enregistrer"}
            </button>
            {!creating && risk && (
              <button onClick={remove} disabled={busy} className="ml-auto inline-flex items-center gap-1 text-[12px] text-rose-600 border border-rose-200 rounded-lg px-3 py-2 hover:bg-rose-50 dark:hover:bg-rose-500/10">
                <Trash2 size={14} /> Supprimer
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

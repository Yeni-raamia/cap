"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, History, Link2, Plus, ShieldAlert, ShieldCheck, Trash2, X } from "lucide-react";
import {
  fmt,
  riskLevel,
  RISK_CATEGORIES,
  RISK_LEVEL_TONE,
  RISK_PROBA_LABELS,
  RISK_IMPACT_LABELS,
  RISK_STATUTS,
  RISK_TREATMENTS,
  type Risk,
  type RiskControlRef,
  type RiskLink,
  type RiskLinkKind,
} from "@/lib/domain";
import { FRAMEWORKS, frameworkById } from "@/lib/grc/frameworks";
import { useApp } from "./app-context";
import { toDayInput } from "@/lib/period";

/* Formatage en heure locale : `toISOString()` bascule en UTC et affiche la
 * veille en fin de journée — réenregistrer reculait alors la date d'un jour. */
const toDateInput = (d: Date | null | undefined) => toDayInput(d ?? null);

/** Fiche d'un risque (méthode ISO 27005) : inhérent → traitement → résiduel. */
export function RiskModal({ risk, creating, onClose }: { risk: Risk | null; creating: boolean; onClose: () => void }) {
  const { demo, me, profiles, profileById, assets, items, projects, negligences, nonConformites, objectives, createRisk, updateRisk, deleteRisk, acceptRisk, reviewRisk } = useApp();
  const canEdit = !demo;

  const [title, setTitle] = useState(risk?.title ?? "");
  const [description, setDescription] = useState(risk?.description ?? "");
  const [category, setCategory] = useState(risk?.category ?? RISK_CATEGORIES[0]);
  const [assetId, setAssetId] = useState(risk?.assetId ?? "");
  const [threat, setThreat] = useState(risk?.threat ?? "");
  const [vulnerability, setVulnerability] = useState(risk?.vulnerability ?? "");
  const [p, setP] = useState(risk?.probability ?? 3);
  const [i, setI] = useState(risk?.impact ?? 3);
  const [rp, setRp] = useState(risk?.residualProbability ?? risk?.probability ?? 3);
  const [ri, setRi] = useState(risk?.residualImpact ?? risk?.impact ?? 3);
  const [treatment, setTreatment] = useState(risk?.treatment ?? "Réduire");
  const [treatmentPlan, setTreatmentPlan] = useState(risk?.treatmentPlan ?? "");
  const [status, setStatus] = useState(risk?.status ?? "Identifié");
  const [ownerId, setOwnerId] = useState(risk?.ownerId ?? me.id);
  const [review, setReview] = useState(toDateInput(risk?.reviewDate));
  const [controls, setControls] = useState<RiskControlRef[]>(risk?.controls ?? []);
  const [links, setLinks] = useState<RiskLink[]>(risk?.links ?? []);
  const [pickFw, setPickFw] = useState(FRAMEWORKS[0].id);
  const [pickCode, setPickCode] = useState("");
  const [showAccept, setShowAccept] = useState(false);
  const [acceptUntil, setAcceptUntil] = useState("");
  const [acceptJust, setAcceptJust] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const inhLevel = riskLevel(p, i);
  const resLevel = riskLevel(rp, ri);

  const hasControl = (fw: string, code: string) => controls.some((c) => c.frameworkId === fw && c.controlCode === code);
  const addControl = () => {
    if (!pickCode || hasControl(pickFw, pickCode)) return;
    setControls((prev) => [...prev, { frameworkId: pickFw, controlCode: pickCode }]);
    setPickCode("");
  };
  const removeControl = (fw: string, code: string) => setControls((prev) => prev.filter((c) => !(c.frameworkId === fw && c.controlCode === code)));

  const hasLink = (kind: RiskLinkKind, refId: string) => links.some((l) => l.kind === kind && l.refId === refId);
  const toggleLink = (kind: RiskLinkKind, refId: string) => setLinks((prev) => (hasLink(kind, refId) ? prev.filter((l) => !(l.kind === kind && l.refId === refId)) : [...prev, { kind, refId }]));

  const linkGroups = useMemo(
    () => [
      { kind: "item" as RiskLinkKind, label: "Suivis", entries: items.slice(0, 50).map((x) => ({ id: x.id, name: `${x.ref} — ${x.objet}` })) },
      { kind: "project" as RiskLinkKind, label: "Projets", entries: projects.map((x) => ({ id: x.id, name: x.name })) },
      { kind: "nonconformite" as RiskLinkKind, label: "Non-conformités", entries: nonConformites.map((x) => ({ id: x.id, name: x.objet || "NC" })) },
      { kind: "negligence" as RiskLinkKind, label: "Négligences", entries: negligences.map((x) => ({ id: x.id, name: x.objet || "Négligence" })) },
      { kind: "objective" as RiskLinkKind, label: "Objectifs", entries: objectives.map((x) => ({ id: x.id, name: x.title })) },
    ],
    [items, projects, nonConformites, negligences, objectives]
  );

  const save = async () => {
    if (!title.trim()) return;
    setBusy(true);
    setErr(null);
    const payload = { title: title.trim(), description, category, assetId: assetId || null, threat, vulnerability, probability: p, impact: i, residualProbability: rp, residualImpact: ri, treatment, treatmentPlan, status, ownerId, reviewDate: review || null, controls, links };
    const e = creating ? await createRisk(payload) : risk ? await updateRisk(risk.id, payload) : "—";
    setBusy(false);
    if (e) setErr(e);
    else onClose();
  };
  const remove = async () => {
    if (!risk || (typeof window !== "undefined" && !window.confirm(`Supprimer le risque « ${risk.ref} » ?`))) return;
    setBusy(true);
    const e = await deleteRisk(risk.id);
    setBusy(false);
    if (e) setErr(e); else onClose();
  };
  const doAccept = async () => {
    if (!risk) return;
    await acceptRisk(risk.id, acceptUntil || null, acceptJust);
    setStatus("Accepté");
    setShowAccept(false);
  };
  const doReview = async () => {
    if (!risk || !reviewNote.trim()) return;
    await reviewRisk(risk.id, reviewNote.trim());
    setReviewNote("");
  };

  const inputCls = "w-full text-[13px] border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 bg-white dark:bg-slate-900 focus:border-emerald-400 outline-none";
  const labelCls = "block text-[11px] font-medium text-slate-500 mb-1";
  const Matrix = ({ prob, imp, setProb, setImp, level, title: t }: { prob: number; imp: number; setProb: (v: number) => void; setImp: (v: number) => void; level: string; title: string }) => (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-2.5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-semibold text-slate-600">{t}</span>
        <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 border ${RISK_LEVEL_TONE[level as keyof typeof RISK_LEVEL_TONE]}`}>{level} · {prob * imp}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <select value={prob} onChange={(e) => setProb(Number(e.target.value))} disabled={!canEdit} aria-label={`Probabilité ${t}`} className={inputCls}>
          {RISK_PROBA_LABELS.map((l, n) => <option key={n} value={n + 1}>P{n + 1} · {l}</option>)}
        </select>
        <select value={imp} onChange={(e) => setImp(Number(e.target.value))} disabled={!canEdit} aria-label={`Impact ${t}`} className={inputCls}>
          {RISK_IMPACT_LABELS.map((l, n) => <option key={n} value={n + 1}>I{n + 1} · {l}</option>)}
        </select>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto animate-fade" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl my-8 max-h-[92vh] overflow-y-auto animate-pop" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3 p-4 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
          <ShieldAlert size={20} className="text-rose-600 mt-1 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-semibold text-slate-800 dark:text-slate-100">{creating ? "Nouveau risque" : risk?.ref}</div>
            <div className="flex items-center gap-2 mt-1 text-[11px] flex-wrap">
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 border font-medium ${RISK_LEVEL_TONE[inhLevel]}`}>Inhérent {inhLevel}</span>
              <span className="text-slate-400">→</span>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 border font-medium ${RISK_LEVEL_TONE[resLevel]}`}>Résiduel {resLevel}</span>
            </div>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        <div className="p-4 space-y-3">
          {err && <div className="text-[12px] text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{err}</div>}

          <div>
            <label className={labelCls}>Intitulé du risque</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} disabled={!canEdit} placeholder="Ex. Compromission d'un compte à privilèges…" className={inputCls} />
          </div>

          {/* Scénario : actif · menace · vulnérabilité */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Actif ciblé</label>
              <select value={assetId} onChange={(e) => setAssetId(e.target.value)} disabled={!canEdit} className={inputCls}>
                <option value="">— Aucun</option>
                {assets.map((a) => <option key={a.id} value={a.id}>{a.ref} · {a.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Catégorie</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} disabled={!canEdit} className={inputCls}>
                {RISK_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Source / menace</label>
              <input value={threat} onChange={(e) => setThreat(e.target.value)} disabled={!canEdit} placeholder="Ex. attaquant externe, erreur interne…" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Vulnérabilité</label>
              <input value={vulnerability} onChange={(e) => setVulnerability(e.target.value)} disabled={!canEdit} placeholder="Ex. absence de MFA…" className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Description / événement redouté</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} disabled={!canEdit} rows={2} placeholder="Conséquence redoutée…" className={inputCls} />
          </div>

          {/* Évaluation inhérent → résiduel */}
          <div className="grid sm:grid-cols-2 gap-3">
            <Matrix prob={p} imp={i} setProb={setP} setImp={setI} level={inhLevel} title="Risque inhérent (avant traitement)" />
            <Matrix prob={rp} imp={ri} setProb={setRp} setImp={setRi} level={resLevel} title="Risque résiduel (après traitement)" />
          </div>

          {/* Traitement */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Stratégie de traitement</label>
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
                {profiles.map((x) => <option key={x.id} value={x.id}>{x.nom}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Prochaine revue</label>
              <input type="date" value={review} onChange={(e) => setReview(e.target.value)} disabled={!canEdit} className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Plan de traitement</label>
            <textarea value={treatmentPlan} onChange={(e) => setTreatmentPlan(e.target.value)} disabled={!canEdit} rows={2} placeholder="Actions de réduction, échéances…" className={inputCls} />
          </div>

          {/* Mesures de traitement (référentiels de conformité) */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
            <div className="text-[11px] font-medium text-slate-500 uppercase mb-1.5 flex items-center gap-1.5"><ShieldCheck size={13} /> Mesures de traitement (conformité)</div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {controls.length === 0 && <span className="text-[12px] text-slate-400">Aucune mesure liée.</span>}
              {controls.map((c) => {
                const fw = frameworkById(c.frameworkId);
                const ctrl = fw?.controls.find((x) => x.code === c.controlCode);
                return (
                  <span key={`${c.frameworkId}:${c.controlCode}`} className="inline-flex items-center gap-1 text-[11px] rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 pl-2 pr-1 py-0.5 max-w-[260px]">
                    <span className="font-mono font-semibold">{c.controlCode}</span>
                    <span className="truncate">{ctrl?.title ?? ""}</span>
                    {canEdit && <button onClick={() => removeControl(c.frameworkId, c.controlCode)} aria-label="Retirer" className="text-emerald-600 hover:text-rose-600"><X size={12} /></button>}
                  </span>
                );
              })}
            </div>
            {canEdit && (
              <div className="flex items-center gap-2 flex-wrap">
                <select value={pickFw} onChange={(e) => { setPickFw(e.target.value); setPickCode(""); }} className="text-[12px] border border-slate-200 rounded-lg px-2 py-1.5 bg-white">
                  {FRAMEWORKS.map((f) => <option key={f.id} value={f.id}>{f.short}</option>)}
                </select>
                <select value={pickCode} onChange={(e) => setPickCode(e.target.value)} className="flex-1 min-w-[10rem] text-[12px] border border-slate-200 rounded-lg px-2 py-1.5 bg-white">
                  <option value="">Choisir une mesure…</option>
                  {(frameworkById(pickFw)?.controls ?? []).filter((c) => !hasControl(pickFw, c.code)).map((c) => <option key={c.code} value={c.code}>{c.code} · {c.title}</option>)}
                </select>
                <button onClick={addControl} disabled={!pickCode} className="inline-flex items-center gap-1 text-[12px] font-medium text-white bg-emerald-600 rounded-lg px-3 py-1.5 hover:bg-emerald-700 disabled:opacity-40"><Plus size={14} /> Lier</button>
              </div>
            )}
          </div>

          {/* Acceptation du risque */}
          {!creating && risk && (
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
              <div className="text-[11px] font-medium text-slate-500 uppercase mb-1.5 flex items-center gap-1.5"><CheckCircle2 size={13} /> Acceptation du risque</div>
              {risk.acceptedBy ? (
                <div className="text-[12px] text-slate-600">
                  Accepté par <b>{profileById(risk.acceptedBy).nom}</b> le {risk.acceptedAt && fmt(risk.acceptedAt)}
                  {risk.acceptUntil && <> · jusqu&apos;au <b>{fmt(risk.acceptUntil)}</b></>}
                  {risk.acceptanceJustification && <div className="text-slate-500 mt-0.5">« {risk.acceptanceJustification} »</div>}
                </div>
              ) : canEdit ? (
                showAccept ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <label className="text-[11px] text-slate-500">Accepté jusqu&apos;au</label>
                      <input type="date" value={acceptUntil} onChange={(e) => setAcceptUntil(e.target.value)} className="text-[12px] border border-slate-200 rounded-lg px-2 py-1" />
                    </div>
                    <textarea value={acceptJust} onChange={(e) => setAcceptJust(e.target.value)} rows={2} placeholder="Justification de l'acceptation (obligatoire pour la traçabilité)…" className={inputCls} />
                    <div className="flex gap-2">
                      <button onClick={doAccept} className="text-[12px] font-medium text-white bg-violet-600 rounded-lg px-3 py-1.5 hover:bg-violet-700">Confirmer l&apos;acceptation</button>
                      <button onClick={() => setShowAccept(false)} className="text-[12px] text-slate-500 px-3 py-1.5">Annuler</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setShowAccept(true)} className="text-[12px] font-medium text-violet-700 border border-violet-200 rounded-lg px-3 py-1.5 hover:bg-violet-50">Accepter formellement ce risque</button>
                )
              ) : <span className="text-[12px] text-slate-400">Risque non accepté.</span>}
            </div>
          )}

          {/* Historique de réévaluation */}
          {!creating && risk && (
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
              <div className="text-[11px] font-medium text-slate-500 uppercase mb-1.5 flex items-center gap-1.5"><History size={13} /> Historique de réévaluation ({risk.reviews.length})</div>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {risk.reviews.map((v) => (
                  <div key={v.id} className="text-[11px] text-slate-500 flex items-start gap-2">
                    <span className="text-slate-400 shrink-0">{fmt(v.reviewedAt)}</span>
                    <span className="font-mono shrink-0">{riskLevel(v.inherentP, v.inherentI)[0]}→{riskLevel(v.residualP, v.residualI)[0]}</span>
                    <span className="text-slate-600">{v.note}{v.reviewedBy && ` — ${profileById(v.reviewedBy).nom}`}</span>
                  </div>
                ))}
              </div>
              {canEdit && (
                <div className="flex items-center gap-2 mt-2">
                  <input value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); doReview(); } }} placeholder="Consigner une revue (note)…" className="flex-1 text-[12px] border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-emerald-400" />
                  <button onClick={doReview} disabled={!reviewNote.trim()} className="text-[12px] font-medium text-slate-700 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 disabled:opacity-40">Consigner</button>
                </div>
              )}
            </div>
          )}

          {/* Croisements inter-modules */}
          <div>
            <div className="text-[11px] font-medium text-slate-500 uppercase mb-1.5 flex items-center gap-1.5"><Link2 size={13} /> Éléments reliés</div>
            <div className="space-y-2">
              {linkGroups.map((g) => g.entries.length > 0 && (
                <div key={g.kind}>
                  <div className="text-[10px] text-slate-400 mb-1">{g.label}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {g.entries.map((e) => {
                      const on = hasLink(g.kind, e.id);
                      return <button key={e.id} disabled={!canEdit} onClick={() => toggleLink(g.kind, e.id)} title={e.name} className={`text-[11px] rounded-full px-2 py-0.5 border max-w-[220px] truncate ${on ? "bg-rose-600 text-white border-rose-600" : "border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>{e.name}</button>;
                    })}
                  </div>
                </div>
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
              <button onClick={remove} disabled={busy} className="ml-auto inline-flex items-center gap-1 text-[12px] text-rose-600 border border-rose-200 rounded-lg px-3 py-2 hover:bg-rose-50 dark:hover:bg-rose-500/10"><Trash2 size={14} /> Supprimer</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

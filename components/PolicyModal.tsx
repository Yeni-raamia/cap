"use client";

import { useState } from "react";
import { ExternalLink, Plus, ScrollText, Trash2, X } from "lucide-react";
import {
  policyCoverage,
  policyStageIndex,
  POLICY_DOMAINS,
  POLICY_STAGE_ALL,
  POLICY_STAGE_NA,
  POLICY_STAGE_TONE,
  POLICY_STAGES,
  POLICY_STATUTS,
  type Policy,
  type PolicyDiffusion,
} from "@/lib/domain";
import { useApp } from "./app-context";
import { toDayInput } from "@/lib/period";

/* Formatage en heure locale : `toISOString()` bascule en UTC et affiche la
 * veille en fin de journée — réenregistrer reculait alors la date d'un jour. */
const toDateInput = (d: Date | null | undefined) => toDayInput(d ?? null);

/** Fiche d'une politique : métadonnées + suivi de diffusion par direction/service. */
export function PolicyModal({ policy, creating, onClose }: { policy: Policy | null; creating: boolean; onClose: () => void }) {
  const { demo, me, profiles, refLists, directions, createPolicy, updatePolicy, deletePolicy, setPolicyDiffusion, removePolicyDiffusion } = useApp();
  // Cibles de diffusion suggérées : listes de référence + organigramme (directions/sigles/services).
  const orgTargets = [
    ...directions.flatMap((d) => [d.name, d.code, ...d.services.map((s) => s.name)]),
    ...(refLists.services ?? []),
  ].map((s) => s.trim()).filter(Boolean);
  const serviceSuggestions = [...new Set(orgTargets)].sort((a, b) => a.localeCompare(b));
  const canEdit = !demo;

  const [title, setTitle] = useState(policy?.title ?? "");
  const [reference, setReference] = useState(policy?.reference ?? "");
  const [domain, setDomain] = useState(policy?.domain ?? POLICY_DOMAINS[0]);
  const [version, setVersion] = useState(policy?.version ?? "1.0");
  const [status, setStatus] = useState(policy?.status ?? "Brouillon");
  const [ownerId, setOwnerId] = useState(policy?.ownerId ?? me.id);
  const [published, setPublished] = useState(toDateInput(policy?.publishedAt));
  const [review, setReview] = useState(toDateInput(policy?.reviewDate));
  const [summary, setSummary] = useState(policy?.summary ?? "");
  const [url, setUrl] = useState(policy?.url ?? "");
  const [newService, setNewService] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const cov = policy ? policyCoverage(policy) : { applicable: 0, total: 0, pct: 0 };

  const save = async () => {
    if (!title.trim()) return;
    setBusy(true);
    setErr(null);
    const payload = { title: title.trim(), reference, domain, version, status, ownerId, publishedAt: published || null, reviewDate: review || null, summary, url };
    const e = creating ? await createPolicy(payload) : policy ? await updatePolicy(policy.id, payload) : "—";
    setBusy(false);
    if (e) setErr(e);
    else onClose();
  };

  const remove = async () => {
    if (!policy || (typeof window !== "undefined" && !window.confirm(`Supprimer définitivement la politique « ${policy.ref} » et son suivi de diffusion ?`))) return;
    setBusy(true);
    const e = await deletePolicy(policy.id);
    setBusy(false);
    if (e) setErr(e);
    else onClose();
  };

  const addService = () => {
    const svc = newService.trim();
    if (!policy || !svc) return;
    setPolicyDiffusion(policy.id, svc, "Diffusée");
    setNewService("");
  };

  const inputCls = "w-full text-[13px] border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 bg-white dark:bg-slate-900 focus:border-emerald-400 outline-none";
  const labelCls = "block text-[11px] font-medium text-slate-500 mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto animate-fade" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl my-8 max-h-[90vh] overflow-y-auto animate-pop" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3 p-4 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
          <ScrollText size={20} className="text-sky-600 mt-1 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-semibold text-slate-800 dark:text-slate-100">{creating ? "Nouvelle politique" : policy?.ref}</div>
            {!creating && policy && (
              <div className="text-[11px] text-slate-400 mt-0.5">Applicabilité : {cov.applicable}/{cov.total} services · {cov.pct}%</div>
            )}
          </div>
          <button onClick={onClose} aria-label="Fermer" className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        <div className="p-4 space-y-3">
          {err && <div className="text-[12px] text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{err}</div>}

          <div>
            <label className={labelCls}>Intitulé de la politique</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} disabled={!canEdit} placeholder="Ex. Politique de contrôle d'accès…" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Cadre / référence</label>
              <input value={reference} onChange={(e) => setReference(e.target.value)} disabled={!canEdit} list="policy-refs" placeholder="ISO 27001 A.5.15…" className={inputCls} />
              <datalist id="policy-refs">{(refLists.policies ?? []).map((p) => <option key={p} value={p} />)}</datalist>
            </div>
            <div>
              <label className={labelCls}>Domaine</label>
              <select value={domain} onChange={(e) => setDomain(e.target.value)} disabled={!canEdit} className={inputCls}>
                {POLICY_DOMAINS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Version</label>
              <input value={version} onChange={(e) => setVersion(e.target.value)} disabled={!canEdit} placeholder="1.0" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Statut</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} disabled={!canEdit} className={inputCls}>
                {POLICY_STATUTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Responsable</label>
              <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} disabled={!canEdit} className={inputCls}>
                {profiles.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>En vigueur le</label>
              <input type="date" value={published} onChange={(e) => setPublished(e.target.value)} disabled={!canEdit} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Prochaine revue</label>
              <input type="date" value={review} onChange={(e) => setReview(e.target.value)} disabled={!canEdit} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Lien du document</label>
              <input value={url} onChange={(e) => setUrl(e.target.value)} disabled={!canEdit} placeholder="https://…" className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Résumé / objet</label>
            <textarea value={summary} onChange={(e) => setSummary(e.target.value)} disabled={!canEdit} rows={2} placeholder="Portée, principes clés…" className={inputCls} />
          </div>

          {/* Suivi de diffusion par direction / service */}
          {!creating && policy ? (
            <div>
              <div className="text-[11px] font-medium text-slate-500 uppercase mb-1.5">Diffusion par direction / service</div>
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800">
                {policy.diffusions.length === 0 && <div className="px-3 py-3 text-[12px] text-slate-400">Aucun service ciblé. Ajoutez une direction/service ci-dessous.</div>}
                {policy.diffusions.map((d) => (
                  <DiffusionRow key={d.id} d={d} policyId={policy.id} canEdit={canEdit} onStage={(stage) => setPolicyDiffusion(policy.id, d.service, stage, d.note)} onNote={(note) => setPolicyDiffusion(policy.id, d.service, d.stage, note)} onRemove={() => removePolicyDiffusion(policy.id, d.service)} />
                ))}
              </div>
              {canEdit && (
                <div className="flex items-center gap-2 mt-2">
                  <input value={newService} onChange={(e) => setNewService(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addService(); } }} list="policy-services" placeholder="Ajouter une direction/service…" className="flex-1 text-[13px] border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-emerald-400" />
                  <datalist id="policy-services">{serviceSuggestions.map((s) => <option key={s} value={s} />)}</datalist>
                  <button onClick={addService} disabled={!newService.trim()} className="inline-flex items-center gap-1 text-[12px] font-medium text-white bg-sky-600 rounded-lg px-3 py-1.5 hover:bg-sky-700 disabled:opacity-40"><Plus size={14} /> Ajouter</button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-[11px] text-slate-400">Le suivi de diffusion par service devient disponible après la création de la politique.</div>
          )}
        </div>

        {canEdit && (
          <div className="flex items-center gap-2 p-4 border-t border-slate-100 dark:border-slate-800">
            <button onClick={save} disabled={busy || !title.trim()} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-slate-900 dark:bg-emerald-600 rounded-xl px-4 py-2 hover:-translate-y-0.5 transition-transform shadow-soft disabled:opacity-50">
              <ScrollText size={15} /> {creating ? "Créer la politique" : "Enregistrer"}
            </button>
            {url && <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[12px] text-sky-700 border border-sky-200 rounded-lg px-3 py-2 hover:bg-sky-50"><ExternalLink size={13} /> Ouvrir le document</a>}
            {!creating && policy && (
              <button onClick={remove} disabled={busy} className="ml-auto inline-flex items-center gap-1 text-[12px] text-rose-600 border border-rose-200 rounded-lg px-3 py-2 hover:bg-rose-50 dark:hover:bg-rose-500/10"><Trash2 size={14} /> Supprimer</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Une ligne de suivi de diffusion (un service) avec la progression du cycle. */
function DiffusionRow({ d, canEdit, onStage, onNote, onRemove }: { d: PolicyDiffusion; policyId: string; canEdit: boolean; onStage: (stage: string) => void; onNote: (note: string) => void; onRemove: () => void }) {
  const [note, setNote] = useState(d.note);
  const idx = policyStageIndex(d.stage);
  return (
    <div className="px-3 py-2.5">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[13px] font-medium text-slate-800 dark:text-slate-100 flex-1 min-w-[8rem] truncate">{d.service}</span>
        {/* Progression du cycle (4 pastilles) */}
        <div className="flex items-center gap-1">
          {POLICY_STAGES.map((s, i) => (
            <span key={s} title={s} className={`h-2 w-2 rounded-full ${d.stage === POLICY_STAGE_NA ? "bg-slate-200" : i <= idx ? "bg-emerald-500" : "bg-slate-200"}`} />
          ))}
        </div>
        <span className={`text-[10px] font-medium rounded-full px-2 py-0.5 border ${POLICY_STAGE_TONE[d.stage] ?? "bg-slate-100 text-slate-500"}`}>{d.stage}</span>
        {canEdit ? (
          <select value={d.stage} onChange={(e) => onStage(e.target.value)} aria-label={`Étape ${d.service}`} className="text-[11px] border border-slate-200 rounded px-1 py-0.5 bg-white">
            {POLICY_STAGE_ALL.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        ) : null}
        {canEdit && (
          <button onClick={onRemove} aria-label="Retirer ce service" className="text-slate-300 hover:text-rose-600"><X size={14} /></button>
        )}
      </div>
      {canEdit && (
        <input value={note} onChange={(e) => setNote(e.target.value)} onBlur={() => note !== d.note && onNote(note)} placeholder="Note (interlocuteur, date d'entretien…)" className="mt-1.5 w-full text-[11px] border border-slate-100 rounded px-2 py-1 text-slate-600 outline-none focus:border-slate-300" />
      )}
    </div>
  );
}

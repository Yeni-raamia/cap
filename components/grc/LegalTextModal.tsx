"use client";

import { useState } from "react";
import { Plus, Scale, Trash2, X } from "lucide-react";
import {
  LEGAL_KINDS,
  LEGAL_STATUS,
  type LegalArticle,
  type LegalText,
} from "@/lib/domain";
import { toDayInput } from "@/lib/period";
import { useApp } from "@/components/app-context";

const inputCls =
  "w-full text-[13px] border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 bg-white dark:bg-slate-900 focus:border-emerald-400 outline-none";
const labelCls = "block text-[11px] font-medium text-slate-500 mb-1";

/**
 * Fiche d'un texte légal : métadonnées et articles.
 *
 * Chaque article devient une mesure évaluable dans l'onglet Conformité ; son
 * repère (« Art. 12 ») sert de clé, c'est donc le seul champ obligatoire.
 */
export function LegalTextModal({
  text,
  creating,
  onClose,
}: {
  text: LegalText | null;
  creating: boolean;
  onClose: () => void;
}) {
  const { me, profiles, legalTextAction } = useApp();
  const canDelete = ["manager", "directeur", "admin"].includes(me.role);

  const [name, setName] = useState(text?.name ?? "");
  const [kind, setKind] = useState(text?.kind ?? LEGAL_KINDS[0]);
  const [authority, setAuthority] = useState(text?.authority ?? "");
  const [reference, setReference] = useState(text?.reference ?? "");
  const [publishedAt, setPublishedAt] = useState(toDayInput(text?.publishedAt ?? null));
  const [effectiveAt, setEffectiveAt] = useState(toDayInput(text?.effectiveAt ?? null));
  const [reviewDate, setReviewDate] = useState(toDayInput(text?.reviewDate ?? null));
  const [url, setUrl] = useState(text?.url ?? "");
  const [description, setDescription] = useState(text?.description ?? "");
  const [scope, setScope] = useState(text?.scope ?? "");
  const [status, setStatus] = useState(text?.status ?? LEGAL_STATUS[0]);
  const [applicable, setApplicable] = useState(text?.applicable ?? true);
  const [ownerId, setOwnerId] = useState(text?.ownerId ?? me.id);
  const [articles, setArticles] = useState<LegalArticle[]>(text?.articles ?? []);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const setArticle = (i: number, patch: Partial<LegalArticle>) =>
    setArticles((prev) => prev.map((a, k) => (k === i ? { ...a, ...patch } : a)));
  const addArticle = () =>
    setArticles((prev) => [...prev, { code: "", title: "", requirement: "", group: "Dispositions générales" }]);
  const removeArticle = (i: number) => setArticles((prev) => prev.filter((_, k) => k !== i));

  // Les articles sans repère seront écartés à l'enregistrement : on prévient.
  const sansCode = articles.filter((a) => !a.code.trim()).length;
  const codes = articles.map((a) => a.code.trim()).filter(Boolean);
  const doublons = codes.length - new Set(codes).size;

  const save = async () => {
    if (!name.trim()) return setErr("Intitulé requis.");
    setBusy(true);
    setErr(null);
    const payload = {
      name: name.trim(),
      kind,
      authority,
      reference,
      publishedAt: publishedAt || null,
      effectiveAt: effectiveAt || null,
      reviewDate: reviewDate || null,
      url,
      description,
      scope,
      status,
      applicable,
      ownerId,
      articles,
    };
    const e = await legalTextAction(creating ? "create" : "update", creating ? payload : { id: text!.id, ...payload });
    setBusy(false);
    if (e) setErr(e);
    else onClose();
  };

  const remove = async () => {
    if (!text) return;
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        `Supprimer « ${text.name} » ?\n\nLes évaluations de ses ${text.articles.length} article(s) seront également supprimées.`
      )
    )
      return;
    setBusy(true);
    const e = await legalTextAction("delete", { id: text.id });
    setBusy(false);
    if (e) setErr(e);
    else onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto animate-fade" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl my-8 max-h-[92vh] overflow-y-auto animate-pop" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3 p-4 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
          <Scale size={20} className="text-indigo-600 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-semibold text-slate-800 dark:text-slate-100">
              {creating ? "Nouveau texte légal ou réglementaire" : text?.ref}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Chaque article devient une mesure évaluable dans la Conformité.
            </div>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        <div className="p-4 space-y-3">
          {err && <div className="text-[12px] text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{err}</div>}

          <div>
            <label className={labelCls} htmlFor="lex-name">Intitulé du texte</label>
            <input id="lex-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Loi sur la protection des données à caractère personnel" className={inputCls} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className={labelCls} htmlFor="lex-kind">Nature</label>
              <select id="lex-kind" value={kind} onChange={(e) => setKind(e.target.value)} className={inputCls}>
                {LEGAL_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="lex-ref">Numéro officiel</label>
              <input id="lex-ref" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="n° 2024-123" className={inputCls} />
            </div>
            <div>
              <label className={labelCls} htmlFor="lex-status">Statut</label>
              <select id="lex-status" value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
                {LEGAL_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="lex-owner">Responsable</label>
              <select id="lex-owner" value={ownerId ?? ""} onChange={(e) => setOwnerId(e.target.value)} className={inputCls}>
                {profiles.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="lex-auth">Autorité émettrice</label>
              <input id="lex-auth" value={authority} onChange={(e) => setAuthority(e.target.value)} placeholder="Ministère, régulateur…" className={inputCls} />
            </div>
            <div>
              <label className={labelCls} htmlFor="lex-pub">Publication</label>
              <input id="lex-pub" type="date" value={publishedAt} onChange={(e) => setPublishedAt(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls} htmlFor="lex-eff">Entrée en vigueur</label>
              <input id="lex-eff" type="date" value={effectiveAt} onChange={(e) => setEffectiveAt(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls} htmlFor="lex-rev">Prochaine revue</label>
              <input id="lex-rev" type="date" value={reviewDate} onChange={(e) => setReviewDate(e.target.value)} className={inputCls} />
            </div>
          </div>

          <div>
            <label className={labelCls} htmlFor="lex-scope">Portée dans l&apos;organisation</label>
            <input id="lex-scope" value={scope} onChange={(e) => setScope(e.target.value)} placeholder="Quels traitements, directions ou systèmes sont concernés" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} htmlFor="lex-url">Lien vers le texte</label>
              <input id="lex-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" className={inputCls} />
            </div>
            <div className="flex items-end pb-2">
              <label className="inline-flex items-center gap-2 text-[12.5px] text-slate-600 dark:text-slate-300 cursor-pointer">
                <input type="checkbox" checked={applicable} onChange={(e) => setApplicable(e.target.checked)} className="h-3.5 w-3.5 accent-emerald-600" />
                Applicable à l&apos;organisation
                <span className="text-[11px] text-slate-400">(sinon conservé au registre, non évalué)</span>
              </label>
            </div>
          </div>
          <div>
            <label className={labelCls} htmlFor="lex-desc">Objet du texte</label>
            <textarea id="lex-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={inputCls} />
          </div>

          {/* Articles */}
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-[11px] font-medium text-slate-500 uppercase">Articles & exigences</span>
              <span className="text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-600 px-2 py-0.5 rounded-full font-medium">{articles.length}</span>
              <button onClick={addArticle} className="ml-auto inline-flex items-center gap-1 text-[12px] font-medium text-indigo-700 border border-indigo-200 hover:bg-indigo-50 rounded-lg px-2.5 py-1">
                <Plus size={14} /> Ajouter un article
              </button>
            </div>

            {articles.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-700 px-3 py-4 text-[12.5px] text-slate-400 text-center">
                Aucun article. Sans article, le texte reste au registre mais n&apos;apparaît pas dans la Conformité.
              </div>
            ) : (
              <div className="space-y-2">
                {articles.map((a, i) => (
                  <div key={i} className="rounded-lg border border-slate-200 dark:border-slate-700 p-2 space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-[7rem_1fr_10rem_auto] gap-2">
                      <input
                        value={a.code}
                        onChange={(e) => setArticle(i, { code: e.target.value })}
                        placeholder="Art. 12"
                        aria-label="Repère de l'article"
                        className={`${inputCls} font-mono ${!a.code.trim() ? "border-amber-300" : ""}`}
                      />
                      <input value={a.title} onChange={(e) => setArticle(i, { title: e.target.value })} placeholder="Intitulé de l'article" aria-label="Intitulé" className={inputCls} />
                      <input value={a.group} onChange={(e) => setArticle(i, { group: e.target.value })} placeholder="Chapitre" aria-label="Chapitre" className={inputCls} />
                      <button onClick={() => removeArticle(i)} aria-label="Retirer cet article" className="text-slate-300 hover:text-rose-600 px-1">
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <textarea
                      value={a.requirement}
                      onChange={(e) => setArticle(i, { requirement: e.target.value })}
                      rows={2}
                      placeholder="Ce que le texte impose, en clair — sert de guide à l'évaluation."
                      aria-label="Exigence"
                      className={inputCls}
                    />
                  </div>
                ))}
              </div>
            )}

            {(sansCode > 0 || doublons > 0) && (
              <div className="mt-1.5 text-[11.5px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                {sansCode > 0 && <>{sansCode} article(s) sans repère seront ignorés à l&apos;enregistrement. </>}
                {doublons > 0 && <>{doublons} repère(s) en double : seul le premier sera conservé.</>}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button onClick={save} disabled={busy || !name.trim()} className="inline-flex items-center gap-1 text-[13px] font-semibold text-white bg-emerald-600 rounded-lg px-4 py-2 hover:bg-emerald-700 disabled:opacity-40">
              {creating ? "Ajouter au registre" : "Enregistrer"}
            </button>
            <button onClick={onClose} className="text-[13px] text-slate-500 px-3 py-2">Annuler</button>
            {!creating && canDelete && (
              <button onClick={remove} disabled={busy} className="inline-flex items-center gap-1 text-[13px] font-medium text-rose-600 border border-rose-200 rounded-lg px-3 py-2 hover:bg-rose-50 ml-auto">
                <Trash2 size={14} /> Supprimer
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

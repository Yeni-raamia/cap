"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Plus, X } from "lucide-react";
import {
  buildRef,
  buildSubjectLine,
  contactDisplayName,
  isUrgentType,
  nextRefNumber,
  parseEmail,
  parseSubject,
  PRIVATE_SPACE_ENABLED,
  type ParsedSubject,
  type Priorite,
} from "@/lib/domain";
import { APP_MOTTO } from "@/lib/config";
import { copyText } from "@/lib/clipboard";
import { useApp } from "./app-context";
import { MetierChip, Token, TypeTag } from "./atoms";
import { ContactAutocomplete } from "./ContactAutocomplete";

type Mode = "codes" | "coller";

export function NewSuiviModal() {
  const { showNew, setShowNew, create, items, catalogue, refLists } = useApp();

  const [mode, setMode] = useState<Mode>("codes");

  // Champs communs
  const [prio, setPrio] = useState<Priorite>("Moyenne");
  const [destService, setDestService] = useState("");
  const [dest, setDest] = useState("");
  const [destEmail, setDestEmail] = useState("");
  const [points, setPoints] = useState("");
  const [nonConformite, setNonConformite] = useState(false);
  const [publishNow, setPublishNow] = useState(false);
  const [dueDuration, setDuration] = useState("");

  // Mode « codes »
  const [metier, setMetier] = useState("");
  const [type, setType] = useState("");
  const [objet, setObjet] = useState("");
  const [caseNum, setCaseNum] = useState("");

  // Mode « coller » (ancien parseur)
  const [raw, setRaw] = useState("");
  const email = useMemo(() => parseEmail(raw), [raw]);
  const parsedRaw = useMemo(() => parseSubject(email.subject || raw, catalogue), [email.subject, raw, catalogue]);

  // Sélection d'un contact de l'annuaire → pré-remplit nom, service et e-mail.
  const onPickContact = (c: { prenom?: string; nom?: string; service?: string; email?: string }) => {
    setDest(contactDisplayName(c));
    if (c.service && refLists.services.includes(c.service)) setDestService(c.service);
    if (c.email) setDestEmail(c.email);
  };

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!showNew) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowNew(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showNew, setShowNew]);

  if (!showNew) return null;

  const isCase = metier === "CASE";
  // Numéro : auto (max+1 du métier) sauf CASE où il vient de l'utilisateur (TheHive).
  const autoNum = metier ? nextRefNumber(items, metier) : 0;
  const numForRef = isCase ? caseNum.trim() : autoNum;
  const ref = metier && (!isCase || caseNum.trim()) ? buildRef(metier, numForRef) : "";
  const subjectLine =
    ref && type && objet.trim() ? buildSubjectLine(ref, type, objet) : "";

  const canCreateCodes = Boolean(metier && type && objet.trim() && (!isCase || caseNum.trim()));

  const reset = () => {
    setMetier("");
    setType("");
    setObjet("");
    setCaseNum("");
    setRaw("");
    setPrio("Moyenne");
    setDestService("");
    setDest("");
    setDestEmail("");
    setPoints("");
    setNonConformite(false);
    setPublishNow(false);
    setDuration("");
    setCopied(false);
  };

  const close = () => {
    setShowNew(false);
    reset();
  };

  const copySubject = async () => {
    if (!subjectLine) return;
    if (await copyText(subjectLine)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
  };

  const submit = () => {
    let parsed: ParsedSubject | null = null;
    if (mode === "codes" && canCreateCodes) {
      parsed = { metier, type, urgent: isUrgentType(type, catalogue.types), ref, objet: objet.trim() };
    } else if (mode === "coller" && parsedRaw) {
      parsed = parsedRaw;
    }
    if (!parsed) return;
    const dur = dueDuration.trim() ? Number(dueDuration) : null;
    create(parsed, prio, dest, destService, points, nonConformite, dur && dur > 0 ? dur : null, destEmail.trim(), publishNow);
    reset();
  };

  const canSubmit = mode === "codes" ? canCreateCodes : Boolean(parsedRaw);

  const inputCls =
    "w-full mt-1 text-[13px] border border-slate-200 rounded-lg px-2 py-2 focus:border-emerald-400 outline-none";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm animate-fade" onClick={close} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Nouveau suivi de mail"
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl p-5 max-h-[92vh] overflow-y-auto animate-pop"
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-700 grid place-items-center">
            <Plus size={17} />
          </div>
          <div className="font-semibold text-slate-800">Nouveau suivi de mail</div>
          <button
            onClick={close}
            aria-label="Fermer"
            className="ml-auto text-slate-400 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        {/* Sélecteur de mode */}
        <div className="inline-flex rounded-lg border border-slate-200 p-0.5 mb-4 text-[12px]">
          <button
            onClick={() => setMode("codes")}
            className={`px-3 py-1.5 rounded-md font-medium transition ${
              mode === "codes" ? "bg-emerald-600 text-white" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Choisir les codes
          </button>
          <button
            onClick={() => setMode("coller")}
            className={`px-3 py-1.5 rounded-md font-medium transition ${
              mode === "coller" ? "bg-emerald-600 text-white" : "text-slate-500 hover:text-slate-700"
            }`}
          >
Coller un e-mail
          </button>
        </div>

        {mode === "codes" ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[12px] font-medium text-slate-600" htmlFor="metier">
                  Métier
                </label>
                <select
                  id="metier"
                  value={metier}
                  onChange={(e) => setMetier(e.target.value)}
                  className={inputCls}
                >
                  <option value="">Choisir…</option>
                  {Object.entries(catalogue.metiers).map(([code, m]) => (
                    <option key={code} value={code}>
                      {code} — {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[12px] font-medium text-slate-600" htmlFor="type">
                  Type
                </label>
                <select
                  id="type"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className={inputCls}
                >
                  <option value="">Choisir…</option>
                  {Object.keys(catalogue.types).map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {isCase && (
              <div className="mt-3">
                <label className="text-[12px] font-medium text-slate-600" htmlFor="casenum">
                  N° de cas (TheHive)
                </label>
                <input
                  id="casenum"
                  inputMode="numeric"
                  value={caseNum}
                  onChange={(e) => setCaseNum(e.target.value.replace(/[^0-9#]/g, ""))}
                  placeholder="1188"
                  className={`${inputCls} font-mono`}
                />
              </div>
            )}

            <label className="text-[12px] font-medium text-slate-600 mt-3 block" htmlFor="objet">
              Objet (lisible)
            </label>
            <input
              id="objet"
              autoFocus
              value={objet}
              onChange={(e) => setObjet(e.target.value)}
              placeholder="Vulnérabilité critique Exchange non corrigée"
              className={inputCls}
            />

            {/* Aperçu en direct de l'objet normalisé */}
            <div className="mt-3 bg-slate-900 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-mono uppercase tracking-wide text-emerald-300">
                  Aperçu de l&apos;objet
                </span>
                {ref && (
                  <span className="ml-auto flex items-center gap-1.5">
                    <MetierChip code={metier} />
                    {type && <TypeTag t={type} />}
                    <Token>{ref}</Token>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 font-mono text-[12px] text-slate-100 break-all">
                  {subjectLine || (
                    <span className="text-slate-500">
                      Choisis un métier, un type et écris l&apos;objet…
                    </span>
                  )}
                </code>
                <button
                  onClick={copySubject}
                  disabled={!subjectLine}
                  className="shrink-0 flex items-center gap-1 text-[11px] font-medium text-slate-900 bg-emerald-400 rounded-md px-2 py-1.5 hover:bg-emerald-300 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? "Copié" : "Copier l'objet"}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-2">
                La référence <span className="font-mono">{ref || "…"}</span> est générée
                automatiquement — colle cet objet tel quel dans ton client mail.
              </p>
            </div>
          </>
        ) : (
          <>
            <label className="text-[12px] font-medium text-slate-600" htmlFor="raw-objet">
              Colle l&apos;objet, ou <span className="font-semibold">l&apos;e-mail complet</span> (en-têtes + corps)
            </label>
            <textarea
              id="raw-objet"
              autoFocus
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              rows={4}
              placeholder={"Objet : [SOC-2026-0042] ALERTE — Vulnérabilité critique…\nDe : Alice <alice@dssi.fr>\nÀ : Prestataire réseau\n\nMerci de corriger la faille Exchange…"}
              className={`${inputCls} font-mono`}
            />
            {email.subject && (email.to || email.points.length > 0) && (
              <button
                type="button"
                onClick={() => { if (email.to) setDest(email.to); if (email.points.length) setPoints(email.points.join("\n")); }}
                className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-medium text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 rounded-lg px-2.5 py-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
              >
                ⤵ Pré-remplir depuis l&apos;e-mail{email.to ? ` · dest. « ${email.to} »` : ""}{email.points.length ? ` · ${email.points.length} point(s)` : ""}
              </button>
            )}
            {raw && !parsedRaw && (
              <div className="text-[11px] text-rose-500 mt-1">
                Objet non reconnu — vérifie le format [MÉTIER-2026-####] TYPE — objet.
              </div>
            )}
            {parsedRaw && (
              <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center gap-2 flex-wrap">
                <span className="text-[11px] text-emerald-700 font-medium">Reconnu :</span>
                <MetierChip code={parsedRaw.metier} />
                <TypeTag t={parsedRaw.type} />
                <Token>{parsedRaw.ref}</Token>
                <span className="text-[12px] text-slate-600 w-full mt-1">{parsedRaw.objet}</span>
              </div>
            )}
          </>
        )}

        {/* Champs communs */}
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <label className="text-[12px] font-medium text-slate-600" htmlFor="prio">
              Priorité
            </label>
            <select
              id="prio"
              value={prio}
              onChange={(e) => setPrio(e.target.value as Priorite)}
              className={inputCls}
            >
              <option>Critique</option>
              <option>Élevé</option>
              <option>Moyenne</option>
            </select>
          </div>
          <div>
            <label className="text-[12px] font-medium text-slate-600" htmlFor="destService">
              Service destinataire
            </label>
            <select
              id="destService"
              value={destService}
              onChange={(e) => setDestService(e.target.value)}
              className={inputCls}
            >
              <option value="">— service —</option>
              {refLists.services.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-3">
          <label className="text-[12px] font-medium text-slate-600" htmlFor="dest">
            Destinataire (nom de la personne)
          </label>
          <ContactAutocomplete
            id="dest"
            value={dest}
            onChange={setDest}
            onPick={onPickContact}
            placeholder="Tape quelques lettres — l'annuaire propose les contacts"
            className={inputCls}
          />
          <p className="text-[10px] text-slate-400 mt-1">
            Choisis un contact de l&apos;annuaire (nom, service et e-mail pré-remplis) ou saisis un nouveau nom.
          </p>
        </div>
        <div className="mt-3">
          <label className="text-[12px] font-medium text-slate-600" htmlFor="destEmail">
            E-mail du destinataire <span className="text-slate-400">(pour envoyer les relances)</span>
          </label>
          <input
            id="destEmail"
            type="email"
            value={destEmail}
            onChange={(e) => setDestEmail(e.target.value)}
            placeholder="prenom.nom@exemple.fr"
            className={inputCls}
          />
        </div>

        <label className="text-[12px] font-medium text-slate-600 mt-3 block" htmlFor="points">
          Points clés (une ligne chacun)
        </label>
        <textarea
          id="points"
          value={points}
          onChange={(e) => setPoints(e.target.value)}
          rows={2}
          className={inputCls}
          placeholder={"Correctif disponible\nFenêtre à planifier"}
        />

        <label className="text-[12px] font-medium text-slate-600 mt-3 block" htmlFor="duree">
          Durée de traitement acceptable (jours)
        </label>
        <input
          id="duree"
          type="number"
          min={1}
          value={dueDuration}
          onChange={(e) => setDuration(e.target.value)}
          className={inputCls}
          placeholder="Ex. 5 — au-delà, notification + suivi en retard"
        />

        <label className="flex items-start gap-2 mt-3 text-[12px] text-slate-600 cursor-pointer bg-orange-50/60 border border-orange-200 rounded-lg px-3 py-2">
          <input
            type="checkbox"
            checked={nonConformite}
            onChange={(e) => setNonConformite(e.target.checked)}
            className="h-3.5 w-3.5 accent-orange-600 mt-0.5"
          />
          <span>
            <span className="font-medium text-slate-700">Non-conformité à la politique de sécurité</span>
            <span className="block text-[11px] text-slate-500">
              Ouvre automatiquement une fiche dans le module Non-conformités.
            </span>
          </span>
        </label>

        {/* Espace privé (Lot 2) — masqué tant que PRIVATE_SPACE_ENABLED est false. */}
        {PRIVATE_SPACE_ENABLED && (
          <label className="flex items-start gap-2 mt-2 text-[12px] text-slate-600 cursor-pointer bg-emerald-50/60 border border-emerald-200 rounded-lg px-3 py-2">
            <input
              type="checkbox"
              checked={publishNow}
              onChange={(e) => setPublishNow(e.target.checked)}
              className="h-3.5 w-3.5 accent-emerald-600 mt-0.5"
            />
            <span>
              <span className="font-medium text-slate-700">Publier tout de suite (visible par l&apos;équipe)</span>
              <span className="block text-[11px] text-slate-500">
                Par défaut, un nouveau suivi est <strong>privé</strong> (visible de vous seul) et reste dans « Mon espace ». Vous pourrez le publier plus tard.
              </span>
            </span>
          </label>
        )}

        <div className="flex gap-2 mt-4">
          <button
            onClick={close}
            className="flex-1 text-[13px] text-slate-600 border border-slate-200 rounded-lg py-2 hover:bg-slate-50"
          >
            Annuler
          </button>
          <button
            disabled={!canSubmit}
            onClick={submit}
            className="flex-1 text-[13px] font-medium text-white bg-emerald-600 rounded-lg py-2 hover:bg-emerald-700 disabled:opacity-40"
          >
            Créer le suivi de mail
          </button>
        </div>
        <p className="text-[11px] text-slate-400 mt-3 text-center">{APP_MOTTO} — le suivi de mail démarre ici.</p>
      </div>
    </div>
  );
}

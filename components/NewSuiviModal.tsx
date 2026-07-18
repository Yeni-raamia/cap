"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Plus, X } from "lucide-react";
import {
  buildRef,
  buildSubjectLine,
  isUrgentType,
  nextRefNumber,
  parseSubject,
  type ParsedSubject,
  type Priorite,
} from "@/lib/domain";
import { APP_MOTTO } from "@/lib/config";
import { useApp } from "./app-context";
import { MetierChip, Token, TypeTag } from "./atoms";

type Mode = "codes" | "coller";

export function NewSuiviModal() {
  const { showNew, setShowNew, create, items, catalogue } = useApp();

  const [mode, setMode] = useState<Mode>("codes");

  // Champs communs
  const [prio, setPrio] = useState<Priorite>("Moyenne");
  const [dest, setDest] = useState("");
  const [points, setPoints] = useState("");

  // Mode « codes »
  const [metier, setMetier] = useState("");
  const [type, setType] = useState("");
  const [objet, setObjet] = useState("");
  const [caseNum, setCaseNum] = useState("");

  // Mode « coller » (ancien parseur)
  const [raw, setRaw] = useState("");
  const parsedRaw = useMemo(() => parseSubject(raw, catalogue), [raw, catalogue]);

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
    setDest("");
    setPoints("");
    setCopied(false);
  };

  const close = () => {
    setShowNew(false);
    reset();
  };

  const copySubject = async () => {
    if (!subjectLine) return;
    try {
      await navigator.clipboard.writeText(subjectLine);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Presse-papiers indisponible : on ignore silencieusement.
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
    create(parsed, prio, dest, points);
    reset();
  };

  const canSubmit = mode === "codes" ? canCreateCodes : Boolean(parsedRaw);

  const inputCls =
    "w-full mt-1 text-[13px] border border-slate-200 rounded-lg px-2 py-2 focus:border-emerald-400 outline-none";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-slate-900/30" onClick={close} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Nouveau suivi"
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl p-5 max-h-[92vh] overflow-y-auto"
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-700 grid place-items-center">
            <Plus size={17} />
          </div>
          <div className="font-semibold text-slate-800">Nouveau suivi</div>
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
            Coller un objet existant
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
              Colle l&apos;objet du mail (fil déjà en cours)
            </label>
            <input
              id="raw-objet"
              autoFocus
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder="[SOC-2026-0042] ALERTE — Vulnérabilité critique…"
              className={`${inputCls} font-mono`}
            />
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
            <label className="text-[12px] font-medium text-slate-600" htmlFor="dest">
              Destinataire principal
            </label>
            <input
              id="dest"
              value={dest}
              onChange={(e) => setDest(e.target.value)}
              placeholder="Service informatique — Réseau"
              className={inputCls}
            />
          </div>
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
            Créer le suivi
          </button>
        </div>
        <p className="text-[11px] text-slate-400 mt-3 text-center">{APP_MOTTO} — le suivi démarre ici.</p>
      </div>
    </div>
  );
}

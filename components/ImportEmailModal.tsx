"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, Mailbox, Paperclip, Plus, Upload, X } from "lucide-react";
import { fmt, parseSubject, type Priorite } from "@/lib/domain";
import { useApp } from "./app-context";

interface ParsedResult {
  subject: string;
  from: string;
  fromEmail: string;
  to: string;
  date: string | null;
  text: string;
  points: string[];
  refToken: string | null;
  match: { id: string; ref: string; objet: string; statut: string } | null;
  attachments: { filename: string; mime: string; size: number }[];
}

type Mode = "response" | "create";
const PRIOS: Priorite[] = ["Critique", "Élevé", "Moyenne"];

/** Import d'un e-mail (.eml) : réponse sur un suivi, ou création d'un nouveau suivi. */
export function ImportEmailModal() {
  const { showImport, setShowImport, importEmailResponse, createItemFromEmail, items, me, catalogue } = useApp();

  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<ParsedResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("response");

  // Mode « réponse »
  const [selItem, setSelItem] = useState<string>("");
  const [importing, setImporting] = useState(false);

  // Mode « nouveau suivi »
  const [cMetier, setCMetier] = useState("");
  const [cType, setCType] = useState("");
  const [cPrio, setCPrio] = useState<Priorite>("Moyenne");
  const [cObjet, setCObjet] = useState("");
  const [cDest, setCDest] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!showImport) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setShowImport(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showImport, setShowImport]);

  const editable = useMemo(
    () =>
      items
        .filter((i) => (me.role === "agent" ? i.ownerId === me.id : true))
        .filter((i) => i.statut !== "Clôturé")
        .slice()
        .sort((a, b) => a.ref.localeCompare(b.ref)),
    [items, me]
  );
  const metiers = useMemo(() => Object.keys(catalogue.metiers).filter((m) => m !== "CASE"), [catalogue]);
  const types = useMemo(() => Object.keys(catalogue.types), [catalogue]);

  if (!showImport) return null;

  const reset = () => {
    setFile(null);
    setParsed(null);
    setSelItem("");
    setError(null);
    setCMetier("");
    setCType("");
    setCPrio("Moyenne");
    setCObjet("");
    setCDest("");
  };
  const close = () => {
    setShowImport(false);
    reset();
  };

  const onPick = async (f: File | null) => {
    setFile(f);
    setParsed(null);
    setError(null);
    if (!f) return;
    setParsing(true);
    try {
      const form = new FormData();
      form.append("file", f);
      const r = await fetch("/api/email/parse", { method: "POST", body: form });
      const d = await r.json();
      if (!r.ok) {
        setError(d.error || "Analyse impossible.");
        return;
      }
      const res = d as ParsedResult;
      setParsed(res);
      setSelItem(res.match?.id ?? "");
      setMode(res.match ? "response" : "create");
      // Pré-remplissage du formulaire de création
      setCObjet(res.subject || "");
      setCDest(res.from || res.fromEmail || "");
      const ps = parseSubject(res.subject, catalogue);
      if (ps) {
        setCMetier(ps.metier === "CASE" ? "" : ps.metier);
        setCType(ps.type);
      }
    } catch {
      setError("Analyse impossible.");
    } finally {
      setParsing(false);
    }
  };

  const confirmResponse = async () => {
    if (!file || !selItem) return;
    setImporting(true);
    const ok = await importEmailResponse(selItem, file);
    setImporting(false);
    if (ok) close();
  };

  const confirmCreate = async () => {
    if (!file || !cMetier || !cType || !cObjet.trim()) return;
    setCreating(true);
    const ok = await createItemFromEmail(file, {
      metier: cMetier,
      type: cType,
      prio: cPrio,
      objet: cObjet.trim(),
      dest: cDest.trim(),
    });
    setCreating(false);
    if (ok) close();
  };

  const inputCls = "w-full text-[13px] border border-slate-200 rounded-lg px-2 py-2 outline-none focus:border-emerald-400";
  const tabCls = (active: boolean) =>
    `flex-1 text-[12px] font-medium rounded-lg px-3 py-1.5 border ${
      active ? "bg-emerald-600 text-white border-emerald-600" : "text-slate-600 border-slate-200 hover:bg-slate-50"
    }`;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm animate-fade" onClick={close} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Importer un e-mail"
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl p-5 max-h-[92vh] overflow-y-auto animate-pop"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-700 grid place-items-center">
              <Mailbox size={17} />
            </div>
            <div>
              <div className="text-[15px] font-bold text-slate-800">Importer un e-mail (.eml)</div>
              <div className="text-[11.5px] text-slate-500">Réponse sur un suivi, ou création d&apos;un nouveau suivi.</div>
            </div>
          </div>
          <button onClick={close} aria-label="Fermer" className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <input
          type="file"
          accept=".eml,message/rfc822"
          onChange={(e) => onPick(e.target.files?.[0] ?? null)}
          className="block w-full text-[12px] text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-[12px] file:font-medium file:text-slate-700 hover:file:bg-slate-200"
        />
        <p className="text-[11px] text-slate-400 mt-1">
          Depuis votre messagerie : glissez l&apos;e-mail sur le bureau ou « Enregistrer sous » au format .eml.
        </p>

        {parsing && (
          <div className="mt-4 flex items-center gap-2 text-[13px] text-slate-500">
            <Loader2 size={15} className="animate-spin" /> Analyse de l&apos;e-mail…
          </div>
        )}

        {error && <div className="mt-4 text-[12px] text-rose-600">{error}</div>}

        {parsed && (
          <div className="mt-4 space-y-3">
            {/* Aperçu */}
            <div className="rounded-xl border border-slate-200 p-3 space-y-1.5">
              <div className="text-[13px] font-semibold text-slate-800 truncate">{parsed.subject || "(sans objet)"}</div>
              <div className="text-[11.5px] text-slate-500">
                De <b className="text-slate-700">{parsed.from}</b>
                {parsed.fromEmail && parsed.fromEmail !== parsed.from ? ` <${parsed.fromEmail}>` : ""}
                {parsed.date ? ` · ${fmt(new Date(parsed.date))}` : ""}
              </div>
              {parsed.points.length > 0 && (
                <ul className="text-[11.5px] text-slate-600 list-disc pl-4 space-y-0.5 max-h-24 overflow-y-auto">
                  {parsed.points.map((p, i) => (
                    <li key={i} className="truncate">{p}</li>
                  ))}
                </ul>
              )}
              {parsed.attachments.length > 0 && (
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Paperclip size={12} /> {parsed.attachments.length} pièce(s) jointe(s) dans l&apos;e-mail
                </div>
              )}
            </div>

            {/* Choix : réponse ou nouveau suivi */}
            <div className="flex items-center gap-2">
              <button onClick={() => setMode("response")} className={tabCls(mode === "response")}>
                Réponse sur un suivi
              </button>
              <button onClick={() => setMode("create")} className={tabCls(mode === "create")}>
                Nouveau suivi
              </button>
            </div>

            {mode === "response" ? (
              <>
                <div>
                  <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-slate-400 mb-1">
                    Suivi concerné
                    {parsed.match && (
                      <span className="inline-flex items-center gap-1 text-emerald-600 normal-case tracking-normal">
                        <CheckCircle2 size={12} /> détecté via {parsed.refToken}
                      </span>
                    )}
                  </div>
                  <select value={selItem} onChange={(e) => setSelItem(e.target.value)} className={inputCls}>
                    <option value="">— Choisir un suivi —</option>
                    {editable.map((i) => (
                      <option key={i.id} value={i.id}>{i.ref} — {i.objet}</option>
                    ))}
                  </select>
                  {!parsed.match && (
                    <p className="text-[11px] text-amber-600 mt-1">
                      Aucune référence reconnue — choisissez un suivi, ou créez-en un nouveau.
                    </p>
                  )}
                </div>
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-2.5 text-[11.5px] text-slate-500">
                  La réponse sera enregistrée dans le fil du suivi (statut → <b>En traitement</b>) et l&apos;e-mail
                  attaché comme preuve.
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={confirmResponse}
                    disabled={!selItem || importing}
                    className="inline-flex items-center gap-2 text-[13px] font-semibold text-white bg-emerald-600 rounded-lg px-4 py-2 hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {importing ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                    Enregistrer comme réponse
                  </button>
                  <button onClick={close} className="text-[12px] text-slate-500 hover:text-slate-700 px-2 py-2">Annuler</button>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] uppercase tracking-wide text-slate-400">Métier</label>
                    <select value={cMetier} onChange={(e) => setCMetier(e.target.value)} className={`${inputCls} mt-1`}>
                      <option value="">— métier —</option>
                      {metiers.map((m) => (<option key={m} value={m}>{m} — {catalogue.metiers[m].label}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-wide text-slate-400">Type</label>
                    <select value={cType} onChange={(e) => setCType(e.target.value)} className={`${inputCls} mt-1`}>
                      <option value="">— type —</option>
                      {types.map((t) => (<option key={t} value={t}>{t}</option>))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-wide text-slate-400">Objet</label>
                  <input value={cObjet} onChange={(e) => setCObjet(e.target.value)} className={`${inputCls} mt-1`} placeholder="Objet du suivi" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] uppercase tracking-wide text-slate-400">Destinataire</label>
                    <input value={cDest} onChange={(e) => setCDest(e.target.value)} className={`${inputCls} mt-1`} placeholder="Nom / adresse" />
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-wide text-slate-400">Priorité</label>
                    <select value={cPrio} onChange={(e) => setCPrio(e.target.value as Priorite)} className={`${inputCls} mt-1`}>
                      {PRIOS.map((p) => (<option key={p} value={p}>{p}</option>))}
                    </select>
                  </div>
                </div>
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-2.5 text-[11.5px] text-slate-500">
                  Un nouveau suivi sera créé (référence attribuée automatiquement), les points clés repris de
                  l&apos;e-mail, et l&apos;e-mail attaché comme preuve.
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={confirmCreate}
                    disabled={!cMetier || !cType || !cObjet.trim() || creating}
                    className="inline-flex items-center gap-2 text-[13px] font-semibold text-white bg-emerald-600 rounded-lg px-4 py-2 hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {creating ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                    Créer le suivi
                  </button>
                  <button onClick={close} className="text-[12px] text-slate-500 hover:text-slate-700 px-2 py-2">Annuler</button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

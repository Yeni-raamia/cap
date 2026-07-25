"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, Mailbox, Paperclip, Upload, X } from "lucide-react";
import { fmt } from "@/lib/domain";
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

/** Import d'un e-mail (.eml) comme réponse sur un suivi. Modale globale. */
export function ImportEmailModal() {
  const { showImport, setShowImport, importEmailResponse, items, me } = useApp();

  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<ParsedResult | null>(null);
  const [selItem, setSelItem] = useState<string>("");
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!showImport) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setShowImport(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showImport, setShowImport]);

  // Suivis sur lesquels l'utilisateur peut enregistrer une réponse.
  const editable = useMemo(
    () =>
      items
        .filter((i) => (me.role === "agent" ? i.ownerId === me.id : true))
        .filter((i) => i.statut !== "Clôturé")
        .slice()
        .sort((a, b) => a.ref.localeCompare(b.ref)),
    [items, me]
  );

  if (!showImport) return null;

  const reset = () => {
    setFile(null);
    setParsed(null);
    setSelItem("");
    setError(null);
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
      setParsed(d as ParsedResult);
      setSelItem(d.match?.id ?? "");
    } catch {
      setError("Analyse impossible.");
    } finally {
      setParsing(false);
    }
  };

  const confirm = async () => {
    if (!file || !selItem) return;
    setImporting(true);
    const ok = await importEmailResponse(selItem, file);
    setImporting(false);
    if (ok) close();
  };

  const inputCls = "w-full text-[13px] border border-slate-200 rounded-lg px-2 py-2 outline-none focus:border-emerald-400";

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
              <div className="text-[11.5px] text-slate-500">Enregistre une réponse reçue sur le suivi correspondant.</div>
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

            {/* Rattachement */}
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
                  <option key={i.id} value={i.id}>
                    {i.ref} — {i.objet}
                  </option>
                ))}
              </select>
              {!parsed.match && (
                <p className="text-[11px] text-amber-600 mt-1">
                  Aucune référence reconnue dans l&apos;objet — choisissez le suivi manuellement.
                </p>
              )}
            </div>

            <div className="rounded-lg bg-slate-50 border border-slate-200 p-2.5 text-[11.5px] text-slate-500">
              La réponse sera enregistrée dans le fil du suivi (statut → <b>En traitement</b>) et l&apos;e-mail
              original attaché comme preuve.
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={confirm}
                disabled={!selItem || importing}
                className="inline-flex items-center gap-2 text-[13px] font-semibold text-white bg-emerald-600 rounded-lg px-4 py-2 hover:bg-emerald-700 disabled:opacity-50"
              >
                {importing ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                Enregistrer comme réponse
              </button>
              <button onClick={close} className="text-[12px] text-slate-500 hover:text-slate-700 px-2 py-2">
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import { Database, Download, Loader2, ShieldAlert, Upload } from "lucide-react";
import { useApp } from "./app-context";
import { Card } from "./atoms";

/** Sauvegarde & restauration de la base locale (admin). */
export function BackupSection() {
  const { toast } = useApp();
  const [downloading, setDownloading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const download = async () => {
    setDownloading(true);
    try {
      const r = await fetch("/api/admin/backup");
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        toast(j.error || "Sauvegarde impossible.", "error");
        return;
      }
      const blob = await r.blob();
      const name =
        /filename="([^"]+)"/.exec(r.headers.get("Content-Disposition") || "")?.[1] || "cap-backup.sqlite";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast("Sauvegarde téléchargée.", "success");
    } catch {
      toast("Sauvegarde impossible.", "error");
    } finally {
      setDownloading(false);
    }
  };

  const restore = async () => {
    if (!file || !confirmed) return;
    setRestoring(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const r = await fetch("/api/admin/restore", { method: "POST", body: form });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        toast(j.error || "Restauration impossible.", "error");
        return;
      }
      toast("Base restaurée. Rechargement…", "success");
      // Toutes les données ont changé (et la session actuelle a pu disparaître) :
      // on recharge entièrement l'application.
      setTimeout(() => window.location.assign("/"), 1200);
    } catch {
      toast("Restauration impossible.", "error");
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Sauvegarde */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Database size={16} className="text-emerald-600" />
          <h2 className="text-[14px] font-bold text-slate-800">Sauvegarde de la base</h2>
        </div>
        <p className="text-[12.5px] text-slate-500">
          Télécharge un instantané complet de toute l&apos;application (membres, suivis, projets, tâches,
          négligences, non-conformités, messages, pièces jointes, journal…) dans un seul fichier SQLite.
          Conserve-le en lieu sûr : il permet de tout restaurer.
        </p>
        <button
          onClick={download}
          disabled={downloading}
          className="inline-flex items-center gap-2 text-[13px] font-semibold text-white bg-emerald-600 rounded-lg px-4 py-2 hover:bg-emerald-700 disabled:opacity-50"
        >
          {downloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
          {downloading ? "Préparation…" : "Télécharger la sauvegarde"}
        </button>
      </Card>

      {/* Restauration */}
      <Card className="p-4 space-y-3 ring-1 ring-rose-200">
        <div className="flex items-center gap-2">
          <ShieldAlert size={16} className="text-rose-600" />
          <h2 className="text-[14px] font-bold text-slate-800">Restauration</h2>
        </div>
        <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-[12px] text-rose-700 space-y-1">
          <p className="font-semibold">Opération irréversible.</p>
          <p>
            La base actuelle sera <b>entièrement remplacée</b> par le fichier fourni. Un instantané de
            sécurité de la base courante est créé automatiquement avant remplacement (fichier <code>.bak</code>
            à côté de la base). Vous serez peut-être déconnecté et l&apos;application se rechargera.
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".sqlite,.db,.bak,application/octet-stream"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setConfirmed(false);
          }}
          className="block w-full text-[12px] text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-[12px] file:font-medium file:text-slate-700 hover:file:bg-slate-200"
        />

        {file && (
          <label className="flex items-start gap-2 text-[12px] text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 accent-rose-600"
            />
            <span>
              Je comprends que cela <b>remplace définitivement</b> les données actuelles par{" "}
              <b>{file.name}</b>.
            </span>
          </label>
        )}

        <button
          onClick={restore}
          disabled={!file || !confirmed || restoring}
          className="inline-flex items-center gap-2 text-[13px] font-semibold text-white bg-rose-600 rounded-lg px-4 py-2 hover:bg-rose-700 disabled:opacity-50"
        >
          {restoring ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
          {restoring ? "Restauration…" : "Restaurer cette sauvegarde"}
        </button>
      </Card>
    </div>
  );
}

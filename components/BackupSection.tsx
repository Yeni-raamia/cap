"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CalendarClock,
  Database,
  Download,
  HardDriveDownload,
  Loader2,
  RotateCcw,
  ShieldAlert,
  Trash2,
  Upload,
} from "lucide-react";
import { formatBytes, type BackupFrequency, type BackupSettings, type ServerBackupFile } from "@/lib/domain";
import { useApp } from "./app-context";
import { Card } from "./atoms";

const fmtDate = (d: string | Date) =>
  new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

/** Sauvegarde & restauration de la base locale (admin). */
export function BackupSection() {
  const { toast } = useApp();

  // Sauvegarde/restauration manuelle par fichier
  const [downloading, setDownloading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sauvegardes planifiées / serveur
  const [cfg, setCfg] = useState<BackupSettings | null>(null);
  const [files, setFiles] = useState<ServerBackupFile[]>([]);
  const [auto, setAuto] = useState(false);
  const [freq, setFreq] = useState<BackupFrequency>("daily");
  const [retention, setRetention] = useState(7);
  const [saving, setSaving] = useState(false);
  const [runningNow, setRunningNow] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/backups");
    if (!r.ok) return;
    const j = (await r.json()) as { settings: BackupSettings; files: ServerBackupFile[] };
    setCfg(j.settings);
    setFiles(j.files);
    setAuto(j.settings.autoEnabled);
    setFreq(j.settings.frequency);
    setRetention(j.settings.retention);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const apply = (j: { settings: BackupSettings; files: ServerBackupFile[] }) => {
    setCfg(j.settings);
    setFiles(j.files);
  };

  const post = async (payload: Record<string, unknown>) => {
    const r = await fetch("/api/admin/backups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return r;
  };

  const downloadFull = async () => {
    setDownloading(true);
    try {
      const r = await fetch("/api/admin/backup");
      if (!r.ok) {
        toast((await r.json().catch(() => ({}))).error || "Sauvegarde impossible.", "error");
        return;
      }
      const blob = await r.blob();
      const name = /filename="([^"]+)"/.exec(r.headers.get("Content-Disposition") || "")?.[1] || "cap-backup.sqlite";
      triggerDownload(URL.createObjectURL(blob), name);
      toast("Sauvegarde téléchargée.", "success");
    } catch {
      toast("Sauvegarde impossible.", "error");
    } finally {
      setDownloading(false);
    }
  };

  const restoreFile = async () => {
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
      setTimeout(() => window.location.assign("/"), 1200);
    } catch {
      toast("Restauration impossible.", "error");
    } finally {
      setRestoring(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const r = await post({ action: "save", autoEnabled: auto, frequency: freq, retention });
      if (r.ok) {
        apply(await r.json());
        toast("Réglages de sauvegarde enregistrés.", "success");
      } else toast("Échec de l'enregistrement.", "error");
    } finally {
      setSaving(false);
    }
  };

  const runNow = async () => {
    setRunningNow(true);
    try {
      const r = await post({ action: "run" });
      if (r.ok) {
        apply(await r.json());
        toast("Sauvegarde créée sur le serveur.", "success");
      } else toast("Sauvegarde impossible.", "error");
    } finally {
      setRunningNow(false);
    }
  };

  const del = async (name: string) => {
    if (!confirm(`Supprimer la sauvegarde « ${name} » ?`)) return;
    setBusy(name);
    try {
      const r = await post({ action: "delete", name });
      if (r.ok) apply(await r.json());
      else toast("Suppression impossible.", "error");
    } finally {
      setBusy(null);
    }
  };

  const restoreServer = async (name: string) => {
    if (!confirm(`Restaurer « ${name} » ? La base actuelle sera entièrement remplacée (un instantané de sécurité est créé au préalable).`))
      return;
    setBusy(name);
    try {
      const r = await post({ action: "restore", name });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        toast(j.error || "Restauration impossible.", "error");
        return;
      }
      toast("Base restaurée. Rechargement…", "success");
      setTimeout(() => window.location.assign("/"), 1200);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Sauvegarde manuelle */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Database size={16} className="text-emerald-600" />
          <h2 className="text-[14px] font-bold text-slate-800">Sauvegarde de la base</h2>
        </div>
        <p className="text-[12.5px] text-slate-500">
          Télécharge un instantané complet de toute l&apos;application (membres, suivis, projets, tâches,
          négligences, non-conformités, messages, pièces jointes, journal…) dans un seul fichier SQLite.
        </p>
        <button
          onClick={downloadFull}
          disabled={downloading}
          className="inline-flex items-center gap-2 text-[13px] font-semibold text-white bg-emerald-600 rounded-lg px-4 py-2 hover:bg-emerald-700 disabled:opacity-50"
        >
          {downloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
          {downloading ? "Préparation…" : "Télécharger la sauvegarde"}
        </button>
      </Card>

      {/* Sauvegardes planifiées */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <CalendarClock size={16} className="text-emerald-600" />
          <h2 className="text-[14px] font-bold text-slate-800">Sauvegardes automatiques</h2>
        </div>
        <p className="text-[12.5px] text-slate-500">
          Crée périodiquement une sauvegarde sur le serveur (dossier <code>data/backups</code>) et ne conserve
          que les plus récentes. Déclenchée lors de l&apos;usage de l&apos;application — aucune tâche planifiée
          externe requise.
        </p>

        <label className="flex items-center gap-2 text-[13px] text-slate-700 cursor-pointer">
          <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} className="accent-emerald-600" />
          Activer les sauvegardes automatiques
        </label>

        <div className="flex flex-wrap items-end gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-1">Fréquence</div>
            <select
              value={freq}
              onChange={(e) => setFreq(e.target.value as BackupFrequency)}
              disabled={!auto}
              className="text-[13px] border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white disabled:opacity-50"
            >
              <option value="daily">Quotidienne</option>
              <option value="weekly">Hebdomadaire</option>
            </select>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-1">Sauvegardes conservées</div>
            <input
              type="number"
              min={1}
              max={90}
              value={retention}
              onChange={(e) => setRetention(Number(e.target.value))}
              className="w-24 text-[13px] border border-slate-200 rounded-lg px-2.5 py-1.5"
            />
          </div>
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 text-[13px] font-semibold text-white bg-emerald-600 rounded-lg px-4 py-2 hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : null}
            Enregistrer
          </button>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={runNow}
            disabled={runningNow}
            className="inline-flex items-center gap-2 text-[13px] font-medium text-slate-700 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 disabled:opacity-50"
          >
            {runningNow ? <Loader2 size={15} className="animate-spin" /> : <HardDriveDownload size={15} />}
            Sauvegarder maintenant sur le serveur
          </button>
          {cfg?.lastRunAt && (
            <span className="text-[11.5px] text-slate-400">Dernière : {fmtDate(cfg.lastRunAt)}</span>
          )}
        </div>

        {/* Liste des sauvegardes serveur */}
        <div className="pt-2">
          <div className="text-[11px] uppercase tracking-wide text-slate-400 mb-1.5">
            Sauvegardes sur le serveur ({files.length})
          </div>
          {files.length === 0 ? (
            <div className="text-[12px] text-slate-400">Aucune sauvegarde serveur pour l&apos;instant.</div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg">
              {files.map((f) => (
                <div key={f.name} className="flex items-center gap-2 px-2.5 py-2">
                  <Database size={13} className="text-slate-300 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] text-slate-700 truncate">{f.name}</div>
                    <div className="text-[11px] text-slate-400">
                      {fmtDate(f.createdAt)} · {formatBytes(f.size)}
                    </div>
                  </div>
                  <a
                    href={`/api/admin/backups/download?name=${encodeURIComponent(f.name)}`}
                    className="p-1.5 text-slate-400 hover:text-emerald-600"
                    title="Télécharger"
                    aria-label="Télécharger"
                  >
                    <Download size={14} />
                  </a>
                  <button
                    onClick={() => restoreServer(f.name)}
                    disabled={busy === f.name}
                    className="p-1.5 text-slate-400 hover:text-amber-600 disabled:opacity-50"
                    title="Restaurer cette sauvegarde"
                    aria-label="Restaurer"
                  >
                    {busy === f.name ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                  </button>
                  <button
                    onClick={() => del(f.name)}
                    disabled={busy === f.name}
                    className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-50"
                    title="Supprimer"
                    aria-label="Supprimer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Restauration depuis un fichier */}
      <Card className="p-4 space-y-3 ring-1 ring-rose-200">
        <div className="flex items-center gap-2">
          <ShieldAlert size={16} className="text-rose-600" />
          <h2 className="text-[14px] font-bold text-slate-800">Restauration depuis un fichier</h2>
        </div>
        <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-[12px] text-rose-700 space-y-1">
          <p className="font-semibold">Opération irréversible.</p>
          <p>
            La base actuelle sera <b>entièrement remplacée</b> par le fichier fourni. Un instantané de
            sécurité de la base courante est créé automatiquement avant remplacement. Vous serez peut-être
            déconnecté et l&apos;application se rechargera.
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
              Je comprends que cela <b>remplace définitivement</b> les données actuelles par <b>{file.name}</b>.
            </span>
          </label>
        )}

        <button
          onClick={restoreFile}
          disabled={!file || !confirmed || restoring}
          className="inline-flex items-center gap-2 text-[13px] font-semibold text-white bg-rose-600 rounded-lg px-4 py-2 hover:bg-rose-700 disabled:opacity-50"
        >
          {restoring ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
          {restoring ? "Restauration…" : "Restaurer ce fichier"}
        </button>
      </Card>
    </div>
  );
}

function triggerDownload(url: string, name: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

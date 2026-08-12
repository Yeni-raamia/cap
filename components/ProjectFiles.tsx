"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, FileText, ImageIcon, Loader2, Paperclip, Trash2, Upload } from "lucide-react";
import { ATTACH_EXTS, ATTACH_MAX_BYTES, fileExt, formatBytes, fmt, type ProjectAttachment } from "@/lib/domain";
import { useApp } from "./app-context";
import { Card } from "./atoms";

const IMG_EXTS = ["png", "jpg", "jpeg", "webp", "gif"];

/** L'API renvoie du JSON : les dates en reviennent en chaînes, à revivifier. */
const reviveFiles = (files: ProjectAttachment[] = []): ProjectAttachment[] =>
  files.map((f) => ({ ...f, createdAt: new Date(f.createdAt) }));
function iconFor(name: string) {
  const e = fileExt(name);
  if (IMG_EXTS.includes(e)) return ImageIcon;
  if (e === "pdf") return FileText;
  return Paperclip;
}

/** Fichiers partagés d'un projet (dépôt, téléchargement, suppression). */
export function ProjectFiles({ projectId, canWrite }: { projectId: string; canWrite: boolean }) {
  const { me, profileById, toast } = useApp();
  const [list, setList] = useState<ProjectAttachment[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/project-files?projectId=${encodeURIComponent(projectId)}`, { cache: "no-store" });
      const d = await r.json();
      if (r.ok) setList(reviveFiles(d.files));
    } catch {
      setList([]);
    }
  }, [projectId]);

  useEffect(() => { void load(); }, [load]);

  const upload = async (file: File) => {
    const ext = fileExt(file.name);
    if (!ATTACH_EXTS.includes(ext)) { toast(`Type non autorisé (.${ext}).`, "error"); return; }
    if (file.size > ATTACH_MAX_BYTES) { toast("Fichier trop volumineux (max 10 Mo).", "error"); return; }
    setUploading(true);
    const fd = new FormData();
    fd.append("projectId", projectId);
    fd.append("file", file);
    try {
      const r = await fetch("/api/project-files", { method: "POST", body: fd });
      const d = await r.json();
      if (!r.ok) toast(d.error ?? "Échec du téléversement.", "error");
      else { setList(reviveFiles(d.files)); toast("Fichier partagé.", "success"); }
    } catch {
      toast("Échec du téléversement.", "error");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const remove = async (a: ProjectAttachment) => {
    if (!confirm(`Supprimer « ${a.filename} » ?`)) return;
    const r = await fetch("/api/project-files/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: a.id }),
    });
    const d = await r.json();
    if (!r.ok) toast(d.error ?? "Échec de la suppression.", "error");
    else { setList(reviveFiles(d.files)); toast("Fichier supprimé.", "success"); }
  };

  const isManager = ["manager", "directeur", "admin"].includes(me.role);

  return (
    <Card className="p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Paperclip size={14} className="text-slate-400" />
          <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">
            Fichiers partagés{list && list.length > 0 ? ` · ${list.length}` : ""}
          </span>
        </div>
        {canWrite && (
          <>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1 text-[12px] font-medium text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 rounded-lg px-2.5 py-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 disabled:opacity-50"
            >
              {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />} Ajouter un fichier
            </button>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept={ATTACH_EXTS.map((e) => `.${e}`).join(",")}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }}
            />
          </>
        )}
      </div>

      {list === null ? (
        <div className="text-[12px] text-slate-400 py-1">Chargement…</div>
      ) : list.length === 0 ? (
        <div className="text-[12px] text-slate-400 py-1">
          Aucun fichier partagé. {canWrite && "Ajoute un document, une capture ou un livrable à partager avec l'équipe du projet."}
        </div>
      ) : (
        <div className="space-y-1">
          {list.map((a) => {
            const Icon = iconFor(a.filename);
            const canDelete = canWrite && (a.uploadedBy === me.id || isManager);
            return (
              <div key={a.id} className="flex items-center gap-2 rounded-lg border border-slate-200/70 dark:border-slate-800 px-2.5 py-1.5">
                <Icon size={16} className="text-slate-400 shrink-0" />
                <a
                  href={`/api/project-files/${a.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 min-w-0 text-[12.5px] text-slate-700 dark:text-slate-200 truncate hover:text-emerald-600 hover:underline"
                  title={a.filename}
                >
                  {a.filename}
                </a>
                <span className="text-[10.5px] text-slate-400 shrink-0 hidden sm:inline">{profileById(a.uploadedBy).nom} · {fmt(a.createdAt)}</span>
                <span className="text-[10.5px] text-slate-400 shrink-0">{formatBytes(a.size)}</span>
                <a href={`/api/project-files/${a.id}`} download className="text-slate-300 hover:text-emerald-600 shrink-0" title="Télécharger" aria-label="Télécharger">
                  <Download size={14} />
                </a>
                {canDelete && (
                  <button onClick={() => remove(a)} className="text-slate-300 hover:text-rose-600 shrink-0" title="Supprimer" aria-label="Supprimer">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

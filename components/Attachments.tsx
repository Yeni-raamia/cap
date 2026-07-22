"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, FileText, ImageIcon, Loader2, Paperclip, Trash2, Upload } from "lucide-react";
import { ATTACH_EXTS, ATTACH_MAX_BYTES, fileExt, formatBytes, type Attachment } from "@/lib/domain";
import { useApp } from "./app-context";
import { Card } from "./atoms";

const IMG_EXTS = ["png", "jpg", "jpeg", "webp", "gif"];

function iconFor(name: string) {
  const e = fileExt(name);
  if (IMG_EXTS.includes(e)) return ImageIcon;
  if (e === "pdf") return FileText;
  return Paperclip;
}

/** Encart « Pièces jointes / preuves » d'un suivi. */
export function Attachments({ itemId, canWrite }: { itemId: string; canWrite: boolean }) {
  const { me, toast } = useApp();
  const [list, setList] = useState<Attachment[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/attachments?itemId=${encodeURIComponent(itemId)}`, { cache: "no-store" });
      const d = await r.json();
      if (r.ok) setList(d.attachments);
    } catch {
      setList([]);
    }
  }, [itemId]);

  useEffect(() => {
    void load();
  }, [load]);

  const upload = async (file: File) => {
    const ext = fileExt(file.name);
    if (!ATTACH_EXTS.includes(ext)) {
      toast(`Type non autorisé (.${ext}).`, "error");
      return;
    }
    if (file.size > ATTACH_MAX_BYTES) {
      toast("Fichier trop volumineux (max 10 Mo).", "error");
      return;
    }
    setUploading(true);
    const fd = new FormData();
    fd.append("itemId", itemId);
    fd.append("file", file);
    try {
      const r = await fetch("/api/attachments", { method: "POST", body: fd });
      const d = await r.json();
      if (!r.ok) toast(d.error ?? "Échec du téléversement.", "error");
      else {
        setList(d.attachments);
        toast("Pièce jointe ajoutée.", "success");
      }
    } catch {
      toast("Échec du téléversement.", "error");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const remove = async (a: Attachment) => {
    if (!confirm(`Supprimer « ${a.filename} » ?`)) return;
    const r = await fetch("/api/attachments/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: a.id }),
    });
    const d = await r.json();
    if (!r.ok) toast(d.error ?? "Échec de la suppression.", "error");
    else {
      setList(d.attachments);
      toast("Pièce jointe supprimée.", "success");
    }
  };

  const isManager = ["manager", "directeur", "admin"].includes(me.role);

  return (
    <Card className="p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Paperclip size={13} className="text-slate-400" />
          <span className="text-[10px] uppercase tracking-wide text-slate-400">
            Pièces jointes / preuves{list && list.length > 0 ? ` · ${list.length}` : ""}
          </span>
        </div>
        {canWrite && (
          <>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 rounded-lg px-2 py-1 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 disabled:opacity-50"
            >
              {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />} Ajouter
            </button>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept={ATTACH_EXTS.map((e) => `.${e}`).join(",")}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void upload(f);
              }}
            />
          </>
        )}
      </div>

      {list === null ? (
        <div className="text-[12px] text-slate-400 py-1">Chargement…</div>
      ) : list.length === 0 ? (
        <div className="text-[12px] text-slate-400 py-1">
          Aucune pièce jointe. {canWrite && "Ajoute une capture, un PDF ou un mail comme preuve."}
        </div>
      ) : (
        <div className="space-y-1">
          {list.map((a) => {
            const Icon = iconFor(a.filename);
            const canDelete = canWrite && (a.uploadedBy === me.id || isManager);
            return (
              <div key={a.id} className="flex items-center gap-2 rounded-lg border border-slate-200/70 dark:border-slate-800 px-2.5 py-1.5">
                <Icon size={15} className="text-slate-400 shrink-0" />
                <a
                  href={`/api/attachments/${a.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 min-w-0 text-[12.5px] text-slate-700 dark:text-slate-200 truncate hover:text-emerald-600 hover:underline"
                  title={a.filename}
                >
                  {a.filename}
                </a>
                <span className="text-[10.5px] text-slate-400 shrink-0">{formatBytes(a.size)}</span>
                <a href={`/api/attachments/${a.id}`} download className="text-slate-300 hover:text-emerald-600 shrink-0" title="Télécharger" aria-label="Télécharger">
                  <Download size={13} />
                </a>
                {canDelete && (
                  <button onClick={() => remove(a)} className="text-slate-300 hover:text-rose-600 shrink-0" title="Supprimer" aria-label="Supprimer">
                    <Trash2 size={13} />
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

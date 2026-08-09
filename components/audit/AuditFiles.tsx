"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, FileText, ImageIcon, Loader2, Paperclip, Trash2, Upload } from "lucide-react";
import { ATTACH_EXTS, ATTACH_MAX_BYTES, fileExt, formatBytes, fmt, type AuditAttachment, type AuditQuestion } from "@/lib/domain";
import { useApp } from "@/components/app-context";

const IMG_EXTS = ["png", "jpg", "jpeg", "webp", "gif"];
function iconFor(name: string) {
  const e = fileExt(name);
  if (IMG_EXTS.includes(e)) return ImageIcon;
  if (e === "pdf") return FileText;
  return Paperclip;
}

/** Preuves / pièces jointes d'un audit (dépôt, téléchargement, suppression) — rattachables à un point de contrôle. */
export function AuditFiles({ auditId, questions, canWrite }: { auditId: string; questions: AuditQuestion[]; canWrite: boolean }) {
  const { me, profileById, toast } = useApp();
  const [list, setList] = useState<AuditAttachment[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [linkQ, setLinkQ] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const qLabel = (id: string) => {
    if (!id) return "";
    const q = questions.find((x) => x.id === id);
    return q ? (q.text.length > 40 ? q.text.slice(0, 40) + "…" : q.text) : "point de contrôle";
  };

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/audit-files?auditId=${encodeURIComponent(auditId)}`, { cache: "no-store" });
      const d = await r.json();
      if (r.ok) setList(d.files); else setList([]);
    } catch { setList([]); }
  }, [auditId]);
  useEffect(() => { void load(); }, [load]);

  const upload = async (file: File) => {
    const ext = fileExt(file.name);
    if (!ATTACH_EXTS.includes(ext)) { toast(`Type non autorisé (.${ext}).`, "error"); return; }
    if (file.size > ATTACH_MAX_BYTES) { toast("Fichier trop volumineux (max 10 Mo).", "error"); return; }
    setUploading(true);
    const fd = new FormData();
    fd.append("auditId", auditId);
    fd.append("questionId", linkQ);
    fd.append("file", file);
    try {
      const r = await fetch("/api/audit-files", { method: "POST", body: fd });
      const d = await r.json();
      if (!r.ok) toast(d.error ?? "Échec du téléversement.", "error");
      else { setList(d.files); toast("Preuve ajoutée.", "success"); }
    } catch { toast("Échec du téléversement.", "error"); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const remove = async (a: AuditAttachment) => {
    if (typeof window !== "undefined" && !window.confirm(`Supprimer « ${a.filename} » ?`)) return;
    const r = await fetch("/api/audit-files/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: a.id }) });
    const d = await r.json();
    if (!r.ok) toast(d.error ?? "Échec de la suppression.", "error");
    else { setList(d.files); toast("Preuve supprimée.", "success"); }
  };

  const isManager = ["manager", "directeur", "admin"].includes(me.role);

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Paperclip size={14} className="text-slate-400" />
          <span className="text-[12px] font-semibold text-slate-700 dark:text-slate-200 uppercase">Preuves &amp; pièces jointes{list && list.length > 0 ? ` · ${list.length}` : ""}</span>
        </div>
        {canWrite && (
          <div className="flex items-center gap-1.5">
            <select value={linkQ} onChange={(e) => setLinkQ(e.target.value)} className="text-[11px] border border-slate-200 rounded-lg px-2 py-1 bg-white dark:bg-slate-900 max-w-[12rem]" title="Rattacher à un point de contrôle (facultatif)">
              <option value="">Audit (général)</option>
              {questions.map((q) => <option key={q.id} value={q.id}>{q.text.length > 50 ? q.text.slice(0, 50) + "…" : q.text}</option>)}
            </select>
            <button onClick={() => fileRef.current?.click()} disabled={uploading} className="inline-flex items-center gap-1 text-[12px] font-medium text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 rounded-lg px-2.5 py-1.5 hover:bg-emerald-50 disabled:opacity-50">
              {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />} Ajouter
            </button>
            <input ref={fileRef} type="file" className="hidden" accept={ATTACH_EXTS.map((e) => `.${e}`).join(",")} onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }} />
          </div>
        )}
      </div>

      {list === null ? (
        <div className="text-[12px] text-slate-400">Chargement…</div>
      ) : list.length === 0 ? (
        <div className="text-[12px] text-slate-400">Aucune preuve. {canWrite && "Ajoute une capture, un export de configuration, un journal…"}</div>
      ) : (
        <div className="space-y-1">
          {list.map((a) => {
            const Icon = iconFor(a.filename);
            const canDelete = canWrite && (a.uploadedBy === me.id || isManager);
            return (
              <div key={a.id} className="flex items-center gap-2 rounded-lg border border-slate-100 dark:border-slate-800 px-2.5 py-1.5">
                <Icon size={16} className="text-slate-400 shrink-0" />
                <a href={`/api/audit-files/${a.id}`} target="_blank" rel="noreferrer" className="min-w-0 text-[12.5px] text-slate-700 dark:text-slate-200 truncate hover:text-emerald-600 hover:underline" title={a.filename}>{a.filename}</a>
                {a.questionId && <span className="text-[10px] text-indigo-500 shrink-0 hidden sm:inline" title={qLabel(a.questionId)}>· {qLabel(a.questionId)}</span>}
                <span className="text-[10.5px] text-slate-400 shrink-0 ml-auto hidden sm:inline">{profileById(a.uploadedBy).nom} · {fmt(a.createdAt)}</span>
                <span className="text-[10.5px] text-slate-400 shrink-0">{formatBytes(a.size)}</span>
                <a href={`/api/audit-files/${a.id}`} download className="text-slate-300 hover:text-emerald-600 shrink-0" title="Télécharger" aria-label="Télécharger"><Download size={14} /></a>
                {canDelete && <button onClick={() => remove(a)} className="text-slate-300 hover:text-rose-600 shrink-0" title="Supprimer" aria-label="Supprimer"><Trash2 size={14} /></button>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

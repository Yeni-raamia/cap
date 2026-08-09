"use client";

import { useMemo, useState } from "react";
import { ClipboardCheck, X } from "lucide-react";
import { useApp } from "./app-context";

const inputCls = "w-full text-[13px] border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 bg-white dark:bg-slate-900 outline-none focus:border-emerald-400";
const labelCls = "block text-[11px] font-medium text-slate-500 mb-1";

export function NewAuditModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string | null) => void }) {
  const { auditGrids, assets, profiles, me, createAudit } = useApp();
  const [gridId, setGridId] = useState(auditGrids[0]?.id ?? "");
  const grid = useMemo(() => auditGrids.find((g) => g.id === gridId) ?? null, [auditGrids, gridId]);
  const [title, setTitle] = useState("");
  const [targetMode, setTargetMode] = useState<"asset" | "free">("free");
  const [targetAssetId, setTargetAssetId] = useState("");
  const [targetLabel, setTargetLabel] = useState("");
  const [auditorId, setAuditorId] = useState(me.id);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);

  const activeAssets = assets.filter((a) => a.status !== "Retiré");

  const submit = async () => {
    if (!grid) return;
    setBusy(true);
    const id = await createAudit({
      gridId,
      title: title.trim() || `Audit — ${grid.name}`,
      targetAssetId: targetMode === "asset" ? (targetAssetId || null) : null,
      targetLabel: targetMode === "free" ? targetLabel.trim() : "",
      auditorId,
      date: date || null,
      status: "En cours",
    });
    setBusy(false);
    onCreated(id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto animate-fade" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg my-8 animate-pop" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3 p-4 border-b border-slate-100 dark:border-slate-800">
          <ClipboardCheck size={20} className="text-emerald-600 mt-1 shrink-0" />
          <div className="flex-1">
            <div className="text-[15px] font-semibold text-slate-800 dark:text-slate-100">Nouvel audit</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Choisis la grille et la cible ; tu répondras aux questions ensuite.</div>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <label className={labelCls}>Grille d&apos;audit</label>
            <select value={gridId} onChange={(e) => setGridId(e.target.value)} className={inputCls}>
              {auditGrids.map((g) => <option key={g.id} value={g.id}>{g.name} · {g.category}</option>)}
            </select>
            {grid && <div className="text-[11px] text-slate-400 mt-1">{grid.questions.length} question{grid.questions.length > 1 ? "s" : ""} · {grid.source}</div>}
          </div>
          <div>
            <label className={labelCls}>Intitulé (facultatif)</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={grid ? `Audit — ${grid.name}` : "Intitulé de l'audit"} className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Cible auditée</label>
            <div className="flex items-center gap-1.5 mb-1.5">
              <button onClick={() => setTargetMode("free")} className={`text-[11px] rounded-full px-2.5 py-1 border ${targetMode === "free" ? "bg-emerald-100 border-emerald-300 text-emerald-800" : "border-slate-200 text-slate-500"}`}>Cible libre</button>
              <button onClick={() => setTargetMode("asset")} className={`text-[11px] rounded-full px-2.5 py-1 border ${targetMode === "asset" ? "bg-emerald-100 border-emerald-300 text-emerald-800" : "border-slate-200 text-slate-500"}`}>Actif du registre</button>
            </div>
            {targetMode === "asset" ? (
              <select value={targetAssetId} onChange={(e) => setTargetAssetId(e.target.value)} className={inputCls}>
                <option value="">— Choisir un actif —</option>
                {activeAssets.map((a) => <option key={a.id} value={a.id}>{a.name}{a.ref ? ` (${a.ref})` : ""}</option>)}
              </select>
            ) : (
              <input value={targetLabel} onChange={(e) => setTargetLabel(e.target.value)} placeholder="Ex. SRV-BACKUP-01, Contrôleurs de domaine…" className={inputCls} />
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>Auditeur</label>
              <select value={auditorId} onChange={(e) => setAuditorId(e.target.value)} className={inputCls}>
                {profiles.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 p-4 border-t border-slate-100 dark:border-slate-800">
          <button onClick={submit} disabled={busy || !grid} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-slate-900 dark:bg-emerald-600 rounded-xl px-4 py-2 disabled:opacity-50">
            <ClipboardCheck size={15} /> Créer et répondre
          </button>
          <button onClick={onClose} className="text-[13px] text-slate-500 px-3 py-2">Annuler</button>
        </div>
      </div>
    </div>
  );
}

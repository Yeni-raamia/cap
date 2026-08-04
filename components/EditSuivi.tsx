"use client";

import { useState } from "react";
import { Info, Loader2, Save, X } from "lucide-react";
import type { Item, Priorite } from "@/lib/domain";
import { useApp } from "./app-context";
import { Card } from "./atoms";

const PRIORITES: Priorite[] = ["Critique", "Élevé", "Moyenne"];

/** Formulaire d'édition des métadonnées d'un suivi (dans le Drawer).
 *  Les personnes (destinataires) ne sont pas modifiables ici : elles se
 *  définissent à la création, et une éventuelle correction d'orthographe se
 *  fait de façon contrôlée dans Administration → Destinataires (évite les
 *  saisies divergentes qui faussent les statistiques). */
export function EditSuivi({ item, onDone }: { item: Item; onDone: () => void }) {
  const { updateItem, me } = useApp();
  const [objet, setObjet] = useState(item.objet);
  const [priorite, setPriorite] = useState<Priorite>(item.priorite);
  const [points, setPoints] = useState(item.pointsCles.filter((p) => p !== "—").join("\n"));
  const [dueDuration, setDuration] = useState(item.dueDurationDays != null ? String(item.dueDurationDays) : "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!objet.trim()) return;
    setSaving(true);
    // On ne touche PAS aux personnes : édition des métadonnées uniquement.
    const ok = await updateItem(item, {
      objet,
      priorite,
      pointsCles: points.split("\n"),
      dueDurationDays: dueDuration.trim() ? Number(dueDuration) : null,
    });
    setSaving(false);
    if (ok) onDone();
  };

  const inputCls =
    "w-full text-[13px] border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-emerald-400";
  const label = "text-[10px] uppercase tracking-wide text-slate-400 mb-1";
  const isAdmin = me.role === "admin";

  return (
    <Card className="p-3 space-y-3 ring-1 ring-emerald-200">
      <div className="flex items-center justify-between">
        <div className="text-[12px] font-semibold text-emerald-700">Édition du suivi</div>
        <button onClick={onDone} aria-label="Annuler l'édition" className="text-slate-400 hover:text-slate-600">
          <X size={16} />
        </button>
      </div>

      <div>
        <div className={label}>Objet</div>
        <input value={objet} onChange={(e) => setObjet(e.target.value)} className={inputCls} />
      </div>

      <div>
        <div className={label}>Priorité</div>
        <select value={priorite} onChange={(e) => setPriorite(e.target.value as Priorite)} className={inputCls}>
          {PRIORITES.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </div>

      <div>
        <div className={label}>Points clés (un par ligne)</div>
        <textarea
          value={points}
          onChange={(e) => setPoints(e.target.value)}
          rows={4}
          placeholder="Un point par ligne…"
          className={`${inputCls} resize-y`}
        />
      </div>

      <div>
        <div className={label}>Durée de traitement acceptable (jours)</div>
        <input
          type="number"
          min={1}
          value={dueDuration}
          onChange={(e) => setDuration(e.target.value)}
          placeholder="Ex. 5 — vide = aucune"
          className={`${inputCls} max-w-[10rem]`}
        />
      </div>

      {/* Personnes : lecture seule (correction contrôlée en administration) */}
      <div>
        <div className={label}>Personnes</div>
        <div className="space-y-1">
          {item.personnes.length === 0 ? (
            <div className="text-[11px] text-slate-400">Aucune personne renseignée.</div>
          ) : (
            item.personnes.map((p, i) => (
              <div key={i} className="flex items-center gap-2 text-[12px] text-slate-600">
                <span className="text-slate-800">{p.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">{p.kind}</span>
                {p.service && <span className="text-slate-400">· {p.service}</span>}
                {p.email && <span className="text-slate-400 truncate">· {p.email}</span>}
              </div>
            ))
          )}
        </div>
        <div className="mt-1.5 flex items-start gap-1.5 text-[10.5px] text-slate-400">
          <Info size={12} className="mt-0.5 shrink-0" />
          <span>
            Les destinataires se définissent à la création du suivi.{" "}
            {isAdmin
              ? "Pour corriger une orthographe, utilisez Administration → Destinataires (répercuté partout)."
              : "Pour corriger une orthographe, demandez à un administrateur (Administration → Destinataires)."}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={save}
          disabled={saving || !objet.trim()}
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-white bg-emerald-600 rounded-lg px-3 py-1.5 hover:bg-emerald-700 disabled:opacity-50"
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Enregistrer
        </button>
        <button onClick={onDone} className="text-[12px] text-slate-500 hover:text-slate-700 px-2 py-1.5">
          Annuler
        </button>
      </div>
    </Card>
  );
}

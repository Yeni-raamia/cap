"use client";

import { useState } from "react";
import { Loader2, Plus, Save, Trash2, X } from "lucide-react";
import type { Item, PersonKind, Priorite } from "@/lib/domain";
import { useApp } from "./app-context";
import { Card } from "./atoms";

const PRIORITES: Priorite[] = ["Critique", "Élevé", "Moyenne"];
const KINDS: PersonKind[] = ["destinataire", "copie", "impliqué"];

/** Formulaire d'édition des métadonnées d'un suivi (dans le Drawer). */
export function EditSuivi({ item, onDone }: { item: Item; onDone: () => void }) {
  const { updateItem } = useApp();
  const [objet, setObjet] = useState(item.objet);
  const [priorite, setPriorite] = useState<Priorite>(item.priorite);
  const [points, setPoints] = useState(item.pointsCles.filter((p) => p !== "—").join("\n"));
  const [dueDuration, setDuration] = useState(item.dueDurationDays != null ? String(item.dueDurationDays) : "");
  const [personnes, setPersonnes] = useState(
    item.personnes.map((p) => ({ name: p.name, kind: p.kind, service: p.service ?? "", email: p.email ?? "" }))
  );
  const [saving, setSaving] = useState(false);

  const setPerson = (i: number, patch: Partial<{ name: string; kind: PersonKind; service: string; email: string }>) =>
    setPersonnes((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  const addPerson = () => setPersonnes((prev) => [...prev, { name: "", kind: "destinataire", service: "", email: "" }]);
  const removePerson = (i: number) => setPersonnes((prev) => prev.filter((_, idx) => idx !== i));

  const save = async () => {
    if (!objet.trim()) return;
    setSaving(true);
    const ok = await updateItem(item, {
      objet,
      priorite,
      pointsCles: points.split("\n"),
      dueDurationDays: dueDuration.trim() ? Number(dueDuration) : null,
      personnes: personnes
        .filter((p) => p.name.trim())
        .map((p) => ({ name: p.name.trim(), kind: p.kind, service: p.service.trim() || null, email: p.email.trim() || null })),
    });
    setSaving(false);
    if (ok) onDone();
  };

  const inputCls =
    "w-full text-[13px] border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-emerald-400";
  const label = "text-[10px] uppercase tracking-wide text-slate-400 mb-1";

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

      <div>
        <div className="flex items-center justify-between mb-1">
          <div className={label + " mb-0"}>Personnes</div>
          <button onClick={addPerson} className="inline-flex items-center gap-1 text-[11px] text-emerald-700 hover:underline">
            <Plus size={12} /> Ajouter
          </button>
        </div>
        <div className="space-y-1.5">
          {personnes.map((p, i) => (
            <div key={i} className="border border-slate-200 rounded-lg p-1.5 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <input
                  value={p.name}
                  onChange={(e) => setPerson(i, { name: e.target.value })}
                  placeholder="Nom"
                  className={`${inputCls} flex-1`}
                />
                <select
                  value={p.kind}
                  onChange={(e) => setPerson(i, { kind: e.target.value as PersonKind })}
                  className="text-[12px] border border-slate-200 rounded-lg px-1.5 py-1.5 outline-none focus:border-emerald-400"
                  aria-label="Rôle"
                >
                  {KINDS.map((k) => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
                <input
                  value={p.service}
                  onChange={(e) => setPerson(i, { service: e.target.value })}
                  placeholder="Service"
                  className={`${inputCls} w-24`}
                />
                <button
                  onClick={() => removePerson(i)}
                  aria-label="Retirer cette personne"
                  className="text-slate-400 hover:text-rose-600 shrink-0 px-1"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <input
                type="email"
                value={p.email}
                onChange={(e) => setPerson(i, { email: e.target.value })}
                placeholder={p.kind === "destinataire" ? "E-mail (pour envoyer les relances)" : "E-mail"}
                className={inputCls}
              />
            </div>
          ))}
          {personnes.length === 0 && <div className="text-[11px] text-slate-400">Aucune personne. Ajoutez-en une.</div>}
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

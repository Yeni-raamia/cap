"use client";

import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { parseSubject, type Priorite } from "@/lib/domain";
import { APP_MOTTO } from "@/lib/config";
import { useApp } from "./app-context";
import { MetierChip, Token, TypeTag } from "./atoms";

export function NewSuiviModal() {
  const { showNew, setShowNew, create } = useApp();
  const [raw, setRaw] = useState("");
  const [points, setPoints] = useState("");
  const [prio, setPrio] = useState<Priorite>("Moyenne");
  const [dest, setDest] = useState("");
  const parsed = useMemo(() => parseSubject(raw), [raw]);

  if (!showNew) return null;

  const close = () => {
    setShowNew(false);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-slate-900/30" onClick={close} />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-700 grid place-items-center">
            <Plus size={17} />
          </div>
          <div className="font-semibold text-slate-800">Nouveau suivi</div>
          <button
            onClick={close}
            aria-label="Fermer"
            className="ml-auto text-slate-400 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        <label className="text-[12px] font-medium text-slate-600" htmlFor="raw-objet">
          Colle l&apos;objet du mail
        </label>
        <input
          id="raw-objet"
          autoFocus
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder="[SOC-2026-0042] ALERTE — Vulnérabilité critique…"
          className="w-full mt-1 font-mono text-[13px] border border-slate-200 rounded-lg px-3 py-2 focus:border-emerald-400 outline-none"
        />

        {raw && !parsed && (
          <div className="text-[11px] text-rose-500 mt-1">
            Objet non reconnu — vérifie le format [MÉTIER-2026-####] TYPE — objet.
          </div>
        )}
        {parsed && (
          <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-emerald-700 font-medium">Reconnu :</span>
            <MetierChip code={parsed.metier} />
            <TypeTag t={parsed.type} />
            <Token>{parsed.ref}</Token>
            <span className="text-[12px] text-slate-600 w-full mt-1">{parsed.objet}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <label className="text-[12px] font-medium text-slate-600" htmlFor="prio">
              Priorité
            </label>
            <select
              id="prio"
              value={prio}
              onChange={(e) => setPrio(e.target.value as Priorite)}
              className="w-full mt-1 text-[13px] border border-slate-200 rounded-lg px-2 py-2"
            >
              <option>Critique</option>
              <option>Élevé</option>
              <option>Moyenne</option>
            </select>
          </div>
          <div>
            <label className="text-[12px] font-medium text-slate-600" htmlFor="dest">
              Destinataire principal
            </label>
            <input
              id="dest"
              value={dest}
              onChange={(e) => setDest(e.target.value)}
              placeholder="Service informatique — Réseau"
              className="w-full mt-1 text-[13px] border border-slate-200 rounded-lg px-2 py-2"
            />
          </div>
        </div>

        <label className="text-[12px] font-medium text-slate-600 mt-3 block" htmlFor="points">
          Points clés (une ligne chacun)
        </label>
        <textarea
          id="points"
          value={points}
          onChange={(e) => setPoints(e.target.value)}
          rows={2}
          className="w-full mt-1 text-[13px] border border-slate-200 rounded-lg px-3 py-2"
          placeholder={"Correctif disponible\nFenêtre à planifier"}
        />

        <div className="flex gap-2 mt-4">
          <button
            onClick={close}
            className="flex-1 text-[13px] text-slate-600 border border-slate-200 rounded-lg py-2 hover:bg-slate-50"
          >
            Annuler
          </button>
          <button
            disabled={!parsed}
            onClick={() => {
              if (!parsed) return;
              create(parsed, prio, dest, points);
              setRaw("");
              setPoints("");
              setDest("");
              setPrio("Moyenne");
            }}
            className="flex-1 text-[13px] font-medium text-white bg-emerald-600 rounded-lg py-2 hover:bg-emerald-700 disabled:opacity-40"
          >
            Créer le suivi
          </button>
        </div>
        <p className="text-[11px] text-slate-400 mt-3 text-center">
          {APP_MOTTO} — le suivi démarre ici.
        </p>
      </div>
    </div>
  );
}

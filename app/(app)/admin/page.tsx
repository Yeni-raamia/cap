"use client";

import { useState } from "react";
import { TONES, type Role, type Tone } from "@/lib/domain";
import { ORG_NAME } from "@/lib/config";
import { useApp } from "@/components/app-context";
import { Avatar, Card, MetierChip, TypeTag } from "@/components/atoms";

const ROLES: Role[] = ["agent", "directeur", "admin"];

export default function AdminPage() {
  const { demo, me, profiles, catalogue, emailOn, setEmailOn, updateRole, addCatalogueOption } =
    useApp();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const canManage = !demo && me.role === "admin";

  // Formulaire « nouveau métier »
  const [mCode, setMCode] = useState("");
  const [mLabel, setMLabel] = useState("");
  const [mTone, setMTone] = useState<Tone>("slate");
  // Formulaire « nouveau type »
  const [tCode, setTCode] = useState("");
  const [tLabel, setTLabel] = useState("");
  const [tRel, setTRel] = useState("");
  const [tEsc, setTEsc] = useState("");
  const [tUrgent, setTUrgent] = useState(false);
  const [catErr, setCatErr] = useState<string | null>(null);
  const [catMsg, setCatMsg] = useState<string | null>(null);

  const onRoleChange = async (userId: string, role: Role) => {
    setErr(null);
    setBusy(userId);
    const error = await updateRole(userId, role);
    if (error) setErr(error);
    setBusy(null);
  };

  const addMetier = async () => {
    setCatErr(null);
    setCatMsg(null);
    const error = await addCatalogueOption({ kind: "metier", code: mCode, label: mLabel, tone: mTone });
    if (error) return setCatErr(error);
    setCatMsg(`Métier « ${mCode.toUpperCase()} » ajouté.`);
    setMCode("");
    setMLabel("");
    setMTone("slate");
  };

  const addType = async () => {
    setCatErr(null);
    setCatMsg(null);
    const error = await addCatalogueOption({
      kind: "type",
      code: tCode,
      label: tLabel,
      slaRelance: tRel,
      slaEscalade: tEsc,
      urgent: tUrgent,
    });
    if (error) return setCatErr(error);
    setCatMsg(`Type « ${tCode.toUpperCase()} » ajouté.`);
    setTCode("");
    setTLabel("");
    setTRel("");
    setTEsc("");
    setTUrgent(false);
  };

  const roleBadge = (role: string) =>
    role === "directeur"
      ? "bg-emerald-100 text-emerald-700"
      : role === "admin"
        ? "bg-violet-100 text-violet-700"
        : "bg-slate-100 text-slate-600";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Administration</h1>
        <p className="text-[13px] text-slate-500">
          {ORG_NAME} · membres, rôles, catalogue et seuils de relance.
        </p>
      </div>

      <Card className="p-4">
        <div className="text-[13px] font-semibold text-slate-700 mb-3">Membres &amp; rôles (RBAC)</div>
        {err && <div className="text-[12px] text-rose-600 mb-2">{err}</div>}
        <div className="divide-y divide-slate-100">
          {profiles.map((u) => (
            <div key={u.id} className="flex items-center gap-3 py-2.5">
              <Avatar init={u.init} size="h-7 w-7" />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] text-slate-800 truncate">
                  {u.nom}
                  {u.id === me.id && <span className="text-[11px] text-emerald-600 ml-1">· toi</span>}
                </div>
                <div className="text-[11px] text-slate-400 truncate">{u.poste}</div>
              </div>
              {canManage ? (
                <select
                  aria-label={`Rôle de ${u.nom}`}
                  value={u.role}
                  disabled={busy === u.id || u.id === me.id}
                  onChange={(e) => onRoleChange(u.id, e.target.value as Role)}
                  className="text-[11px] border border-slate-200 rounded-lg px-2 py-1 bg-white disabled:opacity-60"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              ) : (
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${roleBadge(u.role)}`}>
                  {u.role}
                </span>
              )}
            </div>
          ))}
        </div>
        {canManage && (
          <div className="text-[11px] text-slate-400 mt-2">
            Tu peux modifier le rôle des autres membres (pas le tien).
          </div>
        )}
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="text-[13px] font-semibold text-slate-700 mb-3">
            Seuils de relance (SLA) par type
          </div>
          <div className="space-y-1.5">
            {Object.entries(catalogue.types)
              .filter(([, v]) => v.sla)
              .map(([t, v]) => (
                <div key={t} className="flex items-center gap-2 text-[12px]">
                  <span className="w-24">
                    <TypeTag t={t} />
                  </span>
                  <span className="text-slate-500">Relance J+{v.sla!.relance}</span>
                  <span className="text-slate-300">·</span>
                  <span className="text-rose-500">Escalade J+{v.sla!.escalade}</span>
                </div>
              ))}
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-[13px] font-semibold text-slate-700 mb-3">
            Canaux de notification
          </div>
          <label className="flex items-center gap-3 text-[13px] text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={emailOn}
              onChange={(e) => setEmailOn(e.target.checked)}
              className="h-4 w-4 accent-emerald-600"
            />
            Rappels par e-mail (en plus de l&apos;in-app)
          </label>
          <div className="text-[11px] text-slate-400 mt-2">
            Le digest du matin au Directeur est toujours actif.
          </div>
          <div className="text-[13px] font-semibold text-slate-700 mt-4 mb-2">Catalogue</div>
          <div className="text-[12px] text-slate-500">
            {Object.keys(catalogue.metiers).length} métiers ·{" "}
            {Object.keys(catalogue.types).length} types. Ajouter une option est immédiat —
            l&apos;app s&apos;étend sans refonte.
          </div>
        </Card>
      </div>

      {/* Ajout d'options aux listes déroulantes (admin uniquement) */}
      {canManage && (
        <Card className="p-4">
          <div className="text-[13px] font-semibold text-slate-700 mb-1">
            Ajouter une option aux listes déroulantes
          </div>
          <p className="text-[12px] text-slate-500 mb-3">
            Les nouveaux métiers et types apparaissent aussitôt dans le formulaire « Nouveau
            suivi ».
          </p>
          {catErr && <div className="text-[12px] text-rose-600 mb-2">{catErr}</div>}
          {catMsg && <div className="text-[12px] text-emerald-700 mb-2">{catMsg}</div>}

          <div className="grid md:grid-cols-2 gap-5">
            {/* Nouveau métier */}
            <div className="space-y-2">
              <div className="text-[12px] font-medium text-slate-600">Nouveau métier</div>
              <div className="flex gap-2">
                <input
                  aria-label="Code métier"
                  value={mCode}
                  onChange={(e) => setMCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 6))}
                  placeholder="Code (ex. FIN)"
                  className="w-28 font-mono text-[13px] border border-slate-200 rounded-lg px-2 py-2"
                />
                <input
                  aria-label="Libellé métier"
                  value={mLabel}
                  onChange={(e) => setMLabel(e.target.value)}
                  placeholder="Libellé"
                  className="flex-1 text-[13px] border border-slate-200 rounded-lg px-2 py-2"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[12px] text-slate-500" htmlFor="mtone">
                  Teinte
                </label>
                <select
                  id="mtone"
                  value={mTone}
                  onChange={(e) => setMTone(e.target.value as Tone)}
                  className="text-[13px] border border-slate-200 rounded-lg px-2 py-1.5"
                >
                  {TONES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                {mCode && <MetierChip code={mCode} />}
              </div>
              <button
                onClick={addMetier}
                disabled={!mCode || !mLabel.trim()}
                className="text-[13px] font-medium text-white bg-emerald-600 rounded-lg px-3 py-1.5 hover:bg-emerald-700 disabled:opacity-40"
              >
                Ajouter le métier
              </button>
            </div>

            {/* Nouveau type */}
            <div className="space-y-2">
              <div className="text-[12px] font-medium text-slate-600">Nouveau type</div>
              <div className="flex gap-2">
                <input
                  aria-label="Code type"
                  value={tCode}
                  onChange={(e) => setTCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 12))}
                  placeholder="Code (ex. RAPPORT)"
                  className="w-32 font-mono text-[13px] border border-slate-200 rounded-lg px-2 py-2"
                />
                <input
                  aria-label="Libellé type"
                  value={tLabel}
                  onChange={(e) => setTLabel(e.target.value)}
                  placeholder="Libellé"
                  className="flex-1 text-[13px] border border-slate-200 rounded-lg px-2 py-2"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  aria-label="SLA relance (jours)"
                  value={tRel}
                  onChange={(e) => setTRel(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="Relance J+"
                  inputMode="numeric"
                  className="w-24 text-[13px] border border-slate-200 rounded-lg px-2 py-1.5"
                />
                <input
                  aria-label="SLA escalade (jours)"
                  value={tEsc}
                  onChange={(e) => setTEsc(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="Escalade J+"
                  inputMode="numeric"
                  className="w-24 text-[13px] border border-slate-200 rounded-lg px-2 py-1.5"
                />
                <label className="flex items-center gap-1 text-[12px] text-slate-600">
                  <input
                    type="checkbox"
                    checked={tUrgent}
                    onChange={(e) => setTUrgent(e.target.checked)}
                    className="h-4 w-4 accent-rose-600"
                  />
                  urgent
                </label>
              </div>
              <p className="text-[10px] text-slate-400">
                Laisse les seuils vides pour un type sans relance attendue (ex. information).
              </p>
              <button
                onClick={addType}
                disabled={!tCode || !tLabel.trim()}
                className="text-[13px] font-medium text-white bg-emerald-600 rounded-lg px-3 py-1.5 hover:bg-emerald-700 disabled:opacity-40"
              >
                Ajouter le type
              </button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

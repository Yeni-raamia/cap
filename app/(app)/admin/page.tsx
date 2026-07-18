"use client";

import { useState } from "react";
import { METIERS, TYPES, type Role } from "@/lib/domain";
import { ORG_NAME } from "@/lib/config";
import { useApp } from "@/components/app-context";
import { Avatar, Card, TypeTag } from "@/components/atoms";

const ROLES: Role[] = ["agent", "directeur", "admin"];

export default function AdminPage() {
  const { demo, me, profiles, emailOn, setEmailOn, updateRole } = useApp();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const canManage = !demo && me.role === "admin";

  const onRoleChange = async (userId: string, role: Role) => {
    setErr(null);
    setBusy(userId);
    const error = await updateRole(userId, role);
    if (error) setErr(error);
    setBusy(null);
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
            {Object.entries(TYPES)
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
            {Object.keys(METIERS).length} métiers · {Object.keys(TYPES).length} types · éditables
            ici. Ajouter un métier ou un type est immédiat — l&apos;app s&apos;étend sans refonte.
          </div>
        </Card>
      </div>
    </div>
  );
}

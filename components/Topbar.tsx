"use client";

import { useRouter } from "next/navigation";
import { Bell, LogOut, Search } from "lucide-react";
import { canAccess } from "@/lib/nav";
import { useApp } from "./app-context";
import { Avatar } from "./atoms";

export function Topbar() {
  const { demo, me, meId, setMeId, profiles, alerts, signOut } = useApp();
  const router = useRouter();

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center gap-3 px-5 shrink-0">
      <div className="relative flex-1 max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          aria-label="Rechercher"
          placeholder="Rechercher une référence, un objet…"
          className="w-full pl-9 pr-3 py-1.5 text-[13px] bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-emerald-300"
        />
      </div>
      <button
        onClick={() => router.push("/rappels")}
        aria-label="Rappels"
        className="relative text-slate-500 hover:text-slate-700"
      >
        <Bell size={19} />
        {alerts > 0 && (
          <span className="absolute -top-1 -right-1 h-4 w-4 bg-rose-500 text-white text-[9px] font-bold rounded-full grid place-items-center">
            {alerts}
          </span>
        )}
      </button>

      <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
        <Avatar init={me.init} size="h-8 w-8" />
        {demo ? (
          // Sélecteur d'utilisateur — démo RBAC (mode démo uniquement)
          <select
            aria-label="Utilisateur de démonstration"
            value={meId}
            onChange={(e) => {
              const id = e.target.value;
              setMeId(id);
              const next = profiles.find((u) => u.id === id);
              if (next && !canAccess(window.location.pathname, next)) {
                router.push("/espace");
              }
            }}
            className="text-[12px] border border-slate-200 rounded-lg px-2 py-1 bg-white"
          >
            {profiles.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nom} · {u.role}
              </option>
            ))}
          </select>
        ) : (
          // Utilisateur réellement connecté (Supabase)
          <>
            <div className="text-right leading-tight hidden sm:block">
              <div className="text-[12px] font-medium text-slate-700">{me.nom}</div>
              <div className="text-[10px] text-slate-400">{me.role}</div>
            </div>
            <button
              onClick={signOut}
              aria-label="Se déconnecter"
              title="Se déconnecter"
              className="text-slate-400 hover:text-rose-600 ml-1"
            >
              <LogOut size={17} />
            </button>
          </>
        )}
      </div>
    </header>
  );
}

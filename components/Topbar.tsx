"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, BellOff, BellRing, LogOut, Moon, Search, Sun, Volume2, VolumeX } from "lucide-react";
import { canAccess, navForUser } from "@/lib/nav";
import { useApp } from "./app-context";
import { Avatar } from "./atoms";

const openPalette = () => window.dispatchEvent(new Event("cap:cmdk"));

export function Topbar() {
  const { demo, me, meId, setMeId, profiles, alerts, signOut, soundEnabled, setSoundEnabled, pushEnabled, setPushEnabled, theme, toggleTheme } = useApp();
  const router = useRouter();

  return (
    <header className="h-14 bg-white/85 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 flex items-center gap-3 px-5 shrink-0 sticky top-0 z-20">
      <button
        onClick={openPalette}
        aria-label="Ouvrir la recherche (⌘K)"
        className="group relative flex-1 max-w-sm flex items-center gap-2 pl-9 pr-2 py-1.5 text-[13px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-400 hover:border-emerald-300 transition-colors"
      >
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <span className="truncate">Rechercher, naviguer…</span>
        <kbd className="ml-auto text-[10px] text-slate-400 border border-slate-200 dark:border-slate-600 rounded px-1.5 py-0.5">⌘K</kbd>
      </button>
      <button
        onClick={toggleTheme}
        aria-label={theme === "dark" ? "Passer en thème clair" : "Passer en thème sombre"}
        title={theme === "dark" ? "Thème clair" : "Thème sombre"}
        className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
      >
        {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
      </button>
      <button
        onClick={() => setSoundEnabled(!soundEnabled)}
        aria-label={soundEnabled ? "Couper le son des notifications" : "Activer le son des notifications"}
        title={soundEnabled ? "Son des notifications activé" : "Son des notifications coupé"}
        className={soundEnabled ? "text-slate-500 hover:text-slate-700" : "text-slate-300 hover:text-slate-500"}
      >
        {soundEnabled ? <Volume2 size={19} /> : <VolumeX size={19} />}
      </button>
      <button
        onClick={() => setPushEnabled(!pushEnabled)}
        aria-label={pushEnabled ? "Désactiver les bulles de notification" : "Activer les bulles de notification"}
        title={pushEnabled ? "Bulles de notification activées" : "Bulles de notification désactivées"}
        className={pushEnabled ? "text-slate-500 hover:text-slate-700" : "text-slate-300 hover:text-slate-500"}
      >
        {pushEnabled ? <BellRing size={19} /> : <BellOff size={19} />}
      </button>
      <button
        onClick={() => router.push("/rappels")}
        aria-label="Rappels"
        className="relative text-slate-500 hover:text-slate-700"
      >
        <Bell size={19} className="transition-transform hover:rotate-12" />
        {alerts > 0 && (
          <span className="absolute -top-1 -right-1 h-4 w-4 bg-rose-500 text-white text-[9px] font-bold rounded-full grid place-items-center ring-2 ring-white">
            <span className="absolute inset-0 rounded-full bg-rose-500 animate-ping opacity-60" />
            <span className="relative">{alerts}</span>
          </span>
        )}
      </button>

      <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
        {demo ? (
          <Avatar init={me.init} src={me.avatar || undefined} size="h-8 w-8" />
        ) : (
          <Link href="/compte" aria-label="Mon compte" title="Mon compte" className="rounded-full hover:ring-2 hover:ring-emerald-300 transition">
            <Avatar init={me.init} src={me.avatar || undefined} size="h-8 w-8" />
          </Link>
        )}
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
                router.push(navForUser(next)[0]?.href ?? "/espace");
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

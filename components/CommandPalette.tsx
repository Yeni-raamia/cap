"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CornerDownLeft,
  LogOut,
  Moon,
  Plus,
  Search,
  Sun,
} from "lucide-react";
import { navForUser } from "@/lib/nav";
import { useApp } from "./app-context";

interface Cmd {
  id: string;
  label: string;
  hint?: string;
  group: string;
  icon: React.ReactNode;
  run: () => void;
}

export function CommandPalette() {
  const { demo, me, setShowNew, toggleTheme, theme, signOut } = useApp();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Raccourci global ⌘K / Ctrl+K.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("cap:cmdk", onOpen as EventListener);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("cap:cmdk", onOpen as EventListener);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQ("");
      setSel(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  const commands = useMemo<Cmd[]>(() => {
    const go = (href: string) => () => {
      router.push(href);
      setOpen(false);
    };
    const nav = navForUser(me).map((n) => ({
      id: `nav-${n.id}`,
      label: n.label,
      hint: "Aller à",
      group: "Navigation",
      icon: <ArrowRight size={15} className="text-slate-400" />,
      run: go(n.href),
    }));
    const actions: Cmd[] = [];
    if (!demo) {
      actions.push({
        id: "new",
        label: "Nouveau suivi de mail",
        hint: "Créer",
        group: "Actions",
        icon: <Plus size={15} className="text-emerald-500" />,
        run: () => {
          setShowNew(true);
          setOpen(false);
        },
      });
    }
    actions.push({
      id: "theme",
      label: theme === "dark" ? "Passer en thème clair" : "Passer en thème sombre",
      hint: "Apparence",
      group: "Actions",
      icon: theme === "dark" ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} className="text-indigo-400" />,
      run: () => {
        toggleTheme();
        setOpen(false);
      },
    });
    if (!demo) {
      actions.push({
        id: "logout",
        label: "Se déconnecter",
        group: "Actions",
        icon: <LogOut size={15} className="text-rose-400" />,
        run: () => {
          setOpen(false);
          signOut();
        },
      });
    }
    return [...actions, ...nav];
  }, [me, demo, theme, router, setShowNew, toggleTheme, signOut]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return commands;
    return commands.filter((c) => c.label.toLowerCase().includes(s) || c.group.toLowerCase().includes(s));
  }, [q, commands]);

  useEffect(() => {
    if (sel >= filtered.length) setSel(0);
  }, [filtered.length, sel]);

  if (!open) return null;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSel((s) => Math.min(filtered.length - 1, s + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSel((s) => Math.max(0, s - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      filtered[sel]?.run();
    }
  };

  // Regroupe pour l'affichage.
  let lastGroup = "";

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-slate-900/40 backdrop-blur-sm animate-fade pt-[12vh] px-4" onClick={() => setOpen(false)}>
      <div
        className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-float border border-slate-200 dark:border-slate-700 overflow-hidden animate-pop"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-2 px-4 border-b border-slate-100 dark:border-slate-800">
          <Search size={17} className="text-slate-400" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher une page, une action…"
            className="flex-1 py-3.5 text-[14px] bg-transparent outline-none text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
          />
          <kbd className="text-[10px] text-slate-400 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5">ESC</kbd>
        </div>
        <div className="max-h-[52vh] overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-[13px] text-slate-400">Aucun résultat.</div>
          ) : (
            filtered.map((c, i) => {
              const showGroup = c.group !== lastGroup;
              lastGroup = c.group;
              const active = i === sel;
              return (
                <div key={c.id}>
                  {showGroup && (
                    <div className="px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{c.group}</div>
                  )}
                  <button
                    onMouseEnter={() => setSel(i)}
                    onClick={() => c.run()}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      active ? "bg-emerald-50 dark:bg-emerald-500/10" : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <span className="grid place-items-center h-7 w-7 rounded-lg bg-slate-100 dark:bg-slate-800">{c.icon}</span>
                    <span className="flex-1 text-[13.5px] text-slate-800 dark:text-slate-100">{c.label}</span>
                    {c.hint && <span className="text-[11px] text-slate-400">{c.hint}</span>}
                    {active && <CornerDownLeft size={13} className="text-emerald-500" />}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

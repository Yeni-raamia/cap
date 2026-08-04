"use client";

import { useMemo, useState } from "react";
import { contactDisplayName, type Contact } from "@/lib/domain";
import { useApp } from "./app-context";

/**
 * Champ de saisie d'un destinataire avec autocomplétion depuis l'annuaire
 * partagé : suggestions filtrées au fil de la frappe (nom · service · e-mail).
 * La saisie libre reste possible (nom hors annuaire).
 */
export function ContactAutocomplete({
  value,
  onChange,
  onPick,
  placeholder,
  className,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  onPick: (c: Contact) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}) {
  const { contacts } = useApp();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const matches = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return [];
    return contacts
      .filter((c) => `${contactDisplayName(c)} ${c.email} ${c.service} ${c.fonction}`.toLowerCase().includes(q))
      .slice(0, 8);
  }, [contacts, value]);

  const choose = (c: Contact) => {
    onPick(c);
    setOpen(false);
  };

  return (
    <div className="relative">
      <input
        id={id}
        value={value}
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (!open || matches.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, matches.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            choose(matches[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder={placeholder}
        className={className}
      />
      {open && matches.length > 0 && (
        <ul className="absolute z-30 left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg text-[12px]">
          {matches.map((c, i) => (
            <li key={c.id}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(c);
                }}
                className={`w-full text-left px-2.5 py-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 ${
                  i === active ? "bg-emerald-50 dark:bg-emerald-500/10" : ""
                }`}
              >
                <span className="font-medium text-slate-800 dark:text-slate-100">{contactDisplayName(c) || "(sans nom)"}</span>
                {c.service && <span className="text-slate-400"> · {c.service}</span>}
                {c.email && <span className="block text-[11px] text-slate-400 truncate">{c.email}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

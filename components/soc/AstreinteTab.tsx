"use client";

import { useMemo, useState } from "react";
import { CalendarClock, Phone, Plus, UserCheck } from "lucide-react";
import { SHIFT_ROLE_TONE, currentOnCall, fmtLong, isShiftActive, type OnCallShift } from "@/lib/domain";
import { useApp } from "@/components/app-context";
import { Card } from "@/components/atoms";
import { GrcTabHeader } from "@/components/grc/GrcTabHeader";
import { EmptyState } from "@/components/EmptyState";
import { OnCallModal } from "@/components/OnCallModal";

const fmtDT = (d: Date) => new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(d);

export function AstreinteTab() {
  const { onCall, profileById, readOnly } = useApp();
  const now = useMemo(() => new Date(), []);
  const [creating, setCreating] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const active = useMemo(() => currentOnCall(onCall, now), [onCall, now]);
  const upcoming = useMemo(() => onCall.filter((s) => s.start.getTime() > now.getTime()).sort((a, b) => a.start.getTime() - b.start.getTime()), [onCall, now]);
  const past = useMemo(() => onCall.filter((s) => s.end.getTime() < now.getTime()).sort((a, b) => b.end.getTime() - a.end.getTime()), [onCall, now]);

  const editing = editId ? onCall.find((s) => s.id === editId) ?? null : null;
  const canCreate = !readOnly;

  return (
    <div className="space-y-5">
      <GrcTabHeader
        title="Astreinte & planning de garde"
        subtitle="Qui est de garde, quand, et comment le joindre — pour ne jamais perdre de temps en cas d'incident."
        right={canCreate ? (
          <button onClick={() => setCreating(true)} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-slate-900 dark:bg-emerald-600 rounded-xl px-3.5 py-2 hover:-translate-y-0.5 transition-transform shadow-soft">
            <Plus size={15} /> Nouvelle garde
          </button>
        ) : undefined}
      />

      {/* De garde maintenant */}
      <Card className="p-4">
        <div className="text-[11px] text-slate-500 uppercase mb-2 flex items-center gap-1.5"><UserCheck size={14} className="text-emerald-500" /> De garde maintenant · {fmtLong(now)}</div>
        {active.length === 0 ? (
          <div className="text-[13px] text-slate-400">Personne n&apos;est planifié de garde à cet instant.</div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-2">
            {active.map((s) => (
              <button key={s.id} onClick={() => setEditId(s.id)} className="text-left rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-500/10 p-3 hover:-translate-y-0.5 transition-transform">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-semibold text-slate-800 dark:text-slate-100">{profileById(s.personId).nom}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${SHIFT_ROLE_TONE[s.role] ?? ""}`}>{s.role}</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">jusqu&apos;au {fmtDT(s.end)}</div>
                {s.contact && <div className="text-[12px] text-emerald-700 mt-0.5 inline-flex items-center gap-1"><Phone size={12} /> {s.contact}</div>}
              </button>
            ))}
          </div>
        )}
      </Card>

      {onCall.length === 0 ? (
        <EmptyState icon={CalendarClock} title="Aucune garde planifiée" subtitle={canCreate ? "Planifie les créneaux d'astreinte de l'équipe." : "Le planning d'astreinte sera géré par l'équipe."} />
      ) : (
        <>
          {upcoming.length > 0 && <ShiftList title="À venir" shifts={upcoming} now={now} profileById={profileById} onOpen={setEditId} />}
          {past.length > 0 && <ShiftList title="Passées" shifts={past.slice(0, 12)} now={now} profileById={profileById} onOpen={setEditId} dim />}
        </>
      )}

      {(creating || editing) && <OnCallModal shift={editing} creating={creating} onClose={() => { setCreating(false); setEditId(null); }} />}
    </div>
  );
}

function ShiftList({ title, shifts, now, profileById, onOpen, dim }: { title: string; shifts: OnCallShift[]; now: Date; profileById: (id: string) => { nom: string }; onOpen: (id: string) => void; dim?: boolean }) {
  return (
    <div>
      <div className="text-[13px] font-semibold text-slate-700 dark:text-slate-200 mb-2">{title}</div>
      <div className="space-y-1.5">
        {shifts.map((s) => (
          <button key={s.id} onClick={() => onOpen(s.id)} className={`w-full text-left rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-soft px-3 py-2 flex items-center gap-3 hover:-translate-y-0.5 transition-transform ${dim ? "opacity-60" : ""}`}>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border shrink-0 ${SHIFT_ROLE_TONE[s.role] ?? ""}`}>{s.role}</span>
            <span className="text-[13px] font-medium text-slate-800 dark:text-slate-100 shrink-0">{profileById(s.personId).nom}</span>
            <span className="text-[11px] text-slate-400 flex-1 min-w-0 truncate">{fmtDT(s.start)} → {fmtDT(s.end)}</span>
            {isShiftActive(s, now) && <span className="text-[10px] text-emerald-600 shrink-0">en cours</span>}
            {s.contact && <span className="text-[11px] text-slate-400 shrink-0 hidden sm:inline">{s.contact}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

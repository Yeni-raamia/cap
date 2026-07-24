"use client";

import { useEffect, useState } from "react";
import { Loader2, LogOut, Monitor, MapPin, X } from "lucide-react";

interface Session {
  id: string;
  current: boolean;
  device: string;
  ip: string | null;
  createdAt: string;
  lastSeenAt: string;
}

const rel = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.round(h / 24);
  return `il y a ${d} j`;
};

/** Sessions actives (appareils connectés) de l'espace membre : liste + révocation. */
export function SessionsSection() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = () => {
    fetch("/api/account/sessions")
      .then((r) => (r.ok ? r.json() : { sessions: [] }))
      .then((d) => setSessions(d.sessions || []))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const act = async (body: { action: string; id?: string }, key: string) => {
    setBusy(key);
    try {
      const r = await fetch("/api/account/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (r.ok) setSessions(d.sessions || []);
    } finally {
      setBusy(null);
    }
  };

  const others = sessions.filter((s) => !s.current).length;

  return (
    <section className="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-soft p-5">
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2">
          <Monitor size={16} className="text-slate-400" />
          <h2 className="text-[14px] font-bold text-slate-800 dark:text-slate-100">Sessions actives</h2>
        </div>
        {others > 0 && (
          <button
            onClick={() => act({ action: "revoke_others" }, "others")}
            disabled={busy === "others"}
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-rose-700 border border-rose-200 dark:border-rose-500/30 rounded-lg px-2.5 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-500/10 disabled:opacity-50"
          >
            {busy === "others" ? <Loader2 size={13} className="animate-spin" /> : <LogOut size={13} />} Déconnecter les autres
          </button>
        )}
      </div>
      <p className="text-[12px] text-slate-500 mb-4">Les appareils actuellement connectés à ton compte.</p>

      {loading ? (
        <div className="text-[13px] text-slate-400 text-center py-6 flex items-center justify-center gap-2">
          <Loader2 size={14} className="animate-spin" /> Chargement…
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-3 rounded-xl border border-slate-200/70 dark:border-slate-800 px-3 py-2.5"
            >
              <Monitor size={18} className="text-slate-400 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-medium text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  {s.device}
                  {s.current && (
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-500/10 rounded-full px-1.5 py-0.5">
                      Cet appareil
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 flex items-center gap-2 flex-wrap">
                  <span>Actif {rel(s.lastSeenAt)}</span>
                  {s.ip && (
                    <span className="inline-flex items-center gap-0.5">
                      <MapPin size={10} /> {s.ip}
                    </span>
                  )}
                </div>
              </div>
              {!s.current && (
                <button
                  onClick={() => act({ action: "revoke", id: s.id }, s.id)}
                  disabled={busy === s.id}
                  title="Révoquer cette session"
                  className="inline-flex items-center gap-1 text-[12px] text-slate-500 hover:text-rose-600 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 disabled:opacity-50"
                >
                  {busy === s.id ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

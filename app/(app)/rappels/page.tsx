"use client";

import { ArrowUp, Bell, CalendarClock, CheckCheck, Mail, RotateCcw } from "lucide-react";
import { fmt, reminderState, type Item, type NotifKind } from "@/lib/domain";
import { useApp } from "@/components/app-context";
import { Card, Token } from "@/components/atoms";

const notifIcon: Record<NotifKind, typeof RotateCcw> = {
  relance: RotateCcw,
  escalade: ArrowUp,
  digest: CalendarClock,
};
const notifTone: Record<NotifKind, string> = {
  relance: "bg-amber-100 text-amber-600",
  escalade: "bg-rose-100 text-rose-600",
  digest: "bg-slate-800 text-emerald-300",
};

export default function RappelsPage() {
  const { demo, items, now, me, emailOn, profileById, notifications, markNotificationsRead } =
    useApp();

  const dues = items.filter((i) => reminderState(i, now).level === "relance");
  const escal = items.filter((i) => reminderState(i, now).level === "escalade");
  const bloques = items.filter((i) => i.statut === "Bloqué").length;
  const isDir = me.role === "directeur" || me.role === "admin";
  const unread = notifications.filter((n) => !n.read).length;

  const Row = ({ i, tone }: { i: Item; tone: "rose" | "amber" }) => {
    const rs = reminderState(i, now);
    return (
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 last:border-0">
        <div
          className={`h-8 w-8 rounded-lg grid place-items-center ${
            tone === "rose" ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-600"
          }`}
        >
          {tone === "rose" ? <ArrowUp size={16} /> : <RotateCcw size={16} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] text-slate-800 truncate">{i.objet}</div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400 flex-wrap">
            <Token>{i.ref}</Token>
            <span>{profileById(i.ownerId).nom}</span>
            <span>· sans réponse depuis {rs.days}j</span>
          </div>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-slate-400">
          <span className="px-1.5 py-0.5 bg-slate-100 rounded">in-app</span>
          {emailOn && (
            <span className="px-1.5 py-0.5 bg-slate-100 rounded flex items-center gap-1">
              <Mail size={9} />
              e-mail
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Rappels</h1>
        <p className="text-[13px] text-slate-500">
          Le système relance à ta place — canaux : in-app{emailOn ? " + e-mail" : ""}.
        </p>
      </div>

      {!demo && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Bell size={15} className="text-slate-500" />
            <h2 className="text-[13px] font-semibold text-slate-700 uppercase tracking-wide">
              Mes notifications
            </h2>
            {unread > 0 && (
              <span className="text-[11px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">
                {unread}
              </span>
            )}
            {unread > 0 && (
              <button
                onClick={markNotificationsRead}
                className="ml-auto inline-flex items-center gap-1 text-[12px] text-emerald-700 font-medium hover:underline"
              >
                <CheckCheck size={14} />
                Tout marquer comme lu
              </button>
            )}
          </div>
          <Card>
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-[13px] text-slate-400">
                Aucune notification pour l&apos;instant.
              </div>
            ) : (
              notifications.map((n) => {
                const Icon = notifIcon[n.kind];
                return (
                  <div
                    key={n.id}
                    className={`flex items-center gap-3 px-4 py-3 border-b border-slate-100 last:border-0 ${
                      n.read ? "opacity-60" : ""
                    }`}
                  >
                    <div className={`h-8 w-8 rounded-lg grid place-items-center ${notifTone[n.kind]}`}>
                      <Icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] text-slate-800">{n.message}</div>
                      <div className="text-[11px] text-slate-400">{fmt(n.createdAt)}</div>
                    </div>
                    {!n.read && <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />}
                  </div>
                );
              })
            )}
          </Card>
        </div>
      )}

      {isDir && (
        <Card className="p-4 bg-slate-800 border-slate-800">
          <div className="flex items-center gap-2 text-emerald-300 text-[11px] font-mono mb-2">
            <CalendarClock size={14} />
            DIGEST DU MATIN · 08:00
          </div>
          <div className="text-white text-[15px] font-medium mb-1">
            {escal.length} suivis escaladés · {bloques} bloqués
          </div>
          <div className="text-slate-300 text-[12px]">
            Envoyé automatiquement chaque matin. Tu n&apos;as plus à courir après les suivis — ils
            remontent à toi.
          </div>
        </Card>
      )}

      <div>
        <div className="flex items-center gap-2 mb-2">
          <RotateCcw size={15} className="text-amber-500" />
          <h2 className="text-[13px] font-semibold text-slate-700 uppercase tracking-wide">
            Relances dues
          </h2>
          <span className="text-[11px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
            {dues.length}
          </span>
        </div>
        <Card>
          {dues.length ? (
            dues.map((i) => <Row key={i.id} i={i} tone="amber" />)
          ) : (
            <div className="p-6 text-center text-[13px] text-slate-400">Aucune relance due.</div>
          )}
        </Card>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <ArrowUp size={15} className="text-rose-500" />
          <h2 className="text-[13px] font-semibold text-slate-700 uppercase tracking-wide">
            Escaladés au Directeur
          </h2>
          <span className="text-[11px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">
            {escal.length}
          </span>
        </div>
        <Card>
          {escal.length ? (
            escal.map((i) => <Row key={i.id} i={i} tone="rose" />)
          ) : (
            <div className="p-6 text-center text-[13px] text-slate-400">Aucune escalade.</div>
          )}
        </Card>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArrowUp, Bell, CalendarCheck, CalendarClock, CalendarDays, CheckCheck, CheckSquare, FolderKanban, Mail, MessageSquare, RotateCcw, ShieldAlert } from "lucide-react";
import { fmt, isPublished, type Item, type Notif, type NotifKind } from "@/lib/domain";
import { useApp } from "@/components/app-context";
import { Card, Token } from "@/components/atoms";
import { PageHero } from "@/components/PageHero";

const notifIcon: Record<NotifKind, typeof RotateCcw> = {
  relance: RotateCcw,
  escalade: ArrowUp,
  digest: CalendarClock,
  echeance: CalendarCheck,
  message: MessageSquare,
  projet: FolderKanban,
  tache: CheckSquare,
  securite: ShieldAlert,
  reunion: CalendarDays,
};
const notifTone: Record<NotifKind, string> = {
  relance: "bg-amber-100 text-amber-600",
  escalade: "bg-rose-100 text-rose-600",
  digest: "bg-slate-800 text-emerald-300",
  echeance: "bg-sky-100 text-sky-600",
  message: "bg-emerald-100 text-emerald-600",
  projet: "bg-indigo-100 text-indigo-600",
  tache: "bg-violet-100 text-violet-600",
  securite: "bg-rose-100 text-rose-600",
  reunion: "bg-amber-100 text-amber-600",
};

export default function RappelsPage() {
  const {
    demo, items: allItems, me, emailEnabled: emailOn, rs, profileById, notifications,
    markNotificationsRead, markNotificationRead, openItem,
  } = useApp();
  const [notifTab, setNotifTab] = useState<"actives" | "archivees">("actives");
  const router = useRouter();

  // Vue d'équipe : rappels calculés sur les suivis publiés uniquement.
  const items = allItems.filter(isPublished);
  const dues = items.filter((i) => rs(i).level === "relance");
  const escal = items.filter((i) => rs(i).level === "escalade");
  const bloques = items.filter((i) => i.statut === "Bloqué").length;
  const isDir = me.role === "directeur" || me.role === "admin";

  const active = notifications.filter((n) => !n.read);
  const archived = notifications.filter((n) => n.read);
  const shown = notifTab === "actives" ? active : archived;

  // Rediriger vers le sujet du rappel (lien explicite, sinon le suivi lié) puis
  // archiver la notification active.
  const onNotifClick = (n: Notif) => {
    if (n.link) {
      router.push(n.link);
    } else if (n.itemId) {
      const it = allItems.find((x) => x.id === n.itemId);
      if (it) openItem(it);
    }
    if (!n.read) markNotificationRead(n.id);
  };

  const Row = ({ i, tone }: { i: Item; tone: "rose" | "amber" }) => {
    const state = rs(i);
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
            <span>· sans réponse depuis {state.days}j</span>
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
    <div className="space-y-5 animate-float">
      <PageHero
        kicker="Automatisation"
        icon={Bell}
        title="Rappels"
        subtitle={`Le système relance à ta place — canaux : in-app${emailOn ? " + e-mail" : ""}.`}
      />

      {!demo && (
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Bell size={15} className="text-slate-500" />
            <h2 className="text-[13px] font-semibold text-slate-700 uppercase tracking-wide">
              Mes notifications
            </h2>
            {/* Onglets Actives / Archivées */}
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 text-[12px] bg-white ml-1">
              <button
                onClick={() => setNotifTab("actives")}
                className={`px-2.5 py-1 rounded-md font-medium ${notifTab === "actives" ? "bg-emerald-600 text-white" : "text-slate-500 hover:text-slate-700"}`}
              >
                Actives{active.length ? ` (${active.length})` : ""}
              </button>
              <button
                onClick={() => setNotifTab("archivees")}
                className={`px-2.5 py-1 rounded-md font-medium ${notifTab === "archivees" ? "bg-slate-700 text-white" : "text-slate-500 hover:text-slate-700"}`}
              >
                Archivées{archived.length ? ` (${archived.length})` : ""}
              </button>
            </div>
            {notifTab === "actives" && active.length > 0 && (
              <button
                onClick={markNotificationsRead}
                className="ml-auto inline-flex items-center gap-1 text-[12px] text-emerald-700 font-medium hover:underline"
              >
                <CheckCheck size={14} />
                Tout archiver
              </button>
            )}
          </div>
          <Card>
            {shown.length === 0 ? (
              <div className="p-6 text-center text-[13px] text-slate-400">
                {notifTab === "actives" ? "Aucune notification active. Tout est traité 🎉" : "Aucune notification archivée."}
              </div>
            ) : (
              shown.map((n) => {
                const Icon = notifIcon[n.kind];
                return (
                  <button
                    key={n.id}
                    onClick={() => onNotifClick(n)}
                    className={`w-full text-left flex items-center gap-3 px-4 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 ${
                      n.read ? "opacity-70" : ""
                    }`}
                  >
                    <div className={`h-8 w-8 rounded-lg grid place-items-center shrink-0 ${notifTone[n.kind]}`}>
                      <Icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] text-slate-800">{n.message}</div>
                      <div className="text-[11px] text-slate-400">{fmt(n.createdAt)}</div>
                    </div>
                    {!n.read && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          markNotificationRead(n.id);
                        }}
                        title="Archiver"
                        aria-label="Archiver cette notification"
                        className="shrink-0 inline-flex items-center justify-center h-7 w-7 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                      >
                        <Archive size={14} />
                      </span>
                    )}
                  </button>
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
            {escal.length} suivis de mail escaladés · {bloques} bloqués
          </div>
          <div className="text-slate-300 text-[12px]">
            Envoyé automatiquement chaque matin. Tu n&apos;as plus à courir après les suivis de mail — ils
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

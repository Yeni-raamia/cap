"use client";

import { useState } from "react";
import { AlertOctagon, FolderKanban, Inbox, MessageSquare, Plus, Trash2, UserRound, Users2, X } from "lucide-react";
import { type ConversationSummary } from "@/lib/domain";
import { useApp } from "@/components/app-context";
import { Avatar, Card } from "@/components/atoms";
import { PageHero } from "@/components/PageHero";
import { Discussion } from "@/components/Discussion";

const kindIcon: Record<string, typeof MessageSquare> = {
  group: Users2,
  direct: UserRound,
  item: Inbox,
  negligence: AlertOctagon,
  project: FolderKanban,
};

export default function MessageriePage() {
  const { demo, conversations, profiles, me, createGroup, startDirect, deleteGroup, markConversationRead } = useApp();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panel, setPanel] = useState<null | "group" | "direct">(null);
  const [title, setTitle] = useState("");
  const [members, setMembers] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const selected = conversations.find((c) => c.id === selectedId) ?? null;
  // Destinataires possibles pour un message privé : comptes approuvés, hors soi et hors DSI (lecture seule).
  const contactables = profiles.filter((u) => u.id !== me.id && u.role !== "dsi");

  const open = (c: ConversationSummary) => {
    setSelectedId(c.id);
    if (c.unread > 0) markConversationRead(c.id);
  };

  const create = async () => {
    setErr(null);
    if (!title.trim()) return setErr("Titre du groupe requis.");
    const e = await createGroup(title.trim(), members);
    if (e) return setErr(e);
    setTitle("");
    setMembers([]);
    setPanel(null);
  };

  const openDirect = async (profileId: string) => {
    const id = await startDirect(profileId);
    setPanel(null);
    if (id) {
      setSelectedId(id);
      markConversationRead(id);
    }
  };

  const removeGroup = async (c: ConversationSummary) => {
    if (!confirm(`Supprimer le groupe « ${c.title} » et tous ses messages ?`)) return;
    const e = await deleteGroup(c.id);
    if (e) setErr(e);
    else if (selectedId === c.id) setSelectedId(null);
  };

  const canDeleteGroup = (c: ConversationSummary) => c.kind === "group" && (c.createdBy === me.id || me.role === "admin");

  return (
    <div className="space-y-4 animate-float">
      <PageHero
        kicker="Communication"
        icon={MessageSquare}
        title="Messagerie"
        subtitle="Messages privés, groupes et fils sur les suivis de mail, négligences et projets."
        right={
          !demo ? (
            <>
              <button onClick={() => setPanel(panel === "direct" ? null : "direct")} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 rounded-xl px-3 py-2 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors">
                <UserRound size={16} /> Message privé
              </button>
              <button onClick={() => setPanel(panel === "group" ? null : "group")} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-slate-900 dark:bg-emerald-600 rounded-xl px-3.5 py-2 hover:-translate-y-0.5 transition-transform shadow-soft">
                <Plus size={16} /> Nouveau groupe
              </button>
            </>
          ) : undefined
        }
      />

      {/* Nouveau message privé */}
      {panel === "direct" && !demo && (
        <Card className="p-4 space-y-2">
          <div className="text-[13px] font-semibold text-slate-700">Démarrer un message privé</div>
          {contactables.length === 0 ? (
            <div className="text-[12px] text-slate-400">Aucun contact disponible.</div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {contactables.map((u) => (
                <button key={u.id} onClick={() => openDirect(u.id)} className="inline-flex items-center gap-1.5 text-[12px] border border-slate-200 rounded-full pl-1 pr-3 py-0.5 hover:bg-emerald-50 hover:border-emerald-200">
                  <Avatar init={u.init} size="h-5 w-5" /> {u.nom}
                </button>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Nouveau groupe */}
      {panel === "group" && !demo && (
        <Card className="p-4 space-y-3">
          <div className="text-[13px] font-semibold text-slate-700">Nouveau groupe de discussion</div>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nom du groupe (ex. Cellule incident)" className="w-full text-[13px] border border-slate-200 rounded-lg px-3 py-2" />
          <div>
            <div className="text-[12px] text-slate-500 mb-1.5">Membres</div>
            <div className="flex flex-wrap gap-1.5">
              {contactables.map((u) => {
                const on = members.includes(u.id);
                return (
                  <label key={u.id} className={`inline-flex items-center gap-1 text-[11px] border rounded-full px-2 py-1 cursor-pointer ${on ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "border-slate-200 text-slate-500"}`}>
                    <input type="checkbox" checked={on} onChange={(e) => setMembers((prev) => e.target.checked ? [...prev, u.id] : prev.filter((x) => x !== u.id))} className="h-3 w-3 accent-emerald-600" />
                    {u.nom}
                  </label>
                );
              })}
            </div>
          </div>
          {err && <div className="text-[12px] text-rose-600">{err}</div>}
          <div className="flex gap-2">
            <button onClick={() => setPanel(null)} className="text-[13px] text-slate-600 border border-slate-200 rounded-lg px-3 py-1.5 inline-flex items-center gap-1"><X size={13} />Annuler</button>
            <button onClick={create} className="text-[13px] font-medium text-white bg-emerald-600 rounded-lg px-3 py-1.5">Créer le groupe</button>
          </div>
        </Card>
      )}

      {err && panel === null && <div className="text-[12px] text-rose-600">{err}</div>}

      <div className="grid md:grid-cols-3 gap-4">
        {/* Liste des conversations */}
        <Card className="p-0 overflow-hidden md:col-span-1">
          {conversations.length === 0 ? (
            <div className="p-6 text-center text-[13px] text-slate-400">
              {demo ? "Messagerie indisponible en mode démo." : "Aucune conversation. Écris à quelqu'un, crée un groupe ou commente un suivi de mail/projet."}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[70vh] overflow-y-auto">
              {conversations.map((c) => {
                const Icon = kindIcon[c.kind] ?? MessageSquare;
                const active = selectedId === c.id;
                return (
                  <div key={c.id} className={`group flex items-center ${active ? "bg-emerald-50" : "hover:bg-slate-50"}`}>
                    <button onClick={() => open(c)} className="flex-1 flex items-start gap-2 px-3 py-2.5 text-left min-w-0">
                      <div className="h-8 w-8 rounded-lg bg-slate-100 text-slate-500 grid place-items-center shrink-0"><Icon size={16} /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[13px] font-medium text-slate-800 truncate flex-1">{c.title}</span>
                          {c.unread > 0 && <span className="text-[10px] bg-emerald-500 text-white font-bold rounded-full px-1.5">{c.unread}</span>}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">{c.lastPreview || "—"}</div>
                      </div>
                    </button>
                    {canDeleteGroup(c) && (
                      <button onClick={() => removeGroup(c)} aria-label="Supprimer le groupe" className="px-2 text-slate-300 hover:text-rose-600 opacity-0 group-hover:opacity-100">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Fil */}
        <Card className="p-4 md:col-span-2">
          {selected ? (
            <>
              <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-100">
                {(() => { const Icon = kindIcon[selected.kind] ?? MessageSquare; return <Icon size={16} className="text-slate-500" />; })()}
                <span className="text-[14px] font-semibold text-slate-800">{selected.title}</span>
                {selected.kind === "group" && <span className="text-[11px] text-slate-400">· {selected.memberIds.length} membre(s)</span>}
                {selected.kind === "direct" && <span className="text-[11px] text-emerald-600">· privé</span>}
                {canDeleteGroup(selected) && (
                  <button onClick={() => removeGroup(selected)} className="ml-auto inline-flex items-center gap-1 text-[12px] text-rose-600 hover:bg-rose-50 rounded-lg px-2 py-1">
                    <Trash2 size={13} /> Supprimer le groupe
                  </button>
                )}
              </div>
              <Discussion target={{ convId: selected.id }} height="h-[60vh]" />
            </>
          ) : (
            <div className="text-[13px] text-slate-400 text-center py-24">Sélectionne une conversation.</div>
          )}
        </Card>
      </div>
    </div>
  );
}

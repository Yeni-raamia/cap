"use client";

import { useState } from "react";
import { AlertOctagon, FolderKanban, Inbox, MessageSquare, Plus, Users2, X } from "lucide-react";
import { fmt, type ConversationSummary } from "@/lib/domain";
import { useApp } from "@/components/app-context";
import { Card } from "@/components/atoms";
import { Discussion } from "@/components/Discussion";

const kindIcon: Record<string, typeof MessageSquare> = {
  group: Users2,
  item: Inbox,
  negligence: AlertOctagon,
  project: FolderKanban,
};

export default function MessageriePage() {
  const { demo, conversations, profiles, me, createGroup, markConversationRead } = useApp();
  const [selected, setSelected] = useState<ConversationSummary | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [title, setTitle] = useState("");
  const [members, setMembers] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const open = (c: ConversationSummary) => {
    setSelected(c);
    if (c.unread > 0) markConversationRead(c.id);
  };

  const create = async () => {
    setErr(null);
    if (!title.trim()) return setErr("Titre du groupe requis.");
    const e = await createGroup(title.trim(), members);
    if (e) return setErr(e);
    setTitle(""); setMembers([]); setShowNew(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-slate-800 flex items-center gap-2"><MessageSquare size={20} className="text-emerald-600" /> Messagerie</h1>
          <p className="text-[13px] text-slate-500">Messages internes et fils de discussion sur les suivis, négligences et projets.</p>
        </div>
        {!demo && (
          <button onClick={() => setShowNew((v) => !v)} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-white bg-emerald-600 rounded-lg px-3 py-2 hover:bg-emerald-700">
            <Plus size={16} /> Nouveau groupe
          </button>
        )}
      </div>

      {showNew && !demo && (
        <Card className="p-4 space-y-3">
          <div className="text-[13px] font-semibold text-slate-700">Nouveau groupe de discussion</div>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nom du groupe (ex. Cellule incident)" className="w-full text-[13px] border border-slate-200 rounded-lg px-3 py-2" />
          <div>
            <div className="text-[12px] text-slate-500 mb-1.5">Membres</div>
            <div className="flex flex-wrap gap-1.5">
              {profiles.filter((u) => u.id !== me.id).map((u) => {
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
            <button onClick={() => setShowNew(false)} className="text-[13px] text-slate-600 border border-slate-200 rounded-lg px-3 py-1.5 inline-flex items-center gap-1"><X size={13} />Annuler</button>
            <button onClick={create} className="text-[13px] font-medium text-white bg-emerald-600 rounded-lg px-3 py-1.5">Créer le groupe</button>
          </div>
        </Card>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        {/* Liste des conversations */}
        <Card className="p-0 overflow-hidden md:col-span-1">
          {conversations.length === 0 ? (
            <div className="p-6 text-center text-[13px] text-slate-400">
              {demo ? "Messagerie indisponible en mode démo." : "Aucune conversation. Crée un groupe ou écris sur un suivi/projet."}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[70vh] overflow-y-auto">
              {conversations.map((c) => {
                const Icon = kindIcon[c.kind] ?? MessageSquare;
                const active = selected?.id === c.id;
                return (
                  <button key={c.id} onClick={() => open(c)} className={`w-full flex items-start gap-2 px-3 py-2.5 text-left ${active ? "bg-emerald-50" : "hover:bg-slate-50"}`}>
                    <div className="h-8 w-8 rounded-lg bg-slate-100 text-slate-500 grid place-items-center shrink-0"><Icon size={16} /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13px] font-medium text-slate-800 truncate flex-1">{c.title}</span>
                        {c.unread > 0 && <span className="text-[10px] bg-emerald-500 text-white font-bold rounded-full px-1.5">{c.unread}</span>}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">{c.lastPreview || "—"}</div>
                    </div>
                  </button>
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

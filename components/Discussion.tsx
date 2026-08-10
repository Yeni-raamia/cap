"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, BellOff, CornerUpLeft, Paperclip, Send, SmilePlus, Trash2, X } from "lucide-react";
import { fmt, formatBytes, isImageAttachment, REACTION_EMOJIS, type Message } from "@/lib/domain";
import { useApp } from "./app-context";
import { Avatar } from "./atoms";

interface Target {
  convId?: string;
  refType?: string;
  refId?: string;
}

/** Fil de discussion réutilisable (suivi, négligence, projet ou groupe). */
export function Discussion({ target, height = "h-72" }: { target: Target; height?: string }) {
  const { demo, me, profileById, loadMessages, muteConversation, sendMessage, sendMessageFile, reactToMessage, deleteMessage } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [convId, setConvId] = useState<string | null>(target.convId ?? null);
  const [muted, setMuted] = useState(false);
  const [muting, setMuting] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const key = target.convId ?? `${target.refType}:${target.refId}`;

  useEffect(() => {
    if (demo) return;
    let alive = true;
    const load = () =>
      loadMessages(target).then((d) => {
        if (!alive) return;
        setConvId(d.conversationId);
        setMessages(d.messages);
        setMuted(d.muted);
      });
    load();
    const iv = setInterval(load, 15000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, demo]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const submit = async () => {
    const body = input.trim();
    if (!body || sending) return;
    setSending(true);
    setInput("");
    const reply = replyingTo?.id ?? null;
    setReplyingTo(null);
    const msgs = await sendMessage(target, body, reply);
    setMessages(msgs);
    if (!convId && target.convId) setConvId(target.convId);
    setSending(false);
  };

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || uploading) return;
    setErr(null);
    setUploading(true);
    const caption = input.trim();
    setInput("");
    const reply = replyingTo?.id ?? null;
    setReplyingTo(null);
    const { messages: msgs, error } = await sendMessageFile(target, file, caption, reply);
    if (error) setErr(error);
    else {
      setMessages(msgs);
      if (!convId && target.convId) setConvId(target.convId);
    }
    setUploading(false);
  };

  const react = async (messageId: string, emoji: string) => {
    setPickerFor(null);
    const msgs = await reactToMessage(messageId, emoji);
    if (msgs) setMessages(msgs);
  };

  const remove = async (messageId: string) => {
    if (!confirm("Supprimer ce message ?")) return;
    const msgs = await deleteMessage(messageId);
    if (msgs) setMessages(msgs);
  };

  if (demo) {
    return <div className="text-[12px] text-slate-400 p-3">Messagerie indisponible en mode démo.</div>;
  }

  const toggleMute = async () => {
    if (muting) return;
    setMuting(true);
    const ok = await muteConversation({ ...target, convId: convId ?? target.convId }, !muted);
    if (ok) setMuted(!muted);
    setMuting(false);
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-end mb-1.5">
        <button
          onClick={toggleMute}
          disabled={muting}
          title={muted ? "Réactiver les notifications de ce fil" : "Ne plus recevoir les notifications de ce fil"}
          className={`inline-flex items-center gap-1 text-[11px] rounded-lg px-2 py-1 border transition-colors disabled:opacity-50 ${
            muted
              ? "text-amber-700 border-amber-200 bg-amber-50 hover:bg-amber-100"
              : "text-slate-500 border-slate-200 hover:bg-slate-50"
          }`}
        >
          {muted ? <BellOff size={13} /> : <Bell size={13} />}
          {muted ? "En sourdine" : "Notifié"}
        </button>
      </div>
      <div className={`${height} overflow-y-auto space-y-3 pr-1`}>
        {messages.length === 0 ? (
          <div className="text-[12px] text-slate-400 text-center py-6">Aucun message. Démarre la discussion.</div>
        ) : (
          messages.map((m) => {
            const mine = m.authorId === me.id;
            const author = profileById(m.authorId);
            const parent = m.replyTo ? messages.find((x) => x.id === m.replyTo) : null;
            // Réactions groupées par emoji.
            const grouped = new Map<string, string[]>();
            m.reactions.forEach((r) => grouped.set(r.emoji, [...(grouped.get(r.emoji) ?? []), r.profileId]));

            return (
              <div key={m.id} className={`group flex gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                <Avatar init={author.init} size="h-6 w-6" />
                <div className={`max-w-[75%] ${mine ? "items-end text-right" : ""} flex flex-col`}>
                  {/* Aperçu du message cité */}
                  {parent && (
                    <div className={`text-[11px] text-slate-400 mb-0.5 flex items-center gap-1 ${mine ? "justify-end" : ""}`}>
                      <CornerUpLeft size={11} />
                      <span className="truncate max-w-[180px]">
                        <b className="text-slate-500">{profileById(parent.authorId).nom}</b> : {parent.body}
                      </span>
                    </div>
                  )}

                  <div className={`flex items-center gap-1 ${mine ? "flex-row-reverse" : ""}`}>
                    {m.body && (
                      <div className={`inline-block text-[13px] rounded-2xl px-3 py-1.5 whitespace-pre-wrap break-words ${mine ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-800"}`}>
                        {m.body}
                      </div>
                    )}
                    {/* Actions au survol */}
                    <div className="relative flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition">
                      <button onClick={() => setPickerFor(pickerFor === m.id ? null : m.id)} aria-label="Réagir" className="text-slate-400 hover:text-amber-500 p-0.5">
                        <SmilePlus size={14} />
                      </button>
                      <button onClick={() => setReplyingTo(m)} aria-label="Répondre" className="text-slate-400 hover:text-emerald-600 p-0.5">
                        <CornerUpLeft size={14} />
                      </button>
                      {mine && (
                        <button onClick={() => remove(m.id)} aria-label="Supprimer le message" className="text-slate-400 hover:text-rose-600 p-0.5">
                          <Trash2 size={13} />
                        </button>
                      )}
                      {pickerFor === m.id && (
                        <div className={`absolute z-10 top-6 ${mine ? "right-0" : "left-0"} bg-white border border-slate-200 rounded-full shadow-lg px-1.5 py-1 flex items-center gap-0.5`}>
                          {REACTION_EMOJIS.map((e) => (
                            <button key={e} onClick={() => react(m.id, e)} className="text-[15px] hover:scale-125 transition px-0.5" aria-label={`Réagir ${e}`}>
                              {e}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Pièces jointes */}
                  {m.attachments.length > 0 && (
                    <div className={`flex flex-col gap-1 mt-1 ${mine ? "items-end" : "items-start"}`}>
                      {m.attachments.map((a) =>
                        isImageAttachment(a) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <a key={a.id} href={`/api/message-files/${a.id}`} target="_blank" rel="noopener noreferrer" title={a.filename}>
                            <img src={`/api/message-files/${a.id}`} alt={a.filename} className="max-h-44 max-w-[240px] rounded-xl border border-slate-200 dark:border-slate-700 object-cover" />
                          </a>
                        ) : (
                          <a
                            key={a.id}
                            href={`/api/message-files/${a.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex items-center gap-2 text-[12px] rounded-xl px-2.5 py-1.5 border max-w-[240px] ${mine ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-200"} hover:underline`}
                          >
                            <Paperclip size={13} className="shrink-0" />
                            <span className="truncate flex-1">{a.filename}</span>
                            <span className="text-slate-400 shrink-0">{formatBytes(a.size)}</span>
                          </a>
                        )
                      )}
                    </div>
                  )}

                  {/* Réactions posées */}
                  {grouped.size > 0 && (
                    <div className={`flex items-center gap-1 mt-1 flex-wrap ${mine ? "justify-end" : ""}`}>
                      {[...grouped.entries()].map(([emoji, ids]) => {
                        const reacted = ids.includes(me.id);
                        return (
                          <button
                            key={emoji}
                            onClick={() => react(m.id, emoji)}
                            title={ids.map((id) => profileById(id).nom).join(", ")}
                            className={`text-[11px] rounded-full px-1.5 py-0.5 border flex items-center gap-0.5 ${reacted ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"}`}
                          >
                            <span>{emoji}</span> {ids.length}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {mine ? "" : author.nom + " · "}{fmt(m.createdAt)}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      {/* Bandeau « répondre à » */}
      {replyingTo && (
        <div className="flex items-center gap-2 mt-2 text-[12px] bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
          <CornerUpLeft size={13} className="text-emerald-600 shrink-0" />
          <span className="flex-1 truncate text-slate-600">
            Réponse à <b>{profileById(replyingTo.authorId).nom}</b> : {replyingTo.body}
          </span>
          <button onClick={() => setReplyingTo(null)} aria-label="Annuler la réponse" className="text-slate-400 hover:text-slate-600">
            <X size={14} />
          </button>
        </div>
      )}

      {err && <div className="text-[11px] text-rose-600 mt-2">{err}</div>}

      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100">
        <input ref={fileRef} type="file" className="hidden" onChange={onPickFile} aria-hidden />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading || sending}
          title="Joindre un fichier (max 10 Mo)"
          aria-label="Joindre un fichier"
          className="inline-flex items-center justify-center text-slate-500 hover:text-emerald-600 border border-slate-200 rounded-lg px-2.5 py-2 disabled:opacity-40"
        >
          <Paperclip size={16} />
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
          placeholder={uploading ? "Envoi du fichier…" : replyingTo ? "Votre réponse…" : "Écrire un message…"}
          disabled={uploading}
          className="flex-1 text-[13px] border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-emerald-400 disabled:opacity-60"
        />
        <button onClick={submit} disabled={!input.trim() || sending || uploading} className="inline-flex items-center gap-1 text-[13px] font-medium text-white bg-emerald-600 rounded-lg px-3 py-2 hover:bg-emerald-700 disabled:opacity-40">
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}

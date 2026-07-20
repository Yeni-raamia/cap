"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { fmt, type Message } from "@/lib/domain";
import { useApp } from "./app-context";
import { Avatar } from "./atoms";

interface Target {
  convId?: string;
  refType?: string;
  refId?: string;
}

/** Fil de discussion réutilisable (suivi, négligence, projet ou groupe). */
export function Discussion({ target, height = "h-72" }: { target: Target; height?: string }) {
  const { demo, me, profileById, loadMessages, sendMessage } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [convId, setConvId] = useState<string | null>(target.convId ?? null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
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
    const msgs = await sendMessage(target, body);
    setMessages(msgs);
    if (!convId && target.convId) setConvId(target.convId);
    setSending(false);
  };

  if (demo) {
    return <div className="text-[12px] text-slate-400 p-3">Messagerie indisponible en mode démo.</div>;
  }

  return (
    <div className="flex flex-col">
      <div className={`${height} overflow-y-auto space-y-3 pr-1`}>
        {messages.length === 0 ? (
          <div className="text-[12px] text-slate-400 text-center py-6">Aucun message. Démarre la discussion.</div>
        ) : (
          messages.map((m) => {
            const mine = m.authorId === me.id;
            const author = profileById(m.authorId);
            return (
              <div key={m.id} className={`flex gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                <Avatar init={author.init} size="h-6 w-6" />
                <div className={`max-w-[75%] ${mine ? "text-right" : ""}`}>
                  <div className={`inline-block text-[13px] rounded-2xl px-3 py-1.5 ${mine ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-800"}`}>
                    {m.body}
                  </div>
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
      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
          placeholder="Écrire un message…"
          className="flex-1 text-[13px] border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-emerald-400"
        />
        <button onClick={submit} disabled={!input.trim() || sending} className="inline-flex items-center gap-1 text-[13px] font-medium text-white bg-emerald-600 rounded-lg px-3 py-2 hover:bg-emerald-700 disabled:opacity-40">
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}

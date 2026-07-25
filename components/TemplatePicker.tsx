"use client";

import { useMemo, useState } from "react";
import { Check, Copy, FileText, Loader2, Send } from "lucide-react";
import { applyTemplate, daysBetween, TEMPLATE_CATEGORIES, type Item } from "@/lib/domain";
import { copyText } from "@/lib/clipboard";
import { useApp } from "./app-context";
import { Card } from "./atoms";

const catLabel = (v: string) => TEMPLATE_CATEGORIES.find((c) => c.value === v)?.label ?? v;

/** Encart de modèles de relance dans le détail d'un suivi : aperçu, copie, envoi. */
export function TemplatePicker({ item }: { item: Item }) {
  const { templates, me, now, toast, emailEnabled, sendRelanceEmail } = useApp();
  const [selId, setSelId] = useState<string>(templates[0]?.id ?? "");
  const [copied, setCopied] = useState<"subject" | "body" | "all" | null>(null);
  const [sending, setSending] = useState(false);

  const dest = item.personnes.find((p) => p.kind === "destinataire") ?? item.personnes[0];
  const destEmail = dest?.email?.trim() || "";
  const canEdit = me.role === "agent" ? item.ownerId === me.id : true;

  const vars = useMemo(() => {
    return {
      ref: item.ref,
      objet: item.objet,
      destinataire: dest?.name ?? "",
      service: dest?.service ?? "",
      jours: String(daysBetween(item.dateMaj, now)),
      relances: String(item.relancesCount),
      priorite: item.priorite,
      moi: me.nom,
    } as Record<string, string>;
  }, [item, now, me, dest?.name, dest?.service]);

  if (templates.length === 0) return null;

  const tpl = templates.find((t) => t.id === selId) ?? templates[0];
  const subject = applyTemplate(tpl.subject, vars);
  const body = applyTemplate(tpl.body, vars);

  const copy = async (text: string, which: "subject" | "body" | "all") => {
    if (await copyText(text)) {
      setCopied(which);
      toast("Copié dans le presse-papiers.", "success");
      setTimeout(() => setCopied(null), 1500);
    } else {
      toast("Impossible de copier.", "error");
    }
  };

  const send = async () => {
    setSending(true);
    await sendRelanceEmail(item, tpl.id);
    setSending(false);
  };

  return (
    <Card className="p-3 space-y-2">
      <div className="flex items-center gap-1.5">
        <FileText size={13} className="text-slate-400" />
        <span className="text-[10px] uppercase tracking-wide text-slate-400">Modèles de relance</span>
      </div>

      <select
        value={tpl.id}
        onChange={(e) => setSelId(e.target.value)}
        aria-label="Choisir un modèle"
        className="w-full text-[12px] border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
      >
        {templates.map((t) => (
          <option key={t.id} value={t.id}>
            {catLabel(t.category)} · {t.name}
          </option>
        ))}
      </select>

      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 border-b border-slate-100 dark:border-slate-800">
          <span className="text-[12px] font-medium text-slate-700 dark:text-slate-200 truncate">{subject}</span>
          <button
            onClick={() => copy(subject, "subject")}
            className="shrink-0 text-slate-400 hover:text-emerald-600"
            title="Copier l'objet"
            aria-label="Copier l'objet"
          >
            {copied === "subject" ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
          </button>
        </div>
        <pre className="text-[11.5px] text-slate-600 dark:text-slate-300 whitespace-pre-wrap px-2.5 py-2 font-sans max-h-48 overflow-y-auto">{body}</pre>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => copy(body, "body")}
          className="flex-1 inline-flex items-center justify-center gap-1.5 text-[12px] font-medium border border-slate-200 dark:border-slate-700 rounded-lg py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
        >
          {copied === "body" ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />} Copier le corps
        </button>
        <button
          onClick={() => copy(`${subject}\n\n${body}`, "all")}
          className="flex-1 inline-flex items-center justify-center gap-1.5 text-[12px] font-medium bg-slate-800 dark:bg-emerald-600 text-white rounded-lg py-1.5 hover:bg-slate-700"
        >
          {copied === "all" ? <Check size={13} /> : <Copy size={13} />} Objet + corps
        </button>
      </div>

      {emailEnabled && (
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          {destEmail ? (
            <button
              onClick={send}
              disabled={sending || !canEdit}
              title={canEdit ? undefined : "Droits insuffisants sur ce suivi."}
              className="w-full inline-flex items-center justify-center gap-1.5 text-[12px] font-semibold bg-emerald-600 text-white rounded-lg py-2 hover:bg-emerald-700 disabled:opacity-50"
            >
              {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              {sending ? "Envoi…" : `Envoyer la relance à ${destEmail}`}
            </button>
          ) : (
            <div className="text-[11px] text-slate-400">
              Renseigne l&apos;e-mail du destinataire (bouton ✏️ « Éditer le suivi ») pour envoyer la relance
              directement au destinataire.
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

"use client";

import { useMemo, useState } from "react";
import { Check, Copy, FileText } from "lucide-react";
import { applyTemplate, daysBetween, TEMPLATE_CATEGORIES, type Item } from "@/lib/domain";
import { useApp } from "./app-context";
import { Card } from "./atoms";

const catLabel = (v: string) => TEMPLATE_CATEGORIES.find((c) => c.value === v)?.label ?? v;

/** Encart de modèles de relance dans le détail d'un suivi : aperçu + copie. */
export function TemplatePicker({ item }: { item: Item }) {
  const { templates, me, now, toast } = useApp();
  const [selId, setSelId] = useState<string>(templates[0]?.id ?? "");
  const [copied, setCopied] = useState<"subject" | "body" | "all" | null>(null);

  const vars = useMemo(() => {
    const dest = item.personnes.find((p) => p.kind === "destinataire") ?? item.personnes[0];
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
  }, [item, now, me]);

  if (templates.length === 0) return null;

  const tpl = templates.find((t) => t.id === selId) ?? templates[0];
  const subject = applyTemplate(tpl.subject, vars);
  const body = applyTemplate(tpl.body, vars);

  const copy = async (text: string, which: "subject" | "body" | "all") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      toast("Copié dans le presse-papiers.", "success");
      setTimeout(() => setCopied(null), 1500);
    } catch {
      toast("Impossible de copier.", "error");
    }
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
    </Card>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, CheckCircle2, ChevronDown, ListChecks, Sparkles, TriangleAlert } from "lucide-react";
import { METHOD_SHEETS, type MethodSheet } from "@/lib/grc/methodesRef";
import { Card } from "@/components/atoms";
import { GrcTabHeader } from "@/components/grc/GrcTabHeader";

export function MethodesTab() {
  const [openId, setOpenId] = useState<string>(METHOD_SHEETS[0]?.id ?? "");

  return (
    <div className="space-y-5">
      <GrcTabHeader
        title="Méthodes d'appréciation du risque"
        subtitle="Fiches de référence sur les grandes méthodes : à quoi elles servent, comment elles se déroulent, leurs forces et leurs limites. Chaque méthode est aussi évaluable dans l'onglet Conformité (maturité d'adoption)."
      />

      <Card className="p-4 bg-gradient-to-br from-indigo-50/60 to-transparent dark:from-indigo-500/5">
        <div className="flex items-start gap-3">
          <BookOpen size={20} className="text-indigo-600 mt-0.5 shrink-0" />
          <div className="text-[12.5px] text-slate-600 dark:text-slate-300 leading-relaxed">
            Ces méthodes sont <b>complémentaires</b> : <b>EBIOS RM</b>{" "}identifie les scénarios d&apos;attaque réalistes,{" "}
            <b>IT-Grundschutz</b>{" "}fournit un socle de mesures prêt à l&apos;emploi, et <b>FAIR</b>{" "}quantifie le risque en euros.
            On peut par exemple cadrer avec EBIOS RM, puis chiffrer un scénario clé avec FAIR.
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        {METHOD_SHEETS.map((m) => (
          <MethodCard key={m.id} m={m} open={openId === m.id} onToggle={() => setOpenId(openId === m.id ? "" : m.id)} />
        ))}
      </div>
    </div>
  );
}

function MethodCard({ m, open, onToggle }: { m: MethodSheet; open: boolean; onToggle: () => void }) {
  const router = useRouter();
  return (
    <Card className="overflow-hidden">
      <button onClick={onToggle} className="w-full text-left flex items-center gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/40">
        <span className="text-2xl shrink-0" aria-hidden>{m.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[14px] font-semibold text-slate-800 dark:text-slate-100">{m.name}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">{m.short}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">{m.origin} · {m.approach}</div>
        </div>
        <ChevronDown size={18} className={`text-slate-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 space-y-4 border-t border-slate-100 dark:border-slate-800">
          <Field label="À quoi ça sert">{m.purpose}</Field>
          <Field label="Quand l'utiliser">{m.whenToUse}</Field>

          <div>
            <div className="text-[12px] font-semibold text-slate-700 dark:text-slate-200 mb-2 flex items-center gap-1.5"><ListChecks size={14} className="text-indigo-500" /> {m.stepsLabel}</div>
            <ol className="space-y-2">
              {m.steps.map((s, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                  <div className="text-[12px] leading-relaxed">
                    <span className="font-medium text-slate-700 dark:text-slate-200">{s.title}</span>
                    <span className="text-slate-500 dark:text-slate-400"> — {s.detail}</span>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="grid md:grid-cols-3 gap-3">
            <MiniList icon={Sparkles} tone="text-emerald-600" title="Livrables" items={m.outputs} />
            <MiniList icon={CheckCircle2} tone="text-sky-600" title="Forces" items={m.strengths} />
            <MiniList icon={TriangleAlert} tone="text-amber-600" title="Limites" items={m.limits} />
          </div>

          <div className="pt-1">
            <button
              onClick={() => router.replace(`/grc?tab=conformite&fw=${m.id}`, { scroll: false })}
              className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/40 rounded-xl px-3 py-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-500/10"
            >
              Évaluer la maturité d&apos;adoption dans la Conformité →
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-slate-400 mb-0.5">{label}</div>
      <div className="text-[12.5px] text-slate-600 dark:text-slate-300 leading-relaxed">{children}</div>
    </div>
  );
}

function MiniList({ icon: Icon, tone, title, items }: { icon: typeof Sparkles; tone: string; title: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-slate-200/70 dark:border-slate-800 p-3">
      <div className={`text-[12px] font-semibold flex items-center gap-1.5 mb-1.5 ${tone}`}><Icon size={14} /> {title}</div>
      <ul className="space-y-1">
        {items.map((it, i) => <li key={i} className="text-[11.5px] text-slate-600 dark:text-slate-400 leading-snug flex gap-1.5"><span className="text-slate-300 mt-0.5">•</span>{it}</li>)}
      </ul>
    </div>
  );
}

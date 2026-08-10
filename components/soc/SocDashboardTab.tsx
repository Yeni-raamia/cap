"use client";

import { useMemo } from "react";
import { BookOpen, CheckCircle2, Crosshair, Layers, ListChecks, Radar } from "lucide-react";
import { RUNBOOK_CATEGORIES, RUNBOOK_STATUS_TONE, type Runbook } from "@/lib/domain";
import { useApp } from "@/components/app-context";
import { Card, Token } from "@/components/atoms";
import { GrcTabHeader } from "@/components/grc/GrcTabHeader";
import { EmptyState } from "@/components/EmptyState";

export function SocDashboardTab({ onTab }: { onTab: (tab: string) => void }) {
  const { runbooks, socProcedures } = useApp();

  const d = useMemo(() => {
    const valides = runbooks.filter((r) => r.status === "Validé").length;
    const cats = new Set(runbooks.map((r) => r.category));
    const techniques = new Set(runbooks.flatMap((r) => r.attackTechniques));
    const byCat = RUNBOOK_CATEGORIES
      .map((c) => ({ category: c, n: runbooks.filter((r) => r.category === c).length }))
      .filter((x) => x.n > 0);
    return { valides, cats: cats.size, techniques: techniques.size, byCat };
  }, [runbooks]);

  return (
    <div className="space-y-5">
      <GrcTabHeader title="Tableau de bord SOC" subtitle="Le socle méthodologique de l'équipe : où en est la capitalisation des bonnes pratiques." />

      {/* Cadrage du module */}
      <Card className="p-4 bg-gradient-to-br from-emerald-50/60 to-transparent dark:from-emerald-500/5">
        <div className="flex items-start gap-3">
          <Radar size={20} className="text-emerald-600 mt-0.5 shrink-0" />
          <div className="text-[12.5px] text-slate-600 dark:text-slate-300 leading-relaxed">
            Ce module n&apos;est pas une console d&apos;alertes (Wazuh et vos outils gardent l&apos;opérationnel). C&apos;est la <b>colonne vertébrale méthodologique</b> : des <b>runbooks</b> de réponse pas-à-pas, pour que l&apos;équipe sache <i>comment s&apos;y prendre</i> au quotidien, selon les normes (NIST SP 800-61, ANSSI). Un incident confirmé s&apos;ouvre dans le registre <b>GRC</b> (source unique).
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatTile icon={BookOpen} tone="text-emerald-600" label="Runbooks" value={runbooks.length} onClick={() => onTab("runbooks")} />
        <StatTile icon={CheckCircle2} tone="text-sky-600" label="Validés" value={d.valides} onClick={() => onTab("runbooks")} />
        <StatTile icon={ListChecks} tone="text-teal-600" label="Procédures" value={socProcedures.length} onClick={() => onTab("procedures")} />
        <StatTile icon={Layers} tone="text-indigo-600" label="Scénarios couverts" value={d.cats} sub={`/ ${RUNBOOK_CATEGORIES.length}`} onClick={() => onTab("runbooks")} />
        <StatTile icon={Crosshair} tone="text-rose-600" label="Techniques ATT&CK" value={d.techniques} sub="couvertes" onClick={() => onTab("attack")} />
      </div>

      {runbooks.length === 0 ? (
        <EmptyState icon={BookOpen} title="Aucun runbook pour l'instant" subtitle="La bibliothèque de départ apparaîtra ici (hameçonnage, rançongiciel, compte compromis…)." />
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          <Card className="p-4">
            <div className="text-[13px] font-semibold text-slate-700 mb-3 flex items-center gap-2"><Layers size={15} className="text-indigo-500" /> Couverture par scénario</div>
            <div className="space-y-1.5">
              {d.byCat.map((c) => (
                <button key={c.category} onClick={() => onTab("runbooks")} className="w-full flex items-center gap-2 text-left hover:opacity-80">
                  <span className="flex-1 min-w-0 text-[12px] text-slate-600 truncate">{c.category}</span>
                  <span className="text-[11px] font-mono text-slate-400">{c.n}</span>
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[13px] font-semibold text-slate-700 flex items-center gap-2"><BookOpen size={15} className="text-emerald-500" /> Runbooks</div>
              <button onClick={() => onTab("runbooks")} className="text-[11px] text-emerald-700 hover:underline">Tous →</button>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {runbooks.slice(0, 6).map((r: Runbook) => (
                <button key={r.id} onClick={() => onTab("runbooks")} className="w-full text-left flex items-center gap-2 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded px-1">
                  <Token>{r.ref}</Token>
                  <span className="flex-1 min-w-0 text-[12.5px] text-slate-700 dark:text-slate-200 truncate">{r.title}</span>
                  <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full ${RUNBOOK_STATUS_TONE[r.status] ?? "bg-slate-100 text-slate-500"}`}>{r.status}</span>
                </button>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function StatTile({ icon: Icon, tone, label, value, sub, onClick }: { icon: typeof BookOpen; tone: string; label: string; value: number | string; sub?: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="text-left">
      <Card className="p-3.5 hover:-translate-y-0.5 transition-transform">
        <div className="flex items-center gap-2"><Icon size={16} className={tone} /><span className="text-[11px] text-slate-400">{label}</span></div>
        <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{value}{sub && <span className="text-[13px] text-slate-400 font-normal"> {sub}</span>}</div>
      </Card>
    </button>
  );
}

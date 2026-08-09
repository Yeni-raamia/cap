"use client";

import { useMemo, useState } from "react";
import { Radar as RadarIcon } from "lucide-react";
import { auditScoreTone, computeAuditScore, fmt, type Audit } from "@/lib/domain";
import { useApp } from "@/components/app-context";
import { Card } from "@/components/atoms";
import { AuditRadar } from "@/components/audit/AuditRadar";

const MAX = 8;

/** Radar consolidé : score moyen par catégorie sur une sélection d'audits (≤ 8). */
export function ConsolidatedRadarCard() {
  const { audits } = useApp();
  // Audits exploitables : ceux qui ont au moins une réponse notée.
  const usable = useMemo(() => audits.filter((a) => computeAuditScore(a.questions, a.responses).answered > 0), [audits]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(usable.slice(0, MAX).map((a) => a.id)));

  const toggle = (id: string) => setSelected((s) => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id);
    else if (n.size < MAX) n.add(id);
    return n;
  });

  const data = useMemo(() => {
    const chosen = usable.filter((a) => selected.has(a.id));
    const byCat = new Map<string, { sum: number; n: number }>();
    chosen.forEach((a) => {
      const s = computeAuditScore(a.questions, a.responses);
      const c = byCat.get(a.category) ?? { sum: 0, n: 0 };
      c.sum += s.global; c.n += 1; byCat.set(a.category, c);
    });
    return [...byCat.entries()].map(([category, v]) => ({ domain: category, score: Math.round(v.sum / v.n) }));
  }, [usable, selected]);

  const globalAvg = data.length ? Math.round(data.reduce((s, d) => s + d.score, 0) / data.length) : 0;

  if (usable.length === 0) {
    return (
      <Card className="p-4">
        <div className="text-[13px] font-semibold text-slate-700 mb-1 flex items-center gap-2"><RadarIcon size={15} className="text-emerald-500" /> Radar consolidé</div>
        <div className="text-[12px] text-slate-400 py-6 text-center">Réalise quelques audits pour générer le radar consolidé de posture.</div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="text-[13px] font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2"><RadarIcon size={15} className="text-emerald-500" /> Radar consolidé par catégorie</div>
        <span className="text-[11px] text-slate-400">{selected.size}/{MAX} audits · moyenne <span className={`font-semibold ${auditScoreTone(globalAvg)}`}>{globalAvg}%</span></span>
      </div>
      <div className="grid md:grid-cols-[1fr_240px] gap-4 items-center">
        <AuditRadar data={data} height={260} />
        <div>
          <div className="text-[11px] text-slate-500 mb-1.5">Audits inclus (max {MAX})</div>
          <div className="max-h-[240px] overflow-y-auto pr-1 space-y-1">
            {usable.map((a) => <AuditRow key={a.id} a={a} on={selected.has(a.id)} disabled={!selected.has(a.id) && selected.size >= MAX} onToggle={() => toggle(a.id)} />)}
          </div>
        </div>
      </div>
    </Card>
  );
}

function AuditRow({ a, on, disabled, onToggle }: { a: Audit; on: boolean; disabled: boolean; onToggle: () => void }) {
  const s = computeAuditScore(a.questions, a.responses);
  return (
    <label className={`flex items-center gap-2 rounded-lg px-2 py-1.5 cursor-pointer border ${on ? "border-emerald-200 bg-emerald-50/60 dark:bg-emerald-500/10" : "border-slate-100 dark:border-slate-800"} ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}>
      <input type="checkbox" checked={on} disabled={disabled} onChange={onToggle} className="accent-emerald-500" />
      <div className="flex-1 min-w-0">
        <div className="text-[12px] text-slate-700 dark:text-slate-200 truncate">{a.title}</div>
        <div className="text-[10px] text-slate-400 truncate">{a.category}{a.date ? ` · ${fmt(a.date)}` : ""}</div>
      </div>
      <span className={`text-[12px] font-bold ${auditScoreTone(s.global)}`}>{s.global}%</span>
    </label>
  );
}

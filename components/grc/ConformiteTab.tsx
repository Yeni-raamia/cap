"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Search, ShieldCheck } from "lucide-react";
import { CONTROL_STATUS, CONTROL_STATUS_TONE, fmt, type ControlAssessment } from "@/lib/domain";
import { FRAMEWORKS, frameworkById } from "@/lib/grc/frameworks";
import { scoreFramework, scoreGroup } from "@/lib/grc/scoring";
import { useApp } from "@/components/app-context";
import { Card } from "@/components/atoms";
import { GrcTabHeader } from "@/components/grc/GrcTabHeader";
import { ConformiteRapportPdf } from "@/components/grc/ConformiteRapportPdf";
import { ControlAssessmentModal } from "@/components/ControlAssessmentModal";

const pctTone = (p: number) => (p >= 70 ? "text-emerald-600" : p >= 40 ? "text-amber-600" : "text-rose-600");
const barTone = (p: number) => (p >= 70 ? "bg-emerald-500" : p >= 40 ? "bg-amber-500" : "bg-rose-500");

export function ConformiteTab() {
  const { controlAssessments, profileById } = useApp();
  const fwParam = useSearchParams().get("fw");
  const [fwId, setFwId] = useState(FRAMEWORKS.some((f) => f.id === fwParam) ? (fwParam as string) : FRAMEWORKS[0].id);
  const [search, setSearch] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [applicableOnly, setApplicableOnly] = useState(false);
  const [openCode, setOpenCode] = useState<string | null>(null);

  const fw = frameworkById(fwId)!;
  const byCode = useMemo(() => {
    const m = new Map<string, ControlAssessment>();
    controlAssessments.filter((a) => a.frameworkId === fwId).forEach((a) => m.set(a.controlCode, a));
    return m;
  }, [controlAssessments, fwId]);

  const fwScore = useMemo(() => scoreFramework(fw, byCode), [fw, byCode]);

  const controls = useMemo(() => {
    const q = search.trim().toLowerCase();
    return fw.controls.filter((c) => {
      const a = byCode.get(c.code);
      const status = a?.status ?? "Non évalué";
      const applicable = a ? a.applicable : true;
      return (
        (!q || c.code.toLowerCase().includes(q) || c.title.toLowerCase().includes(q)) &&
        (!fStatus || status === fStatus) &&
        (!applicableOnly || applicable)
      );
    });
  }, [fw, byCode, search, fStatus, applicableOnly]);

  const open = openCode ? fw.controls.find((c) => c.code === openCode) ?? null : null;

  return (
    <div className="space-y-5">
      <GrcTabHeader
        title="Conformité"
        subtitle="Évaluer la posture face aux référentiels : applicabilité (SoA), statut d'implémentation et maturité par mesure."
        right={<ConformiteRapportPdf />}
      />

      {/* Sélecteur de référentiel */}
      <div className="flex items-center gap-2 flex-wrap">
        {FRAMEWORKS.map((f) => {
          const s = scoreFramework(f, new Map(controlAssessments.filter((a) => a.frameworkId === f.id).map((a) => [a.controlCode, a])));
          return (
            <button key={f.id} onClick={() => setFwId(f.id)} className={`text-left rounded-xl border px-3 py-2 transition-colors ${fwId === f.id ? "border-emerald-400 bg-emerald-50/60 dark:bg-emerald-500/10" : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
              <div className="text-[12.5px] font-semibold text-slate-800 dark:text-slate-100">{f.short}</div>
              <div className={`text-[15px] font-bold ${pctTone(s.conformity)}`}>{s.conformity}%</div>
            </button>
          );
        })}
      </div>

      {/* Score du référentiel sélectionné */}
      <Card className="p-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="text-[13px] font-semibold text-slate-700 flex items-center gap-2"><ShieldCheck size={15} className="text-emerald-500" /> {fw.name}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">{fwScore.applicable} mesures applicables · {fwScore.excluded} exclues (SoA) · {fwScore.assessed} évaluées · {fwScore.implemented} implémentées</div>
          </div>
          <div className="text-right">
            <div className={`text-3xl font-bold ${pctTone(fwScore.conformity)}`}>{fwScore.conformity}%</div>
            <div className="text-[10px] text-slate-400">conformité (maturité)</div>
          </div>
        </div>
        {/* Score par thème / fonction */}
        <div className="mt-4 space-y-2">
          {fw.groups.map((g) => {
            const gs = scoreGroup(fw, g, byCode);
            return (
              <div key={g} className="flex items-center gap-2">
                <span className="w-40 shrink-0 text-[11px] text-slate-500 truncate">{g}</span>
                <div className="flex-1 h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${barTone(gs.conformity)}`} style={{ width: `${gs.conformity}%` }} />
                </div>
                <span className="w-9 text-right text-[11px] font-mono text-slate-500">{gs.conformity}%</span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Filtres */}
      <Card className="p-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[10rem]">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher une mesure…" className="w-full text-[13px] border border-slate-200 rounded-lg pl-8 pr-2 py-1.5 outline-none focus:border-emerald-400" />
          </div>
          <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} aria-label="Statut" className="text-[12px] border border-slate-200 rounded-lg px-2 py-1.5 bg-white">
            <option value="">Tous statuts</option>
            {CONTROL_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <label className="inline-flex items-center gap-1 text-[11px] text-slate-500 cursor-pointer">
            <input type="checkbox" checked={applicableOnly} onChange={(e) => setApplicableOnly(e.target.checked)} className="h-3 w-3 accent-emerald-600" /> Applicables seulement
          </label>
        </div>
      </Card>

      {/* Liste des mesures, groupées par thème/fonction */}
      <div className="space-y-4">
        {fw.groups.map((g) => {
          const rows = controls.filter((c) => c.group === g);
          if (rows.length === 0) return null;
          return (
            <div key={g}>
              <div className="text-[12px] font-semibold text-slate-600 uppercase tracking-wide mb-1.5">{g}</div>
              <Card className="divide-y divide-slate-100">
                {rows.map((c) => {
                  const a = byCode.get(c.code);
                  const status = a?.status ?? "Non évalué";
                  const applicable = a ? a.applicable : true;
                  const maturity = a?.maturity ?? 0;
                  return (
                    <button key={c.code} onClick={() => setOpenCode(c.code)} className={`w-full text-left flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 ${!applicable ? "opacity-55" : ""}`}>
                      <span className="shrink-0 text-[11px] font-mono font-bold text-slate-500 w-16">{c.code}</span>
                      <span className="flex-1 min-w-0 text-[13px] text-slate-800 truncate">{c.title}</span>
                      {!applicable ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-400 border border-slate-200">Exclue (SoA)</span>
                      ) : (
                        <>
                          {/* Maturité 0–5 */}
                          <span className="hidden sm:flex items-center gap-0.5" title={`Maturité ${maturity}/5`}>
                            {[1, 2, 3, 4, 5].map((n) => <span key={n} className={`h-1.5 w-3 rounded-sm ${n <= maturity ? "bg-emerald-500" : "bg-slate-200"}`} />)}
                          </span>
                          <span className={`shrink-0 text-[10px] font-medium rounded-full px-2 py-0.5 border ${CONTROL_STATUS_TONE[status] ?? "bg-slate-100 text-slate-500"}`}>{status}</span>
                        </>
                      )}
                      {a?.lastAssessedAt && <span className="hidden md:inline text-[10px] text-slate-400 shrink-0">{fmt(a.lastAssessedAt)}</span>}
                      {a?.responsibleId && <span className="hidden lg:inline text-[10px] text-slate-400 shrink-0 truncate max-w-[7rem]">{profileById(a.responsibleId).nom}</span>}
                    </button>
                  );
                })}
              </Card>
            </div>
          );
        })}
        {controls.length === 0 && <Card className="p-6 text-center text-[13px] text-slate-400 flex items-center justify-center gap-2"><CheckCircle2 size={15} /> Aucune mesure ne correspond au filtre.</Card>}
      </div>

      {open && (
        <ControlAssessmentModal frameworkId={fwId} frameworkShort={fw.short} control={open} assessment={byCode.get(open.code) ?? null} onClose={() => setOpenCode(null)} />
      )}
    </div>
  );
}

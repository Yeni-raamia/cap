"use client";

import { useMemo, useState } from "react";
import { BookOpen, Crosshair, Search, ShieldCheck } from "lucide-react";
import { ATTACK_COVERAGE_TONE, runbookCoversTechnique, type AttackCoverage } from "@/lib/domain";
import { ATTACK_TACTICS, ATTACK_TECHNIQUES, type AttackTechnique } from "@/lib/data/attack";
import { useApp } from "@/components/app-context";
import { Card } from "@/components/atoms";
import { GrcTabHeader } from "@/components/grc/GrcTabHeader";
import { AttackTechniqueModal } from "@/components/AttackTechniqueModal";

export function AttackTab() {
  const { runbooks, attackCoverage } = useApp();
  const [search, setSearch] = useState("");
  const [fTactic, setFTactic] = useState("");
  const [fCov, setFCov] = useState(""); // "" | "Couverte" | "reliees" | "nonlink"
  const [openId, setOpenId] = useState<string | null>(null);

  const covByTech = useMemo(() => new Map(attackCoverage.map((c) => [c.techniqueId, c])), [attackCoverage]);
  const rbCount = (t: AttackTechnique) => runbooks.filter((r) => runbookCoversTechnique(r.attackTechniques, t.id)).length;
  const cov = (t: AttackTechnique): AttackCoverage | undefined => covByTech.get(t.id);

  const kpi = useMemo(() => {
    const total = ATTACK_TECHNIQUES.length;
    const couvertes = ATTACK_TECHNIQUES.filter((t) => cov(t)?.status === "Couverte").length;
    const reliees = ATTACK_TECHNIQUES.filter((t) => rbCount(t) > 0).length;
    return { total, couvertes, reliees, tactiques: ATTACK_TACTICS.length };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attackCoverage, runbooks]);

  const matches = (t: AttackTechnique) => {
    const q = search.trim().toLowerCase();
    if (q && !(t.id.toLowerCase().includes(q) || t.name.toLowerCase().includes(q))) return false;
    if (fCov === "Couverte" && cov(t)?.status !== "Couverte") return false;
    if (fCov === "reliees" && rbCount(t) === 0) return false;
    if (fCov === "nonlink" && rbCount(t) > 0) return false;
    return true;
  };

  const tactics = ATTACK_TACTICS.filter((ta) => !fTactic || ta.id === fTactic);
  const opened = openId ? ATTACK_TECHNIQUES.find((t) => t.id === openId) ?? null : null;

  return (
    <div className="space-y-5">
      <GrcTabHeader
        title="Cartographie MITRE ATT&CK"
        subtitle="Le référentiel des tactiques et techniques adverses : pour chaque technique, la piste de détection (Wazuh) et le runbook de réponse relié."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Techniques" value={`${kpi.total}`} tone="text-slate-700" />
        <Kpi label="Tactiques" value={`${kpi.tactiques}`} tone="text-indigo-600" />
        <Kpi label="Reliées à un runbook" value={`${kpi.reliees}`} tone="text-emerald-600" />
        <Kpi label="Détection : couvertes" value={`${kpi.couvertes}`} tone="text-sky-600" />
      </div>

      <Card className="p-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[10rem]">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher (T#### ou nom)…" className="w-full text-[13px] border border-slate-200 rounded-lg pl-8 pr-2 py-1.5 outline-none focus:border-emerald-400" />
          </div>
          <select value={fTactic} onChange={(e) => setFTactic(e.target.value)} aria-label="Tactique" className="text-[12px] border border-slate-200 rounded-lg px-2 py-1.5 bg-white">
            <option value="">Toutes tactiques</option>
            {ATTACK_TACTICS.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select value={fCov} onChange={(e) => setFCov(e.target.value)} aria-label="Filtre" className="text-[12px] border border-slate-200 rounded-lg px-2 py-1.5 bg-white">
            <option value="">Tout</option>
            <option value="reliees">Reliées à un runbook</option>
            <option value="nonlink">Sans runbook</option>
            <option value="Couverte">Détection couverte</option>
          </select>
        </div>
      </Card>

      <div className="space-y-4">
        {tactics.map((ta) => {
          const techs = ATTACK_TECHNIQUES.filter((t) => t.tacticIds.includes(ta.id) && matches(t));
          if (techs.length === 0) return null;
          return (
            <div key={ta.id}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-mono text-slate-400">{ta.id}</span>
                <div className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">{ta.name}</div>
                <span className="text-[11px] text-slate-400">· {techs.length}</span>
                <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {techs.map((t) => {
                  const c = cov(t);
                  const n = rbCount(t);
                  return (
                    <button key={`${ta.id}-${t.id}`} onClick={() => setOpenId(t.id)} className="text-left rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 hover:-translate-y-0.5 transition-transform">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-mono text-rose-600">{t.id}</span>
                        {c && <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${ATTACK_COVERAGE_TONE[c.status] ?? ""}`}>{c.status}</span>}
                      </div>
                      <div className="text-[12.5px] text-slate-700 dark:text-slate-200 leading-snug mt-0.5">{t.name}</div>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                        {n > 0 ? <span className="inline-flex items-center gap-0.5 text-emerald-600"><BookOpen size={10} /> {n} runbook{n > 1 ? "s" : ""}</span> : <span className="text-slate-300">sans runbook</span>}
                        {c?.detectionNote && <span className="inline-flex items-center gap-0.5 text-sky-600"><ShieldCheck size={10} /> détection</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {opened && <AttackTechniqueModal technique={opened} onClose={() => setOpenId(null)} />}
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <Card className="p-3.5">
      <div className={`text-2xl font-bold ${tone}`}>{value}</div>
      <div className="text-[11px] text-slate-400 mt-0.5">{label}</div>
    </Card>
  );
}

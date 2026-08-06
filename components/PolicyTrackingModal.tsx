"use client";

import { useMemo } from "react";
import { PackageCheck, Truck, X } from "lucide-react";
import {
  policyCoverage,
  policyStageIndex,
  POLICY_STAGE_NA,
  type Policy,
  type PolicyDiffusion,
} from "@/lib/domain";

/* Étapes du « colis » : le cycle de vie d'une politique vu comme une livraison. */
const STOPS = [
  { key: "Diffusée", icon: "📤", label: "Diffusée", hint: "Expédiée aux services" },
  { key: "Consultée", icon: "👀", label: "Consultée", hint: "Ouverte / lue" },
  { key: "Comprise", icon: "💡", label: "Comprise", hint: "Assimilée" },
  { key: "Applicable", icon: "✅", label: "Appliquée", hint: "Livrée & en vigueur" },
];
const CONFETTI = ["#10b981", "#38bdf8", "#f59e0b", "#f43f5e", "#8b5cf6", "#22d3ee"];
const OFFSETS = [8, 20, 33, 46, 58, 70, 82, 92]; // positions horizontales déterministes

/** Suivi ludique, « façon colis », de la diffusion d'une politique par service. */
export function PolicyTrackingModal({ policy, onClose }: { policy: Policy; onClose: () => void }) {
  const cov = policyCoverage(policy);

  const { active, na, funnel } = useMemo(() => {
    const na = policy.diffusions.filter((d) => d.stage === POLICY_STAGE_NA);
    const active = policy.diffusions
      .filter((d) => d.stage !== POLICY_STAGE_NA)
      .map((d) => ({ d, idx: policyStageIndex(d.stage) }))
      .sort((a, b) => b.idx - a.idx || a.d.service.localeCompare(b.d.service));
    // Entonnoir : combien de services ont ATTEINT chaque étape (cumulatif).
    const funnel = STOPS.map((s, i) => ({
      ...s,
      reached: active.filter((x) => x.idx >= i).length,
    }));
    return { active, na, funnel };
  }, [policy.diffusions]);

  const totalActive = active.length;
  const delivered = active.filter((x) => x.idx >= 3).length;
  const allDelivered = totalActive > 0 && delivered === totalActive;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto animate-fade" onClick={onClose}>
      <div className="bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 rounded-2xl shadow-2xl w-full max-w-3xl my-8 max-h-[92vh] overflow-y-auto animate-pop" onClick={(e) => e.stopPropagation()}>
        {/* En-tête */}
        <div className="flex items-start gap-3 p-4 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur z-10">
          <div className="relative shrink-0">
            <Truck size={22} className="text-sky-600 mt-1" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] uppercase tracking-wide text-sky-600 font-semibold">Suivi de diffusion</div>
            <div className="text-[15px] font-semibold text-slate-800 dark:text-slate-100 truncate">{policy.title}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">{policy.ref} · {totalActive} service{totalActive > 1 ? "s" : ""} concerné{totalActive > 1 ? "s" : ""}{na.length > 0 ? ` · ${na.length} non concerné${na.length > 1 ? "s" : ""}` : ""}</div>
          </div>
          <ProgressRing pct={cov.pct} />
          <button onClick={onClose} aria-label="Fermer" className="text-slate-400 hover:text-slate-600 mt-1"><X size={18} /></button>
        </div>

        <div className="p-4 space-y-5">
          {totalActive === 0 ? (
            <div className="text-center py-10 text-[13px] text-slate-400">
              <div className="text-4xl mb-2">📦</div>
              Aucun service concerné pour l&apos;instant. Ajoutez des directions/services ciblés depuis la fiche de la politique.
            </div>
          ) : (
            <>
              {/* Bandeau de célébration */}
              {allDelivered && (
                <div className="relative overflow-hidden rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 px-4 py-3 text-center">
                  <Confetti />
                  <div className="text-[14px] font-semibold text-emerald-700 dark:text-emerald-300 relative">🎉 Politique appliquée par tous les services concernés !</div>
                </div>
              )}

              {/* Entonnoir animé : progression cumulée par étape */}
              <div>
                <div className="text-[12px] font-semibold text-slate-600 mb-2">Progression de la flotte</div>
                <div className="grid grid-cols-4 gap-2">
                  {funnel.map((s, i) => {
                    const pct = totalActive ? Math.round((s.reached / totalActive) * 100) : 0;
                    return (
                      <div key={s.key} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-center">
                        <div className="text-lg leading-none">{s.icon}</div>
                        <div className="text-[10px] text-slate-500 mt-1">{s.label}</div>
                        <div className="text-[18px] font-bold text-slate-800 dark:text-slate-100">{s.reached}</div>
                        <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-1">
                          <div className={`h-full rounded-full animate-rail ${i >= 3 ? "bg-emerald-500" : "bg-sky-500"}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Tracks par service (classés du plus avancé au moins avancé) */}
              <div className="space-y-3">
                <div className="text-[12px] font-semibold text-slate-600">Livraison par service</div>
                {active.map(({ d, idx }, rank) => (
                  <ServiceTrack key={d.id} d={d} idx={idx} rank={rank} />
                ))}
              </div>

              {/* Services non concernés */}
              {na.length > 0 && (
                <div>
                  <div className="text-[12px] font-semibold text-slate-600 mb-2">Non concernés</div>
                  <div className="flex flex-wrap gap-1.5">
                    {na.map((d) => (
                      <span key={d.id} className="text-[11px] text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-full px-2.5 py-1">{d.service}</span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* Un rail de livraison pour un service. */
function ServiceTrack({ d, idx, rank }: { d: PolicyDiffusion; idx: number; rank: number }) {
  const pct = (idx / (STOPS.length - 1)) * 100;
  const delivered = idx >= STOPS.length - 1;
  const medal = rank === 0 ? "🥇" : rank === 1 ? "🥈" : rank === 2 ? "🥉" : "";

  return (
    <div className={`relative rounded-xl border p-3 ${delivered ? "border-emerald-200 bg-emerald-50/40 dark:bg-emerald-500/10 dark:border-emerald-500/30" : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"}`}>
      {delivered && <Confetti />}
      <div className="flex items-center gap-2 mb-3 relative">
        <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-100 truncate flex-1">{medal} {d.service}</span>
        {delivered ? (
          <span className="animate-delivered inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 rounded-full px-2 py-0.5"><PackageCheck size={12} /> LIVRÉ</span>
        ) : (
          <span className="text-[10px] font-medium text-sky-700 bg-sky-100 rounded-full px-2 py-0.5">{STOPS[idx].icon} {STOPS[idx].label}</span>
        )}
      </div>

      {/* Rail */}
      <div className="relative mx-2 mt-6 mb-1">
        {/* ligne de fond */}
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full" />
        {/* remplissage */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full animate-rail bg-gradient-to-r from-sky-400 to-emerald-500" style={{ width: `${pct}%` }} />
        {/* colis en mouvement */}
        <div className="absolute top-1/2 z-10 text-lg animate-truck" style={{ left: `${pct}%` }} aria-hidden>
          {delivered ? "📦" : "🚚"}
        </div>
        {/* stops */}
        <div className="relative flex justify-between">
          {STOPS.map((s, i) => {
            const done = i < idx;
            const current = i === idx;
            return (
              <div key={s.key} className="flex flex-col items-center" style={{ width: 0 }}>
                <div
                  className={`h-5 w-5 rounded-full grid place-items-center text-[10px] font-bold border-2 transition-colors ${
                    done ? "bg-emerald-500 border-emerald-500 text-white"
                    : current ? "bg-white dark:bg-slate-900 border-emerald-500 text-emerald-600 animate-stop-pulse"
                    : "bg-white dark:bg-slate-900 border-slate-300 text-slate-300"
                  }`}
                  title={`${s.label} — ${s.hint}`}
                >
                  {done ? "✓" : i + 1}
                </div>
              </div>
            );
          })}
        </div>
        {/* légendes des stops */}
        <div className="relative flex justify-between mt-1">
          {STOPS.map((s, i) => (
            <div key={s.key} className="flex flex-col items-center" style={{ width: 0 }}>
              <span className={`text-[8.5px] whitespace-nowrap ${i <= idx ? "text-slate-600 dark:text-slate-300 font-medium" : "text-slate-300"}`}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
      {d.note && <div className="text-[11px] text-slate-400 mt-2 italic">« {d.note} »</div>}
    </div>
  );
}

/* Anneau de progression global (SVG). */
function ProgressRing({ pct }: { pct: number }) {
  const R = 16;
  const C = 2 * Math.PI * R;
  const tone = pct >= 70 ? "#10b981" : pct >= 40 ? "#f59e0b" : "#f43f5e";
  return (
    <div className="relative shrink-0 h-11 w-11 mt-0.5" title={`${pct}% appliquée`}>
      <svg viewBox="0 0 40 40" className="h-11 w-11 -rotate-90">
        <circle cx="20" cy="20" r={R} fill="none" stroke="#e2e8f0" strokeWidth="4" />
        <circle cx="20" cy="20" r={R} fill="none" stroke={tone} strokeWidth="4" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)} style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(0.3,0.9,0.3,1)" }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-[10px] font-bold text-slate-700 dark:text-slate-200">{pct}%</div>
    </div>
  );
}

/* Pluie de confettis (célébration). */
function Confetti() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {OFFSETS.map((left, i) => (
        <span
          key={i}
          className="absolute top-0 h-1.5 w-1.5 rounded-sm animate-confetti"
          style={{ left: `${left}%`, background: CONFETTI[i % CONFETTI.length], animationDelay: `${(i % 4) * 0.12}s` }}
        />
      ))}
    </div>
  );
}

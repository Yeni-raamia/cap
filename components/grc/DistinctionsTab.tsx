"use client";

import { useMemo, useState } from "react";
import { Award, Medal, Radar as RadarIcon, Trophy } from "lucide-react";
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";
import { competencyRadar, type TrainingDone } from "@/lib/domain";
import { useApp } from "@/components/app-context";
import { Card } from "@/components/atoms";
import { GrcTabHeader } from "@/components/grc/GrcTabHeader";
import { computeCyberBadges, earnedCount, type CyberBadge, type CyberBadgeData } from "@/lib/grc/badges";

export function DistinctionsTab() {
  const { me, profiles, fieldControls, capaActions, risks, policies, nonConformites, planItems, trainingCourses, trainingDone, trainingProgressAll } = useApp();
  const now = useMemo(() => new Date(), []);
  const data: CyberBadgeData = useMemo(
    () => ({ fieldControls, capaActions, risks, policies, nonConformites, planItems }),
    [fieldControls, capaActions, risks, policies, nonConformites, planItems]
  );
  // Les distinctions ne concernent que l'équipe GRC (marqueur posé en administration).
  const grcMembers = useMemo(() => profiles.filter((p) => p.grcMember), [profiles]);
  const [selId, setSelId] = useState(me.grcMember ? me.id : "");

  const badgesOf = useMemo(() => (id: string) => computeCyberBadges(id, data, now), [data, now]);

  const board = useMemo(
    () =>
      grcMembers
        .map((p) => ({ p, badges: badgesOf(p.id) }))
        .map((x) => ({ ...x, earned: earnedCount(x.badges) }))
        .sort((a, b) => b.earned - a.earned),
    [grcMembers, badgesOf]
  );

  // Sélection par défaut : soi-même si GRC, sinon le premier du classement.
  const effectiveSelId = selId && grcMembers.some((p) => p.id === selId) ? selId : board[0]?.p.id ?? "";
  const selName = profiles.find((p) => p.id === effectiveSelId)?.nom ?? "";
  const totalBadges = computeCyberBadges("", data, now).length;
  const selBadges = effectiveSelId ? badgesOf(effectiveSelId) : [];
  const selEarned = earnedCount(selBadges);

  // Progression d'apprentissage du membre sélectionné (live pour soi, base pour les autres).
  const doneForMember = (id: string): TrainingDone[] =>
    id === me.id ? trainingDone : trainingProgressAll.filter((p) => p.userId === id).map((p) => ({ lessonId: p.lessonId, score: p.score, completedAt: p.completedAt }));
  const radarData = useMemo(
    () => (effectiveSelId ? competencyRadar(trainingCourses, doneForMember(effectiveSelId), capaActions, effectiveSelId, now) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [effectiveSelId, trainingCourses, trainingDone, trainingProgressAll, capaActions, now]
  );
  const radarAvg = radarData.length ? Math.round(radarData.reduce((s, r) => s + r.value, 0) / radarData.length) : 0;

  return (
    <div className="space-y-5">
      <GrcTabHeader
        title="Distinctions cyber"
        subtitle="Badges honorifiques décernés à partir de l'activité réelle de l'équipe GRC : rondes, écarts, risques, politiques, actions…"
      />

      {grcMembers.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="text-4xl mb-2">🏅</div>
          <div className="text-[14px] font-semibold text-slate-700">Aucun membre GRC désigné</div>
          <div className="text-[12px] text-slate-400 mt-1 max-w-md mx-auto">Les distinctions ne concernent que l&apos;équipe GRC. Un administrateur peut marquer les profils concernés via <span className="font-medium">Administration → Membres → Équipe GRC</span>.</div>
        </Card>
      ) : (
        <>
          {/* Classement d'équipe */}
          <Card className="p-4">
            <div className="text-[13px] font-semibold text-slate-700 mb-3 flex items-center gap-2"><Trophy size={15} className="text-amber-500" /> Classement des distinctions · équipe GRC</div>
            <div className="space-y-1.5">
              {board.map(({ p, badges, earned }, i) => (
                <button key={p.id} onClick={() => setSelId(p.id)} className={`w-full text-left flex items-center gap-3 rounded-xl px-2.5 py-2 border transition-colors ${effectiveSelId === p.id ? "border-emerald-300 bg-emerald-50/50 dark:bg-emerald-500/10" : "border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50"}`}>
                  <span className={`w-6 text-center text-[13px] font-bold ${i === 0 ? "text-amber-500" : i === 1 ? "text-slate-400" : i === 2 ? "text-orange-400" : "text-slate-300"}`}>{i + 1}</span>
                  <span className="flex-1 min-w-0 text-[13px] font-medium text-slate-700 truncate">{p.nom}{p.id === me.id && <span className="text-[11px] text-emerald-600 font-normal"> · vous</span>}</span>
                  <span className="flex items-center gap-1 shrink-0">
                    {badges.filter((b) => b.earned).slice(0, 6).map((b) => <span key={b.id} title={b.label} className="text-[15px] leading-none">{b.icon}</span>)}
                  </span>
                  <span className="shrink-0 inline-flex items-center gap-1 text-[12px] font-semibold text-slate-500"><Medal size={13} className="text-amber-500" /> {earned}/{totalBadges}</span>
                </button>
              ))}
            </div>
          </Card>

          {/* Radar de compétences du membre sélectionné */}
          <Card className="p-4">
            <div className="text-[13px] font-semibold text-slate-700 mb-1 flex items-center gap-2"><RadarIcon size={15} className="text-sky-500" /> Compétences de {selName}</div>
            <div className="text-[11px] text-slate-400 mb-2">Maîtrise par domaine (Académie) et suivi du plan d&apos;action · indice moyen {radarAvg}/100</div>
            <div className="grid md:grid-cols-[1fr_auto] gap-3 items-center">
              <div className="h-[280px] min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} outerRadius="72%">
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11, fill: "#475569" }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar name={selName} dataKey="value" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.35} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v) => [`${v}/100`, "Maîtrise"]} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-1 gap-1.5">
                {radarData.map((r) => (
                  <div key={r.axis} className="flex items-center justify-between gap-3 text-[11px]">
                    <span className="text-slate-500">{r.axis}</span>
                    <span className={`font-mono font-semibold ${r.value >= 70 ? "text-emerald-600" : r.value >= 40 ? "text-amber-600" : "text-slate-400"}`}>{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Détail des badges du profil sélectionné */}
          <Card className="p-4">
            <div className="text-[13px] font-semibold text-slate-700 mb-1 flex items-center gap-2"><Award size={15} className="text-emerald-500" /> Distinctions de {selName}</div>
            <div className="text-[11px] text-slate-400 mb-3">{selEarned} badge{selEarned > 1 ? "s" : ""} obtenu{selEarned > 1 ? "s" : ""} sur {totalBadges}</div>
            <div className="grid sm:grid-cols-2 gap-2.5">
              {selBadges.map((b) => <BadgeCard key={b.id} b={b} />)}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function BadgeCard({ b }: { b: CyberBadge }) {
  const pct = b.target > 0 ? Math.min(100, Math.round((b.value / b.target) * 100)) : b.earned ? 100 : 0;
  return (
    <div className={`rounded-xl border p-3 flex items-start gap-3 transition-colors ${b.earned ? "border-emerald-200 bg-emerald-50/40 dark:bg-emerald-500/10 dark:border-emerald-500/30" : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30"}`}>
      <span className={`text-2xl leading-none mt-0.5 ${b.earned ? "" : "grayscale opacity-40"}`}>{b.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`text-[13px] font-semibold ${b.earned ? "text-slate-800 dark:text-slate-100" : "text-slate-500"}`}>{b.label}</span>
          {b.earned && <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 rounded-full px-1.5 py-0.5">OBTENU</span>}
        </div>
        <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">{b.desc}</div>
        {b.target > 0 && !b.earned && (
          <div className="mt-1.5 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-slate-400 rounded-full" style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>
    </div>
  );
}

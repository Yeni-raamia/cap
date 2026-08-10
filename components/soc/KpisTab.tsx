"use client";

import { useMemo } from "react";
import { AlertTriangle, BookOpen, Crosshair, Gauge, ListChecks, Radio, ShieldAlert, UserCheck } from "lucide-react";
import { computeSocKpis } from "@/lib/domain";
import { ATTACK_TECHNIQUES } from "@/lib/data/attack";
import { useApp } from "@/components/app-context";
import { Card } from "@/components/atoms";
import { Ring } from "@/components/dataviz";
import { GrcTabHeader } from "@/components/grc/GrcTabHeader";

export function KpisTab({ onTab }: { onTab: (tab: string) => void }) {
  const app = useApp();
  const now = useMemo(() => new Date(), []);
  const k = useMemo(
    () => computeSocKpis({
      runbooks: app.runbooks, socProcedures: app.socProcedures, attackTechniqueIds: ATTACK_TECHNIQUES.map((t) => t.id),
      attackCoverage: app.attackCoverage, intel: app.intel, onCall: app.onCall, incidents: app.incidents, now,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [app.runbooks, app.socProcedures, app.attackCoverage, app.intel, app.onCall, app.incidents, now]
  );
  const readyColor = k.readiness >= 70 ? "#10b981" : k.readiness >= 45 ? "#f59e0b" : "#f43f5e";
  const pctTone = (p: number) => (p >= 70 ? "text-emerald-600" : p >= 40 ? "text-amber-600" : "text-rose-600");

  return (
    <div className="space-y-5">
      <GrcTabHeader title="Pilotage & KPIs du SOC" subtitle="La préparation méthodologique de l'équipe et sa posture — de quoi rendre compte en un coup d'œil." />

      {/* Préparation (readiness) */}
      <Card className="p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <Ring value={k.readiness} size={84} stroke={9} color={readyColor}><span className="text-[20px] font-bold" style={{ color: readyColor }}>{k.readiness}</span></Ring>
          <div>
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5"><Gauge size={13} /> Préparation méthodologique</div>
            <div className="text-[15px] font-semibold text-slate-800 dark:text-slate-100">{k.readiness >= 70 ? "Solide" : k.readiness >= 45 ? "À consolider" : "À renforcer"}</div>
            <div className="text-[11px] text-slate-400 mt-0.5 max-w-md">Runbooks validés, procédures validées et couverture ATT&CK — la capitalisation du savoir-faire, indépendamment de l&apos;opérationnel temps réel.</div>
          </div>
          <div className="ml-auto grid grid-cols-3 gap-2 text-center">
            <Mini label="Runbooks validés" value={`${k.runbookValidationPct}%`} tone={pctTone(k.runbookValidationPct)} />
            <Mini label="Procédures validées" value={`${k.procValidationPct}%`} tone={pctTone(k.procValidationPct)} />
            <Mini label="Couverture ATT&CK" value={`${k.attackCoveragePct}%`} tone={pctTone(k.attackCoveragePct)} />
          </div>
        </div>
      </Card>

      {/* Capitalisation */}
      <Section title="Capitalisation du savoir-faire">
        <Tile icon={BookOpen} tone="text-emerald-600" label="Runbooks" value={`${k.runbooksValides}/${k.runbooks}`} sub="validés" onClick={() => onTab("runbooks")} />
        <Tile icon={ListChecks} tone="text-teal-600" label="Procédures" value={`${k.proceduresValidees}/${k.procedures}`} sub="validées" onClick={() => onTab("procedures")} />
        <Tile icon={Crosshair} tone="text-rose-600" label="ATT&CK couvertes" value={`${k.attackCouvertes}/${k.attackTotal}`} sub={`${k.attackReliees} reliées à un runbook`} onClick={() => onTab("attack")} />
      </Section>

      {/* Menaces, incidents, astreinte */}
      <Section title="Posture & opérations">
        <Tile icon={Radio} tone="text-amber-600" label="Veille active" value={`${k.veilleActive}`} sub={`${k.veilleCritique} critiques`} onClick={() => onTab("veille")} />
        <Tile icon={ShieldAlert} tone="text-rose-600" label="Incidents ouverts" value={`${k.incidentsOuverts}`} sub={`${k.incidentsCritiques} critiques (GRC)`} />
        <Tile icon={AlertTriangle} tone="text-sky-600" label="MTTR moyen" value={k.mttrHeures === null ? "—" : `${k.mttrHeures} h`} sub="résolution incidents" />
        <Tile icon={UserCheck} tone="text-emerald-600" label="De garde" value={`${k.deGarde}`} sub="maintenant" onClick={() => onTab("astreinte")} />
      </Section>

      <div className="text-[11px] text-slate-400">Les incidents sont gérés dans le module <button onClick={() => { window.location.href = "/grc?tab=incidents"; }} className="text-emerald-700 hover:underline">GRC</button> (source unique) ; le SOC en reflète ici la posture.</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[13px] font-semibold text-slate-700 dark:text-slate-200 mb-2">{title}</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{children}</div>
    </div>
  );
}
function Tile({ icon: Icon, tone, label, value, sub, onClick }: { icon: typeof BookOpen; tone: string; label: string; value: string; sub?: string; onClick?: () => void }) {
  const inner = (
    <Card className={`p-3.5 ${onClick ? "hover:-translate-y-0.5 transition-transform" : ""}`}>
      <div className="flex items-center gap-2"><Icon size={16} className={tone} /><span className="text-[11px] text-slate-400">{label}</span></div>
      <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{value}</div>
      {sub && <div className="text-[11px] text-slate-400 mt-0.5">{sub}</div>}
    </Card>
  );
  return onClick ? <button onClick={onClick} className="text-left">{inner}</button> : inner;
}
function Mini({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-lg border border-slate-100 dark:border-slate-800 px-2.5 py-1.5">
      <div className={`text-lg font-bold ${tone}`}>{value}</div>
      <div className="text-[10px] text-slate-400 leading-tight">{label}</div>
    </div>
  );
}

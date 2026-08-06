"use client";

import { useMemo, useState } from "react";
import { Gem, Info, ShieldAlert, ShieldCheck } from "lucide-react";
import {
  CID_LABELS,
  CONFIDENTIALITY_LABELS,
  CRITICALITY_TONE,
  RISK_LEVEL_TONE,
  type AssetCriticality,
} from "@/lib/domain";
import { computeJewels, isJewel, JEWEL_BAND_TONE, type JewelAnalysis } from "@/lib/grc/jewels";
import { useApp } from "@/components/app-context";
import { Card, Token } from "@/components/atoms";
import { GrcTabHeader } from "@/components/grc/GrcTabHeader";
import { EmptyState } from "@/components/EmptyState";

export function JoyauxTab() {
  const { assets, risks, fieldControls, profileById } = useApp();

  const analyses = useMemo(() => computeJewels(assets, risks, fieldControls), [assets, risks, fieldControls]);
  const jewels = useMemo(() => analyses.filter(isJewel), [analyses]);
  const others = analyses.length - jewels.length;

  const kpi = useMemo(() => {
    const prioritaires = jewels.filter((j) => j.band === "Prioritaire").length;
    const exposed = jewels.filter((j) => j.maxResidual === "Critique" || j.maxResidual === "Élevé").length;
    const noRisk = jewels.filter((j) => j.linkedRisks.length === 0).length;
    return { total: jewels.length, prioritaires, exposed, noRisk };
  }, [jewels]);

  return (
    <div className="space-y-5">
      <GrcTabHeader
        title="Joyaux de la couronne"
        subtitle="Analyse des joyaux (Crown Jewels Analysis) : les actifs vitaux pour la mission, leur exposition et leur protection — déduits des actifs, risques et contrôles."
      />

      <Card className="p-3.5 bg-gradient-to-r from-indigo-50/60 to-transparent dark:from-indigo-500/10">
        <div className="flex items-start gap-2 text-[12px] text-slate-600 dark:text-slate-300">
          <Info size={15} className="text-indigo-500 mt-0.5 shrink-0" />
          <p>
            Un <span className="font-semibold">joyau</span> est un actif dont la compromission nuirait le plus à la mission (criticité C/I/D élevée ou risque résiduel élevé).
            L&apos;<span className="font-semibold">indice JRI</span> priorise l&apos;effort de protection en croisant la <span className="font-semibold">valeur</span> (criticité),
            l&apos;<span className="font-semibold">exposition</span> (risque résiduel) et la <span className="font-semibold">protection</span> en place (mesures de traitement + contrôles terrain).
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Joyaux identifiés" value={kpi.total} tone="text-indigo-600" />
        <Kpi label="Prioritaires" value={kpi.prioritaires} tone="text-rose-600" />
        <Kpi label="Exposition élevée+" value={kpi.exposed} tone="text-orange-600" />
        <Kpi label="Sans analyse de risque" value={kpi.noRisk} tone="text-amber-600" />
      </div>

      {assets.length === 0 ? (
        <EmptyState icon={Gem} title="Aucun actif au registre" subtitle="Alimente le registre des actifs (onglet Actifs) : les joyaux en seront déduits automatiquement." />
      ) : jewels.length === 0 ? (
        <Card className="p-6 text-center text-[13px] text-slate-400">Aucun joyau détecté : aucun actif n&apos;atteint une criticité élevée ou ne porte de risque résiduel élevé.</Card>
      ) : (
        <div className="space-y-3">
          {jewels.map((j) => <JewelCard key={j.asset.id} j={j} owner={profileById(j.asset.ownerId).nom} />)}
        </div>
      )}

      {others > 0 && (
        <div className="text-[11px] text-slate-400 text-center">
          {others} autre{others > 1 ? "s" : ""} actif{others > 1 ? "s" : ""} hors périmètre joyaux (criticité modérée/faible, sans risque résiduel élevé).
        </div>
      )}
    </div>
  );
}

function JewelCard({ j, owner }: { j: JewelAnalysis; owner: string }) {
  const a = j.asset;
  const cid = [
    { k: "C", v: a.confidentiality, label: CONFIDENTIALITY_LABELS[a.confidentiality] ?? "—" },
    { k: "I", v: a.integrity, label: CID_LABELS[a.integrity] ?? "—" },
    { k: "D", v: a.availability, label: CID_LABELS[a.availability] ?? "—" },
  ];
  const gauge = j.band === "Prioritaire" ? "bg-rose-500" : j.band === "À surveiller" ? "bg-amber-500" : "bg-emerald-500";

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3 flex-wrap">
        <Gem size={18} className="text-indigo-500 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Token>{a.ref}</Token>
            <span className="text-[14px] font-semibold text-slate-800 dark:text-slate-100">{a.name}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${CRITICALITY_TONE[j.criticality as AssetCriticality] ?? "bg-slate-100 text-slate-500"}`}>{j.criticality}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">{[a.type, a.service, owner].filter(Boolean).join(" · ")}</div>
        </div>
        {/* Indice JRI */}
        <div className="text-right shrink-0">
          <div className="text-[10px] text-slate-400 uppercase tracking-wide">Indice JRI</div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${JEWEL_BAND_TONE[j.band]}`}>{j.band}</span>
            <span className="text-2xl font-bold text-slate-800 dark:text-slate-100 tabular-nums">{j.jri}</span>
          </div>
        </div>
      </div>

      {/* Jauge JRI */}
      <div className="mt-2 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${gauge}`} style={{ width: `${j.jri}%` }} />
      </div>

      <div className="grid sm:grid-cols-3 gap-3 mt-3">
        {/* Classification C/I/D */}
        <div className="rounded-lg border border-slate-100 dark:border-slate-800 p-2.5">
          <div className="text-[10px] text-slate-400 uppercase mb-1.5">Classification</div>
          <div className="flex gap-1.5">
            {cid.map((x) => (
              <div key={x.k} className="flex-1 text-center rounded-md bg-slate-50 dark:bg-slate-800 py-1" title={x.label}>
                <div className="text-[10px] text-slate-400">{x.k}</div>
                <div className="text-[13px] font-bold text-slate-700 dark:text-slate-200">{x.v}</div>
              </div>
            ))}
          </div>
        </div>
        {/* Exposition */}
        <div className="rounded-lg border border-slate-100 dark:border-slate-800 p-2.5">
          <div className="text-[10px] text-slate-400 uppercase mb-1.5 flex items-center gap-1"><ShieldAlert size={11} className="text-rose-400" /> Exposition</div>
          {j.linkedRisks.length === 0 ? (
            <div className="text-[12px] text-slate-400">Aucun risque rattaché</div>
          ) : (
            <div className="flex items-center gap-1.5 flex-wrap">
              {j.maxResidual && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${RISK_LEVEL_TONE[j.maxResidual]}`}>{j.maxResidual}</span>}
              <span className="text-[11px] text-slate-500">{j.linkedRisks.length} risque{j.linkedRisks.length > 1 ? "s" : ""} résiduel{j.linkedRisks.length > 1 ? "s" : ""}</span>
            </div>
          )}
        </div>
        {/* Protection */}
        <div className="rounded-lg border border-slate-100 dark:border-slate-800 p-2.5">
          <div className="text-[10px] text-slate-400 uppercase mb-1.5 flex items-center gap-1"><ShieldCheck size={11} className="text-emerald-400" /> Protection</div>
          <div className="flex items-center gap-1 mb-1">
            {[0, 1, 2].map((i) => <span key={i} className={`h-1.5 flex-1 rounded-full ${i < j.protectionScore ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700"}`} />)}
          </div>
          <div className="text-[10px] text-slate-400">{j.mitigations} mesure{j.mitigations > 1 ? "s" : ""} · {j.controlCoverage} contrôle{j.controlCoverage > 1 ? "s" : ""}</div>
        </div>
      </div>

      {/* Recommandations */}
      <div className="mt-3">
        <div className="text-[10px] text-slate-400 uppercase mb-1">Recommandations</div>
        <ul className="space-y-0.5">
          {j.recommendations.map((r, i) => (
            <li key={i} className="text-[12px] text-slate-600 dark:text-slate-300 flex items-start gap-1.5">
              <span className="text-indigo-400 mt-0.5">▸</span> {r}
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

function Kpi({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <Card className="p-3.5">
      <div className={`text-2xl font-bold ${tone}`}>{value}</div>
      <div className="text-[11px] text-slate-400 mt-0.5">{label}</div>
    </Card>
  );
}

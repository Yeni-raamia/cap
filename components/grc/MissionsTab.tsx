"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Boxes, Crosshair, Plus, Users2 } from "lucide-react";
import {
  assetCriticality,
  MISSION_VALUE_TONE,
  MISSION_VALUES,
  type Mission,
} from "@/lib/domain";
import { useApp } from "@/components/app-context";
import { Card, Token } from "@/components/atoms";
import { GrcTabHeader } from "@/components/grc/GrcTabHeader";
import { MissionsRapportPdf } from "@/components/grc/MissionsRapportPdf";
import { EmptyState } from "@/components/EmptyState";
import { MissionModal } from "@/components/MissionModal";

const critDot: Record<string, string> = { Vitale: "bg-rose-500", Essentielle: "bg-orange-500", Importante: "bg-amber-500", Secondaire: "bg-slate-400" };

export function MissionsTab() {
  const { missions, assetById, profileById, readOnly } = useApp();
  const [creating, setCreating] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const kpi = useMemo(() => {
    const active = missions.filter((m) => m.status !== "Retirée");
    const vitales = active.filter((m) => m.value === "Vitale").length;
    const deps = active.reduce((n, m) => n + m.dependencies.length, 0);
    const people = new Set(active.flatMap((m) => m.peopleIds)).size;
    return { total: missions.length, vitales, deps, people };
  }, [missions]);

  const byValue = useMemo(
    () => MISSION_VALUES.map((v) => ({ value: v, n: missions.filter((m) => m.value === v && m.status !== "Retirée").length })),
    [missions]
  );

  const editing = editId ? missions.find((m) => m.id === editId) ?? null : null;
  const canCreate = !readOnly;

  return (
    <div className="space-y-5">
      <GrcTabHeader
        title="Missions & dépendances"
        subtitle="Cartographier les missions de l'organisation — leur valeur, les actifs et personnes qui les portent, et les dépendances amont/aval. Socle de l'analyse des joyaux (CJA)."
        right={
          <div className="flex items-center gap-2">
            <MissionsRapportPdf />
            {canCreate && (
              <button onClick={() => setCreating(true)} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-slate-900 dark:bg-emerald-600 rounded-xl px-3.5 py-2 hover:-translate-y-0.5 transition-transform shadow-soft">
                <Plus size={15} /> Nouvelle mission
              </button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Missions" value={`${kpi.total}`} tone="text-indigo-600" />
        <Kpi label="Missions vitales" value={`${kpi.vitales}`} tone="text-rose-600" />
        <Kpi label="Dépendances" value={`${kpi.deps}`} tone="text-amber-600" />
        <Kpi label="Personnes clés" value={`${kpi.people}`} tone="text-violet-600" />
      </div>

      {/* Répartition par valeur */}
      {missions.length > 0 && (
        <Card className="p-3.5">
          <div className="text-[11px] text-slate-500 mb-2">Missions par valeur</div>
          <div className="flex gap-1.5 flex-wrap">
            {byValue.map((x) => (
              <span key={x.value} className={`text-[11px] px-2.5 py-1 rounded-full border ${MISSION_VALUE_TONE[x.value]}`}>{x.value} · {x.n}</span>
            ))}
          </div>
        </Card>
      )}

      {missions.length === 0 ? (
        <EmptyState icon={Crosshair} title="Aucune mission" subtitle={canCreate ? "Recense les missions de l'organisation et leurs dépendances." : "Les missions seront gérées par l'équipe GRC."} />
      ) : (
        <div className="space-y-3">
          {missions.map((m) => (
            <MissionFlow key={m.id} m={m} assetName={(id) => assetById(id)?.name ?? "?"} assetCrit={(id) => { const a = assetById(id); return a ? assetCriticality(a) : "—"; }} ownerName={m.ownerId ? profileById(m.ownerId).nom : "—"} peopleNames={m.peopleIds.map((id) => profileById(id).nom)} onClick={() => setEditId(m.id)} />
          ))}
        </div>
      )}

      {(creating || editing) && <MissionModal mission={editing} creating={creating} onClose={() => { setCreating(false); setEditId(null); }} />}
    </div>
  );
}

/* Arborescence d'une mission : Amont → Mission (actifs/personnes) → Aval. */
function MissionFlow({ m, assetName, assetCrit, ownerName, peopleNames, onClick }: { m: Mission; assetName: (id: string) => string; assetCrit: (id: string) => string; ownerName: string; peopleNames: string[]; onClick: () => void }) {
  const amont = m.dependencies.filter((d) => d.direction === "amont");
  const aval = m.dependencies.filter((d) => d.direction === "aval");
  return (
    <button onClick={onClick} className="w-full text-left rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-soft p-4 hover:-translate-y-0.5 transition-transform">
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <Token>{m.ref}</Token>
        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${MISSION_VALUE_TONE[m.value] ?? ""}`}>{m.value}</span>
        <span className="text-[10px] text-slate-400">{m.type}</span>
        {m.status !== "Active" && <span className="text-[10px] text-slate-400">· {m.status}</span>}
        <span className="text-[10px] text-slate-400 ml-auto">{ownerName}</span>
      </div>

      <div className="grid md:grid-cols-[1fr_auto_1.4fr_auto_1fr] gap-2 items-center">
        {/* Amont */}
        <DepColumn title="Amont — dépend de" deps={amont} align="left" />
        <ArrowRight size={16} className="text-slate-300 hidden md:block mx-auto" />
        {/* Mission (centre) */}
        <div className="rounded-xl border-2 border-indigo-200 dark:border-indigo-500/40 bg-indigo-50/40 dark:bg-indigo-500/10 p-3 text-center">
          <div className="text-[14px] font-semibold text-slate-800 dark:text-slate-100 leading-snug">{m.name}</div>
          {m.assetIds.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1 justify-center">
              {m.assetIds.map((id) => (
                <span key={id} className="inline-flex items-center gap-1 text-[10px] bg-white dark:bg-slate-800 border border-slate-200 rounded-full px-1.5 py-0.5">
                  <Boxes size={10} className="text-teal-500" /> {assetName(id)} <span className={`h-1.5 w-1.5 rounded-full ${critDot[assetCrit(id)] ?? "bg-slate-300"}`} />
                </span>
              ))}
            </div>
          )}
          {peopleNames.length > 0 && (
            <div className="mt-1.5 text-[10px] text-slate-500 flex items-center gap-1 justify-center flex-wrap"><Users2 size={10} /> {peopleNames.join(", ")}</div>
          )}
        </div>
        <ArrowRight size={16} className="text-slate-300 hidden md:block mx-auto" />
        {/* Aval */}
        <DepColumn title="Aval — en dépendent" deps={aval} align="right" />
      </div>
    </button>
  );
}

function DepColumn({ title, deps, align }: { title: string; deps: Mission["dependencies"]; align: "left" | "right" }) {
  return (
    <div className={align === "right" ? "md:text-right" : ""}>
      <div className="text-[10px] text-slate-400 uppercase mb-1">{title}</div>
      {deps.length === 0 ? (
        <div className="text-[11px] text-slate-300">—</div>
      ) : (
        <div className={`flex flex-wrap gap-1 ${align === "right" ? "md:justify-end" : ""}`}>
          {deps.map((d) => (
            <span key={d.id} title={`${d.kind}${d.description ? " · " + d.description : ""}`} className="inline-flex items-center gap-1 text-[10.5px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-1.5 py-0.5 text-slate-600 dark:text-slate-300">
              <span className={`h-1.5 w-1.5 rounded-full ${critDot[d.criticality] ?? "bg-slate-300"}`} /> {d.name}
            </span>
          ))}
        </div>
      )}
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

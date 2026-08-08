"use client";

import { useMemo, useState } from "react";
import { ClipboardList, Gauge, Plus } from "lucide-react";
import { fmt, type DirectionReview } from "@/lib/domain";
import { computeGrcKpis, grcPosture } from "@/lib/grc/kpis";
import { useApp } from "@/components/app-context";
import { Card, Token } from "@/components/atoms";
import { Ring } from "@/components/dataviz";
import { GrcTabHeader } from "@/components/grc/GrcTabHeader";
import { RevueRapportPdf } from "@/components/grc/RevueRapportPdf";
import { EmptyState } from "@/components/EmptyState";
import { ReviewModal } from "@/components/ReviewModal";

export function RevueTab() {
  const app = useApp();
  const { reviews, profileById, readOnly } = app;
  const now = useMemo(() => new Date(), []);
  const [creating, setCreating] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const kpis = useMemo(
    () => computeGrcKpis({ risks: app.risks, controlAssessments: app.controlAssessments, fieldControls: app.fieldControls, capaActions: app.capaActions, incidents: app.incidents, processing: app.processing, policies: app.policies, continuityPlans: app.continuityPlans, missions: app.missions, assets: app.assets, now }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [app.risks, app.controlAssessments, app.fieldControls, app.capaActions, app.incidents, app.processing, app.policies, app.continuityPlans, app.missions, app.assets, now]
  );
  const posture = grcPosture(kpis);
  const postureColor = posture >= 70 ? "#10b981" : posture >= 45 ? "#f59e0b" : "#f43f5e";

  const editing = editId ? reviews.find((r) => r.id === editId) ?? null : null;
  const canCreate = !readOnly;

  const tiles: { label: string; value: string; tone: string }[] = [
    { label: "Conformité (référentiels)", value: `${kpis.conformite}%`, tone: kpis.conformite >= 70 ? "text-emerald-600" : kpis.conformite >= 40 ? "text-amber-600" : "text-rose-600" },
    { label: "Risques critiques ouverts", value: `${kpis.risquesCritiques}`, tone: "text-rose-600" },
    { label: "Écarts terrain ouverts", value: `${kpis.ecartsOuverts}`, tone: "text-amber-600" },
    { label: "Actions en retard", value: `${kpis.capaEnRetard}`, tone: "text-rose-600" },
    { label: "Incidents ouverts", value: `${kpis.incidentsOuverts}`, tone: "text-amber-600" },
    { label: "Violations de données", value: `${kpis.violationsDonnees}`, tone: "text-rose-600" },
    { label: "AIPD à réaliser", value: `${kpis.aipdARealiser}`, tone: "text-amber-600" },
    { label: "Applicabilité politiques", value: `${kpis.applicabilitePolitiques}%`, tone: "text-sky-600" },
    { label: "Continuité à tester", value: `${kpis.continuiteATester}`, tone: "text-amber-600" },
    { label: "Joyaux prioritaires", value: `${kpis.joyauxPrioritaires}`, tone: "text-indigo-600" },
  ];

  return (
    <div className="space-y-5">
      <GrcTabHeader
        title="Revue de direction & pilotage"
        subtitle="Tableau de bord synthétique de la posture GRC (agrège tous les onglets) et revues de direction (ISO 27001 §9.3)."
        right={
          <div className="flex items-center gap-2">
            <RevueRapportPdf />
            {canCreate && (
              <button onClick={() => setCreating(true)} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-slate-900 dark:bg-emerald-600 rounded-xl px-3.5 py-2 hover:-translate-y-0.5 transition-transform shadow-soft">
                <Plus size={15} /> Nouvelle revue
              </button>
            )}
          </div>
        }
      />

      {/* Posture + KPIs */}
      <Card className="p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <Ring value={posture} size={84} stroke={9} color={postureColor}><span className="text-[20px] font-bold" style={{ color: postureColor }}>{posture}</span></Ring>
          <div>
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5"><Gauge size={13} /> Indice de posture GRC</div>
            <div className="text-[15px] font-semibold text-slate-800 dark:text-slate-100">{posture >= 70 ? "Maîtrisée" : posture >= 45 ? "À consolider" : "Sous tension"}</div>
            <div className="text-[11px] text-slate-400 mt-0.5 max-w-md">Conformité pondérée par les risques critiques, actions en retard, incidents et écarts RGPD/continuité.</div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 mt-4">
          {tiles.map((t) => (
            <div key={t.label} className="rounded-xl border border-slate-100 dark:border-slate-800 p-2.5">
              <div className={`text-xl font-bold ${t.tone}`}>{t.value}</div>
              <div className="text-[10.5px] text-slate-400 mt-0.5 leading-tight">{t.label}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Registre des revues */}
      <div>
        <div className="text-[13px] font-semibold text-slate-700 mb-2 flex items-center gap-2"><ClipboardList size={15} className="text-slate-500" /> Revues de direction</div>
        {reviews.length === 0 ? (
          <EmptyState icon={ClipboardList} title="Aucune revue" subtitle={canCreate ? "Planifie une revue de direction et capture les indicateurs du moment." : "Les revues seront gérées par l'équipe GRC."} />
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {reviews.map((r) => <ReviewCard key={r.id} r={r} participants={r.participantIds.map((id) => profileById(id).nom)} onClick={() => setEditId(r.id)} />)}
          </div>
        )}
      </div>

      {(creating || editing) && <ReviewModal review={editing} creating={creating} liveKpis={kpis as unknown as Record<string, number>} onClose={() => { setCreating(false); setEditId(null); }} />}
    </div>
  );
}

const STATUS_TONE: Record<string, string> = { "Préparée": "bg-slate-100 text-slate-600", "Tenue": "bg-sky-100 text-sky-700", "Clôturée": "bg-emerald-100 text-emerald-700" };
function ReviewCard({ r, participants, onClick }: { r: DirectionReview; participants: string[]; onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-left rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-soft p-4 hover:-translate-y-0.5 transition-transform">
      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
        <Token>{r.ref}</Token>
        <span className={`text-[10px] px-2 py-0.5 rounded-full ${STATUS_TONE[r.status] ?? "bg-slate-100 text-slate-500"}`}>{r.status}</span>
        {r.period && <span className="text-[10px] text-slate-400">{r.period}</span>}
      </div>
      <div className="text-[14px] font-semibold text-slate-800 dark:text-slate-100 leading-snug">{r.title}</div>
      <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-400 flex-wrap">
        {r.date && <span>{fmt(r.date)}</span>}
        {participants.length > 0 && <span>· {participants.length} participant{participants.length > 1 ? "s" : ""}</span>}
        {r.nextReviewDate && <span>· prochaine {fmt(r.nextReviewDate)}</span>}
      </div>
      {r.decisions && <div className="text-[11px] text-slate-500 mt-2 line-clamp-2">Décisions : {r.decisions}</div>}
    </button>
  );
}

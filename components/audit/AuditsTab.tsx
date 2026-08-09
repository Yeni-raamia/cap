"use client";

import { useMemo, useState } from "react";
import { ClipboardCheck, Plus, Search, Target, TrendingDown, TrendingUp } from "lucide-react";
import { AUDIT_STATUS_TONE, auditScoreTone, computeAuditScore, previousAudit, type Audit } from "@/lib/domain";
import { fmt } from "@/lib/domain";
import { useApp } from "@/components/app-context";
import { Card, Token } from "@/components/atoms";
import { GrcTabHeader } from "@/components/grc/GrcTabHeader";
import { EmptyState } from "@/components/EmptyState";
import { NewAuditModal } from "@/components/NewAuditModal";
import { AuditRunModal } from "@/components/AuditRunModal";

export function AuditsTab() {
  const { audits, auditGrids, assetById, profileById, readOnly } = useApp();
  const [search, setSearch] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [creating, setCreating] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return audits.filter((a) =>
      (!q || a.title.toLowerCase().includes(q) || a.ref.toLowerCase().includes(q) || a.targetLabel.toLowerCase().includes(q)) &&
      (!fStatus || a.status === fStatus)
    );
  }, [audits, search, fStatus]);

  const running = runId ? audits.find((a) => a.id === runId) ?? null : null;
  const canCreate = !readOnly && auditGrids.length > 0;
  const targetName = (a: Audit) => (a.targetAssetId ? assetById(a.targetAssetId)?.name ?? a.targetLabel : a.targetLabel) || "—";

  return (
    <div className="space-y-5">
      <GrcTabHeader
        title="Audits réalisés"
        subtitle="Chaque audit applique une grille à une cible et produit un score par domaine (radar) + des constats."
        right={canCreate ? (
          <button onClick={() => setCreating(true)} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-slate-900 dark:bg-emerald-600 rounded-xl px-3.5 py-2 hover:-translate-y-0.5 transition-transform shadow-soft">
            <Plus size={15} /> Nouvel audit
          </button>
        ) : undefined}
      />

      <Card className="p-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[10rem]">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un audit…" className="w-full text-[13px] border border-slate-200 rounded-lg pl-8 pr-2 py-1.5 outline-none focus:border-emerald-400" />
          </div>
          <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} aria-label="Statut" className="text-[12px] border border-slate-200 rounded-lg px-2 py-1.5 bg-white">
            <option value="">Tous statuts</option>
            {Object.keys(AUDIT_STATUS_TONE).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </Card>

      {audits.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title="Aucun audit" subtitle={auditGrids.length === 0 ? "Crée d'abord une grille dans l'onglet Grilles." : canCreate ? "Lance un premier audit à partir d'une grille." : "Les audits seront menés par l'équipe d'audit."} />
      ) : filtered.length === 0 ? (
        <Card className="p-6 text-center text-[13px] text-slate-400">Aucun audit ne correspond au filtre.</Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {filtered.map((a) => {
            const sc = computeAuditScore(a.questions, a.responses);
            const prev = previousAudit(a, audits);
            const dl = prev ? sc.global - computeAuditScore(prev.questions, prev.responses).global : null;
            return (
              <button key={a.id} onClick={() => setRunId(a.id)} className="text-left rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-soft p-4 hover:-translate-y-0.5 transition-transform">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <Token>{a.ref}</Token>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${AUDIT_STATUS_TONE[a.status] ?? "bg-slate-100 text-slate-500"}`}>{a.status}</span>
                  {dl !== null && dl !== 0 && (
                    <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${dl > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      {dl > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}{dl > 0 ? "+" : ""}{dl}
                    </span>
                  )}
                  <span className={`ml-auto text-xl font-bold ${auditScoreTone(sc.global)}`}>{sc.global}%</span>
                </div>
                <div className="text-[14px] font-semibold text-slate-800 dark:text-slate-100 leading-snug">{a.title}</div>
                <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1"><Target size={11} /> {targetName(a)} · {a.gridName}</div>
                <div className="mt-2 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${sc.global >= 80 ? "bg-emerald-500" : sc.global >= 50 ? "bg-amber-500" : "bg-rose-500"}`} style={{ width: `${sc.global}%` }} />
                </div>
                <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-400 flex-wrap">
                  <span>{sc.answered}/{sc.total} évaluées</span>
                  {sc.gaps > 0 && <span className="text-rose-500">· {sc.gaps} constat{sc.gaps > 1 ? "s" : ""}</span>}
                  {a.date && <span>· {fmt(a.date)}</span>}
                  <span>· {profileById(a.auditorId).nom}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {creating && <NewAuditModal onClose={() => setCreating(false)} onCreated={(id) => { setCreating(false); if (id) setRunId(id); }} />}
      {running && <AuditRunModal audit={running} onClose={() => setRunId(null)} />}
    </div>
  );
}

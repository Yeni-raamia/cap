"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Search, Star, Wrench } from "lucide-react";
import { AUDIT_ANSWER_TONE, CAPA_STATUS_TONE, type Audit, type AuditQuestion, type CapaAction } from "@/lib/domain";
import { useApp } from "@/components/app-context";
import { Card, Token } from "@/components/atoms";
import { GrcTabHeader } from "@/components/grc/GrcTabHeader";
import { EmptyState } from "@/components/EmptyState";

interface Constat {
  audit: Audit;
  q: AuditQuestion;
  answer: string;
  note: string;
  capa: CapaAction | null;
}

export function ConstatsTab() {
  const { audits, capaActions, assetById, readOnly, createCapa } = useApp();
  const [search, setSearch] = useState("");
  const [fCrit, setFCrit] = useState(false);
  const [fSuivi, setFSuivi] = useState(""); // "" | "sans" | "avec" | "cloture"
  const [busy, setBusy] = useState<string | null>(null);

  const capaByKey = useMemo(() => {
    const m = new Map<string, CapaAction>();
    capaActions.forEach((c) => { if (c.sourceType === "audit" && c.sourceId) m.set(c.sourceId, c); });
    return m;
  }, [capaActions]);

  const constats = useMemo<Constat[]>(() => {
    const rows: Constat[] = [];
    audits.forEach((audit) => {
      const byId = new Map(audit.responses.map((r) => [r.questionId, r]));
      audit.questions.forEach((q) => {
        const r = byId.get(q.id);
        if (r && (r.answer === "Non" || r.answer === "Partiel")) {
          rows.push({ audit, q, answer: r.answer, note: r.note, capa: capaByKey.get(`${audit.id}:${q.id}`) ?? null });
        }
      });
    });
    // Constats critiques d'abord, puis Non avant Partiel.
    return rows.sort((a, b) => Number(b.q.critical) - Number(a.q.critical) || (a.answer === "Non" ? -1 : 1) - (b.answer === "Non" ? -1 : 1));
  }, [audits, capaByKey]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return constats.filter((c) => {
      if (fCrit && !c.q.critical) return false;
      if (fSuivi === "sans" && c.capa) return false;
      if (fSuivi === "avec" && !c.capa) return false;
      if (fSuivi === "cloture" && !(c.capa && c.capa.status === "Clôturée")) return false;
      if (query && !(c.q.text.toLowerCase().includes(query) || c.audit.title.toLowerCase().includes(query) || c.q.domain.toLowerCase().includes(query))) return false;
      return true;
    });
  }, [constats, search, fCrit, fSuivi]);

  const withoutAction = constats.filter((c) => !c.capa).length;
  const targetName = (a: Audit) => (a.targetAssetId ? assetById(a.targetAssetId)?.name ?? a.targetLabel : a.targetLabel) || "—";

  const makeCapa = async (c: Constat) => {
    const key = `${c.audit.id}:${c.q.id}`;
    setBusy(key);
    await createCapa({
      title: `Constat audit ${c.audit.ref} — ${c.q.text}`.slice(0, 160),
      description: [c.note, c.q.guidance].filter(Boolean).join(" — "),
      type: "Corrective",
      priority: c.q.critical ? "Haute" : "Normale",
      sourceType: "audit",
      sourceId: key,
    });
    setBusy(null);
  };

  return (
    <div className="space-y-5">
      <GrcTabHeader
        title="Constats & recommandations"
        subtitle="Registre transverse des écarts relevés dans les audits (ISO 19011 / IIA), avec le suivi des actions correctives associées."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Constats" value={`${constats.length}`} tone="text-amber-600" />
        <Kpi label="Critiques" value={`${constats.filter((c) => c.q.critical).length}`} tone="text-rose-600" />
        <Kpi label="Sans action" value={`${withoutAction}`} tone="text-rose-600" />
        <Kpi label="Actions liées" value={`${constats.length - withoutAction}`} tone="text-emerald-600" />
      </div>

      <Card className="p-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[10rem]">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un constat…" className="w-full text-[13px] border border-slate-200 rounded-lg pl-8 pr-2 py-1.5 outline-none focus:border-emerald-400" />
          </div>
          <select value={fSuivi} onChange={(e) => setFSuivi(e.target.value)} aria-label="Suivi" className="text-[12px] border border-slate-200 rounded-lg px-2 py-1.5 bg-white">
            <option value="">Tout suivi</option>
            <option value="sans">Sans action</option>
            <option value="avec">Avec action</option>
            <option value="cloture">Action clôturée</option>
          </select>
          <button onClick={() => setFCrit((v) => !v)} className={`text-[12px] rounded-lg px-2.5 py-1.5 border ${fCrit ? "bg-rose-50 border-rose-200 text-rose-700" : "border-slate-200 text-slate-500"}`}>Critiques</button>
        </div>
      </Card>

      {constats.length === 0 ? (
        <EmptyState icon={AlertTriangle} title="Aucun constat" subtitle="Les réponses « Non » et « Partiel » de tes audits apparaîtront ici comme constats à traiter." />
      ) : filtered.length === 0 ? (
        <Card className="p-6 text-center text-[13px] text-slate-400">Aucun constat ne correspond au filtre.</Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  <th className="py-2 px-3">Audit / cible</th>
                  <th className="py-2 px-3">Domaine</th>
                  <th className="py-2 px-3">Constat</th>
                  <th className="py-2 px-3">Réponse</th>
                  <th className="py-2 px-3">Suivi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const key = `${c.audit.id}:${c.q.id}`;
                  return (
                    <tr key={key} className="border-b border-slate-50 dark:border-slate-800/60 align-top">
                      <td className="py-2 px-3 min-w-[9rem]">
                        <Token>{c.audit.ref}</Token>
                        <div className="text-[11px] text-slate-400 mt-0.5">{targetName(c.audit)}</div>
                      </td>
                      <td className="py-2 px-3 text-[12px] text-slate-500 min-w-[6rem]">{c.q.domain}</td>
                      <td className="py-2 px-3 max-w-[22rem]">
                        <div className="text-[12.5px] text-slate-700 dark:text-slate-200 flex items-start gap-1">
                          {c.q.critical && <Star size={11} className="fill-amber-500 text-amber-500 mt-0.5 shrink-0" aria-label="critique" />}
                          <span>{c.q.text}</span>
                        </div>
                        {c.note && <div className="text-[11px] text-slate-400 mt-0.5">{c.note}</div>}
                      </td>
                      <td className="py-2 px-3"><span className={`text-[10px] px-2 py-0.5 rounded-full border ${AUDIT_ANSWER_TONE[c.answer]}`}>{c.answer}</span></td>
                      <td className="py-2 px-3 min-w-[9rem]">
                        {c.capa ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Token>{c.capa.ref}</Token>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${CAPA_STATUS_TONE[c.capa.status] ?? "bg-slate-100 text-slate-500"}`}>{c.capa.status}</span>
                          </div>
                        ) : readOnly ? (
                          <span className="text-[11px] text-slate-400">—</span>
                        ) : (
                          <button onClick={() => makeCapa(c)} disabled={busy === key} className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-700 bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/30 rounded-full px-2.5 py-0.5 hover:bg-sky-100 disabled:opacity-50">
                            <Wrench size={12} /> Créer une action
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
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

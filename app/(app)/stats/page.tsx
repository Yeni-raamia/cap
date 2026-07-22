"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { STATUTS, type Statut } from "@/lib/domain";
import { computeBreakdowns, computeProjectStats } from "@/lib/stats";
import { BarChart3 } from "lucide-react";
import { useApp } from "@/components/app-context";
import { PageHero } from "@/components/PageHero";
import { RapportPdf } from "@/components/RapportPdf";
import { ExportSuivis } from "@/components/ExportSuivis";

const box = "bg-white border border-slate-200 rounded-xl p-4";

export default function StatsPage() {
  const { items, profiles, catalogue, now, projects, theme } = useApp();
  const dark = theme === "dark";
  const grid = dark ? "#1e293b" : "#eef2f6";
  const tick = { fontSize: 11, fill: dark ? "#94a3b8" : "#64748b" };
  const tip = {
    contentStyle: {
      background: dark ? "#0f172a" : "#ffffff",
      border: `1px solid ${dark ? "#1e293b" : "#e2e8f0"}`,
      borderRadius: 8,
      fontSize: 12,
    },
    labelStyle: { color: dark ? "#e2e8f0" : "#0f172a" },
  };
  const agents = profiles.filter((u) => u.role === "agent");
  const bd = computeBreakdowns(items, profiles, now, catalogue.types);
  const maxCause = Math.max(1, ...bd.causes.map((c) => c.n));
  const maxAppr = Math.max(1, ...bd.parAppreciation.map((a) => a.n));
  const ps = computeProjectStats(projects, now);
  const maxProjStatut = Math.max(1, ...ps.parStatut.map((s) => s.n));

  const parMetier = Object.keys(catalogue.metiers)
    .map((m) => ({ name: m, v: items.filter((i) => i.metier === m).length }))
    .filter((x) => x.v);

  const parAgent = agents.map((u) => {
    const mine = items.filter((i) => i.ownerId === u.id);
    const rep = mine.filter((i) => i.timeline.some((e) => e.kind === "reponse")).length;
    return { name: u.init, taux: mine.length ? Math.round((rep / mine.length) * 100) : 0 };
  });

  const relances = agents.map((u) => ({
    name: u.init,
    v: items.filter((i) => i.ownerId === u.id).reduce((s, i) => s + i.relancesCount, 0),
  }));

  return (
    <div className="space-y-6 animate-float">
      <PageHero
        kicker="Pilotage"
        icon={BarChart3}
        title="Statistiques"
        subtitle="Le registre, en vivant. Ce qui avance, ce qui répond, qui fait bouger les lignes."
        right={<RapportPdf />}
      />

      {/* Exports Excel/CSV */}
      <div className={`${box} flex items-center justify-between gap-3 flex-wrap`}>
        <div className="text-[12.5px] text-slate-600 dark:text-slate-300">
          <span className="font-semibold text-slate-800 dark:text-slate-100">Exports</span> — données brutes pour Excel / reporting.
        </div>
        <ExportSuivis />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className={box}>
          <div className="text-[13px] font-semibold text-slate-700 mb-3">Volume par métier</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={parMetier}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={grid} />
              <XAxis dataKey="name" tick={tick} />
              <YAxis tick={tick} allowDecimals={false} />
              <Tooltip {...tip} />
              <Bar dataKey="v" radius={[4, 4, 0, 0]} fill="#1FA07A" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className={box}>
          <div className="text-[13px] font-semibold text-slate-700 mb-3">
            Taux de réponse par agent (%)
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={parAgent}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={grid} />
              <XAxis dataKey="name" tick={tick} />
              <YAxis tick={tick} domain={[0, 100]} />
              <Tooltip {...tip} />
              <Bar dataKey="taux" radius={[4, 4, 0, 0]}>
                {parAgent.map((e, i) => (
                  <Cell
                    key={i}
                    fill={e.taux >= 60 ? "#1FA07A" : e.taux >= 30 ? "#D9943B" : "#C9503E"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className={box}>
          <div className="text-[13px] font-semibold text-slate-700 mb-3">
            Relances effectuées par agent
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={relances}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={grid} />
              <XAxis dataKey="name" tick={tick} />
              <YAxis tick={tick} allowDecimals={false} />
              <Tooltip {...tip} />
              <Bar dataKey="v" radius={[4, 4, 0, 0]} fill="#3E7CB1" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className={box}>
          <div className="text-[13px] font-semibold text-slate-700 mb-3">
            Répartition des statuts
          </div>
          <div className="space-y-2 mt-4">
            {(Object.keys(STATUTS) as Statut[]).map((s) => {
              const n = items.filter((i) => i.statut === s).length;
              const pct = items.length ? Math.round((n / items.length) * 100) : 0;
              return (
                <div key={s} className="flex items-center gap-2 text-[12px]">
                  <span className="w-24 text-slate-600">{s}</span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-400" style={{ width: pct + "%" }} />
                  </div>
                  <span className="w-6 text-right text-slate-400">{n}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ---------- Statistiques détaillées (imputabilité) ---------- */}
      <div>
        <h2 className="text-[15px] font-semibold text-slate-800">Détail par partie prenante</h2>
        <p className="text-[13px] text-slate-500">
          Qui envoie, qui reçoit, qui bloque — pour que toutes les parties soient rendues
          responsables.
        </p>
      </div>

      {/* Par émetteur (agent) */}
      <div className={box}>
        <div className="text-[13px] font-semibold text-slate-700 mb-3">
          État par émetteur (agent responsable)
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200">
                <th className="py-1.5 pr-3">Agent</th>
                <th className="py-1.5 pr-3">Suivis de mail</th>
                <th className="py-1.5 pr-3">Relances</th>
                <th className="py-1.5 pr-3">Réponses</th>
                <th className="py-1.5 pr-3">Retards</th>
                <th className="py-1.5 pr-3">Bloqués</th>
                <th className="py-1.5 pr-3">Clôtures</th>
              </tr>
            </thead>
            <tbody>
              {bd.parAgent.map((a) => (
                <tr key={a.id} className="border-b border-slate-100">
                  <td className="py-1.5 pr-3 text-slate-800">{a.nom}</td>
                  <td className="py-1.5 pr-3">{a.suivis}</td>
                  <td className="py-1.5 pr-3">{a.relances}</td>
                  <td className="py-1.5 pr-3">{a.reponses}</td>
                  <td className={`py-1.5 pr-3 ${a.retards ? "text-rose-600 font-medium" : "text-slate-400"}`}>{a.retards}</td>
                  <td className={`py-1.5 pr-3 ${a.bloques ? "text-rose-600 font-medium" : "text-slate-400"}`}>{a.bloques}</td>
                  <td className="py-1.5 pr-3 text-emerald-700">{a.clotures}</td>
                </tr>
              ))}
              {bd.parAgent.length === 0 && (
                <tr><td className="py-3 text-slate-400" colSpan={7}>Aucune donnée.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Par service destinataire */}
      <div className={box}>
        <div className="text-[13px] font-semibold text-slate-700 mb-1">État par service destinataire</div>
        <p className="text-[11px] text-slate-400 mb-3">Réseau, systèmes, prestataire… — où se concentrent les blocages.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200">
                <th className="py-1.5 pr-3">Service</th>
                <th className="py-1.5 pr-3">Mails</th>
                <th className="py-1.5 pr-3">Relances</th>
                <th className="py-1.5 pr-3">Réponses</th>
                <th className="py-1.5 pr-3">Retards</th>
                <th className="py-1.5 pr-3">Bloqués</th>
              </tr>
            </thead>
            <tbody>
              {bd.parService.map((d) => (
                <tr key={d.name} className="border-b border-slate-100">
                  <td className="py-1.5 pr-3 text-slate-800">{d.name}</td>
                  <td className="py-1.5 pr-3">{d.suivis}</td>
                  <td className="py-1.5 pr-3">{d.relances}</td>
                  <td className="py-1.5 pr-3">{d.reponses}</td>
                  <td className={`py-1.5 pr-3 ${d.retards ? "text-rose-600 font-medium" : "text-slate-400"}`}>{d.retards}</td>
                  <td className={`py-1.5 pr-3 ${d.bloques ? "text-rose-600 font-medium" : "text-slate-400"}`}>{d.bloques}</td>
                </tr>
              ))}
              {bd.parService.length === 0 && (
                <tr><td className="py-3 text-slate-400" colSpan={6}>Aucun service renseigné.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Par destinataire */}
      <div className={box}>
        <div className="text-[13px] font-semibold text-slate-700 mb-1">État par destinataire (nom)</div>
        <p className="text-[11px] text-slate-400 mb-3">
          Trié par blocages et retards — met en évidence les tiers dont on attend une action.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200">
                <th className="py-1.5 pr-3">Destinataire</th>
                <th className="py-1.5 pr-3">Mails reçus</th>
                <th className="py-1.5 pr-3">Relances</th>
                <th className="py-1.5 pr-3">Réponses</th>
                <th className="py-1.5 pr-3">Retards</th>
                <th className="py-1.5 pr-3">Bloqués</th>
              </tr>
            </thead>
            <tbody>
              {bd.parDestinataire.map((d) => (
                <tr key={d.name} className="border-b border-slate-100">
                  <td className="py-1.5 pr-3 text-slate-800">{d.name}</td>
                  <td className="py-1.5 pr-3">{d.suivis}</td>
                  <td className="py-1.5 pr-3">{d.relances}</td>
                  <td className="py-1.5 pr-3">{d.reponses}</td>
                  <td className={`py-1.5 pr-3 ${d.retards ? "text-rose-600 font-medium" : "text-slate-400"}`}>{d.retards}</td>
                  <td className={`py-1.5 pr-3 ${d.bloques ? "text-rose-600 font-medium" : "text-slate-400"}`}>{d.bloques}</td>
                </tr>
              ))}
              {bd.parDestinataire.length === 0 && (
                <tr><td className="py-3 text-slate-400" colSpan={6}>Aucun destinataire renseigné.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Par criticité */}
        <div className={box}>
          <div className="text-[13px] font-semibold text-slate-700 mb-3">Par criticité</div>
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200">
                <th className="py-1.5 pr-3">Priorité</th>
                <th className="py-1.5 pr-3">Suivis de mail</th>
                <th className="py-1.5 pr-3">Retards</th>
                <th className="py-1.5 pr-3">Bloqués</th>
                <th className="py-1.5 pr-3">Taux rép.</th>
              </tr>
            </thead>
            <tbody>
              {bd.parCriticite.map((c) => (
                <tr key={c.priorite} className="border-b border-slate-100">
                  <td className="py-1.5 pr-3 text-slate-800">{c.priorite}</td>
                  <td className="py-1.5 pr-3">{c.suivis}</td>
                  <td className={`py-1.5 pr-3 ${c.retards ? "text-rose-600 font-medium" : "text-slate-400"}`}>{c.retards}</td>
                  <td className={`py-1.5 pr-3 ${c.bloques ? "text-rose-600 font-medium" : "text-slate-400"}`}>{c.bloques}</td>
                  <td className="py-1.5 pr-3">{c.tauxReponse}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Par appréciation du motif */}
        <div className={box}>
          <div className="text-[13px] font-semibold text-slate-700 mb-3">
            Par appréciation du motif (suivis de mail à risque)
          </div>
          {bd.parAppreciation.length === 0 ? (
            <div className="text-[13px] text-slate-400 text-center py-6">Aucun suivi de mail à risque.</div>
          ) : (
            <div className="space-y-2 mt-2">
              {bd.parAppreciation.map((a) => (
                <div key={a.appreciation} className="flex items-center gap-2 text-[12px]">
                  <span className="w-40 text-slate-600 truncate">{a.appreciation}</span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400" style={{ width: `${(a.n / maxAppr) * 100}%` }} />
                  </div>
                  <span className="w-6 text-right text-slate-500">{a.n}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Projets */}
        <div className={box}>
          <div className="text-[13px] font-semibold text-slate-700 mb-3">Projets</div>
          <div className="grid grid-cols-2 gap-2 mb-3 text-center">
            <div className="rounded-lg bg-slate-50 p-2">
              <div className="text-xl font-semibold text-slate-800">{ps.total}</div>
              <div className="text-[11px] text-slate-500">Projets</div>
            </div>
            <div className="rounded-lg bg-slate-50 p-2">
              <div className="text-xl font-semibold text-emerald-700">{ps.avancementMoyen}%</div>
              <div className="text-[11px] text-slate-500">Avancement moyen</div>
            </div>
            <div className="rounded-lg bg-slate-50 p-2">
              <div className="text-xl font-semibold text-slate-800">{ps.tachesFaites}/{ps.taches}</div>
              <div className="text-[11px] text-slate-500">Tâches faites</div>
            </div>
            <div className="rounded-lg bg-slate-50 p-2">
              <div className={`text-xl font-semibold ${ps.enRetard ? "text-rose-600" : "text-slate-800"}`}>{ps.enRetard}</div>
              <div className="text-[11px] text-slate-500">Projets en retard</div>
            </div>
          </div>
          {ps.parStatut.length === 0 ? (
            <div className="text-[12px] text-slate-400">Aucun projet.</div>
          ) : (
            <div className="space-y-2">
              {ps.parStatut.map((s) => (
                <div key={s.statut} className="flex items-center gap-2 text-[12px]">
                  <span className="w-24 text-slate-600">{s.statut}</span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-sky-400" style={{ width: `${(s.n / maxProjStatut) * 100}%` }} />
                  </div>
                  <span className="w-6 text-right text-slate-500">{s.n}</span>
                </div>
              ))}
            </div>
          )}
          {ps.tachesEnRetard > 0 && (
            <div className="text-[11px] text-rose-600 mt-2">{ps.tachesEnRetard} tâche(s) en retard sur l&apos;ensemble des projets.</div>
          )}
        </div>

        {/* Causes de blocage */}
        <div className={box}>
          <div className="text-[13px] font-semibold text-slate-700 mb-3">Causes de blocage</div>
          {bd.causes.length === 0 ? (
            <div className="text-[13px] text-slate-400 text-center py-6">Rien de bloqué. Tout avance.</div>
          ) : (
            <div className="space-y-2 mt-2">
              {bd.causes.map((c) => (
                <div key={c.cause} className="flex items-center gap-2 text-[12px]">
                  <span className="w-40 text-slate-600 truncate">{c.cause}</span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-400" style={{ width: `${(c.n / maxCause) * 100}%` }} />
                  </div>
                  <span className="w-6 text-right text-slate-500">{c.n}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

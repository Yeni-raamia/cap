"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { isLateByDuration, NEGLIGENCE_GRAVITES, STATUTS, type NonConformite, type Negligence, type Statut } from "@/lib/domain";
import { computeBreakdowns, computeProjectStats } from "@/lib/stats";
import { BarChart3, Columns2, GripVertical, Plus, RectangleHorizontal, RotateCcw, Settings2, X } from "lucide-react";

type BlockSize = "full" | "half";
type LayoutItem = { id: string; size: BlockSize };
import { useApp } from "@/components/app-context";
import { PageHero } from "@/components/PageHero";
import { RapportPdf } from "@/components/RapportPdf";
import { ExportSuivis } from "@/components/ExportSuivis";

const box = "bg-white border border-slate-200 rounded-xl p-4";

/** Bloc déplaçable du tableau de bord. La poignée et le retrait n'apparaissent
 *  qu'en mode personnalisation. */
function SortableBlock({
  id,
  size,
  customize,
  onRemove,
  onToggleSize,
  children,
}: {
  id: string;
  size: BlockSize;
  customize: boolean;
  onRemove: () => void;
  onToggleSize: () => void;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  // Translate seul (pas de scale) — évite la déformation du bloc pendant le glissé.
  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 20 : undefined,
  };
  // En mode personnalisation, TOUT le bloc est saisissable (plus intuitif qu'une
  // petite poignée). Le clic sur les boutons stoppe la propagation pour ne pas
  // déclencher un glissé.
  const dragProps = customize ? { ...attributes, ...listeners } : {};
  const stop = (e: React.PointerEvent) => e.stopPropagation();
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...dragProps}
      className={`relative ${size === "full" ? "md:col-span-2" : "md:col-span-1"} ${
        customize
          ? "cursor-grab active:cursor-grabbing touch-none rounded-xl ring-1 ring-dashed ring-slate-300 dark:ring-slate-600 hover:ring-emerald-400"
          : ""
      } ${isDragging ? "shadow-xl" : ""}`}
    >
      {customize && (
        <div className="absolute right-2 top-2 z-10 flex items-center gap-1">
          <span
            aria-hidden
            title="Glisser le bloc pour le déplacer"
            className="inline-flex items-center justify-center h-7 w-7 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 shadow-sm"
          >
            <GripVertical size={14} />
          </span>
          <button
            onPointerDown={stop}
            onClick={onToggleSize}
            aria-label={size === "full" ? "Passer en demi-largeur" : "Passer en pleine largeur"}
            title={size === "full" ? "Demi-largeur (2 par ligne)" : "Pleine largeur"}
            className="hidden md:inline-flex items-center justify-center h-7 w-7 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-emerald-600 shadow-sm"
          >
            {size === "full" ? <Columns2 size={14} /> : <RectangleHorizontal size={14} />}
          </button>
          <button
            onPointerDown={stop}
            onClick={onRemove}
            aria-label="Retirer le bloc"
            title="Retirer ce bloc"
            className="inline-flex items-center justify-center h-7 w-7 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-600 shadow-sm"
          >
            <X size={14} />
          </button>
        </div>
      )}
      {children}
    </div>
  );
}

export default function StatsPage() {
  const { items, profiles, catalogue, now, projects, theme, negligences, nonConformites, me } = useApp();
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
  // Palette catégorielle validée (dataviz) + palette de statut réservée.
  const S = dark
    ? { blue: "#3987e5", orange: "#d95926", aqua: "#199e70" }
    : { blue: "#2a78d6", orange: "#eb6834", aqua: "#1baf7a" };
  const STATUS = { good: "#0ca30c", warning: "#fab219", critical: "#d03b3b" };
  const legendStyle = { fontSize: 11, color: dark ? "#c3c2b7" : "#52514e" };
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

  const lateByDuration = items.filter((i) => isLateByDuration(i, now)).length;
  const markedLate = items.filter((i) => i.markedLate && i.statut !== "Clôturé").length;
  const withDuration = items.filter((i) => i.dueDurationDays != null && i.statut !== "Clôturé").length;

  const conformiteSummary = (list: (Negligence | NonConformite)[]) => ({
    total: list.length,
    enAttente: list.filter((x) => x.status !== "Décision rendue" && x.status !== "Classée").length,
  });
  const negSum = conformiteSummary(negligences);
  const ncSum = conformiteSummary(nonConformites);

  // Activité mensuelle : suivis créés vs clôturés (6 derniers mois).
  const activite = (() => {
    const keyOf = (dt: Date) => `${dt.getFullYear()}-${dt.getMonth()}`;
    const buckets: { key: string; name: string; crees: number; clotures: number }[] = [];
    for (let k = 5; k >= 0; k--) {
      const d = new Date(now.getFullYear(), now.getMonth() - k, 1);
      buckets.push({ key: keyOf(d), name: d.toLocaleDateString("fr-FR", { month: "short" }), crees: 0, clotures: 0 });
    }
    const idx = new Map(buckets.map((b, i) => [b.key, i]));
    for (const it of items) {
      const ci = idx.get(keyOf(it.dateCreation));
      if (ci !== undefined) buckets[ci].crees++;
      for (const e of it.timeline) {
        if (e.kind !== "cloture") continue;
        const ei = idx.get(keyOf(e.date));
        if (ei !== undefined) buckets[ei].clotures++;
      }
    }
    return buckets;
  })();

  const conformiteChart = NEGLIGENCE_GRAVITES.map((g) => ({
    name: g,
    negligences: negligences.filter((x) => x.gravite === g).length,
    nonConformites: nonConformites.filter((x) => x.gravite === g).length,
  }));

  /* ---------- Registre des blocs du tableau de bord ---------- */
  const blocks: { id: string; title: string; node: ReactNode }[] = [
    {
      id: "exports",
      title: "Exports",
      node: (
        <div className={`${box} flex items-center justify-between gap-3 flex-wrap`}>
          <div className="text-[12.5px] text-slate-600 dark:text-slate-300">
            <span className="font-semibold text-slate-800 dark:text-slate-100">Exports</span> — données brutes pour Excel / reporting.
          </div>
          <ExportSuivis />
        </div>
      ),
    },
    {
      id: "duree",
      title: "Retard sur durée de traitement",
      node: (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className={box}>
            <div className="text-2xl font-semibold text-orange-600">{lateByDuration}</div>
            <div className="text-[12px] text-slate-500">En retard (durée dépassée)</div>
          </div>
          <div className={box}>
            <div className="text-2xl font-semibold text-slate-800 dark:text-slate-100">{markedLate}</div>
            <div className="text-[12px] text-slate-500">Marqués « en retard »</div>
          </div>
          <div className={box}>
            <div className="text-2xl font-semibold text-slate-800 dark:text-slate-100">{withDuration}</div>
            <div className="text-[12px] text-slate-500">Suivis avec durée cible</div>
          </div>
        </div>
      ),
    },
    {
      id: "activite",
      title: "Activité — créés vs clôturés",
      node: (
        <div className={box}>
          <div className="text-[13px] font-semibold text-slate-700 dark:text-slate-200 mb-3">
            Activité — suivis créés vs clôturés (6 derniers mois)
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={activite} margin={{ top: 4, right: 8, left: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="gCrees" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={S.blue} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={S.blue} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gClotures" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={S.aqua} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={S.aqua} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={grid} />
              <XAxis dataKey="name" tick={tick} tickLine={false} axisLine={{ stroke: grid }} />
              <YAxis tick={tick} allowDecimals={false} tickLine={false} axisLine={false} width={38} />
              <Tooltip {...tip} />
              <Legend wrapperStyle={legendStyle} iconType="plainline" />
              <Area type="monotone" dataKey="crees" name="Créés" stroke={S.blue} strokeWidth={2} fill="url(#gCrees)" dot={{ r: 3, fill: S.blue }} activeDot={{ r: 5 }} />
              <Area type="monotone" dataKey="clotures" name="Clôturés" stroke={S.aqua} strokeWidth={2} fill="url(#gClotures)" dot={{ r: 3, fill: S.aqua }} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ),
    },
    {
      id: "conformite",
      title: "Conformité par gravité",
      node: (
        <div className={box}>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">Conformité — par gravité</div>
            <div className="flex items-center gap-4 text-[12px]">
              <span className="text-slate-500">Négligences : <b className="text-slate-800 dark:text-slate-100">{negSum.total}</b> · {negSum.enAttente} en attente</span>
              <span className="text-slate-500">Non-conformités : <b className="text-slate-800 dark:text-slate-100">{ncSum.total}</b> · {ncSum.enAttente} en attente</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={conformiteChart} margin={{ top: 4, right: 8, left: 4, bottom: 0 }} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={grid} />
              <XAxis dataKey="name" tick={tick} tickLine={false} axisLine={{ stroke: grid }} />
              <YAxis tick={tick} allowDecimals={false} tickLine={false} axisLine={false} width={38} />
              <Tooltip {...tip} />
              <Legend wrapperStyle={legendStyle} />
              <Bar dataKey="negligences" name="Négligences" fill={S.blue} radius={[4, 4, 0, 0]} />
              <Bar dataKey="nonConformites" name="Non-conformités" fill={S.orange} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ),
    },
    {
      id: "volume-metier",
      title: "Volume par métier",
      node: (
        <div className={box}>
          <div className="text-[13px] font-semibold text-slate-700 mb-3">Volume par métier</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={parMetier}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={grid} />
              <XAxis dataKey="name" tick={tick} tickLine={false} axisLine={{ stroke: grid }} />
              <YAxis tick={tick} allowDecimals={false} tickLine={false} axisLine={false} width={38} />
              <Tooltip {...tip} cursor={{ fill: dark ? "#ffffff10" : "#00000008" }} />
              <Bar dataKey="v" name="Suivis" radius={[4, 4, 0, 0]} fill={S.aqua} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ),
    },
    {
      id: "taux-reponse",
      title: "Taux de réponse par agent",
      node: (
        <div className={box}>
          <div className="text-[13px] font-semibold text-slate-700 mb-3">Taux de réponse par agent (%)</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={parAgent}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={grid} />
              <XAxis dataKey="name" tick={tick} tickLine={false} axisLine={{ stroke: grid }} />
              <YAxis tick={tick} domain={[0, 100]} tickLine={false} axisLine={false} width={38} />
              <Tooltip {...tip} cursor={{ fill: dark ? "#ffffff10" : "#00000008" }} />
              <Bar dataKey="taux" name="Taux de réponse" radius={[4, 4, 0, 0]}>
                {parAgent.map((e, i) => (
                  <Cell key={i} fill={e.taux >= 60 ? STATUS.good : e.taux >= 30 ? STATUS.warning : STATUS.critical} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm" style={{ background: STATUS.good }} /> ≥ 60 %</span>
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm" style={{ background: STATUS.warning }} /> 30–59 %</span>
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-sm" style={{ background: STATUS.critical }} /> &lt; 30 %</span>
          </div>
        </div>
      ),
    },
    {
      id: "relances",
      title: "Relances par agent",
      node: (
        <div className={box}>
          <div className="text-[13px] font-semibold text-slate-700 mb-3">Relances effectuées par agent</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={relances}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={grid} />
              <XAxis dataKey="name" tick={tick} tickLine={false} axisLine={{ stroke: grid }} />
              <YAxis tick={tick} allowDecimals={false} tickLine={false} axisLine={false} width={38} />
              <Tooltip {...tip} cursor={{ fill: dark ? "#ffffff10" : "#00000008" }} />
              <Bar dataKey="v" name="Relances" radius={[4, 4, 0, 0]} fill={S.blue} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ),
    },
    {
      id: "statuts",
      title: "Répartition des statuts",
      node: (
        <div className={box}>
          <div className="text-[13px] font-semibold text-slate-700 mb-3">Répartition des statuts</div>
          <div className="space-y-2 mt-2">
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
      ),
    },
    {
      id: "par-emetteur",
      title: "État par émetteur (agent)",
      node: (
        <div className={box}>
          <div className="text-[13px] font-semibold text-slate-700 mb-3">État par émetteur (agent responsable)</div>
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
      ),
    },
    {
      id: "par-service",
      title: "État par service destinataire",
      node: (
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
      ),
    },
    {
      id: "par-destinataire",
      title: "État par destinataire",
      node: (
        <div className={box}>
          <div className="text-[13px] font-semibold text-slate-700 mb-1">État par destinataire (nom)</div>
          <p className="text-[11px] text-slate-400 mb-3">Trié par blocages et retards — met en évidence les tiers dont on attend une action.</p>
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
      ),
    },
    {
      id: "criticite",
      title: "Par criticité",
      node: (
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
      ),
    },
    {
      id: "appreciation",
      title: "Par appréciation du motif",
      node: (
        <div className={box}>
          <div className="text-[13px] font-semibold text-slate-700 mb-3">Par appréciation du motif (suivis de mail à risque)</div>
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
      ),
    },
    {
      id: "projets",
      title: "Projets",
      node: (
        <div className={box}>
          <div className="text-[13px] font-semibold text-slate-700 mb-3">Projets</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3 text-center">
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
      ),
    },
    {
      id: "causes",
      title: "Causes de blocage",
      node: (
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
      ),
    },
  ];

  const HALF = new Set(["volume-metier", "taux-reponse", "relances", "statuts", "criticite", "appreciation", "projets", "causes"]);
  const defaultSizeOf = (id: string): BlockSize => (HALF.has(id) ? "half" : "full");
  const DEFAULT_LAYOUT: LayoutItem[] = blocks.map((b) => ({ id: b.id, size: defaultSizeOf(b.id) }));
  const byId = new Map(blocks.map((b) => [b.id, b]));
  const storageKey = `cap:stats-layout:${me.id}`;

  const [layout, setLayout] = useState<LayoutItem[]>(DEFAULT_LAYOUT);
  const [customize, setCustomize] = useState(false);

  // Hydratation (client). Accepte l'ancien format (liste d'ids) et le nouveau.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const known = new Set(blocks.map((b) => b.id));
        const parsed = JSON.parse(saved);
        let items: LayoutItem[] = [];
        if (Array.isArray(parsed) && parsed.length) {
          if (typeof parsed[0] === "string") {
            items = (parsed as string[]).filter((id) => known.has(id)).map((id) => ({ id, size: defaultSizeOf(id) }));
          } else {
            items = (parsed as LayoutItem[])
              .filter((x) => x && known.has(x.id))
              .map((x) => ({ id: x.id, size: x.size === "half" ? "half" : "full" }));
          }
        }
        if (items.length) setLayout(items);
      }
    } catch {
      /* localStorage indisponible : disposition par défaut */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const persist = (next: LayoutItem[]) => {
    setLayout(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (over && active.id !== over.id) {
      const oldI = layout.findIndex((l) => l.id === active.id);
      const newI = layout.findIndex((l) => l.id === over.id);
      if (oldI >= 0 && newI >= 0) persist(arrayMove(layout, oldI, newI));
    }
  };
  const toggleSize = (id: string) =>
    persist(layout.map((l) => (l.id === id ? { ...l, size: l.size === "full" ? "half" : "full" } : l)));
  const addBlock = (id: string) => persist([...layout, { id, size: defaultSizeOf(id) }]);
  const removeBlock = (id: string) => persist(layout.filter((l) => l.id !== id));

  const ids = layout.map((l) => l.id);
  const available = blocks.filter((b) => !ids.includes(b.id));

  return (
    <div className="space-y-6 animate-float">
      <PageHero
        kicker="Pilotage"
        icon={BarChart3}
        title="Statistiques"
        subtitle="Le registre, en vivant. Compose ton tableau de bord : réorganise, redimensionne, retire ou ajoute des blocs."
        right={
          <div className="flex items-center gap-2 flex-wrap">
            {customize && (
              <>
                <select
                  value=""
                  onChange={(e) => e.target.value && addBlock(e.target.value)}
                  aria-label="Ajouter un bloc"
                  className="text-[12px] border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-2 bg-white dark:bg-slate-900"
                  disabled={available.length === 0}
                >
                  <option value="">{available.length ? "+ Ajouter un bloc" : "Tous les blocs affichés"}</option>
                  {available.map((b) => (
                    <option key={b.id} value={b.id}>{b.title}</option>
                  ))}
                </select>
                <button
                  onClick={() => persist(DEFAULT_LAYOUT)}
                  className="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <RotateCcw size={13} /> Réinitialiser
                </button>
              </>
            )}
            <button
              onClick={() => setCustomize((v) => !v)}
              className={`inline-flex items-center gap-1.5 text-[12px] font-medium rounded-lg px-2.5 py-2 border ${
                customize
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              {customize ? <Plus size={14} className="rotate-45" /> : <Settings2 size={14} />}
              {customize ? "Terminer" : "Personnaliser"}
            </button>
            <RapportPdf />
          </div>
        }
      />

      {customize && (
        <div className="text-[12px] text-slate-500 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2">
          Glisse un bloc (n&apos;importe où dessus) pour le déplacer. L&apos;icône <Columns2 size={12} className="inline align-text-bottom" /> le passe en demi-largeur (deux par ligne), la croix le retire. Menu pour en (r)ajouter. Disposition enregistrée sur cet appareil.
        </div>
      )}

      {layout.length === 0 ? (
        <div className={`${box} text-center text-[13px] text-slate-400 py-10`}>
          Aucun bloc affiché. Ajoute-en via « Personnaliser ».
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={ids} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {layout.map((l) => {
                const b = byId.get(l.id);
                if (!b) return null;
                return (
                  <SortableBlock
                    key={l.id}
                    id={l.id}
                    size={l.size}
                    customize={customize}
                    onRemove={() => removeBlock(l.id)}
                    onToggleSize={() => toggleSize(l.id)}
                  >
                    {b.node}
                  </SortableBlock>
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

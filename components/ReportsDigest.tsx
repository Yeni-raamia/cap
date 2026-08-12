"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FileText, Printer } from "lucide-react";
import { fmt, reportKindDef, type Report } from "@/lib/domain";
import { DEFAULT_PERIOD, matchesPeriod, periodLabel, type PeriodFilter as Period } from "@/lib/period";
import { useApp } from "./app-context";
import { Avatar, Card } from "./atoms";
import { EmptyState } from "./EmptyState";
import { PeriodFilter } from "./PeriodFilter";
import { ReportPrint } from "./ReportPrint";

/**
 * Recueil de tous les comptes rendus — toutes tâches et tous projets
 * confondus — filtrable par personne et par période, et imprimable d'un
 * bloc : c'est le rapport hebdomadaire d'équipe.
 */
export function ReportsDigest() {
  const { reports, tasks, projects, profiles, me, now, profileById, setOpenTaskId } = useApp();

  const [person, setPerson] = useState("");
  const [kind, setKind] = useState("");
  const [period, setPeriod] = useState<Period>(DEFAULT_PERIOD);
  const [printing, setPrinting] = useState<Report[] | null>(null);

  useEffect(() => {
    if (!printing) return;
    const t = setTimeout(() => {
      window.print();
      setPrinting(null);
    }, 150);
    return () => clearTimeout(t);
  }, [printing]);

  // Le filtre de période porte sur la date de rédaction : « les comptes rendus
  // écrits cette semaine », ce que l'on cherche pour un point d'équipe.
  const filtered = useMemo(
    () =>
      reports.filter(
        (r) =>
          (!person || r.authorId === person) &&
          (!kind || r.kind === kind) &&
          matchesPeriod(r.createdAt, false, period, now)
      ),
    [reports, person, kind, period, now]
  );

  const labelOf = (r: Report): string =>
    r.refType === "project"
      ? projects.find((p) => p.id === r.refId)?.name ?? "Projet supprimé"
      : tasks.find((t) => t.id === r.refId)?.title ?? "Tâche supprimée";

  const digestLabel =
    (person ? profileById(person).nom : "Toute l'équipe") + " · " + periodLabel(period, now);

  return (
    <div className="space-y-3">
      <Card className="p-3">
        <div className="flex items-center gap-2 flex-wrap">
          <FileText size={15} className="text-sky-500" />
          <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">Recueil des comptes rendus</span>
          <select
            value={person}
            onChange={(e) => setPerson(e.target.value)}
            aria-label="Filtrer par auteur"
            className="text-[12px] border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 bg-white dark:bg-slate-900 ml-auto"
          >
            <option value="">Toute l&apos;équipe</option>
            <option value={me.id}>Moi</option>
            {profiles.filter((p) => p.id !== me.id).map((p) => (
              <option key={p.id} value={p.id}>{p.nom}</option>
            ))}
          </select>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            aria-label="Filtrer par type"
            className="text-[12px] border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 bg-white dark:bg-slate-900"
          >
            <option value="">Tous types</option>
            <option value="periodique">Points d&apos;avancement</option>
            <option value="cloture">Clôtures</option>
          </select>
          <button
            onClick={() => setPrinting(filtered)}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-1 text-[12px] font-medium text-slate-600 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 disabled:opacity-40 rounded-lg px-2.5 py-1.5"
          >
            <Printer size={13} /> Imprimer le recueil
          </button>
        </div>
        <PeriodFilter value={period} onChange={setPeriod} className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800" />
      </Card>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Aucun compte rendu"
            subtitle="Les points d'avancement et bilans rédigés sur les tâches et les projets se retrouvent ici."
            compact
          />
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((r) => {
              const def = reportKindDef(r.kind);
              const author = r.authorId ? profileById(r.authorId) : null;
              const label = labelOf(r);
              const inner = (
                <div className="flex items-start gap-2.5 px-4 py-2.5 w-full text-left">
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 mt-0.5 ${
                      r.kind === "cloture" ? "bg-emerald-100 text-emerald-700" : "bg-sky-100 text-sky-700"
                    }`}
                  >
                    {def.label}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] text-slate-800 dark:text-slate-100 truncate">{r.title || def.label}</div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 flex-wrap">
                      <span className={r.refType === "project" ? "text-emerald-700" : "text-violet-700"}>{label}</span>
                      {author && (
                        <span className="inline-flex items-center gap-1">
                          · <Avatar init={author.init} size="h-4 w-4" /> {author.nom}
                        </span>
                      )}
                      <span>· {fmt(r.createdAt)}</span>
                      <span className="font-mono">· {r.progress} %</span>
                    </div>
                    {r.done.trim() && (
                      <p className="text-[12px] text-slate-600 dark:text-slate-300 mt-1 line-clamp-2 whitespace-pre-wrap">{r.done}</p>
                    )}
                  </div>
                </div>
              );
              return r.refType === "project" ? (
                <Link key={r.id} href={`/projets/${r.refId}`} className="block hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  {inner}
                </Link>
              ) : (
                <button
                  key={r.id}
                  onClick={() => setOpenTaskId(r.refId)}
                  className="w-full hover:bg-slate-50 dark:hover:bg-slate-800/40"
                >
                  {inner}
                </button>
              );
            })}
          </div>
        )}
      </Card>

      {printing && <ReportPrint reports={printing} refLabel={digestLabel} />}
    </div>
  );
}

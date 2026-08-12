"use client";

import { useEffect, useState } from "react";
import { FileText, Pencil, Plus, Printer } from "lucide-react";
import { fmt, reportKindDef, type Report, type ReportKind, type ReportRefType } from "@/lib/domain";
import { useApp } from "./app-context";
import { Avatar, Card } from "./atoms";
import { ReportModal } from "./ReportModal";
import { ReportPrint } from "./ReportPrint";

/**
 * Comptes rendus d'une tâche ou d'un projet : liste chronologique, rédaction,
 * édition et export imprimable (un compte rendu, ou le recueil complet).
 */
export function ReportsSection({
  refType,
  refId,
  refLabel,
  canWrite,
  compact = false,
}: {
  refType: ReportRefType;
  refId: string;
  refLabel: string;
  canWrite: boolean;
  /** Version resserrée (dans une fiche modale). */
  compact?: boolean;
}) {
  const { reportsFor, profileById, me } = useApp();
  const reports = reportsFor(refType, refId);

  const [creating, setCreating] = useState<ReportKind | null>(null);
  const [editing, setEditing] = useState<Report | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [printing, setPrinting] = useState<Report[] | null>(null);

  // L'impression a besoin d'un rendu avant l'appel : on laisse passer une frame.
  useEffect(() => {
    if (!printing) return;
    const t = setTimeout(() => {
      window.print();
      setPrinting(null);
    }, 150);
    return () => clearTimeout(t);
  }, [printing]);

  const canEdit = (r: Report) => r.authorId === me.id || ["manager", "directeur", "admin"].includes(me.role);

  const body = (
    <>
      {reports.length === 0 ? (
        <div className={`text-center text-[13px] text-slate-400 ${compact ? "py-3" : "p-6"}`}>
          Aucun compte rendu. Rédigez un point d&apos;avancement, ou le bilan de clôture.
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {reports.map((r) => {
            const def = reportKindDef(r.kind);
            const author = r.authorId ? profileById(r.authorId) : null;
            const open = expanded === r.id;
            return (
              <div key={r.id} className="px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <button onClick={() => setExpanded(open ? null : r.id)} className="flex-1 min-w-0 text-left group">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${
                          r.kind === "cloture"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-sky-100 text-sky-700"
                        }`}
                      >
                        {def.label}
                      </span>
                      <span className="text-[13px] text-slate-800 dark:text-slate-100 truncate group-hover:text-sky-700">
                        {r.title || def.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 flex-wrap mt-0.5">
                      {author && (
                        <span className="inline-flex items-center gap-1">
                          <Avatar init={author.init} size="h-4 w-4" /> {author.nom}
                        </span>
                      )}
                      <span>· {fmt(r.createdAt)}</span>
                      {r.periodStart && r.periodEnd && <span>· du {fmt(r.periodStart)} au {fmt(r.periodEnd)}</span>}
                      <span className="font-mono">· {r.progress} %</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setPrinting([r])}
                    title="Imprimer / exporter en PDF"
                    aria-label="Imprimer ce compte rendu"
                    className="text-slate-300 hover:text-slate-600"
                  >
                    <Printer size={14} />
                  </button>
                  {canEdit(r) && (
                    <button
                      onClick={() => setEditing(r)}
                      title="Modifier"
                      aria-label="Modifier ce compte rendu"
                      className="text-slate-300 hover:text-emerald-600"
                    >
                      <Pencil size={14} />
                    </button>
                  )}
                </div>

                {open && (
                  <div className="mt-2 pl-1 space-y-2 border-l-2 border-slate-100 dark:border-slate-800">
                    <Field label={def.sections.done} body={r.done} />
                    <Field label={def.sections.difficulties} body={r.difficulties} />
                    <Field label={def.sections.nextSteps} body={r.nextSteps} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );

  return (
    <div>
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <FileText size={15} className="text-sky-500" />
        <h2 className={`${compact ? "text-[11px]" : "text-[13px]"} font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wide`}>
          Comptes rendus
        </h2>
        {reports.length > 0 && (
          <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">{reports.length}</span>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          {reports.length > 1 && (
            <button
              onClick={() => setPrinting(reports)}
              className="inline-flex items-center gap-1 text-[12px] font-medium text-slate-600 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 rounded-lg px-2.5 py-1.5"
            >
              <Printer size={13} /> Tout imprimer
            </button>
          )}
          {canWrite && (
            <>
              <button
                onClick={() => setCreating("periodique")}
                className="inline-flex items-center gap-1 text-[12px] font-medium text-sky-700 border border-sky-200 hover:bg-sky-50 rounded-lg px-2.5 py-1.5"
              >
                <Plus size={14} /> Point d&apos;avancement
              </button>
              <button
                onClick={() => setCreating("cloture")}
                title="Bilan de fin : résultat, écarts, enseignements"
                className="inline-flex items-center gap-1 text-[12px] font-medium text-emerald-700 border border-emerald-200 hover:bg-emerald-50 rounded-lg px-2.5 py-1.5"
              >
                <Plus size={14} /> Clôture
              </button>
            </>
          )}
        </div>
      </div>

      {compact ? <div className="border border-slate-200 dark:border-slate-800 rounded-xl">{body}</div> : <Card>{body}</Card>}

      {(creating || editing) && (
        <ReportModal
          report={editing}
          refType={refType}
          refId={refId}
          refLabel={refLabel}
          defaultKind={creating ?? "periodique"}
          onClose={() => {
            setCreating(null);
            setEditing(null);
          }}
        />
      )}

      {printing && <ReportPrint reports={printing} refLabel={refLabel} />}
    </div>
  );
}

function Field({ label, body }: { label: string; body: string }) {
  if (!body.trim()) return null;
  return (
    <div className="pl-2.5">
      <div className="text-[10.5px] font-medium text-slate-400 uppercase tracking-wide">{label}</div>
      <p className="text-[12.5px] text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{body}</p>
    </div>
  );
}

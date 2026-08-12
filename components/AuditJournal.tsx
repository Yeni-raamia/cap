"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Loader2, Search, ShieldCheck } from "lucide-react";
import { ACTION_LABEL, actionLabel } from "@/lib/audit-labels";
import { downloadCsv } from "@/lib/export";
import { toDayInput } from "@/lib/period";

interface Entry {
  id: string;
  actorId: string | null;
  actorNom: string;
  action: string;
  detail: string;
  createdAt: string; // ISO
}

const PAGE = 100;
const fmt = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });

/** Journal d'audit filtrable (type, membre, recherche, sécurité) + export CSV. */
export function AuditJournal({ members }: { members: { id: string; nom: string }[] }) {
  const [action, setAction] = useState("");
  const [actorId, setActorId] = useState("");
  const [securityOnly, setSecurityOnly] = useState(false);
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Types d'événements proposés, triés par libellé.
  const actionOptions = useMemo(
    () => Object.keys(ACTION_LABEL).map((a) => ({ a, label: actionLabel(a) })).sort((x, y) => x.label.localeCompare(y.label)),
    []
  );

  const buildQuery = (lim: number) => {
    const p = new URLSearchParams();
    if (action) p.set("action", action);
    if (actorId) p.set("actorId", actorId);
    if (securityOnly) p.set("security", "1");
    if (q.trim()) p.set("q", q.trim());
    p.set("limit", String(lim));
    return p.toString();
  };

  // Rechargement à chaque changement de filtre (recherche débouncée).
  useEffect(() => {
    let alive = true;
    setLoading(true);
    const t = setTimeout(() => {
      fetch(`/api/admin/audit?${buildQuery(limit)}`)
        .then((r) => (r.ok ? r.json() : { entries: [] }))
        .then((d) => { if (alive) setEntries(d.entries || []); })
        .catch(() => { if (alive) setEntries([]); })
        .finally(() => { if (alive) setLoading(false); });
    }, q.trim() ? 300 : 0);
    return () => { alive = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action, actorId, securityOnly, q, limit]);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const r = await fetch(`/api/admin/audit?${buildQuery(10000)}`);
      const d = r.ok ? await r.json() : { entries: [] };
      const rows: (string | number)[][] = [
        ["Date", "Type", "Détail", "Acteur", "Code"],
        ...(d.entries as Entry[]).map((e) => [fmt(e.createdAt), actionLabel(e.action), e.detail, e.actorNom, e.action]),
      ];
      const stamp = toDayInput(new Date());
      downloadCsv(`journal-audit-${stamp}.csv`, rows);
    } finally {
      setExporting(false);
    }
  };

  const hasFilter = action || actorId || securityOnly || q.trim();
  const selectCls =
    "text-[12px] border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-emerald-400/40";

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <div className="text-[13px] font-semibold text-slate-700">Journal d&apos;audit</div>
        <button
          onClick={exportCsv}
          disabled={exporting}
          className="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
        >
          {exporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />} Exporter CSV
        </button>
      </div>

      {/* Filtres */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="relative">
          <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setLimit(PAGE); }}
            placeholder="Rechercher…"
            className={`${selectCls} pl-7 w-44`}
          />
        </div>
        <select value={action} onChange={(e) => { setAction(e.target.value); setLimit(PAGE); }} className={selectCls}>
          <option value="">Tous les types</option>
          {actionOptions.map(({ a, label }) => (
            <option key={a} value={a}>{label}</option>
          ))}
        </select>
        <select value={actorId} onChange={(e) => { setActorId(e.target.value); setLimit(PAGE); }} className={selectCls}>
          <option value="">Tous les membres</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>{m.nom}</option>
          ))}
        </select>
        <button
          onClick={() => { setSecurityOnly((v) => !v); setLimit(PAGE); }}
          className={`inline-flex items-center gap-1 text-[12px] rounded-lg px-2.5 py-1.5 border font-medium ${
            securityOnly ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/30" : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500"
          }`}
        >
          <ShieldCheck size={13} /> Sécurité
        </button>
        {hasFilter && (
          <button
            onClick={() => { setAction(""); setActorId(""); setSecurityOnly(false); setQ(""); setLimit(PAGE); }}
            className="text-[12px] text-slate-500 hover:text-slate-700 underline"
          >
            Réinitialiser
          </button>
        )}
      </div>

      {/* Liste */}
      {loading && entries.length === 0 ? (
        <div className="text-[13px] text-slate-400 text-center py-6 flex items-center justify-center gap-2">
          <Loader2 size={14} className="animate-spin" /> Chargement…
        </div>
      ) : entries.length === 0 ? (
        <div className="text-[13px] text-slate-400 text-center py-6">Aucun événement pour ces critères.</div>
      ) : (
        <div className={`divide-y divide-slate-100 dark:divide-slate-800 ${loading ? "opacity-60" : ""}`}>
          {entries.map((a) => (
            <div key={a.id} className="flex items-center gap-3 py-2 text-[12px]">
              <span className="text-slate-400 w-28 shrink-0">{fmt(a.createdAt)}</span>
              <span className={`font-medium w-44 shrink-0 ${a.action === "login_failed" ? "text-rose-600" : "text-slate-700 dark:text-slate-200"}`}>
                {actionLabel(a.action)}
              </span>
              <span className="text-slate-600 dark:text-slate-300 flex-1 min-w-0 truncate">{a.detail}</span>
              <span className="text-slate-400 shrink-0">{a.actorNom}</span>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {entries.length >= limit && (
        <div className="text-center mt-3">
          <button
            onClick={() => setLimit((l) => l + PAGE)}
            className="text-[12px] font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
          >
            Charger plus
          </button>
        </div>
      )}
    </div>
  );
}

"use client";

import { FileSpreadsheet } from "lucide-react";
import { daysBetween } from "@/lib/domain";
import { downloadCsv } from "@/lib/export";
import { useApp } from "./app-context";

const dateFr = (d: Date) => new Date(d).toLocaleDateString("fr-FR");
const SLA_LABEL: Record<string, string> = {
  none: "OK",
  relance: "À relancer",
  escalade: "En retard",
  bloque: "Bloqué",
};

/** Boutons d'export CSV (Excel) : suivis détaillés et synthèse par service. */
export function ExportSuivis() {
  const { items, catalogue, profileById, now, rs } = useApp();

  const stamp = dateFr(now).replace(/\//g, "-");

  const exportSuivis = () => {
    const header = [
      "Référence", "Métier", "Type", "Objet", "Responsable", "Statut", "Priorité",
      "Service destinataire", "Destinataire", "Relances", "Jours d'attente",
      "État SLA", "Réponse reçue", "Créé le", "Mis à jour le",
    ];
    const rows = items.map((i) => {
      const dest = i.personnes.find((p) => p.kind === "destinataire") ?? i.personnes[0];
      const aReponse = i.timeline.some((e) => e.kind === "reponse");
      return [
        i.ref,
        catalogue.metiers[i.metier]?.label ?? i.metier,
        i.type,
        i.objet,
        profileById(i.ownerId).nom,
        i.statut,
        i.priorite,
        dest?.service ?? "",
        dest?.name ?? "",
        i.relancesCount,
        daysBetween(i.dateMaj, now),
        SLA_LABEL[rs(i).level] ?? rs(i).level,
        aReponse ? "Oui" : "Non",
        dateFr(i.dateCreation),
        dateFr(i.dateMaj),
      ];
    });
    downloadCsv(`cap-suivis-${stamp}.csv`, [header, ...rows]);
  };

  const exportParService = () => {
    // Réconciliation par service/prestataire : volumes, en cours, retards, taux de réponse.
    const map = new Map<string, { total: number; actifs: number; clot: number; retard: number; rep: number }>();
    for (const i of items) {
      const dest = i.personnes.find((p) => p.kind === "destinataire") ?? i.personnes[0];
      const key = dest?.service || "— Non renseigné";
      const s = map.get(key) ?? { total: 0, actifs: 0, clot: 0, retard: 0, rep: 0 };
      s.total++;
      if (i.statut === "Clôturé") s.clot++;
      else s.actifs++;
      if (rs(i).level === "escalade") s.retard++;
      if (i.timeline.some((e) => e.kind === "reponse")) s.rep++;
      map.set(key, s);
    }
    const header = ["Service / prestataire", "Total", "En cours", "Clôturés", "En retard", "Taux de réponse (%)"];
    const rows = [...map.entries()]
      .sort((a, b) => b[1].total - a[1].total)
      .map(([service, s]) => [
        service, s.total, s.actifs, s.clot, s.retard,
        s.total ? Math.round((s.rep / s.total) * 100) : 0,
      ]);
    downloadCsv(`cap-synthese-services-${stamp}.csv`, [header, ...rows]);
  };

  const btn =
    "inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800";

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button onClick={exportSuivis} className={btn}>
        <FileSpreadsheet size={14} className="text-emerald-600" /> Exporter les suivis (CSV)
      </button>
      <button onClick={exportParService} className={btn}>
        <FileSpreadsheet size={14} className="text-sky-600" /> Synthèse par service (CSV)
      </button>
    </div>
  );
}

/* ==================================================================
 *  lib/grc/kpis.ts — Indicateurs de pilotage du module GRC.
 *  Agrège tous les onglets pour la revue de direction (ISO 27001 §9.3).
 * ================================================================== */
import {
  controlConformity,
  controlGaps,
  isCapaLate,
  isIncidentOpen,
  isPlanTestStale,
  piaOutstanding,
  policyCoverage,
  riskResidualLevel,
  type Asset,
  type CapaAction,
  type ContinuityPlan,
  type ControlAssessment,
  type FieldControl,
  type Incident,
  type Mission,
  type Negligence,
  type NonConformite,
  type Policy,
  type ProcessingActivity,
  type Risk,
} from "@/lib/domain";
import { FRAMEWORKS } from "@/lib/grc/frameworks";
import { scoreFramework } from "@/lib/grc/scoring";
import { computeJewels, isJewel } from "@/lib/grc/jewels";

export interface GrcKpiInput {
  risks: Risk[];
  controlAssessments: ControlAssessment[];
  fieldControls: FieldControl[];
  capaActions: CapaAction[];
  incidents: Incident[];
  processing: ProcessingActivity[];
  policies: Policy[];
  continuityPlans: ContinuityPlan[];
  missions: Mission[];
  assets: Asset[];
  /** Registres d'écarts (onglet « Écarts & manquements ») — facultatifs. */
  nonConformites?: NonConformite[];
  negligences?: Negligence[];
  now: Date;
}

/** Indicateurs GRC synthétiques (0 par défaut) — sérialisables pour un instantané. */
export interface GrcKpis {
  conformite: number; // % moyen sur les référentiels
  risquesOuverts: number;
  risquesCritiques: number; // résiduel Critique/Élevé, ouverts
  risquesAcceptes: number;
  controlesRealises: number;
  ecartsOuverts: number;
  tauxConformiteControles: number; // % moyen
  capaOuvertes: number;
  capaEnRetard: number;
  incidentsOuverts: number;
  incidentsCritiques: number;
  violationsDonnees: number;
  traitements: number;
  aipdARealiser: number;
  politiquesEnVigueur: number;
  applicabilitePolitiques: number; // %
  continuiteATester: number;
  joyauxPrioritaires: number;
  nonConformitesOuvertes: number;
  negligencesOuvertes: number;
  /** Écarts graves ou critiques, tous registres confondus. */
  manquementsGraves: number;
}

const REALISED = new Set(["Réalisé", "Clôturé"]);

export function computeGrcKpis(x: GrcKpiInput): GrcKpis {
  // Conformité : moyenne des scores par référentiel (comme le tableau de bord).
  const frameworkScores = FRAMEWORKS.map((f) => {
    const byCode = new Map<string, ControlAssessment>();
    x.controlAssessments.filter((a) => a.frameworkId === f.id).forEach((a) => byCode.set(a.controlCode, a));
    return scoreFramework(f, byCode).conformity;
  });
  const conformite = frameworkScores.length ? Math.round(frameworkScores.reduce((s, v) => s + v, 0) / frameworkScores.length) : 0;

  const openRisks = x.risks.filter((r) => r.status !== "Clôturé");
  const risquesCritiques = openRisks.filter((r) => ["Critique", "Élevé"].includes(riskResidualLevel(r))).length;
  const risquesAcceptes = x.risks.filter((r) => r.acceptedBy).length;

  const controlesRealises = x.fieldControls.filter((c) => REALISED.has(c.status)).length;
  const ecartsOuverts = x.fieldControls.reduce((n, c) => n + controlGaps(c).length, 0);
  const confControls = x.fieldControls.filter((c) => REALISED.has(c.status)).map((c) => controlConformity(c)).filter((v) => v > 0);
  const tauxConformiteControles = confControls.length ? Math.round(confControls.reduce((a, v) => a + v, 0) / confControls.length) : 0;

  const capaOuvertes = x.capaActions.filter((a) => a.status !== "Clôturée").length;
  const capaEnRetard = x.capaActions.filter((a) => isCapaLate(a, x.now)).length;

  const openInc = x.incidents.filter(isIncidentOpen);
  const politiquesEnVigueur = x.policies.filter((p) => p.status === "En vigueur");
  const covs = politiquesEnVigueur.map((p) => policyCoverage(p)).filter((c) => c.total > 0);
  const applicabilitePolitiques = covs.length ? Math.round(covs.reduce((a, c) => a + c.pct, 0) / covs.length) : 0;

  const jewels = computeJewels(x.assets, x.risks, x.fieldControls, x.missions).filter(isJewel);

  // Écarts : « ouvert » = ni décidé, ni classé (mêmes statuts dans les deux registres).
  const ncs = x.nonConformites ?? [];
  const negs = x.negligences ?? [];
  const enCours = (s: string) => s !== "Décision rendue" && s !== "Classée";
  const grave = (g: string) => g === "Grave" || g === "Critique";

  return {
    conformite,
    risquesOuverts: openRisks.length,
    risquesCritiques,
    risquesAcceptes,
    controlesRealises,
    ecartsOuverts,
    tauxConformiteControles,
    capaOuvertes,
    capaEnRetard,
    incidentsOuverts: openInc.length,
    incidentsCritiques: openInc.filter((i) => i.severity === "Critique").length,
    violationsDonnees: x.incidents.filter((i) => i.dataBreach).length,
    traitements: x.processing.length,
    aipdARealiser: x.processing.filter(piaOutstanding).length,
    politiquesEnVigueur: politiquesEnVigueur.length,
    applicabilitePolitiques,
    continuiteATester: x.continuityPlans.filter((p) => isPlanTestStale(p, x.now)).length,
    joyauxPrioritaires: jewels.filter((j) => j.band === "Prioritaire").length,
    nonConformitesOuvertes: ncs.filter((n) => enCours(n.status)).length,
    negligencesOuvertes: negs.filter((n) => enCours(n.status)).length,
    manquementsGraves: [...ncs, ...negs].filter((n) => grave(n.gravite)).length,
  };
}

/** Posture globale synthétique (0–100) : conformité pondérée par les points d'attention. */
export function grcPosture(k: GrcKpis): number {
  let score = k.conformite;
  score -= k.risquesCritiques * 4;
  score -= k.capaEnRetard * 3;
  score -= k.incidentsCritiques * 5;
  score -= k.aipdARealiser * 2;
  score -= k.continuiteATester * 2;
  // Un manquement grave non traité pèse sur la posture au même titre qu'un
  // écart de contrôle : c'est la même boucle d'amélioration (ISO 27001 §10.1).
  score -= k.manquementsGraves * 3;
  return Math.max(0, Math.min(100, Math.round(score)));
}

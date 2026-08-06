/* ==================================================================
 *  lib/grc/badges.ts — Badges « cyber » du module GRC.
 *
 *  Distinctions honorifiques calculées à partir de l'activité RÉELLE
 *  de l'équipe sur les données GRC (contrôles terrain, plan d'actions,
 *  risques, politiques, non-conformités, plan de travail). Aucune
 *  persistance : tout est dérivé, comme `computeGame`.
 * ================================================================== */
import {
  controlGaps,
  isCapaLate,
  riskLevel,
  type CapaAction,
  type FieldControl,
  type GrcPlanItem,
  type NonConformite,
  type Policy,
  type Risk,
} from "@/lib/domain";

export interface CyberBadge {
  id: string;
  label: string;
  icon: string;
  desc: string; // condition d'obtention
  earned: boolean;
  value: number; // avancement chiffré (compteur courant)
  target: number; // palier à atteindre (0 = badge non compteur)
}

export interface CyberBadgeData {
  fieldControls: FieldControl[];
  capaActions: CapaAction[];
  risks: Risk[];
  policies: Policy[];
  nonConformites: NonConformite[];
  planItems: GrcPlanItem[];
}

const REALISED = new Set(["Réalisé", "Clôturé"]);

/** Calcule les badges cyber d'un utilisateur (`userId`). */
export function computeCyberBadges(userId: string, data: CyberBadgeData, now: Date = new Date()): CyberBadge[] {
  const { fieldControls, capaActions, risks, policies, nonConformites, planItems } = data;

  // Contrôles terrain menés par l'utilisateur (contrôleur), réellement réalisés.
  const myControls = fieldControls.filter((c) => c.inspectorId === userId);
  const roundsDone = myControls.filter((c) => REALISED.has(c.status)).length;
  const gapsFound = myControls.reduce((n, c) => n + controlGaps(c).length, 0);
  const awarenessDone = myControls.filter((c) => REALISED.has(c.status) && (c.type === "Entretien" || c.type === "Test / exercice")).length;

  // Non-conformités traitées (décision rendue) à l'initiative de l'utilisateur.
  const ncResolved = nonConformites.filter((n) => n.createdBy === userId && n.status === "Décision rendue").length;

  // Risques : identification, et maîtrise (inhérent élevé/critique ramené au résiduel faible/moyen).
  const myRisks = risks.filter((r) => r.ownerId === userId);
  const risksIdentified = myRisks.length;
  const tamed = myRisks.filter((r) => {
    const inh = riskLevel(r.probability, r.impact);
    const res = riskLevel(r.residualProbability, r.residualImpact);
    return (inh === "Critique" || inh === "Élevé") && (res === "Faible" || res === "Moyen");
  }).length;

  // Politiques portées et en vigueur.
  const policiesLive = policies.filter((p) => p.ownerId === userId && p.status === "En vigueur").length;

  // Plan d'actions (CAPA) portées par l'utilisateur.
  const myCapa = capaActions.filter((a) => a.ownerId === userId);
  const capaClosed = myCapa.filter((a) => a.status === "Clôturée").length;
  const capaLate = myCapa.filter((a) => isCapaLate(a, now)).length;

  // Chantiers du plan de travail portés par l'utilisateur.
  const myPlans = planItems.filter((p) => p.ownerId === userId);
  const plansDone = myPlans.filter((p) => p.status === "Terminé").length;

  // Polyvalence : contribuer à plusieurs métiers GRC.
  const metiers = [roundsDone > 0, risksIdentified > 0, policiesLive > 0, capaClosed > 0, plansDone > 0].filter(Boolean).length;

  const counter = (id: string, label: string, icon: string, value: number, target: number, verb: string): CyberBadge => ({
    id, label, icon, value, target, earned: value >= target,
    desc: `${verb} (${Math.min(value, target)}/${target}).`,
  });

  return [
    counter("gardien", "Gardien", "🛡️", roundsDone, 5, "Réaliser 5 rondes / inspections"),
    counter("oeil-de-lynx", "Œil de lynx", "🕵️", gapsFound, 10, "Détecter 10 écarts sur le terrain"),
    counter("rempart", "Rempart", "🔒", ncResolved, 5, "Faire aboutir 5 non-conformités"),
    counter("chasseur", "Chasseur de risques", "🎯", risksIdentified, 10, "Identifier 10 risques au registre"),
    {
      id: "dompteur", label: "Dompteur", icon: "🐉", value: tamed, target: 1, earned: tamed >= 1,
      desc: "Ramener un risque élevé/critique à un résiduel maîtrisé.",
    },
    counter("sentinelle", "Sentinelle", "📢", awarenessDone, 5, "Mener 5 actions de sensibilisation (entretiens / tests)"),
    counter("gardien-politiques", "Gardien des politiques", "📜", policiesLive, 3, "Porter 3 politiques en vigueur"),
    counter("pompier", "Pompier", "🧯", capaClosed, 10, "Clôturer 10 actions correctives"),
    {
      id: "zero-faille", label: "Zéro faille", icon: "🏅", value: capaLate, target: 0,
      earned: capaLate === 0 && myCapa.length >= 5,
      desc: "Aucune action en retard (avec au moins 5 actions portées).",
    },
    {
      id: "cle-de-voute", label: "Clé de voûte", icon: "🔑", value: metiers, target: 4, earned: metiers >= 4,
      desc: `Contribuer à ≥ 4 métiers GRC (${metiers}/5).`,
    },
  ];
}

/** Nombre de badges obtenus (pour classement d'équipe). */
export const earnedCount = (badges: CyberBadge[]): number => badges.filter((b) => b.earned).length;

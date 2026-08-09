/* ==================================================================
 *  lib/domain.ts — Source de vérité du domaine métier (cf. §4)
 *  Catalogue, SLA, statuts, Fil, causes, parse d'objet, état de
 *  relance, scoring « culture juste ». Réutilisé partout.
 * ================================================================== */

/* ---------- Types ---------- */
export type Role = "agent" | "manager" | "directeur" | "admin" | "dsi";
export const ROLES: Role[] = ["agent", "manager", "directeur", "admin", "dsi"];

export type Statut =
  | "Brouillon"
  | "Envoyé"
  | "En attente"
  | "Relancé"
  | "En traitement"
  | "Bloqué"
  | "Clôturé";

export type Priorite = "Critique" | "Élevé" | "Moyenne";

export type PersonKind = "destinataire" | "copie" | "impliqué";

export type EventKind =
  | "creation"
  | "envoi"
  | "relance"
  | "reponse"
  | "statut"
  | "note"
  | "cloture"
  | "escalade";

export type Tone = "emerald" | "amber" | "rose" | "sky" | "violet" | "slate";

export interface Person {
  name: string;
  kind: PersonKind;
  /** Service du destinataire (Réseau, Systèmes, Prestataire…). */
  service?: string | null;
  /** Adresse e-mail (permet l'envoi réel des relances au destinataire). */
  email?: string | null;
}

/** Contact partagé (annuaire éditable par tous) — pré-remplit un destinataire. */
export interface Contact {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  service: string;
  fonction: string;
}

/** Nom affiché d'un contact : « Prénom Nom » (espaces compactés). */
export function contactDisplayName(c: { prenom?: string; nom?: string }): string {
  return `${c.prenom ?? ""} ${c.nom ?? ""}`.replace(/\s+/g, " ").trim();
}

export interface TimelineEvent {
  date: Date;
  kind: EventKind;
  label: string;
  author: string; // profile id
}

export interface Item {
  id: string;
  ref: string;
  metier: string; // code métier
  type: string; // code type
  objet: string;
  ownerId: string;
  statut: Statut;
  priorite: Priorite;
  personnes: Person[];
  pointsCles: string[];
  blocageCause: string | null;
  relancesCount: number;
  dateCreation: Date;
  dateMaj: Date;
  /** Date de relance planifiée par l'utilisateur (calendrier), ou null. */
  dateRelancePrevue: Date | null;
  /** Projet rattaché (ou null). Auto-renseigné pour les suivis de métier PRJ. */
  projectId: string | null;
  /** Appréciation du motif de blocage par l'agent (ou null). */
  appreciation: string | null;
  /** Démarches menées pour lever le blocage. */
  blocageActions: BlocageAction[];
  timeline: TimelineEvent[];
  /** Nombre de pièces jointes / preuves (renseigné côté serveur). */
  attachmentsCount?: number;
  /** Durée de traitement acceptable en jours (échéance perso, EN PLUS du SLA du type). */
  dueDurationDays?: number | null;
  /** Marqué explicitement « En retard » par un utilisateur. */
  markedLate?: boolean;
  /** Visibilité : `false` = privé (créateur seul), `true`/absent = publié (équipe). */
  published?: boolean;
}

export interface Profile {
  id: string;
  nom: string;
  poste: string;
  role: Role;
  init: string;
  /** Photo de profil (data URL redimensionnée), ou vide → initiales. */
  avatar?: string;
  /** Pages supplémentaires accordées par l'admin, au-delà du rôle. */
  extraPages: string[];
  /** Pages retirées par l'admin, même si le rôle y donnerait accès. */
  deniedPages: string[];
  /** Compte en lecture seule (aucune écriture). */
  readonly: boolean;
  /** Compte validé par l'administrateur (accès autorisé à l'application). */
  approved: boolean;
  /** Membre de l'équipe GRC (concerné par les distinctions cyber du module GRC). */
  grcMember: boolean;
  /** L'utilisateur doit renouveler son mot de passe avant d'accéder à l'app. */
  mustChangePassword: boolean;
  /** Double authentification (TOTP) active pour ce compte. */
  totpEnabled: boolean;
}

/** Paramètres de sécurité configurables depuis l'administration. */
export interface SecuritySettings {
  approvalRequired: boolean; // inscriptions soumises à approbation admin
  passwordMinLength: number; // longueur minimale du mot de passe
  loginMaxAttempts: number; // tentatives échouées avant blocage (par compte/IP)
  loginWindowMin: number; // fenêtre de blocage (minutes)
  sessionDays: number; // durée de vie d'une session (jours)
  passwordMaxAgeDays: number; // rotation forcée après N jours (0 = désactivé)
  hstsEnabled: boolean; // en-tête HSTS (HTTPS strict) — effet au redémarrage
  twofaRequired: boolean; // double authentification (TOTP) exigée pour tous
}

export const DEFAULT_SECURITY: SecuritySettings = {
  approvalRequired: true,
  passwordMinLength: 8,
  loginMaxAttempts: 5,
  loginWindowMin: 15,
  sessionDays: 30,
  passwordMaxAgeDays: 0,
  hstsEnabled: false,
  twofaRequired: false,
};

/** Salutation adaptée à l'heure. */
export function greeting(d: Date): string {
  const h = d.getHours();
  if (h < 5) return "Bonne nuit";
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bon après-midi";
  return "Bonsoir";
}

/** Un compte est en lecture seule s'il est marqué comme tel, ou s'il a le rôle DSI. */
export const isReadOnly = (p: { role: Role; readonly?: boolean }): boolean =>
  p.role === "dsi" || Boolean(p.readonly);

export interface Sla {
  relance: number;
  escalade: number;
}

export interface TypeDef {
  sla: Sla | null;
  urgent: boolean;
}

/* ---------- 4.1 · Les 9 métiers (catalogue) ---------- */
export const METIERS: Record<string, { label: string; tone: Tone }> = {
  SOC: { label: "Supervision & détection", tone: "rose" },
  CASE: { label: "Réponse à incident", tone: "rose" },
  INV: { label: "Investigation numérique", tone: "violet" },
  AUD: { label: "Audit", tone: "sky" },
  CTI: { label: "Renseignement menace", tone: "violet" },
  GRC: { label: "Gouvernance & conformité", tone: "emerald" },
  PRJ: { label: "Projets & ingénierie", tone: "sky" },
  ADM: { label: "Coordination interne", tone: "slate" },
  PRE: { label: "Prestataires & tiers", tone: "amber" },
};

/* ---------- 4.2 · Les 11 types + SLA ---------- */
export const TYPES: Record<string, TypeDef> = {
  INFO: { sla: null, urgent: false },
  SIGNAL: { sla: { relance: 3, escalade: 6 }, urgent: false },
  ALERTE: { sla: { relance: 1, escalade: 2 }, urgent: true },
  RECO: { sla: { relance: 4, escalade: 8 }, urgent: false },
  DEMANDE: { sla: { relance: 3, escalade: 7 }, urgent: false },
  RELANCE: { sla: { relance: 2, escalade: 4 }, urgent: false },
  VALIDATION: { sla: { relance: 4, escalade: 8 }, urgent: false },
  REUNION: { sla: { relance: 2, escalade: 4 }, urgent: false },
  CR: { sla: null, urgent: false },
  INTERDIT: { sla: { relance: 1, escalade: 2 }, urgent: true },
  CLOTURE: { sla: null, urgent: false },
};

export const isUrgentType = (type: string, types: Record<string, TypeDef> = TYPES): boolean =>
  Boolean(types[type]?.urgent);

/* ---------- Catalogue (dynamique : éditable en administration) ---------- */
export interface MetierDef {
  label: string;
  tone: Tone;
}
export interface Catalogue {
  metiers: Record<string, MetierDef>;
  types: Record<string, TypeDef>;
}
/** Catalogue par défaut (les 9 métiers + 11 types intégrés). Sert de seed. */
export const DEFAULT_CATALOGUE: Catalogue = { metiers: METIERS, types: TYPES };

/** Teintes disponibles pour un nouveau métier. */
export const TONES: Tone[] = ["emerald", "amber", "rose", "sky", "violet", "slate"];

/* ---------- 4.3 · Statuts et avancement du Fil ---------- */
export const STATUTS: Record<Statut, { pct: number; stage: number; color: Tone }> = {
  Brouillon: { pct: 5, stage: 0, color: "slate" },
  Envoyé: { pct: 25, stage: 1, color: "sky" },
  "En attente": { pct: 40, stage: 1, color: "amber" },
  Relancé: { pct: 55, stage: 2, color: "amber" },
  "En traitement": { pct: 75, stage: 4, color: "emerald" },
  Bloqué: { pct: 50, stage: 3, color: "rose" },
  Clôturé: { pct: 100, stage: 5, color: "emerald" },
};

export const FIL = ["Créé", "Envoyé", "Relance", "Réponse", "Traitement", "Clôturé"];

/** Étape atteinte pour l'affichage du Fil : si réponse reçue et étape < 3, on force l'étape 3. */
export function filStage(item: Item): number {
  const st = STATUTS[item.statut].stage;
  const aReponse = item.timeline.some((e) => e.kind === "reponse");
  return aReponse && st < 3 ? 3 : st;
}

/* ---------- Déblocage : démarches menées & appréciation du motif ---------- */
export type BlocageActionKind =
  | "appel"
  | "mail"
  | "escalade"
  | "whatsapp"
  | "rencontre"
  | "reunion"
  | "autre";

export const BLOCAGE_ACTIONS: { kind: BlocageActionKind; label: string; icon: string }[] = [
  { kind: "appel", label: "Appel téléphonique", icon: "Phone" },
  { kind: "mail", label: "Mail de relance", icon: "Mail" },
  { kind: "escalade", label: "Escalade au DG (rapport)", icon: "ArrowUp" },
  { kind: "whatsapp", label: "Message WhatsApp — Alerte SSI", icon: "MessageCircle" },
  { kind: "rencontre", label: "Rencontre en personne", icon: "Users" },
  { kind: "reunion", label: "Réunion / point", icon: "CalendarClock" },
  { kind: "autre", label: "Autre démarche", icon: "Flag" },
];
export const blocageActionLabel = (
  k: string,
  actions: { kind: string; label: string }[] = BLOCAGE_ACTIONS
): string => actions.find((a) => a.kind === k)?.label ?? k;

/** Icônes disponibles pour une action de déblocage personnalisée. */
export const ACTION_ICONS = [
  "Phone",
  "Mail",
  "ArrowUp",
  "MessageCircle",
  "Users",
  "CalendarClock",
  "Send",
  "FileText",
  "Bell",
  "Flag",
];

export interface BlocageAction {
  id: string;
  itemId: string;
  kind: string; // type de démarche (peut être personnalisé en admin)
  concerne: string; // personne concernée, toujours nommée
  note: string; // compte rendu / message
  authorId: string;
  createdAt: Date;
}

// Appréciation du motif de blocage par l'agent (valeurs par défaut, éditables en admin).
export const APPRECIATIONS = [
  "En traitement",
  "Occupation justifiée",
  "Manque de moyens",
  "Négligence",
  "Congé / absence",
  "Sabotage",
  "Autre",
];

/* ---------- Listes de référence configurables (admin) ---------- */
export interface RefAction {
  kind: string;
  label: string;
  icon: string;
}
export interface RefLists {
  appreciations: string[];
  causes: string[];
  actions: RefAction[];
  decisions: string[];
  services: string[];
  policies: string[];
}

/** Services de destinataire par défaut (éditables en admin). */
export const DEFAULT_SERVICES = [
  "Réseau",
  "Télécom",
  "Bases de données",
  "Systèmes",
  "Applications",
  "Sécurité",
  "Poste de travail",
  "Exploitation",
  "Prestataire",
  "Direction",
  "Autre",
];

/* ---------- 4.4 · Causes de blocage (liste fermée) ---------- */
export const CAUSES = [
  "En attente DSI",
  "En attente prestataire",
  "Arbitrage requis",
  "Manque d'information",
  "Dépendance technique",
];

/* ---------- Module Négligence ---------- */
export const APPRECIATION_NEGLIGENCE = "Négligence"; // déclencheur du module

export const NEGLIGENCE_GRAVITES = ["Faible", "Modérée", "Grave", "Critique"];
export const NEGLIGENCE_RISQUES = ["Faible", "Moyen", "Élevé", "Majeur"];
export const NEGLIGENCE_STATUTS = ["Ouverte", "Transmise au DG", "Décision rendue", "Classée"];

/** Décisions possibles du DG (valeurs par défaut, éditables en admin). */
export const DEFAULT_DECISIONS = [
  "Avertissement",
  "Rappel à l'ordre",
  "Demande d'explication écrite",
  "Instruction de résolution immédiate",
  "Mise en demeure",
  "Accompagnement / formation",
  "Escalade hiérarchique",
  "Sanction disciplinaire",
  "Classement sans suite",
];

export interface Negligence {
  id: string;
  itemId: string | null; // lien facultatif vers un suivi
  objet: string; // description courte
  service: string; // service qui occasionne la négligence
  concerne: string; // personne concernée (responsable de la négligence)
  gravite: string;
  risque: string;
  impact: string;
  description: string;
  status: string;
  decisions: string[]; // décisions cochées par le DG
  createdBy: string;
  decidedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  decidedAt: Date | null;
}

/* ---------- Module Non-conformité (à la politique de sécurité) ----------
 * Même logique que le module Négligence : registre parallèle, mêmes échelles
 * de gravité/risque, mêmes statuts et mécanisme de décision. */
export const NONCONF_LABEL = "Non-conformité à la politique de sécurité";

export interface NonConformite {
  id: string;
  itemId: string | null; // lien facultatif vers un suivi
  objet: string; // description courte de la non-conformité
  service: string; // service concerné
  concerne: string; // personne / entité concernée
  policy: string; // politique / article / contrôle violé (réf. cadre : ISO, CIS, NIST…)
  gravite: string;
  risque: string;
  impact: string;
  description: string;
  status: string;
  decisions: string[];
  createdBy: string;
  decidedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  decidedAt: Date | null;
}

/**
 * Catalogue par défaut des politiques / articles / contrôles susceptibles
 * d'être violés — pré-rempli à partir d'ISO/IEC 27001:2022 (Annexe A), des
 * CIS Controls v8 et du NIST CSF 2.0. Liste éditable (les agents peuvent
 * ajouter leurs propres articles/contrôles depuis l'application).
 */
export const DEFAULT_POLICIES: string[] = [
  // ISO/IEC 27001:2022 — Annexe A (contrôles courants)
  "ISO 27001 A.5.1 — Politiques de sécurité de l'information",
  "ISO 27001 A.5.7 — Renseignement sur les menaces",
  "ISO 27001 A.5.10 — Utilisation acceptable des actifs",
  "ISO 27001 A.5.12 — Classification de l'information",
  "ISO 27001 A.5.14 — Transfert de l'information",
  "ISO 27001 A.5.15 — Contrôle d'accès",
  "ISO 27001 A.5.17 — Informations d'authentification",
  "ISO 27001 A.5.23 — Sécurité des services cloud",
  "ISO 27001 A.5.24 — Planification de la réponse aux incidents",
  "ISO 27001 A.6.3 — Sensibilisation et formation",
  "ISO 27001 A.7.7 — Bureau et écran vides",
  "ISO 27001 A.8.1 — Terminaux des utilisateurs",
  "ISO 27001 A.8.2 — Droits d'accès privilégiés",
  "ISO 27001 A.8.3 — Restriction d'accès à l'information",
  "ISO 27001 A.8.5 — Authentification sécurisée",
  "ISO 27001 A.8.7 — Protection contre les logiciels malveillants",
  "ISO 27001 A.8.8 — Gestion des vulnérabilités techniques",
  "ISO 27001 A.8.12 — Prévention de la fuite de données",
  "ISO 27001 A.8.13 — Sauvegarde des informations",
  "ISO 27001 A.8.15 — Journalisation",
  "ISO 27001 A.8.16 — Surveillance des activités",
  "ISO 27001 A.8.24 — Utilisation de la cryptographie",
  // CIS Controls v8
  "CIS 1 — Inventaire des actifs matériels",
  "CIS 2 — Inventaire des actifs logiciels",
  "CIS 3 — Protection des données",
  "CIS 4 — Configuration sécurisée",
  "CIS 5 — Gestion des comptes",
  "CIS 6 — Gestion du contrôle d'accès",
  "CIS 7 — Gestion continue des vulnérabilités",
  "CIS 8 — Gestion des journaux d'audit",
  "CIS 9 — Protection de la messagerie et des navigateurs",
  "CIS 10 — Défenses contre les logiciels malveillants",
  "CIS 11 — Récupération des données",
  "CIS 12 — Gestion de l'infrastructure réseau",
  "CIS 13 — Surveillance et défense du réseau",
  "CIS 14 — Sensibilisation à la sécurité",
  "CIS 15 — Gestion des prestataires",
  "CIS 16 — Sécurité des applications",
  "CIS 17 — Gestion de la réponse aux incidents",
  "CIS 18 — Tests d'intrusion",
  // NIST Cybersecurity Framework 2.0 — fonctions
  "NIST CSF GV — Gouverner",
  "NIST CSF ID — Identifier",
  "NIST CSF PR — Protéger",
  "NIST CSF DE — Détecter",
  "NIST CSF RS — Répondre",
  "NIST CSF RC — Rétablir",
];

/* ---------- Module GRC : Registre des risques ----------
 * Évaluation par matrice Probabilité × Impact (échelles 1–5) → niveau de risque
 * calculé et coloré. Un risque se relie aux autres modules (suivis, projets,
 * non-conformités, négligences, objectifs) pour croiser l'information. */
export const RISK_PROBA_LABELS = ["Très faible", "Faible", "Moyenne", "Élevée", "Très élevée"]; // index 0 → niveau 1
export const RISK_IMPACT_LABELS = ["Négligeable", "Mineur", "Modéré", "Majeur", "Critique"];
export type RiskLevel = "Faible" | "Moyen" | "Élevé" | "Critique";
export const RISK_STATUTS = ["Identifié", "En traitement", "Réduit", "Accepté", "Transféré", "Clôturé"];
export const RISK_TREATMENTS = ["Réduire", "Accepter", "Transférer", "Éviter"];
export const RISK_CATEGORIES = [
  "Technique / SI",
  "Organisationnel",
  "Humain",
  "Physique",
  "Juridique / conformité",
  "Fournisseur / tiers",
  "Continuité d'activité",
];
/** Type de la cible d'un lien de risque (croisement inter-modules). */
export type RiskLinkKind = "item" | "project" | "negligence" | "nonconformite" | "objective";
export interface RiskLink {
  kind: RiskLinkKind;
  refId: string;
}

/** Niveau de risque à partir des échelles probabilité × impact (1–5). */
export function riskLevel(probability: number, impact: number): RiskLevel {
  const s = probability * impact;
  if (s >= 15) return "Critique";
  if (s >= 8) return "Élevé";
  if (s >= 4) return "Moyen";
  return "Faible";
}
/** Badge (fond + texte) par niveau de risque. */
export const RISK_LEVEL_TONE: Record<RiskLevel, string> = {
  Faible: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Moyen: "bg-amber-100 text-amber-700 border-amber-200",
  Élevé: "bg-orange-100 text-orange-700 border-orange-200",
  Critique: "bg-rose-100 text-rose-700 border-rose-200",
};
/** Couleur de cellule (fond) par niveau, pour la matrice de risques. */
export const RISK_LEVEL_CELL: Record<RiskLevel, string> = {
  Faible: "bg-emerald-200/70 text-emerald-900",
  Moyen: "bg-amber-200/70 text-amber-900",
  Élevé: "bg-orange-300/70 text-orange-900",
  Critique: "bg-rose-300/80 text-rose-900",
};

/** Mesure de traitement liée à un risque (référence au catalogue de conformité). */
export interface RiskControlRef {
  frameworkId: string;
  controlCode: string;
}
/** Entrée d'historique de réévaluation d'un risque (piste d'audit). */
export interface RiskReview {
  id: string;
  reviewedBy: string;
  reviewedAt: Date;
  inherentP: number;
  inherentI: number;
  residualP: number;
  residualI: number;
  note: string;
}

export interface Risk {
  id: string;
  ref: string;
  title: string;
  description: string;
  category: string;
  // Évaluation ISO 27005 : risque inhérent (avant traitement) → résiduel (après).
  probability: number; // 1–5 (inhérent)
  impact: number; // 1–5 (inhérent)
  residualProbability: number; // 1–5 (résiduel)
  residualImpact: number; // 1–5 (résiduel)
  // Scénario de risque.
  assetId: string | null; // actif ciblé (registre des actifs)
  threat: string; // source / événement de menace
  vulnerability: string; // vulnérabilité exploitée
  treatment: string; // stratégie : Réduire / Accepter / Transférer / Éviter
  treatmentPlan: string; // plan d'action
  controls: RiskControlRef[]; // mesures de traitement (référentiels de conformité)
  status: string;
  ownerId: string;
  reviewDate: Date | null; // prochaine revue
  // Acceptation formelle du risque (le cas échéant).
  acceptedBy: string | null;
  acceptedAt: Date | null;
  acceptUntil: Date | null;
  acceptanceJustification: string;
  reviews: RiskReview[]; // historique de réévaluation
  links: RiskLink[]; // croisements vers d'autres modules
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Niveau de risque inhérent / résiduel (raccourcis). */
export const riskInherentLevel = (r: Risk): RiskLevel => riskLevel(r.probability, r.impact);
export const riskResidualLevel = (r: Risk): RiskLevel => riskLevel(r.residualProbability, r.residualImpact);

/* ---------- Module GRC : Politiques de sécurité (diffusion & suivi) ----------
 * Chaque politique est suivie, par direction/service destinataire, le long du
 * cycle : Diffusée → Consultée → Comprise → Applicable (ou « Non applicable »). */
export const POLICY_STATUTS = ["Brouillon", "En vigueur", "Révisée", "Retirée"];
/** Étapes ordonnées du cycle de diffusion (progression 0→3). */
export const POLICY_STAGES = ["Diffusée", "Consultée", "Comprise", "Applicable"];
/** Étape spéciale terminale : la politique ne concerne pas ce service. */
export const POLICY_STAGE_NA = "Non applicable";
export const POLICY_STAGE_ALL = [...POLICY_STAGES, POLICY_STAGE_NA];
export const POLICY_DOMAINS = [
  "Gouvernance",
  "Contrôle d'accès",
  "Protection des données",
  "Continuité d'activité",
  "Sécurité physique",
  "RH / Sensibilisation",
  "Fournisseurs / tiers",
  "Développement / SI",
];
/** Badge (fond + texte) par étape du cycle. */
export const POLICY_STAGE_TONE: Record<string, string> = {
  Diffusée: "bg-slate-100 text-slate-600 border-slate-200",
  Consultée: "bg-sky-100 text-sky-700 border-sky-200",
  Comprise: "bg-violet-100 text-violet-700 border-violet-200",
  Applicable: "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Non applicable": "bg-slate-100 text-slate-400 border-slate-200",
};
/** Index d'étape (0–3) ; -1 pour « Non applicable ». */
export const policyStageIndex = (stage: string): number => POLICY_STAGES.indexOf(stage);

export interface PolicyDiffusion {
  id: string;
  policyId: string;
  service: string; // direction / service destinataire
  stage: string; // POLICY_STAGE_ALL
  note: string;
  updatedAt: Date;
}
export interface Policy {
  id: string;
  ref: string;
  title: string;
  reference: string; // cadre / article (ISO, CIS, NIST, interne…)
  domain: string;
  version: string;
  status: string;
  summary: string;
  url: string; // lien facultatif vers le document
  ownerId: string;
  publishedAt: Date | null;
  reviewDate: Date | null;
  diffusions: PolicyDiffusion[];
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/* ---------- Module GRC : Registre des actifs (ISO 27005) ----------
 * Ce que l'organisation protège. Chaque actif est valorisé selon les trois
 * critères de sécurité C/I/D (échelle 1–4) ; sa criticité = max(C, I, D). */
export const ASSET_TYPES = [
  "Information / Données",
  "Logiciel / Applicatif",
  "Matériel / Infrastructure",
  "Service / Processus",
  "Personne / Compétence",
  "Site / Local",
  "Fournisseur / Tiers",
];
export const ASSET_STATUTS = ["Actif", "En projet", "Retiré"];
/** Échelle des critères de sécurité (index 1–4). */
export const CID_LABELS = ["—", "Faible", "Modéré", "Élevé", "Critique"];
/** Échelle de confidentialité (classification), index 1–4. */
export const CONFIDENTIALITY_LABELS = ["—", "Public", "Interne", "Confidentiel", "Secret"];
export type AssetCriticality = "Faible" | "Modéré" | "Élevé" | "Critique";
export const CRITICALITY_TONE: Record<AssetCriticality, string> = {
  Faible: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Modéré: "bg-amber-100 text-amber-700 border-amber-200",
  Élevé: "bg-orange-100 text-orange-700 border-orange-200",
  Critique: "bg-rose-100 text-rose-700 border-rose-200",
};
/** Criticité d'un actif = plus haute des trois valeurs C/I/D. */
export function assetCriticality(a: { confidentiality: number; integrity: number; availability: number }): AssetCriticality {
  const m = Math.max(a.confidentiality || 1, a.integrity || 1, a.availability || 1);
  return (CID_LABELS[Math.min(4, Math.max(1, m))] as AssetCriticality) || "Faible";
}

export interface Asset {
  id: string;
  ref: string;
  name: string;
  type: string;
  description: string;
  ownerId: string; // propriétaire de l'actif (responsable)
  service: string; // direction / service détenteur
  confidentiality: number; // 1–4
  integrity: number; // 1–4
  availability: number; // 1–4
  status: string;
  reviewDate: Date | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/* ---------- Module GRC : Conformité (évaluation des mesures) ----------
 * La posture de l'organisation face à un référentiel : pour chaque mesure,
 * son applicabilité (SoA), son statut d'implémentation et sa maturité (0–5). */
export const CONTROL_STATUS = ["Non évalué", "Non implémenté", "Partiellement implémenté", "Implémenté"];
/** Échelle de maturité (type CMMI), index 0–5. */
export const MATURITY_LABELS = ["Inexistant", "Initial", "Reproductible", "Défini", "Géré", "Optimisé"];
export const CONTROL_STATUS_TONE: Record<string, string> = {
  "Non évalué": "bg-slate-100 text-slate-500 border-slate-200",
  "Non implémenté": "bg-rose-100 text-rose-700 border-rose-200",
  "Partiellement implémenté": "bg-amber-100 text-amber-700 border-amber-200",
  Implémenté: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

export interface ControlAssessment {
  id: string;
  frameworkId: string;
  controlCode: string;
  applicable: boolean; // dans le périmètre (déclaration d'applicabilité / SoA)
  justification: string; // justification d'inclusion / d'exclusion
  status: string;
  maturity: number; // 0–5
  responsibleId: string;
  evidence: string;
  note: string;
  lastAssessedAt: Date | null;
  nextReviewAt: Date | null;
  updatedAt: Date;
}

/* ---------- Module GRC : Contrôles terrain (rondes / inspections) ---------- */
export const FIELD_CONTROL_TYPES = ["Ronde de sécurité", "Inspection physique", "Audit interne", "Revue documentaire", "Entretien", "Test / exercice"];
export const FIELD_CONTROL_STATUS = ["Planifié", "En cours", "Réalisé", "Clôturé"];
/** Résultat d'un point de contrôle d'une check-list. */
export const CHECK_RESULTS = ["À vérifier", "Conforme", "Écart", "Non applicable"];
export const CHECK_RESULT_TONE: Record<string, string> = {
  "À vérifier": "bg-slate-100 text-slate-500 border-slate-200",
  Conforme: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Écart: "bg-rose-100 text-rose-700 border-rose-200",
  "Non applicable": "bg-slate-100 text-slate-400 border-slate-200",
};

export interface CheckItem {
  id: string;
  label: string; // point de contrôle
  result: string; // CHECK_RESULTS
  note: string;
  frameworkId: string; // mesure de conformité rattachée (facultatif)
  controlCode: string;
}
/** Événement du fil de vie d'un contrôle : création, changement d'état, ou action de suivi. */
export type FieldEventKind = "creation" | "statut" | "action";
export interface FieldControlEvent {
  id: string;
  kind: FieldEventKind;
  label: string; // description libre / action de suivi
  fromStatus: string; // pour kind="statut"
  toStatus: string; // pour kind="statut"
  authorId: string | null;
  at: Date;
}
export const FIELD_EVENT_TONE: Record<FieldEventKind, string> = {
  creation: "bg-slate-100 text-slate-500",
  statut: "bg-sky-100 text-sky-700",
  action: "bg-emerald-100 text-emerald-700",
};
export interface FieldControl {
  id: string;
  ref: string;
  title: string;
  type: string;
  service: string; // direction / service contrôlé
  location: string;
  date: Date | null; // date de réalisation
  inspectorId: string; // contrôleur / auditeur
  status: string;
  summary: string; // conclusion
  items: CheckItem[];
  events: FieldControlEvent[]; // fil de vie horodaté (états + actions de suivi)
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}
/** Écarts constatés lors d'un contrôle = points dont le résultat est « Écart » (points bloquants). */
export const controlGaps = (c: FieldControl): CheckItem[] => c.items.filter((it) => it.result === "Écart");

/** Avancement du dépouillement d'un contrôle : part des points évalués (≠ « À vérifier »). */
export function controlProgress(c: FieldControl): { done: number; total: number; pct: number } {
  const total = c.items.length;
  if (total === 0) return { done: 0, total: 0, pct: c.status === "Clôturé" || c.status === "Réalisé" ? 100 : 0 };
  const done = c.items.filter((it) => it.result !== "À vérifier").length;
  return { done, total, pct: Math.round((done / total) * 100) };
}
/** Taux de conformité : part des points conformes parmi les points évalués. */
export function controlConformity(c: FieldControl): number {
  const evaluated = c.items.filter((it) => it.result !== "À vérifier");
  if (evaluated.length === 0) return 0;
  return Math.round((evaluated.filter((it) => it.result === "Conforme").length / evaluated.length) * 100);
}
/** Ordre du cycle d'un contrôle + étape suivante (pour les boutons d'avancement). */
export const FIELD_STATUS_ORDER = ["Planifié", "En cours", "Réalisé", "Clôturé"];
export function nextFieldStatus(status: string): string | null {
  const i = FIELD_STATUS_ORDER.indexOf(status);
  return i >= 0 && i < FIELD_STATUS_ORDER.length - 1 ? FIELD_STATUS_ORDER[i + 1] : null;
}

/* ---------- Module GRC : Plan d'actions correctives (CAPA) ---------- */
export const CAPA_TYPES = ["Corrective", "Préventive"];
export const CAPA_STATUS = ["Ouverte", "En cours", "Réalisée", "Vérifiée", "Clôturée"];
export const CAPA_PRIORITIES = ["Basse", "Normale", "Haute", "Critique"];
/** Origine d'une action : écart de contrôle, non-conformité, risque, incident, ou saisie manuelle. */
export type CapaSource = "controle" | "nonconformite" | "risque" | "incident" | "audit" | "manuel";
export const CAPA_STATUS_TONE: Record<string, string> = {
  Ouverte: "bg-slate-100 text-slate-600",
  "En cours": "bg-sky-100 text-sky-700",
  Réalisée: "bg-amber-100 text-amber-700",
  Vérifiée: "bg-violet-100 text-violet-700",
  Clôturée: "bg-emerald-100 text-emerald-700",
};

export interface CapaAction {
  id: string;
  ref: string;
  title: string;
  description: string;
  type: string; // Corrective / Préventive
  priority: string;
  sourceType: CapaSource;
  sourceId: string | null; // id de l'écart / NC / risque à l'origine
  ownerId: string;
  dueDate: Date | null;
  status: string;
  verification: string; // vérification d'efficacité
  closedAt: Date | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}
/** Une action est « en retard » si son échéance est passée et qu'elle n'est pas clôturée. */
export const isCapaLate = (a: CapaAction, now: Date): boolean =>
  Boolean(a.dueDate && a.dueDate.getTime() < now.getTime() && a.status !== "Clôturée" && a.status !== "Vérifiée");

/* ---------- Module GRC : Plan de travail (chantiers de l'équipe) ---------- */
export const PLAN_CATEGORIES = ["Conformité", "Gestion des risques", "Politiques", "Sensibilisation", "Audit / Contrôle", "Gouvernance", "Autre"];
export const PLAN_STATUS = ["À planifier", "En cours", "En pause", "Terminé", "Abandonné"];
export const PLAN_PRIORITIES = ["Basse", "Normale", "Haute", "Critique"];
export const PLAN_QUARTERS = ["T1", "T2", "T3", "T4"];
export const PLAN_STATUS_TONE: Record<string, string> = {
  "À planifier": "bg-slate-100 text-slate-600",
  "En cours": "bg-sky-100 text-sky-700",
  "En pause": "bg-amber-100 text-amber-700",
  "Terminé": "bg-emerald-100 text-emerald-700",
  "Abandonné": "bg-slate-200 text-slate-400",
};
export const PLAN_CATEGORY_TONE: Record<string, string> = {
  "Conformité": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Gestion des risques": "bg-rose-50 text-rose-700 border-rose-200",
  "Politiques": "bg-sky-50 text-sky-700 border-sky-200",
  "Sensibilisation": "bg-violet-50 text-violet-700 border-violet-200",
  "Audit / Contrôle": "bg-indigo-50 text-indigo-700 border-indigo-200",
  "Gouvernance": "bg-amber-50 text-amber-700 border-amber-200",
  "Autre": "bg-slate-50 text-slate-600 border-slate-200",
};

/** Chantier du plan de travail annuel de l'équipe GRC. */
export interface GrcPlanItem {
  id: string;
  ref: string; // PLAN-AAAA-NNN
  title: string;
  category: string;
  year: number;
  quarter: string; // T1..T4
  ownerId: string;
  priority: string;
  status: string;
  progress: number; // 0–100
  dueDate: Date | null;
  description: string;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}
/** Un chantier est « en retard » si son échéance est passée et qu'il n'est ni terminé ni abandonné. */
export const isPlanLate = (p: GrcPlanItem, now: Date): boolean =>
  Boolean(p.dueDate && p.dueDate.getTime() < now.getTime() && p.status !== "Terminé" && p.status !== "Abandonné");
/** Un chantier est « actif » (compte dans la charge) s'il n'est ni terminé ni abandonné. */
export const isPlanActive = (p: GrcPlanItem): boolean => p.status !== "Terminé" && p.status !== "Abandonné";

/** Taux d'applicabilité d'une politique : part des services arrivés à « Applicable »
 *  (les services « Non applicable » sont exclus du dénominateur). */
export function policyCoverage(p: Policy): { applicable: number; total: number; pct: number } {
  const concerned = p.diffusions.filter((d) => d.stage !== POLICY_STAGE_NA);
  const applicable = concerned.filter((d) => d.stage === "Applicable").length;
  const total = concerned.length;
  return { applicable, total, pct: total ? Math.round((applicable / total) * 100) : 0 };
}

/* ==================================================================
 *  Module GRC : Académie (entraînement de l'équipe GRC).
 *  Un parcours (course) contient des leçons de 4 types : leçon, quiz,
 *  étude de cas décisionnelle, défi pratique. La progression est propre
 *  à l'apprentissage (niveau de compétence GRC dédié).
 * ================================================================== */
export const TRAINING_CATEGORIES = [
  "Fondamentaux cyber",
  "Fondamentaux GRC",
  "Gestion des risques",
  "Conformité & politiques",
  "Contrôles & audit",
  "Incidents & non-conformités",
  "Décision & pilotage",
];
export type LessonType = "lesson" | "quiz" | "case" | "challenge";
export const LESSON_TYPES: LessonType[] = ["lesson", "quiz", "case", "challenge"];
export const LESSON_TYPE_META: Record<LessonType, { label: string; icon: string; tone: string }> = {
  lesson: { label: "Leçon", icon: "📖", tone: "bg-sky-100 text-sky-700" },
  quiz: { label: "Quiz", icon: "❓", tone: "bg-violet-100 text-violet-700" },
  case: { label: "Étude de cas", icon: "🎬", tone: "bg-amber-100 text-amber-700" },
  challenge: { label: "Défi pratique", icon: "🎯", tone: "bg-emerald-100 text-emerald-700" },
};

/** Question de quiz (QCM) avec explication de la bonne réponse. */
export interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  correct: number; // index de la bonne réponse
  explanation: string;
}
/** Choix d'une étude de cas : conséquence + qualité de la décision (0–100). */
export interface CaseOption {
  label: string;
  feedback: string;
  score: number; // 0–100 : qualité de la décision
}
/** Étape décisionnelle d'une étude de cas. */
export interface CaseStep {
  id: string;
  prompt: string;
  options: CaseOption[];
}
export interface TrainingLesson {
  id: string;
  courseId: string;
  order: number;
  type: LessonType;
  title: string;
  content: string; // leçon : texte ; cas : mise en situation ; défi : consigne
  xp: number;
  questions: QuizQuestion[]; // quiz
  steps: CaseStep[]; // étude de cas
  challengeHref: string; // défi : lien vers un module (ex. /grc?tab=risques)
}
export interface TrainingCourse {
  id: string;
  ref: string;
  title: string;
  description: string;
  category: string;
  icon: string; // emoji
  badge: string; // certification décernée à 100 % (ex. « Analyste de risque certifié »)
  order: number;
  published: boolean;
  lessons: TrainingLesson[];
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}
/** Achèvement d'une leçon par un apprenant (avec le score obtenu 0–100). */
export interface TrainingDone {
  lessonId: string;
  score: number;
  completedAt: Date;
}

export const TRAINING_LEVELS: { min: number; name: string; icon: string }[] = [
  { min: 0, name: "Débutant", icon: "🌱" },
  { min: 150, name: "Junior", icon: "📘" },
  { min: 400, name: "Confirmé", icon: "🎓" },
  { min: 800, name: "Expert", icon: "🏆" },
];
export interface TrainingLevel { level: number; name: string; icon: string; xp: number; nextXp: number | null; progressPct: number; }
export function trainingLevel(xp: number): TrainingLevel {
  let level = 0;
  for (let i = 0; i < TRAINING_LEVELS.length; i++) if (xp >= TRAINING_LEVELS[i].min) level = i;
  const nextXp = level < TRAINING_LEVELS.length - 1 ? TRAINING_LEVELS[level + 1].min : null;
  const base = TRAINING_LEVELS[level].min;
  const progressPct = nextXp ? Math.round(((xp - base) / (nextXp - base)) * 100) : 100;
  return { level, name: TRAINING_LEVELS[level].name, icon: TRAINING_LEVELS[level].icon, xp, nextXp, progressPct };
}

/** XP gagnée par un apprenant = somme (xp de la leçon × score/100) sur les leçons achevées. */
export function trainingXp(courses: TrainingCourse[], done: TrainingDone[]): number {
  const xpById = new Map<string, number>();
  courses.forEach((c) => c.lessons.forEach((l) => xpById.set(l.id, l.xp)));
  return done.reduce((s, d) => s + Math.round(((xpById.get(d.lessonId) ?? 0) * d.score) / 100), 0);
}
/** Avancement d'un parcours pour un apprenant (leçons achevées / total). */
export function courseProgress(course: TrainingCourse, doneIds: Set<string>): { done: number; total: number; pct: number } {
  const total = course.lessons.length;
  const done = course.lessons.filter((l) => doneIds.has(l.id)).length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}
/** Score maximal atteignable pour une leçon (pour l'affichage). */
export const lessonMaxScore = 100;

/** Progression d'apprentissage d'un membre (pour agréger tous les apprenants). */
export interface TrainingProgressEntry extends TrainingDone {
  userId: string;
}

/** Axes de compétence GRC : regroupement des catégories de l'Académie. */
export const COMPETENCY_GROUPS: { label: string; categories: string[] }[] = [
  { label: "Fondamentaux", categories: ["Fondamentaux cyber", "Fondamentaux GRC"] },
  { label: "Risques", categories: ["Gestion des risques"] },
  { label: "Conformité", categories: ["Conformité & politiques"] },
  { label: "Contrôles", categories: ["Contrôles & audit"] },
  { label: "Incidents", categories: ["Incidents & non-conformités"] },
  { label: "Décision", categories: ["Décision & pilotage"] },
];
export interface RadarAxis { axis: string; value: number }

/** Radar de compétences d'un membre : maîtrise par domaine (Académie) + suivi du
 *  plan d'action (CAPA menées sans retard). Valeurs 0–100. */
export function competencyRadar(
  courses: TrainingCourse[],
  done: TrainingDone[],
  capaActions: CapaAction[],
  userId: string,
  now: Date
): RadarAxis[] {
  const score = new Map(done.map((d) => [d.lessonId, d.score]));
  const axes: RadarAxis[] = COMPETENCY_GROUPS.map((g) => {
    const lessons = courses.filter((c) => g.categories.includes(c.category)).flatMap((c) => c.lessons);
    if (lessons.length === 0) return { axis: g.label, value: 0 };
    const sum = lessons.reduce((s, l) => s + (score.get(l.id) ?? 0), 0);
    return { axis: g.label, value: Math.round(sum / lessons.length) };
  });
  const owned = capaActions.filter((a) => a.ownerId === userId);
  const late = owned.filter((a) => isCapaLate(a, now)).length;
  axes.push({ axis: "Plan d'action", value: owned.length ? Math.round((100 * (owned.length - late)) / owned.length) : 0 });
  return axes;
}

/* ==================================================================
 *  Module GRC : Missions & dépendances de l'organisation.
 *  Base de l'analyse des joyaux (CJA) : ce que l'organisation doit
 *  protéger en priorité, ce dont ses missions dépendent, et qui dépend
 *  d'elles. Une mission relie des actifs, des personnes et des
 *  dépendances externes (amont / aval).
 * ================================================================== */
export const MISSION_TYPES = ["Régalienne", "Métier", "Support"];
export const MISSION_VALUES = ["Vitale", "Essentielle", "Importante", "Secondaire"];
export const MISSION_VALUE_SCORE: Record<string, number> = { Vitale: 4, Essentielle: 3, Importante: 2, Secondaire: 1 };
export const MISSION_VALUE_TONE: Record<string, string> = {
  Vitale: "bg-rose-100 text-rose-700 border-rose-200",
  Essentielle: "bg-orange-100 text-orange-700 border-orange-200",
  Importante: "bg-amber-100 text-amber-700 border-amber-200",
  Secondaire: "bg-slate-100 text-slate-600 border-slate-200",
};
export const MISSION_STATUS = ["Active", "En projet", "Retirée"];

/** Sens d'une dépendance vue depuis la mission. */
export type DepDirection = "amont" | "aval";
export const DEP_DIRECTION_LABEL: Record<DepDirection, string> = {
  amont: "Dont dépend la mission", // fournisseurs/entités en amont
  aval: "Qui dépend de la mission", // bénéficiaires/entités en aval
};
export const DEP_KINDS = ["Entité externe", "Autre organisation", "Service interne", "Prestataire", "Infrastructure"];

export interface MissionDependency {
  id: string;
  direction: DepDirection;
  kind: string; // DEP_KINDS
  name: string;
  description: string;
  criticality: string; // MISSION_VALUES (réutilisé)
}
export interface Mission {
  id: string;
  ref: string; // MIS-AAAA-NNN
  name: string;
  type: string; // MISSION_TYPES
  value: string; // MISSION_VALUES (valeur/criticité de la mission)
  description: string;
  ownerId: string; // responsable de la mission
  status: string;
  assetIds: string[]; // actifs rattachés (registre des actifs)
  peopleIds: string[]; // personnes rattachées (profils)
  dependencies: MissionDependency[]; // dépendances amont / aval
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}
export const missionValueScore = (m: Mission): number => MISSION_VALUE_SCORE[m.value] ?? 1;

/** Valeur métier maximale héritée par un actif via les missions qui s'y appuient (0 si aucune). */
export function assetMissionValue(assetId: string, missions: Mission[]): number {
  let max = 0;
  missions.forEach((m) => {
    if (m.status !== "Retirée" && m.assetIds.includes(assetId)) max = Math.max(max, missionValueScore(m));
  });
  return max;
}

/* ==================================================================
 *  Module GRC : Fournisseurs & prestataires (tiers).
 *  Gestion des tiers qui interagissent avec le SI — brique de la chaîne
 *  d'approvisionnement et dépendance externe pour l'analyse des joyaux.
 * ================================================================== */
export const SUPPLIER_TYPES = ["Éditeur / Logiciel", "Hébergeur / Cloud", "Infogérance / TMA", "Télécom / Réseau", "Conseil / Audit", "Matériel", "Autre"];
export const SUPPLIER_CRITICALITIES = ["Critique", "Important", "Standard"];
export const SUPPLIER_CRITICALITY_SCORE: Record<string, number> = { Critique: 3, Important: 2, Standard: 1 };
export const SUPPLIER_CRITICALITY_TONE: Record<string, string> = {
  Critique: "bg-rose-100 text-rose-700 border-rose-200",
  Important: "bg-amber-100 text-amber-700 border-amber-200",
  Standard: "bg-slate-100 text-slate-600 border-slate-200",
};
export const SUPPLIER_STATUS = ["Actif", "En évaluation", "Résilié"];
export const DATA_ACCESS_LEVELS = ["Aucune donnée", "Données internes", "Données personnelles", "Données sensibles"];
export const DATA_ACCESS_TONE: Record<string, string> = {
  "Aucune donnée": "bg-slate-100 text-slate-500",
  "Données internes": "bg-sky-100 text-sky-700",
  "Données personnelles": "bg-amber-100 text-amber-700",
  "Données sensibles": "bg-rose-100 text-rose-700",
};

export interface Supplier {
  id: string;
  ref: string; // FRN-AAAA-NNN
  name: string;
  type: string;
  criticality: string; // SUPPLIER_CRITICALITIES
  service: string; // prestation / périmètre du SI concerné
  dataAccess: string; // DATA_ACCESS_LEVELS
  ownerId: string; // responsable interne du contrat
  status: string;
  contractEnd: Date | null; // échéance du contrat
  reviewDate: Date | null; // prochaine revue de sécurité du tiers
  assetIds: string[]; // actifs du SI auxquels le tiers accède / qu'il opère
  notes: string;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}
export const supplierCriticalityScore = (s: Supplier): number => SUPPLIER_CRITICALITY_SCORE[s.criticality] ?? 1;
/** Un tiers dont la revue de sécurité est dépassée. */
export const isSupplierReviewLate = (s: Supplier, now: Date): boolean =>
  Boolean(s.reviewDate && s.reviewDate.getTime() < now.getTime() && s.status !== "Résilié");
/** Prestataires en lien avec un actif (accès / exploitation) — pour la CJA. */
export const assetSuppliers = (assetId: string, suppliers: Supplier[]): Supplier[] =>
  suppliers.filter((s) => s.status !== "Résilié" && s.assetIds.includes(assetId));

/* ==================================================================
 *  Module GRC : Revue de direction (ISO 27001 §9.3).
 *  Enregistre chaque revue : éléments d'entrée (bilans) et de sortie
 *  (décisions), avec un instantané des indicateurs de pilotage.
 * ================================================================== */
export const REVIEW_STATUS = ["Préparée", "Tenue", "Clôturée"];
export const REVIEW_STATUS_TONE: Record<string, string> = {
  "Préparée": "bg-slate-100 text-slate-600",
  "Tenue": "bg-sky-100 text-sky-700",
  "Clôturée": "bg-emerald-100 text-emerald-700",
};
export interface DirectionReview {
  id: string;
  ref: string; // REV-AAAA-NNN
  title: string;
  date: Date | null;
  period: string; // période couverte
  participantIds: string[];
  // Éléments d'entrée (ISO 9.3.2)
  contextChanges: string;
  riskReview: string;
  complianceReview: string;
  incidentsReview: string;
  objectivesReview: string;
  feedback: string;
  // Éléments de sortie (ISO 9.3.3)
  decisions: string;
  actions: string;
  kpiSnapshot: Record<string, number>; // instantané des indicateurs à la date de revue
  nextReviewDate: Date | null;
  status: string;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/* ==================================================================
 *  Module GRC : RGPD — registre des traitements (ROPA, art. 30) et
 *  analyses d'impact (AIPD/PIA, art. 35).
 * ================================================================== */
export const LEGAL_BASES = ["Consentement", "Contrat", "Obligation légale", "Intérêt légitime", "Mission d'intérêt public", "Sauvegarde d'intérêts vitaux"];
export const DATA_CATEGORIES = ["Identité", "Coordonnées", "Vie professionnelle", "Données de connexion", "Données financières", "Données de santé", "Données biométriques", "Localisation", "Numéro de sécurité sociale", "Autre"];
export const PROCESSING_STATUS = ["Actif", "En projet", "Suspendu", "Clôturé"];
export const PIA_STATUS = ["Non requise", "À réaliser", "En cours", "Réalisée"];
export const PIA_RISK_LEVELS = ["Faible", "Moyen", "Élevé"];
export const PIA_RISK_TONE: Record<string, string> = {
  Faible: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Moyen: "bg-amber-100 text-amber-700 border-amber-200",
  "Élevé": "bg-rose-100 text-rose-700 border-rose-200",
};

/** Traitement de données personnelles (fiche du registre — ROPA). */
export interface ProcessingActivity {
  id: string;
  ref: string; // TRT-AAAA-NNN
  name: string;
  purpose: string; // finalité
  legalBasis: string; // base légale
  dataCategories: string[]; // catégories de données
  sensitiveData: boolean; // données sensibles (art. 9)
  dataSubjects: string; // personnes concernées
  recipients: string; // destinataires (dont sous-traitants)
  retention: string; // durée de conservation
  transfersOutsideEU: boolean;
  transferDetails: string; // pays / garanties
  ownerId: string; // responsable du traitement (côté interne)
  service: string; // direction / service
  securityMeasures: string;
  assetIds: string[]; // actifs / SI supportant le traitement
  // AIPD / PIA
  piaRequired: boolean;
  piaStatus: string; // PIA_STATUS
  piaRisk: string; // PIA_RISK_LEVELS — risque résiduel pour les personnes
  piaNotes: string;
  status: string; // PROCESSING_STATUS
  reviewDate: Date | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}
/** Une AIPD est « à faire » si elle est requise mais pas encore réalisée. */
export const piaOutstanding = (p: ProcessingActivity): boolean => p.piaRequired && p.piaStatus !== "Réalisée" && p.status !== "Clôturé";
export const isRopaReviewLate = (p: ProcessingActivity, now: Date): boolean =>
  Boolean(p.reviewDate && p.reviewDate.getTime() < now.getTime() && p.status !== "Clôturé");

/* ==================================================================
 *  Module GRC : Gestion des incidents (cycle ISO 27035).
 *  Déclaration → Qualification → Traitement → Résolution → REX.
 * ================================================================== */
export const INCIDENT_TYPES = ["Cyberattaque", "Fuite / violation de données", "Indisponibilité / panne", "Malveillance interne", "Erreur humaine", "Physique / environnemental", "Fraude", "Autre"];
export const INCIDENT_SEVERITIES = ["Mineur", "Modéré", "Majeur", "Critique"];
export const INCIDENT_SEVERITY_SCORE: Record<string, number> = { Mineur: 1, "Modéré": 2, Majeur: 3, Critique: 4 };
export const INCIDENT_SEVERITY_TONE: Record<string, string> = {
  Mineur: "bg-slate-100 text-slate-600 border-slate-200",
  "Modéré": "bg-sky-100 text-sky-700 border-sky-200",
  Majeur: "bg-amber-100 text-amber-700 border-amber-200",
  Critique: "bg-rose-100 text-rose-700 border-rose-200",
};
/** Cycle de vie d'un incident (ISO 27035). */
export const INCIDENT_STATUS = ["Déclaré", "Qualifié", "En traitement", "Résolu", "Clôturé"];
export const INCIDENT_STATUS_TONE: Record<string, string> = {
  "Déclaré": "bg-violet-100 text-violet-700",
  "Qualifié": "bg-sky-100 text-sky-700",
  "En traitement": "bg-amber-100 text-amber-700",
  "Résolu": "bg-emerald-100 text-emerald-700",
  "Clôturé": "bg-slate-200 text-slate-500",
};

export interface Incident {
  id: string;
  ref: string; // INC-AAAA-NNN
  title: string;
  type: string;
  severity: string;
  status: string;
  dataBreach: boolean; // violation de données personnelles (pertinence RGPD, notification 72h)
  detectedAt: Date | null;
  declaredBy: string; // qui a signalé
  ownerId: string; // responsable du traitement
  missionId: string; // mission impactée (facultatif)
  assetIds: string[]; // actifs impactés
  description: string;
  impact: string; // impact constaté
  actionsTaken: string; // confinement / traitement
  resolvedAt: Date | null;
  rootCause: string; // cause racine
  lessons: string; // retour d'expérience (REX)
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}
/** Un incident est « ouvert » tant qu'il n'est ni résolu ni clôturé. */
export const isIncidentOpen = (i: Incident): boolean => i.status !== "Résolu" && i.status !== "Clôturé";
export const incidentSeverityScore = (i: Incident): number => INCIDENT_SEVERITY_SCORE[i.severity] ?? 1;
/** Étape suivante du cycle de vie (pour l'avancement rapide). */
export function nextIncidentStatus(status: string): string | null {
  const i = INCIDENT_STATUS.indexOf(status);
  return i >= 0 && i < INCIDENT_STATUS.length - 1 ? INCIDENT_STATUS[i + 1] : null;
}
/** Délai de résolution en heures (si détecté et résolu). */
export function incidentResolutionHours(i: Incident): number | null {
  if (!i.detectedAt || !i.resolvedAt) return null;
  return Math.max(0, Math.round((i.resolvedAt.getTime() - i.detectedAt.getTime()) / 36e5));
}

/* ==================================================================
 *  Module GRC : Continuité d'activité (BIA + PCA/PRA).
 *  BIA (analyse d'impact métier) : pour chaque activité critique, l'impact
 *  d'une interruption et les objectifs de reprise (DMIA, RTO, RPO).
 *  PCA/PRA : la stratégie et la procédure pour reprendre.
 *  Se rattache aux missions (prolonge Missions & dépendances).
 * ================================================================== */
export const CONTINUITY_STATUS = ["Brouillon", "Validé", "À réviser", "Obsolète"];
/** Échelle de temps partagée pour DMIA / RTO / RPO (du plus court au plus long). */
export const RECOVERY_SCALE = ["Immédiat", "< 1h", "< 4h", "< 8h", "< 24h", "< 72h", "< 1 sem.", "> 1 sem."];
export const RECOVERY_SCORE: Record<string, number> = { Immédiat: 8, "< 1h": 7, "< 4h": 6, "< 8h": 5, "< 24h": 4, "< 72h": 3, "< 1 sem.": 2, "> 1 sem.": 1 };
export const IMPACT_DOMAINS = ["Financier", "Opérationnel", "Juridique / RGPD", "Réputation", "Humain / sécurité"];
// La criticité BIA réutilise l'échelle de valeur des missions (Vitale → Secondaire).

export interface ContinuityPlan {
  id: string;
  ref: string; // PCA-AAAA-NNN
  activity: string; // activité / processus critique
  missionId: string; // mission rattachée (facultatif)
  ownerId: string;
  criticality: string; // MISSION_VALUES (Vitale → Secondaire)
  mtpd: string; // DMIA — durée max d'interruption admissible (RECOVERY_SCALE)
  rto: string; // objectif de temps de reprise
  rpo: string; // objectif de point de reprise (perte de données max)
  impacts: string[]; // IMPACT_DOMAINS concernés
  strategy: string; // stratégie de continuité (site de repli, mode dégradé…)
  resources: string; // ressources nécessaires à la reprise
  procedure: string; // procédure de reprise (étapes)
  assetIds: string[]; // actifs supports
  lastTestDate: Date | null; // dernier test / exercice
  reviewDate: Date | null; // prochaine revue
  status: string;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}
/** Un plan est « à tester » s'il n'a jamais été testé ou l'a été il y a plus d'un an. */
export function isPlanTestStale(p: ContinuityPlan, now: Date): boolean {
  if (p.status === "Obsolète") return false;
  if (!p.lastTestDate) return true;
  return now.getTime() - p.lastTestDate.getTime() > 365 * 864e5;
}
export const isPlanReviewLate = (p: ContinuityPlan, now: Date): boolean =>
  Boolean(p.reviewDate && p.reviewDate.getTime() < now.getTime() && p.status !== "Obsolète");
/** Écart de continuité : un objectif de reprise (RTO) plus long que la durée max
 *  tolérée (DMIA) est incohérent — la reprise arrive trop tard. */
export const hasContinuityGap = (p: ContinuityPlan): boolean =>
  Boolean(RECOVERY_SCORE[p.rto] && RECOVERY_SCORE[p.mtpd] && RECOVERY_SCORE[p.rto] < RECOVERY_SCORE[p.mtpd]);

/* ---------- Module GRC : Organigramme (Directions → Services) ---------- */
/** Service (unité) rattaché à une direction. */
export interface OrgService {
  id: string;
  name: string;
  headId: string; // responsable du service (profil), facultatif
}
/** Direction de l'organisation — peut regrouper plusieurs services. */
export interface Direction {
  id: string;
  ref: string; // DIR-AAAA-NNN
  name: string;
  code: string; // sigle court (ex. DSI)
  headId: string; // directeur (profil), facultatif
  description: string;
  services: OrgService[];
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}
/** Tous les libellés de services connus de l'organigramme (pour l'auto-complétion). */
export const directionServiceNames = (directions: Direction[]): string[] =>
  [...new Set(directions.flatMap((d) => d.services.map((s) => s.name.trim()).filter(Boolean)))].sort((a, b) => a.localeCompare(b));

/** Assimilation/applicabilité des politiques pour une direction : agrège les
 *  diffusions de toutes les politiques dont le service cible appartient à la
 *  direction. Renvoie la répartition par étape + le taux d'applicabilité. */
export function directionPolicyRollup(dir: Direction, policies: Policy[]): {
  total: number; applicable: number; comprises: number; pct: number; byStage: Record<string, number>;
} {
  // Une politique peut être diffusée au niveau de la direction (nom/sigle) ou d'un de ses services.
  const svcNames = new Set(
    [dir.name, dir.code, ...dir.services.map((s) => s.name)].map((n) => n.trim().toLowerCase()).filter(Boolean)
  );
  const byStage: Record<string, number> = {};
  POLICY_STAGE_ALL.forEach((s) => (byStage[s] = 0));
  let concerned = 0;
  let applicable = 0;
  let comprises = 0;
  policies.forEach((p) =>
    p.diffusions.forEach((d) => {
      if (!svcNames.has(d.service.trim().toLowerCase())) return;
      byStage[d.stage] = (byStage[d.stage] ?? 0) + 1;
      if (d.stage === POLICY_STAGE_NA) return;
      concerned += 1;
      if (d.stage === "Applicable") applicable += 1;
      if (d.stage === "Comprise" || d.stage === "Applicable") comprises += 1;
    })
  );
  return { total: concerned, applicable, comprises, pct: concerned ? Math.round((applicable / concerned) * 100) : 0, byStage };
}

/* ==================================================================
 *  Module Audit : audits techniques par questionnaire.
 *  L'équipe vérifie la conformité d'une configuration (sauvegardes,
 *  journalisation, GPO/AD, durcissement serveur…) via une grille de
 *  questions notées Oui/Partiel/Non/N-A → score par domaine + radar.
 * ================================================================== */
export const AUDIT_CATEGORIES = [
  "Sauvegardes / Restauration",
  "Active Directory / GPO",
  "Journalisation / SIEM",
  "Durcissement serveur",
  "Poste de travail",
  "Réseau / Pare-feu",
  "Messagerie / Anti-spam",
  "Cloud / SaaS",
  "Sécurité physique",
  "Autre",
];
export const AUDIT_SOURCES = ["CIS Benchmark", "ANSSI", "NIST", "Microsoft", "Interne", "Autre"];

/** Réponses possibles à une question d'audit + valeur de score (N-A exclu du calcul). */
export const AUDIT_ANSWERS = ["Oui", "Partiel", "Non", "Non applicable", "À vérifier"] as const;
export type AuditAnswer = (typeof AUDIT_ANSWERS)[number];
export const AUDIT_ANSWER_VALUE: Record<string, number | null> = {
  Oui: 100, Partiel: 50, Non: 0, "Non applicable": null, "À vérifier": null,
};
export const AUDIT_ANSWER_TONE: Record<string, string> = {
  Oui: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Partiel: "bg-amber-100 text-amber-700 border-amber-200",
  Non: "bg-rose-100 text-rose-700 border-rose-200",
  "Non applicable": "bg-slate-100 text-slate-400 border-slate-200",
  "À vérifier": "bg-slate-100 text-slate-500 border-slate-200",
};
/** Cycle de vie d'un audit. */
export const AUDIT_STATUS = ["Planifié", "En cours", "Terminé", "Clôturé"];
export const AUDIT_STATUS_TONE: Record<string, string> = {
  "Planifié": "bg-slate-100 text-slate-600",
  "En cours": "bg-sky-100 text-sky-700",
  "Terminé": "bg-emerald-100 text-emerald-700",
  "Clôturé": "bg-slate-200 text-slate-500",
};

/** Une question d'une grille d'audit. */
export interface AuditQuestion {
  id: string;
  domain: string; // thème de la question (axe du radar)
  text: string; // le point de contrôle
  guidance: string; // comment vérifier / preuve attendue
  weight: number; // pondération (1–3)
  critical: boolean; // point critique (priorise le constat)
}
/** Grille (référentiel) d'audit réutilisable. */
export interface AuditGrid {
  id: string;
  ref: string; // GRID-AAAA-NNN
  name: string;
  category: string; // AUDIT_CATEGORIES
  source: string; // AUDIT_SOURCES
  description: string;
  questions: AuditQuestion[];
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}
/** Domaines (axes) distincts d'une grille, dans l'ordre d'apparition. */
export const gridDomains = (questions: AuditQuestion[]): string[] => {
  const seen: string[] = [];
  questions.forEach((q) => { const d = q.domain.trim() || "Général"; if (!seen.includes(d)) seen.push(d); });
  return seen;
};

/** Réponse à une question lors d'un audit. */
export interface AuditResponse {
  questionId: string;
  answer: string; // AUDIT_ANSWERS
  note: string;
  evidence: string; // preuve / observation
}
/** Un audit réalisé : une grille (figée) appliquée à une cible, à une date. */
export interface Audit {
  id: string;
  ref: string; // AUD-AAAA-NNN
  title: string;
  gridId: string; // grille d'origine (référence)
  gridName: string; // nom figé de la grille
  category: string;
  // Grille figée à la création (score stable même si la grille évolue ensuite).
  questions: AuditQuestion[];
  targetAssetId: string | null; // cible = actif du registre (facultatif)
  targetLabel: string; // cible en texte libre (si pas d'actif)
  auditorId: string;
  date: Date | null;
  status: string; // AUDIT_STATUS
  responses: AuditResponse[];
  summary: string; // conclusion / synthèse
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditScore {
  global: number; // % pondéré sur les questions notées (hors N-A / à vérifier)
  coverage: number; // % de questions notées (hors « à vérifier »)
  answered: number; // questions notées (Oui/Partiel/Non)
  total: number; // questions de la grille
  gaps: number; // réponses Non ou Partiel (constats potentiels)
  criticalGaps: number; // constats sur des questions critiques
  byDomain: { domain: string; score: number; answered: number; total: number }[];
}

/** Calcule le score d'un audit (global pondéré + par domaine, pour le radar). */
export function computeAuditScore(questions: AuditQuestion[], responses: AuditResponse[]): AuditScore {
  const byId = new Map(responses.map((r) => [r.questionId, r]));
  const val = (r?: AuditResponse) => (r ? AUDIT_ANSWER_VALUE[r.answer] ?? null : null);

  let wSum = 0, wVal = 0, answered = 0, gaps = 0, criticalGaps = 0;
  const domainAgg = new Map<string, { wSum: number; wVal: number; answered: number; total: number }>();
  for (const q of questions) {
    const dom = q.domain.trim() || "Général";
    const agg = domainAgg.get(dom) ?? { wSum: 0, wVal: 0, answered: 0, total: 0 };
    agg.total += 1;
    const r = byId.get(q.id);
    const v = val(r);
    if (r && (r.answer === "Non" || r.answer === "Partiel")) { gaps += 1; if (q.critical) criticalGaps += 1; }
    if (v !== null) {
      const w = Math.max(0, q.weight) || 1;
      wSum += w; wVal += w * v; answered += 1;
      agg.wSum += w; agg.wVal += w * v; agg.answered += 1;
    }
    domainAgg.set(dom, agg);
  }
  const byDomain = gridDomains(questions).map((domain) => {
    const a = domainAgg.get(domain)!;
    return { domain, score: a.wSum ? Math.round(a.wVal / a.wSum) : 0, answered: a.answered, total: a.total };
  });
  return {
    global: wSum ? Math.round(wVal / wSum) : 0,
    coverage: questions.length ? Math.round((answered / questions.length) * 100) : 0,
    answered, total: questions.length, gaps, criticalGaps, byDomain,
  };
}
/** Tonalité (couleur texte) selon le score. */
export const auditScoreTone = (pct: number): string => (pct >= 80 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-rose-600");

/** Clé de cible d'un audit (actif ou libellé libre) — pour rapprocher les ré-audits. */
export const auditTargetKey = (a: Audit): string => (a.targetAssetId ? `asset:${a.targetAssetId}` : `label:${a.targetLabel.trim().toLowerCase()}`);
const auditTime = (a: Audit): number => (a.date ? a.date.getTime() : a.createdAt.getTime());
/** Audit précédent portant sur la même grille ET la même cible (le plus récent avant celui-ci). */
export function previousAudit(current: Audit, all: Audit[]): Audit | null {
  const key = auditTargetKey(current);
  const t = auditTime(current);
  const prior = all.filter((a) => a.id !== current.id && a.gridId === current.gridId && auditTargetKey(a) === key && auditTime(a) < t);
  prior.sort((a, b) => auditTime(b) - auditTime(a));
  return prior[0] ?? null;
}

/* ---------- Module Audit : Programme d'audit annuel (ISO 19011 §5) ----------
 * Le plan d'audit basé sur les risques : quels périmètres auditer, quand, par
 * qui, avec quelle priorité. Un item peut se concrétiser par un audit réalisé. */
export const AUDIT_PLAN_STATUS = ["Planifié", "En cours", "Réalisé", "Reporté", "Annulé"];
export const AUDIT_PLAN_STATUS_TONE: Record<string, string> = {
  "Planifié": "bg-slate-100 text-slate-600",
  "En cours": "bg-sky-100 text-sky-700",
  "Réalisé": "bg-emerald-100 text-emerald-700",
  "Reporté": "bg-amber-100 text-amber-700",
  "Annulé": "bg-slate-200 text-slate-400",
};
/** Priorité d'audit basée sur les risques. */
export const AUDIT_RISK_LEVELS = ["Élevé", "Moyen", "Faible"];
export const AUDIT_RISK_TONE: Record<string, string> = {
  "Élevé": "bg-rose-100 text-rose-700 border-rose-200",
  "Moyen": "bg-amber-100 text-amber-700 border-amber-200",
  "Faible": "bg-emerald-100 text-emerald-700 border-emerald-200",
};

/** Entrée du programme d'audit annuel (périmètre planifié). */
export interface AuditPlanItem {
  id: string;
  ref: string; // PROG-AAAA-NNN
  title: string; // périmètre / thème à auditer
  category: string; // AUDIT_CATEGORIES
  riskLevel: string; // AUDIT_RISK_LEVELS (priorité basée risque)
  year: number;
  quarter: string; // T1..T4
  ownerId: string; // auditeur pressenti
  targetAssetId: string | null; // cible = actif du registre (facultatif)
  targetLabel: string; // cible en texte libre
  gridId: string; // grille pressentie (facultatif)
  auditId: string; // audit réalisé qui concrétise l'item (facultatif)
  plannedDate: Date | null;
  status: string; // AUDIT_PLAN_STATUS
  objective: string; // objectif / justification de l'audit
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}
/** Un item est « en retard » si sa date planifiée est passée et qu'il n'est ni réalisé ni annulé. */
export const isAuditPlanLate = (p: AuditPlanItem, now: Date): boolean =>
  Boolean(p.plannedDate && p.plannedDate.getTime() < now.getTime() && p.status !== "Réalisé" && p.status !== "Annulé");
/** Un item « actif » compte dans la charge (ni réalisé, ni reporté, ni annulé). */
export const isAuditPlanActive = (p: AuditPlanItem): boolean => p.status === "Planifié" || p.status === "En cours";

/** Listes de référence par défaut (seed + repli si la base est vide). */
export const DEFAULT_REF_LISTS: RefLists = {
  appreciations: APPRECIATIONS,
  causes: CAUSES,
  actions: BLOCAGE_ACTIONS,
  decisions: DEFAULT_DECISIONS,
  services: DEFAULT_SERVICES,
  policies: DEFAULT_POLICIES,
};

/* ---------- Modèles de relance / réponses types ---------- */
export type TemplateCategory = "relance" | "escalade" | "cloture" | "autre";

export const TEMPLATE_CATEGORIES: { value: TemplateCategory; label: string }[] = [
  { value: "relance", label: "Relance" },
  { value: "escalade", label: "Escalade" },
  { value: "cloture", label: "Clôture" },
  { value: "autre", label: "Autre" },
];

export interface EmailTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  subject: string;
  body: string;
}

/** Variables reconnues dans un modèle (documentation affichée à l'admin). */
export const TEMPLATE_VARS: { key: string; desc: string }[] = [
  { key: "{ref}", desc: "Référence du suivi" },
  { key: "{objet}", desc: "Objet du suivi" },
  { key: "{destinataire}", desc: "Destinataire principal" },
  { key: "{service}", desc: "Service du destinataire" },
  { key: "{jours}", desc: "Jours depuis la dernière mise à jour" },
  { key: "{relances}", desc: "Nombre de relances déjà effectuées" },
  { key: "{priorite}", desc: "Priorité du suivi" },
  { key: "{moi}", desc: "Votre nom" },
];

/** Remplace les variables {clef} d'un modèle par leurs valeurs. */
export function applyTemplate(text: string, vars: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? vars[k] : m));
}

/** Modèles par défaut (seed initial, ensuite éditables en administration). */
export const DEFAULT_TEMPLATES: Omit<EmailTemplate, "id">[] = [
  {
    name: "Relance simple",
    category: "relance",
    subject: "[{ref}] Relance — {objet}",
    body:
      "Bonjour,\n\nSauf erreur de ma part, je n'ai pas encore de retour concernant « {objet} » (réf. {ref}), en attente depuis {jours} jour(s).\n\nPourriez-vous m'indiquer où en est ce point ? Je reste disponible.\n\nCordialement,\n{moi} — DSSI",
  },
  {
    name: "Relance ferme (2ᵉ relance)",
    category: "relance",
    subject: "[{ref}] 2ᵉ relance — {objet}",
    body:
      "Bonjour,\n\nMalgré ma précédente sollicitation, le point « {objet} » (réf. {ref}) reste sans réponse depuis {jours} jour(s) — {relances} relance(s) à ce jour.\n\nCe sujet étant important pour la sécurité, merci de traiter en priorité et de me confirmer une échéance.\n\nCordialement,\n{moi} — DSSI",
  },
  {
    name: "Escalade à la direction",
    category: "escalade",
    subject: "[{ref}] Escalade — {objet}",
    body:
      "Bonjour,\n\nJe porte à votre attention le point « {objet} » (réf. {ref}), sans mouvement depuis {jours} jour(s) malgré {relances} relance(s) auprès de {destinataire}.\n\nUne décision de votre part est nécessaire pour débloquer la situation.\n\nCordialement,\n{moi} — DSSI",
  },
  {
    name: "Accusé de clôture",
    category: "cloture",
    subject: "[{ref}] Clôturé — {objet}",
    body:
      "Bonjour,\n\nLe point « {objet} » (réf. {ref}) est désormais traité et clôturé de notre côté. Merci pour votre collaboration.\n\nCordialement,\n{moi} — DSSI",
  },
];

/* ---------- Pièces jointes / preuves ---------- */
export interface Attachment {
  id: string;
  itemId: string;
  filename: string;
  mime: string;
  size: number;
  uploadedBy: string;
  createdAt: Date;
}

/** Fichier partagé d'un projet (même stockage que les pièces jointes de suivi). */
export interface ProjectAttachment {
  id: string;
  projectId: string;
  filename: string;
  mime: string;
  size: number;
  uploadedBy: string;
  createdAt: Date;
}

/** Taille maximale d'une pièce jointe (10 Mo). */
export const ATTACH_MAX_BYTES = 10 * 1024 * 1024;

/** Extensions autorisées (preuves : images, PDF, mails, bureautique, archives). */
export const ATTACH_EXTS = [
  "png", "jpg", "jpeg", "webp", "gif", "pdf", "txt", "csv",
  "eml", "msg", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "zip",
];

/** Extension (minuscule, sans point) d'un nom de fichier. */
export function fileExt(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

/** Taille lisible (Ko / Mo). */
export function formatBytes(n: number): string {
  if (n < 1024) return `${n} o`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} Ko`;
  return `${(n / (1024 * 1024)).toFixed(1)} Mo`;
}

/* ---------- Helpers temps ---------- */
export const DAY = 864e5;
export const daysAgo = (n: number): Date => new Date(Date.now() - n * DAY);
export const daysBetween = (a: Date, b: Date): number =>
  Math.floor((b.getTime() - a.getTime()) / DAY);
export const fmt = (d: Date): string =>
  d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
export const fmtLong = (d: Date): string =>
  d.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "long" });

/* ---------- 4.8 · Parse d'un objet de mail normalisé ---------- */
export interface ParsedSubject {
  metier: string;
  type: string;
  urgent: boolean;
  ref: string;
  objet: string;
}

export function parseSubject(
  raw: string,
  catalogue: Catalogue = DEFAULT_CATALOGUE
): ParsedSubject | null {
  if (!raw) return null;
  let s = raw.trim();
  // Tolère Re: / Fwd: / Tr: / Fw: empilés
  for (let i = 0; i < 4; i++) s = s.replace(/^(re|fwd|tr|fw)\s*:\s*/i, "");
  const m = s.match(
    /\[([A-Z]{2,6})-(?:2026-)?([0-9#]+)\]\s*(!?[A-Z]+)(?:\s+\d+)?\s*[—–-]\s*(.+)/
  );
  if (!m) return null;
  const metier = m[1].toUpperCase();
  const num = m[2];
  const type = m[3].replace("!", "").toUpperCase();
  if (!catalogue.metiers[metier] || !catalogue.types[type]) return null; // rejet si hors catalogue
  return {
    metier,
    type,
    urgent: m[3].startsWith("!"),
    ref: `${metier}-${num}`,
    objet: m[4].trim(),
  };
}

/* ---------- Assemblage d'une référence (saisie par listes) ---------- */
export const REF_YEAR = 2026;

/**
 * Prochain numéro pour un métier donné, calculé à partir des objets
 * existants (max des numéros observés + 1, ou 1 si aucun).
 *
 * TODO (Phase 2 · Supabase) : remplacer ce calcul en mémoire par une
 * séquence par métier en base (ex. table `ref_counters` ou `nextval`
 * d'une séquence Postgres dédiée), pour rester correct en multi-utilisateurs.
 */
export function nextRefNumber(items: Item[], metier: string): number {
  const nums = items
    .filter((i) => i.metier === metier)
    .map((i) => {
      const m = i.ref.match(/(\d+)\s*$/); // dernier groupe de chiffres de la réf
      return m ? parseInt(m[1], 10) : 0;
    });
  return nums.length ? Math.max(...nums) + 1 : 1;
}

/** Construit la référence normalisée. CASE = sans année (n° TheHive). */
export function buildRef(metier: string, num: number | string, year: number = REF_YEAR): string {
  if (metier === "CASE") return `CASE-${num}`;
  return `${metier}-${year}-${String(num).padStart(4, "0")}`;
}

/** Ligne d'objet normalisée assemblée : `[REF] TYPE — objet`. */
export function buildSubjectLine(ref: string, type: string, objet: string): string {
  return `[${ref}] ${type} — ${objet}`.trim();
}

/** Extrait objet/expéditeur/destinataire/points d'un e-mail collé (heuristique). */
export function parseEmail(raw: string): { subject: string; from: string; to: string; points: string[] } {
  const lines = raw.split(/\r?\n/);
  const grab = (re: RegExp): string => {
    for (const l of lines) {
      const m = l.match(re);
      if (m) return m[1].trim();
    }
    return "";
  };
  // « Nom <email> » → nom si présent, sinon l'adresse ; garde le 1er destinataire.
  const clean = (v: string): string => {
    if (!v) return "";
    const first = v.split(/[,;]/)[0].trim();
    const m = first.match(/^([^<]+)<([^>]+)>/);
    if (m) return (m[1].trim() || m[2].trim()).replace(/^["']|["']$/g, "");
    return first.replace(/[<>]/g, "").trim();
  };
  const subject = grab(/^\s*(?:objet|subject)\s*:\s*(.+)$/i);
  const from = clean(grab(/^\s*(?:de|from|exp[ée]diteur)\s*:\s*(.+)$/i));
  const to = clean(grab(/^\s*(?:[àa]|to|destinataire|pour)\s*:\s*(.+)$/i));

  // Corps : après la 1re ligne vide qui suit un en-tête, sinon lignes non-en-tête.
  const headerRe = /^\s*(?:objet|subject|de|from|exp[ée]diteur|[àa]|to|cc|destinataire|pour|date|envoy[ée])\s*:/i;
  const body: string[] = [];
  let inBody = false;
  for (const l of lines) {
    if (!inBody) {
      if (l.trim() === "" ) { inBody = true; continue; }
      if (headerRe.test(l)) continue;
      inBody = true;
    }
    const t = l.replace(/^\s*[-•*·▸]\s*/, "").trim();
    if (t && !/^>/.test(t) && !/^--\s*$/.test(t)) body.push(t);
  }
  const points = body.filter((p) => p.length > 3).slice(0, 6);

  return { subject, from, to, points };
}

/* ---------- 4.5 · État de relance d'un item ---------- */
export type ReminderLevel = "none" | "ok" | "relance" | "escalade" | "bloque";

export interface ReminderState {
  level: ReminderLevel;
  days: number;
  dueIn?: number;
}

/**
 * Date de la dernière action « sortante » vers le destinataire : envoi initial
 * ou dernière relance. C'est le point de départ de l'horloge SLA — de sorte
 * qu'une note, un changement de statut ou une correction de libellé ne repousse
 * PAS l'échéance de relance/escalade (« Rien ne dérive »).
 */
export function lastOutboundDate(item: Item): Date {
  let d = item.dateCreation;
  for (const e of item.timeline) {
    if ((e.kind === "envoi" || e.kind === "relance") && e.date > d) d = e.date;
  }
  return d;
}

/** Échéance de traitement personnalisée (création + durée acceptable), ou null. */
export function customDeadline(item: Item): Date | null {
  if (item.dueDurationDays == null || item.dueDurationDays <= 0) return null;
  return new Date(item.dateCreation.getTime() + item.dueDurationDays * DAY);
}

/** Le suivi a-t-il dépassé sa durée de traitement acceptable ? */
export function isOverDuration(item: Item, now: Date): boolean {
  if (item.statut === "Clôturé") return false;
  const dl = customDeadline(item);
  return dl != null && now.getTime() > dl.getTime();
}

/** « En retard » au sens durée : dépassement de la durée OU marqué manuellement. */
export function isLateByDuration(item: Item, now: Date): boolean {
  return item.statut !== "Clôturé" && (item.markedLate === true || isOverDuration(item, now));
}

export function reminderState(
  item: Item,
  now: Date,
  types: Record<string, TypeDef> = TYPES
): ReminderState {
  if (item.statut === "Clôturé") return { level: "none", days: 0 };
  const sla = types[item.type]?.sla;
  // Horloge mesurée depuis la dernière action sortante, pas depuis dateMaj.
  const d = daysBetween(lastOutboundDate(item), now);
  // Une réponse reçue (« En traitement ») suspend la relance : on n'attend plus
  // le destinataire, la balle est dans notre camp.
  if (item.statut === "En traitement") return { level: "ok", days: d };
  if (item.statut === "Bloqué") return { level: "bloque", days: d };
  if (!sla) return { level: "none", days: d };
  if (d >= sla.escalade) return { level: "escalade", days: d };
  if (d >= sla.relance) return { level: "relance", days: d };
  return { level: "ok", days: d, dueIn: sla.relance - d };
}

/* ---------- 4.6 · Score « culture juste » ---------- */
export interface Score {
  id: string;
  score: number;
  closures: number;
  relances: number;
  reponses: number;
  retard: number;
  actifs: number;
  badges: string[];
}

export function computeScores(
  items: Item[],
  profiles: Profile[],
  now: Date,
  types: Record<string, TypeDef> = TYPES
): Score[] {
  const map: Record<string, Score> = {};
  profiles
    .filter((u) => u.role === "agent")
    .forEach((u) => {
      map[u.id] = {
        id: u.id,
        score: 0,
        closures: 0,
        relances: 0,
        reponses: 0,
        retard: 0,
        actifs: 0,
        badges: [],
      };
    });

  items.forEach((it) => {
    const s = map[it.ownerId];
    if (!s) return;
    if (it.statut !== "Clôturé") s.actifs++;
    if (it.statut === "Clôturé") {
      s.score += 10;
      s.closures++;
    }
    if (it.relancesCount) {
      s.score += it.relancesCount * 5;
      s.relances += it.relancesCount;
    }
    if (it.timeline.some((e) => e.kind === "reponse")) {
      s.score += 8;
      s.reponses++;
    }
    if (reminderState(it, now, types).level === "escalade") {
      s.score -= 4;
      s.retard++;
    }
  });

  Object.values(map).forEach((s) => {
    s.score = Math.max(0, s.score);
    s.badges = [];
    if (s.relances >= 3) s.badges.push("Relanceur");
    if (s.closures >= 2) s.badges.push("Closeur");
    if (s.reponses >= 3) s.badges.push("Réactif");
    if (s.retard === 0) s.badges.push("Zéro oubli");
  });

  return Object.values(map).sort((a, b) => b.score - a.score);
}

/* ---------- Notifications (moteur de relance) ---------- */
export type NotifKind = "relance" | "escalade" | "digest" | "echeance" | "message" | "projet" | "tache" | "securite" | "reunion";

export interface Notif {
  id: string;
  userId: string;
  itemId: string | null;
  kind: NotifKind;
  message: string;
  channel: string[];
  read: boolean;
  createdAt: Date;
  /** Cible de navigation au clic (route interne, ex. « /projets/<id> »). */
  link?: string | null;
}

/* ---------- Module Projet ---------- */
export type ProjectStatus = "En cours" | "En pause" | "Terminé" | "Annulé";
export const PROJECT_STATUTS: ProjectStatus[] = ["En cours", "En pause", "Terminé", "Annulé"];

export type TaskStatus = "à faire" | "en cours" | "fait" | "bloqué";
export const TASK_STATUTS: TaskStatus[] = ["à faire", "en cours", "fait", "bloqué"];

export type TaskPriority = "Basse" | "Normale" | "Haute" | "Urgente";
export const TASK_PRIORITIES: TaskPriority[] = ["Basse", "Normale", "Haute", "Urgente"];
export const TASK_PRIORITY_WEIGHT: Record<TaskPriority, number> = {
  Basse: 1,
  Normale: 2,
  Haute: 3,
  Urgente: 5,
};

/* ---------- Tâches assignables (productivité) ----------
 * Unité de travail attribuable à une personne, autonome ou rattachée à un
 * projet. Alimente l'espace personnel et la vue Productivité. */
export interface Task {
  id: string;
  title: string;
  description: string;
  assigneeId: string | null;
  createdBy: string | null;
  projectId: string | null; // contexte optionnel
  status: TaskStatus;
  priority: TaskPriority;
  startDate: Date | null; // planification : début prévu
  dueDate: Date | null; // planification : échéance
  createdAt: Date;
  completedAt: Date | null;
  subtasks: Subtask[];
  /** Visibilité : `false` = privé (créateur seul), `true`/absent = publié (équipe). */
  published?: boolean;
}

/** Élément d'une checklist de sous-tâches. */
export interface Subtask {
  id: string;
  taskId: string;
  title: string;
  done: boolean;
  ordre: number;
}

export const subtaskProgress = (t: Task): { done: number; total: number; pct: number } => {
  const total = t.subtasks.length;
  const done = t.subtasks.filter((s) => s.done).length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
};

export interface ProjectTask {
  id: string;
  projectId: string;
  title: string;
  description: string;
  assigneeId: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: Date | null;
  completedAt: Date | null;
  ordre: number;
  createdAt: Date;
  /** Auteur de la proposition à l'origine de la tâche (Lot 3), ou null si ajout direct. */
  proposedBy?: string | null;
}

export interface ProjectNote {
  id: string;
  projectId: string;
  authorId: string;
  body: string;
  createdAt: Date;
}

/* ---------- Proposition de tâche (Lot 3 — « pull request ») ----------
 * Un non-membre propose une tâche sur un projet ; le propriétaire l'approuve
 * (merge → devient une tâche du projet) ou la refuse. */
export type ProposalStatus = "en_attente" | "approuvee" | "refusee";

export interface ProjectTaskProposal {
  id: string;
  projectId: string;
  title: string;
  description: string;
  dueDate: Date | null;
  proposedBy: string;
  status: ProposalStatus;
  decidedBy: string | null;
  decisionNote: string;
  mergedTaskId: string | null; // tâche créée à l'approbation
  createdAt: Date;
  decidedAt: Date | null;
}

/* ---------- Demande de clôture d'un projet ---------- */
export type ClosureStatus = "en_attente" | "validee" | "rejetee";

export interface ClosureRequest {
  id: string;
  projectId: string;
  requestedBy: string;
  summary: string; // récapitulatif des phases/actions achevées
  deliverables: string[]; // livrables
  status: ClosureStatus;
  decidedBy: string | null;
  decisionNote: string;
  createdAt: Date;
  decidedAt: Date | null;
}

/** Demande de suppression d'un projet, en attente d'approbation manager/admin. */
export interface ProjectDeletionRequest {
  requestedBy: string;
  reason: string;
  requestedAt: Date;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  status: ProjectStatus;
  deadline: Date | null;
  sourceItemId: string | null; // suivi (métier PRJ) à l'origine du projet
  createdAt: Date;
  tasks: ProjectTask[];
  memberIds: string[];
  notes: ProjectNote[];
  /** Changement de statut proposé, en attente de validation du directeur. */
  pendingStatus: string | null;
  pendingBy: string | null;
  /** Dernière demande de clôture (la plus récente), le cas échéant. */
  closure: ClosureRequest | null;
  /** Projet archivé (masqué des vues actives, conservé). */
  archived: boolean;
  /** Demande de suppression en attente d'approbation (ou null). */
  deletionRequest: ProjectDeletionRequest | null;
  /** Visibilité : `false` = privé (créateur seul), `true`/absent = publié (équipe). */
  published?: boolean;
  /** Propositions de tâches (Lot 3) — en attente et décidées. */
  proposals: ProjectTaskProposal[];
}

/**
 * Interrupteur de la fonctionnalité « espace privé / publication » (Lot 2).
 *
 * `false` (par défaut) : la fonctionnalité est DÉSACTIVÉE — toute création est
 * publiée d'emblée et l'application se comporte comme avant le Lot 2 (tout est
 * visible par l'équipe). Tout le code de visibilité reste en place mais devient
 * inerte (les filtres laissent tout passer, les badges/boutons « Publier » ne
 * s'affichent pas). Passer à `true` pour réactiver le privé par défaut.
 */
export const PRIVATE_SPACE_ENABLED = false;

/**
 * Vrai si l'élément est visible par l'équipe (publié). L'absence de champ vaut
 * « publié » (rétrocompatibilité : données de démo et anciens enregistrements).
 */
export const isPublished = (x: { published?: boolean }): boolean => x.published !== false;

/** Vrai si `viewerId` a le droit de voir l'élément (publié, ou son créateur/propriétaire). */
export const canView = (x: { published?: boolean; ownerId?: string; createdBy?: string | null }, viewerId: string): boolean =>
  x.published !== false || x.ownerId === viewerId || x.createdBy === viewerId;

export interface ProjectMetrics {
  total: number;
  done: number;
  open: number;
  late: number;
  progress: number; // %
}

export function projectMetrics(p: Project, now: Date): ProjectMetrics {
  const total = p.tasks.length;
  const done = p.tasks.filter((t) => t.status === "fait").length;
  const late =
    p.status === "Terminé"
      ? 0
      : p.tasks.filter((t) => t.status !== "fait" && t.dueDate && t.dueDate.getTime() < now.getTime()).length;
  // Un projet terminé est à 100 % d'avancement, quel que soit l'état des tâches.
  const progress = p.status === "Terminé" ? 100 : total ? Math.round((done / total) * 100) : 0;
  return { total, done, open: total - done, late, progress };
}

/** Un projet archivé (explicitement, ou terminé/annulé) est masqué de la liste active. */
export const isProjectArchived = (p: Project): boolean =>
  p.archived === true || p.status === "Terminé" || p.status === "Annulé";

/* ---------- Radar de profil (gamification) ----------
 * Six dimensions de performance, normalisées 0–100 relativement à l'équipe
 * (le meilleur membre d'un axe = 100). « Ponctualité » est inversée : le plus
 * d'escalades = 0, aucune = 100. */
export const RADAR_DIMENSIONS = [
  { key: "reponses", label: "Réponses", hint: "Mails ayant reçu une réponse" },
  { key: "taches", label: "Tâches", hint: "Tâches terminées (perso + projet)" },
  { key: "projets", label: "Projets", hint: "Avancement moyen des projets portés" },
  { key: "reactivite", label: "Réactivité", hint: "Relances effectuées" },
  { key: "clotures", label: "Clôtures", hint: "Suivis menés jusqu'à « Clôturé »" },
  { key: "ponctualite", label: "Ponctualité", hint: "Absence d'escalades / de retard" },
] as const;

export interface RadarResult {
  labels: string[];
  hints: string[];
  byMember: Record<string, number[]>; // normalisé 0–100, aligné sur labels
  rawByMember: Record<string, number[]>; // valeurs brutes (info-bulle)
  average: number[]; // moyenne d'équipe normalisée
}

export function computeRadar(
  memberIds: string[],
  items: Item[],
  tasks: Task[],
  projects: Project[],
  now: Date,
  types: Record<string, TypeDef> = TYPES
): RadarResult {
  // Métriques brutes par membre.
  const raw: Record<string, { reponses: number; taches: number; projets: number; reactivite: number; clotures: number; retard: number }> = {};
  const projProg: Record<string, number[]> = {}; // avancements des projets où chaque membre est impliqué
  memberIds.forEach((id) => (raw[id] = { reponses: 0, taches: 0, projets: 0, reactivite: 0, clotures: 0, retard: 0 }));

  items.forEach((it) => {
    const r = raw[it.ownerId];
    if (!r) return;
    if (it.timeline.some((e) => e.kind === "reponse")) r.reponses++;
    if (it.statut === "Clôturé") r.clotures++;
    r.reactivite += it.relancesCount || 0;
    if (reminderState(it, now, types).level === "escalade") r.retard++;
  });
  // Tâches terminées (Productivité + tâches de projet).
  tasks.forEach((t) => {
    if (t.status === "fait" && t.assigneeId && raw[t.assigneeId]) raw[t.assigneeId].taches++;
  });
  projects.forEach((p) => {
    p.tasks.forEach((t) => {
      if (t.status === "fait" && t.assigneeId && raw[t.assigneeId]) raw[t.assigneeId].taches++;
    });
    // Avancement des projets portés (propriétaire ou membre) : moyenne par membre.
    const prog = projectMetrics(p, now).progress;
    const involved = new Set([p.ownerId, ...p.memberIds]);
    involved.forEach((id) => {
      if (raw[id]) projProg[id] = [...(projProg[id] ?? []), prog];
    });
  });
  // Moyenne d'avancement projet par membre.
  memberIds.forEach((id) => {
    const arr = projProg[id] ?? [];
    raw[id].projets = arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
  });

  // Maxima d'équipe pour la normalisation.
  const maxOf = (sel: (m: (typeof raw)[string]) => number) => Math.max(0, ...memberIds.map((id) => sel(raw[id])));
  const maxReponses = maxOf((m) => m.reponses);
  const maxTaches = maxOf((m) => m.taches);
  const maxProjets = maxOf((m) => m.projets);
  const maxReactivite = maxOf((m) => m.reactivite);
  const maxClotures = maxOf((m) => m.clotures);
  const maxRetard = maxOf((m) => m.retard);
  const pct = (v: number, max: number) => (max > 0 ? Math.round((v / max) * 100) : 0);

  const byMember: Record<string, number[]> = {};
  const rawByMember: Record<string, number[]> = {};
  memberIds.forEach((id) => {
    const m = raw[id];
    byMember[id] = [
      pct(m.reponses, maxReponses),
      pct(m.taches, maxTaches),
      pct(m.projets, maxProjets),
      pct(m.reactivite, maxReactivite),
      pct(m.clotures, maxClotures),
      maxRetard > 0 ? Math.round((1 - m.retard / maxRetard) * 100) : 100, // ponctualité (inversée)
    ];
    rawByMember[id] = [m.reponses, m.taches, m.projets, m.reactivite, m.clotures, m.retard];
  });

  const average = RADAR_DIMENSIONS.map((_, i) =>
    memberIds.length ? Math.round(memberIds.reduce((a, id) => a + byMember[id][i], 0) / memberIds.length) : 0
  );

  return {
    labels: RADAR_DIMENSIONS.map((d) => d.label),
    hints: RADAR_DIMENSIONS.map((d) => d.hint),
    byMember,
    rawByMember,
    average,
  };
}

/* ---------- Plan de l'année (objectifs annuels) ---------- */
export type ObjectiveStatus = "planifie" | "en_cours" | "atteint" | "declasse";
export const OBJECTIVE_STATUTS: ObjectiveStatus[] = ["planifie", "en_cours", "atteint", "declasse"];
export const OBJECTIVE_STATUT_LABEL: Record<ObjectiveStatus, string> = {
  planifie: "Planifié",
  en_cours: "En cours",
  atteint: "Atteint",
  declasse: "Déclassé",
};
/** Palette de couleurs pour les objectifs (accents de la timeline). */
export const OBJECTIVE_COLORS = ["#10b981", "#0ea5e9", "#8b5cf6", "#f59e0b", "#f43f5e", "#14b8a6", "#6366f1", "#ec4899"];

/** Niveau de criticité d'un objectif, avec label de couleur associé. */
export type ObjectiveCriticality = "Basse" | "Moyenne" | "Haute" | "Critique";
export const OBJECTIVE_CRITICALITIES: ObjectiveCriticality[] = ["Basse", "Moyenne", "Haute", "Critique"];
/** Classes de badge (fond + texte + bordure) par niveau de criticité. */
export const OBJECTIVE_CRITICALITY_TONE: Record<ObjectiveCriticality, string> = {
  Basse: "bg-slate-100 text-slate-600 border-slate-200",
  Moyenne: "bg-sky-100 text-sky-700 border-sky-200",
  Haute: "bg-amber-100 text-amber-700 border-amber-200",
  Critique: "bg-rose-100 text-rose-700 border-rose-200",
};
/** Pastille de couleur pleine par niveau (pour les puces). */
export const OBJECTIVE_CRITICALITY_DOT: Record<ObjectiveCriticality, string> = {
  Basse: "bg-slate-400",
  Moyenne: "bg-sky-500",
  Haute: "bg-amber-500",
  Critique: "bg-rose-500",
};

export interface Milestone {
  id: string;
  label: string;
  date: Date;
  done: boolean;
}

export interface Objective {
  id: string;
  title: string;
  /** Sous-titre court (accroche), sous le titre. */
  subtitle: string;
  description: string;
  /** Niveau de criticité (label de couleur). */
  criticality: ObjectiveCriticality;
  startDate: Date;
  endDate: Date;
  ownerId: string;
  color: string;
  status: ObjectiveStatus;
  projectIds: string[];
  taskIds: string[];
  memberIds: string[];
  milestones: Milestone[];
  downgradeReason: string;
  downgradedBy: string | null;
  downgradedAt: Date | null;
  createdBy: string | null;
  createdAt: Date;
}

/** Avancement automatique d'un objectif, dérivé des projets et tâches liés. */
export function objectiveProgress(o: Objective, projects: Project[], tasks: Task[], now: Date): number {
  if (o.status === "atteint") return 100;
  const units: number[] = [];
  projects.filter((p) => o.projectIds.includes(p.id)).forEach((p) => units.push(projectMetrics(p, now).progress));
  tasks.filter((t) => o.taskIds.includes(t.id)).forEach((t) => units.push(t.status === "fait" ? 100 : t.status === "en cours" ? 40 : 0));
  if (units.length === 0) return 0;
  return Math.round(units.reduce((s, v) => s + v, 0) / units.length);
}

/** Fraction de la période écoulée (0..100). */
export function objectiveTimePct(o: Objective, now: Date): number {
  const start = o.startDate.getTime();
  const end = o.endDate.getTime();
  if (now.getTime() <= start) return 0;
  if (now.getTime() >= end) return 100;
  return Math.round(((now.getTime() - start) / (end - start)) * 100);
}

export type ObjectiveHealth = "planned" | "on_track" | "at_risk" | "late" | "done" | "downgraded";
/** Santé d'un objectif : en avance/à l'heure, à risque, en retard… */
export function objectiveHealth(o: Objective, progress: number, now: Date): ObjectiveHealth {
  if (o.status === "atteint") return "done";
  if (o.status === "declasse") return "downgraded";
  if (now.getTime() < o.startDate.getTime()) return "planned";
  const timePct = objectiveTimePct(o, now);
  if (now.getTime() > o.endDate.getTime() && progress < 100) return "late";
  if (progress < timePct - 20) return "at_risk";
  return "on_track";
}

/* ---------- Productivité ---------- */
export const isTaskOpen = (t: Task): boolean => t.status !== "fait";
export const isTaskLate = (t: Task, now: Date): boolean =>
  t.status !== "fait" && !!t.dueDate && t.dueDate.getTime() < now.getTime();

export interface MemberProductivity {
  id: string;
  tasksTotal: number;
  tasksOpen: number;
  tasksDone: number;
  tasksLate: number;
  tasksBlocked: number;
  doneRecent: number; // achevées sur la fenêtre récente (déf. 30 j)
  completionRate: number; // % achevées / total
  charge: number; // somme pondérée des tâches ouvertes (par priorité)
}

/** Indicateurs de rendement d'une personne à partir de ses tâches. */
export function memberProductivity(memberId: string, tasks: Task[], now: Date, windowDays = 30): MemberProductivity {
  const mine = tasks.filter((t) => t.assigneeId === memberId);
  const since = now.getTime() - windowDays * 86400000;
  const done = mine.filter((t) => t.status === "fait");
  const doneRecent = done.filter((t) => t.completedAt && t.completedAt.getTime() >= since).length;
  const open = mine.filter(isTaskOpen);
  const charge = open.reduce((s, t) => s + (TASK_PRIORITY_WEIGHT[t.priority] ?? 2), 0);
  return {
    id: memberId,
    tasksTotal: mine.length,
    tasksOpen: open.length,
    tasksDone: done.length,
    tasksLate: mine.filter((t) => isTaskLate(t, now)).length,
    tasksBlocked: mine.filter((t) => t.status === "bloqué").length,
    doneRecent,
    completionRate: mine.length ? Math.round((done.length / mine.length) * 100) : 0,
    charge,
  };
}

export const PROJECT_METIER = "PRJ"; // métier déclencheur d'un projet

/* ---------- Gamification (honorifique) ---------- */
export const XP = {
  cloture: 15,
  reponse: 10,
  relance: 3,
  tache: 12, // achèvement d'une tâche (poids renforcé)
  sousTache: 2, // sous-tâche cochée
  projet: 120, // projet mené à terme (poids renforcé)
  objectif: 200,
};

export const LEVELS: { min: number; name: string; icon: string }[] = [
  { min: 0, name: "Novice", icon: "🌱" },
  { min: 150, name: "Éclaireur", icon: "🧭" },
  { min: 450, name: "Confirmé", icon: "⚙️" },
  { min: 1000, name: "Expert", icon: "🛡️" },
  { min: 2000, name: "Maître", icon: "⭐" },
  { min: 3500, name: "Légende", icon: "👑" },
];

export interface Badge {
  id: string;
  label: string;
  icon: string;
  desc: string;
  earned: boolean;
}

/** Détail de l'XP par source d'accomplissement (pour l'afficher au classement). */
export interface GameSources {
  mails: number; // clôtures + réponses + relances
  taches: number; // tâches + sous-tâches achevées
  projets: number; // projets menés à terme
  objectifs: number; // objectifs annuels atteints
}
/** Compteurs bruts d'accomplissement. */
export interface GameCounts {
  cloture: number;
  reponse: number;
  relance: number;
  tache: number;
  sousTache: number;
  projet: number;
  objectif: number;
}
export interface GameProfile {
  id: string;
  xp: number;
  level: number; // index dans LEVELS
  levelName: string;
  levelIcon: string;
  nextXp: number | null; // XP du prochain palier (null si niveau max)
  progressPct: number; // progression vers le prochain niveau
  badges: Badge[];
  sources: GameSources; // répartition de l'XP par source
  counts: GameCounts; // compteurs d'accomplissement
}

/** Profil de jeu (XP, niveau, badges) dérivé de l'activité réelle. */
export function computeGame(
  id: string,
  items: Item[],
  tasks: Task[],
  projects: Project[],
  objectives: Objective[]
): GameProfile {
  const mine = items.filter((i) => i.ownerId === id);
  const cloture = mine.filter((i) => i.statut === "Clôturé").length;
  const reponse = mine.reduce((s, i) => s + i.timeline.filter((e) => e.kind === "reponse").length, 0);
  const relance = mine.reduce((s, i) => s + i.relancesCount, 0);
  const myTasks = tasks.filter((t) => t.assigneeId === id);
  const tache = myTasks.filter((t) => t.status === "fait").length;
  const sousTache = myTasks.reduce((s, t) => s + t.subtasks.filter((x) => x.done).length, 0);
  const projet = projects.filter((p) => p.ownerId === id && p.status === "Terminé").length;
  const objectif = objectives.filter((o) => o.status === "atteint" && (o.ownerId === id || o.memberIds.includes(id))).length;
  const lateOwned = mine.filter((i) => i.statut !== "Clôturé").filter((i) => i.priorite === "Critique").length; // approximation douce

  const xp =
    cloture * XP.cloture +
    reponse * XP.reponse +
    relance * XP.relance +
    tache * XP.tache +
    sousTache * XP.sousTache +
    projet * XP.projet +
    objectif * XP.objectif;

  let level = 0;
  for (let i = 0; i < LEVELS.length; i++) if (xp >= LEVELS[i].min) level = i;
  const nextXp = level < LEVELS.length - 1 ? LEVELS[level + 1].min : null;
  const base = LEVELS[level].min;
  const progressPct = nextXp ? Math.round(((xp - base) / (nextXp - base)) * 100) : 100;

  const badges: Badge[] = [
    { id: "premiere", label: "Première clôture", icon: "✅", desc: "Clôturer un premier suivi de mail.", earned: cloture >= 1 },
    { id: "sentinelle", label: "Sentinelle", icon: "🛡️", desc: "25 suivis de mail clôturés.", earned: cloture >= 25 },
    { id: "marathon", label: "Marathonien", icon: "🏅", desc: "100 suivis de mail clôturés.", earned: cloture >= 100 },
    { id: "reactif", label: "Réactif", icon: "⚡", desc: "20 réponses obtenues.", earned: reponse >= 20 },
    { id: "besogneux", label: "Bourreau de travail", icon: "💪", desc: "25 tâches achevées.", earned: tache >= 25 },
    { id: "chef", label: "Chef d'orchestre", icon: "🎼", desc: "Mener un projet à son terme.", earned: projet >= 1 },
    { id: "cap", label: "Cap sur l'année", icon: "🎯", desc: "Atteindre un objectif annuel.", earned: objectif >= 1 },
    { id: "zero", label: "Zéro dérive", icon: "🧭", desc: "Aucun suivi critique en cours (≥ 5 clôturés).", earned: lateOwned === 0 && cloture >= 5 },
    { id: "veteran", label: "Vétéran", icon: "🎖️", desc: "50 suivis de mail clôturés.", earned: cloture >= 50 },
    { id: "pilier", label: "Pilier", icon: "🏛️", desc: "3 projets menés à terme.", earned: projet >= 3 },
    { id: "stratege", label: "Stratège", icon: "♟️", desc: "3 objectifs annuels atteints.", earned: objectif >= 3 },
    { id: "polyvalent", label: "Couteau suisse", icon: "🧰", desc: "Une clôture, une tâche, un projet et un objectif.", earned: cloture >= 1 && tache >= 1 && projet >= 1 && objectif >= 1 },
  ];

  const sources: GameSources = {
    mails: cloture * XP.cloture + reponse * XP.reponse + relance * XP.relance,
    taches: tache * XP.tache + sousTache * XP.sousTache,
    projets: projet * XP.projet,
    objectifs: objectif * XP.objectif,
  };
  const counts: GameCounts = { cloture, reponse, relance, tache, sousTache, projet, objectif };
  return { id, xp, level, levelName: LEVELS[level].name, levelIcon: LEVELS[level].icon, nextXp, progressPct, badges, sources, counts };
}

/** Début de la semaine (lundi 00:00) contenant `d`. */
export function weekStart(d: Date): Date {
  const s = new Date(d);
  const day = (s.getDay() + 6) % 7; // lundi = 0
  s.setDate(s.getDate() - day);
  s.setHours(0, 0, 0, 0);
  return s;
}

export interface Challenge {
  id: string;
  label: string;
  icon: string;
  current: number;
  target: number;
  done: boolean;
}

/** Défis de la semaine, dérivés de l'activité récente de la personne. */
export function weeklyChallenges(id: string, items: Item[], tasks: Task[], now: Date): Challenge[] {
  const ws = weekStart(now).getTime();
  const mine = items.filter((i) => i.ownerId === id);
  const evWeek = (kind: string) => mine.reduce((s, i) => s + i.timeline.filter((e) => e.kind === kind && e.date.getTime() >= ws).length, 0);
  const clot = evWeek("cloture");
  const rep = evWeek("reponse");
  const tks = tasks.filter((t) => t.assigneeId === id && t.status === "fait" && t.completedAt && t.completedAt.getTime() >= ws).length;
  const mk = (cur: number, target: number, label: string, icon: string, idc: string): Challenge => ({ id: idc, label, icon, current: Math.min(cur, target), target, done: cur >= target });
  return [
    mk(clot, 5, "Clôture 5 suivis de mail", "✅", "c_clot"),
    mk(rep, 3, "Obtiens 3 réponses", "⚡", "c_rep"),
    mk(tks, 4, "Achève 4 tâches", "☑️", "c_task"),
  ];
}

/** Membre du mois : plus forte activité du mois en cours (id du profil). */
export function memberOfMonth(profileIds: string[], items: Item[], tasks: Task[], now: Date): string | null {
  const ms = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  let bestId: string | null = null;
  let best = 0;
  for (const id of profileIds) {
    const mine = items.filter((i) => i.ownerId === id);
    const clot = mine.reduce((s, i) => s + i.timeline.filter((e) => e.kind === "cloture" && e.date.getTime() >= ms).length, 0);
    const rep = mine.reduce((s, i) => s + i.timeline.filter((e) => e.kind === "reponse" && e.date.getTime() >= ms).length, 0);
    const tks = tasks.filter((t) => t.assigneeId === id && t.status === "fait" && t.completedAt && t.completedAt.getTime() >= ms).length;
    const score = clot * 3 + rep * 2 + tks;
    if (score > best) {
      best = score;
      bestId = id;
    }
  }
  return best > 0 ? bestId : null;
}

/* ---------- Module Réunion ----------
 * Une réunion peut être autonome ou reliée à un ou plusieurs sujets déjà
 * présents (projet, tâche, suivi, négligence, non-conformité, objectif), avec
 * des participants (membres et/ou contacts de l'annuaire). Ces liens alimentent
 * le graphe de relations. */
export type MeetingStatus = "planifiée" | "tenue" | "annulée";
export const MEETING_STATUTS: MeetingStatus[] = ["planifiée", "tenue", "annulée"];

/** Types d'entités auxquelles une réunion peut être rattachée. */
export type MeetingLinkType = "project" | "task" | "item" | "negligence" | "nonconformite" | "objective";
export const MEETING_LINK_TYPES: { type: MeetingLinkType; label: string }[] = [
  { type: "item", label: "Suivi de mail" },
  { type: "project", label: "Projet" },
  { type: "task", label: "Tâche" },
  { type: "negligence", label: "Négligence" },
  { type: "nonconformite", label: "Non-conformité" },
  { type: "objective", label: "Objectif annuel" },
];

export type MeetingPresence = "invité" | "présent" | "absent" | "excusé";
export const MEETING_PRESENCES: MeetingPresence[] = ["invité", "présent", "absent", "excusé"];

export interface MeetingParticipant {
  kind: "member" | "contact";
  id: string; // profileId ou contactId
  presence: MeetingPresence;
}
export interface MeetingLink {
  type: MeetingLinkType;
  id: string;
}

/** Pièce jointe d'une réunion (support, PV signé…). */
export interface MeetingAttachment {
  id: string;
  meetingId: string;
  filename: string;
  mime: string;
  size: number;
  uploadedBy: string;
  createdAt: Date;
}

export interface Meeting {
  id: string;
  title: string;
  agenda: string; // ordre du jour
  date: Date | null; // date/heure prévue
  location: string; // lieu (salle)
  visioUrl: string; // lien de visioconférence (Teams/Zoom/Jitsi…)
  status: MeetingStatus;
  notes: string; // compte-rendu
  decisions: string[]; // décisions prises
  participants: MeetingParticipant[];
  links: MeetingLink[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/* ---------- Administration ---------- */
export interface AdminMember {
  id: string;
  nom: string;
  email: string;
  poste: string;
  role: Role;
  init: string;
  active: boolean;
  extraPages: string[];
  deniedPages: string[];
  readonly: boolean;
  approved: boolean;
  grcMember: boolean;
  mustChangePassword: boolean;
  totpEnabled: boolean;
  passwordAgeDays: number | null;
}

/** Session active d'un compte (gestion des appareils connectés). */
export interface SessionInfo {
  id: string;
  current: boolean;
  device: string; // libellé lisible (navigateur + système)
  ip: string | null;
  createdAt: Date;
  lastSeenAt: Date;
}

export interface ActivityEntry {
  id: string;
  actorId: string | null;
  actorNom: string;
  action: string;
  detail: string;
  createdAt: Date;
}

export interface AdminCounts {
  members: number;
  activeMembers: number;
  items: number;
  projects: number;
  notifications: number;
}

export interface AppSettings {
  orgName: string;
  orgLogo: string; // logo de l'organisation (data URL), "" si aucun — affiché sur les rapports
  emailEnabled: boolean;
  digestHour: string; // "08:00"
}

/* ---------- Sauvegarde planifiée ---------- */
export type BackupFrequency = "daily" | "weekly";

export interface BackupSettings {
  autoEnabled: boolean;
  frequency: BackupFrequency;
  retention: number; // nombre de sauvegardes conservées sur le serveur
  lastRunAt: string | null; // ISO de la dernière sauvegarde serveur (auto ou manuelle)
}

export const DEFAULT_BACKUP: BackupSettings = {
  autoEnabled: false,
  frequency: "daily",
  retention: 7,
  lastRunAt: null,
};

/** Un fichier de sauvegarde présent sur le serveur. */
export interface ServerBackupFile {
  name: string;
  size: number;
  createdAt: Date;
}

/* ---------- Messagerie interne ---------- */
export type ConvKind = "group" | "direct" | "item" | "negligence" | "project";

export interface MessageReaction {
  emoji: string;
  profileId: string;
}

export interface Message {
  id: string;
  conversationId: string;
  authorId: string;
  body: string;
  createdAt: Date;
  replyTo: string | null; // id du message auquel celui-ci répond
  reactions: MessageReaction[];
}

/** Palette de réactions proposées dans la messagerie. */
export const REACTION_EMOJIS = ["👍", "❤️", "😄", "🎉", "✅", "👀"];

export interface ConversationSummary {
  id: string;
  title: string;
  kind: ConvKind;
  refType: string | null;
  refId: string | null;
  createdBy: string | null;
  memberIds: string[];
  lastAt: Date | null;
  lastPreview: string;
  lastAuthor: string | null;
  unread: number;
  /** L'utilisateur courant a coupé les notifications de ce fil. */
  muted?: boolean;
}

/* ---------- Couleurs de teinte (réutilisées par les atomes UI) ---------- */
export const toneBg: Record<Tone, string> = {
  emerald: "bg-emerald-100 text-emerald-700",
  amber: "bg-amber-100 text-amber-700",
  rose: "bg-rose-100 text-rose-700",
  sky: "bg-sky-100 text-sky-700",
  violet: "bg-violet-100 text-violet-700",
  slate: "bg-slate-100 text-slate-600",
};

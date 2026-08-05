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
  tache: 5,
  sousTache: 1,
  projet: 50,
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

export interface GameProfile {
  id: string;
  xp: number;
  level: number; // index dans LEVELS
  levelName: string;
  levelIcon: string;
  nextXp: number | null; // XP du prochain palier (null si niveau max)
  progressPct: number; // progression vers le prochain niveau
  badges: Badge[];
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

  return { id, xp, level, levelName: LEVELS[level].name, levelIcon: LEVELS[level].icon, nextXp, progressPct, badges };
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

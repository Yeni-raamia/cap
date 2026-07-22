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
}

export interface Profile {
  id: string;
  nom: string;
  poste: string;
  role: Role;
  init: string;
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
}

export const DEFAULT_SECURITY: SecuritySettings = {
  approvalRequired: true,
  passwordMinLength: 8,
  loginMaxAttempts: 5,
  loginWindowMin: 15,
  sessionDays: 30,
  passwordMaxAgeDays: 0,
  hstsEnabled: false,
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

/** Listes de référence par défaut (seed + repli si la base est vide). */
export const DEFAULT_REF_LISTS: RefLists = {
  appreciations: APPRECIATIONS,
  causes: CAUSES,
  actions: BLOCAGE_ACTIONS,
  decisions: DEFAULT_DECISIONS,
  services: DEFAULT_SERVICES,
};

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

export function reminderState(
  item: Item,
  now: Date,
  types: Record<string, TypeDef> = TYPES
): ReminderState {
  if (item.statut === "Clôturé") return { level: "none", days: 0 };
  const sla = types[item.type]?.sla;
  const d = daysBetween(item.dateMaj, now);
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
export type NotifKind = "relance" | "escalade" | "digest" | "echeance" | "message" | "projet" | "tache";

export interface Notif {
  id: string;
  userId: string;
  itemId: string | null;
  kind: NotifKind;
  message: string;
  channel: string[];
  read: boolean;
  createdAt: Date;
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
  assigneeId: string | null;
  status: TaskStatus;
  dueDate: Date | null;
  ordre: number;
  createdAt: Date;
}

export interface ProjectNote {
  id: string;
  projectId: string;
  authorId: string;
  body: string;
  createdAt: Date;
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
}

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

/** Un projet archivé (terminé ou annulé) est masqué de la liste active. */
export const isProjectArchived = (p: Project): boolean => p.status === "Terminé" || p.status === "Annulé";

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

export interface Milestone {
  id: string;
  label: string;
  date: Date;
  done: boolean;
}

export interface Objective {
  id: string;
  title: string;
  description: string;
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
  passwordAgeDays: number | null;
}

export interface ActivityEntry {
  id: string;
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

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
}

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
export type NotifKind = "relance" | "escalade" | "digest" | "echeance" | "message";

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

export type TaskStatus = "à faire" | "en cours" | "fait";
export const TASK_STATUTS: TaskStatus[] = ["à faire", "en cours", "fait"];

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

export const PROJECT_METIER = "PRJ"; // métier déclencheur d'un projet

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
export type ConvKind = "group" | "item" | "negligence" | "project";

export interface Message {
  id: string;
  conversationId: string;
  authorId: string;
  body: string;
  createdAt: Date;
}

export interface ConversationSummary {
  id: string;
  title: string;
  kind: ConvKind;
  refType: string | null;
  refId: string | null;
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

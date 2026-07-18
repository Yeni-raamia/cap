/* ==================================================================
 *  lib/domain.ts — Source de vérité du domaine métier (cf. §4)
 *  Catalogue, SLA, statuts, Fil, causes, parse d'objet, état de
 *  relance, scoring « culture juste ». Réutilisé partout.
 * ================================================================== */

/* ---------- Types ---------- */
export type Role = "agent" | "directeur" | "admin";

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
  timeline: TimelineEvent[];
}

export interface Profile {
  id: string;
  nom: string;
  poste: string;
  role: Role;
  init: string;
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

export const isUrgentType = (type: string): boolean => Boolean(TYPES[type]?.urgent);

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

/* ---------- 4.4 · Causes de blocage (liste fermée) ---------- */
export const CAUSES = [
  "En attente DSI",
  "En attente prestataire",
  "Arbitrage requis",
  "Manque d'information",
  "Dépendance technique",
];

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

export function parseSubject(raw: string): ParsedSubject | null {
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
  if (!METIERS[metier] || !TYPES[type]) return null; // rejet si hors catalogue
  return {
    metier,
    type,
    urgent: m[3].startsWith("!"),
    ref: `${metier}-${num}`,
    objet: m[4].trim(),
  };
}

/* ---------- 4.5 · État de relance d'un item ---------- */
export type ReminderLevel = "none" | "ok" | "relance" | "escalade" | "bloque";

export interface ReminderState {
  level: ReminderLevel;
  days: number;
  dueIn?: number;
}

export function reminderState(item: Item, now: Date): ReminderState {
  if (item.statut === "Clôturé") return { level: "none", days: 0 };
  const sla = TYPES[item.type]?.sla;
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

export function computeScores(items: Item[], profiles: Profile[], now: Date): Score[] {
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
    if (reminderState(it, now).level === "escalade") {
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

/* ---------- Couleurs de teinte (réutilisées par les atomes UI) ---------- */
export const toneBg: Record<Tone, string> = {
  emerald: "bg-emerald-100 text-emerald-700",
  amber: "bg-amber-100 text-amber-700",
  rose: "bg-rose-100 text-rose-700",
  sky: "bg-sky-100 text-sky-700",
  violet: "bg-violet-100 text-violet-700",
  slate: "bg-slate-100 text-slate-600",
};

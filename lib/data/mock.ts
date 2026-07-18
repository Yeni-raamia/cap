/* ==================================================================
 *  lib/data/mock.ts — Adaptateur « mode démo » (données en mémoire).
 *  Noms 100 % neutres : aucun nom réel d'agent ni d'institution.
 *  Cet adaptateur permet à l'app de tourner sans backend (Phase 1).
 * ================================================================== */
import {
  computeScores,
  daysAgo,
  reminderState,
  type Item,
  type ParsedSubject,
  type Person,
  type PersonKind,
  type Priorite,
  type Profile,
  type Statut,
  type TimelineEvent,
  type EventKind,
} from "../domain";

/* ---------- Équipe de démonstration (neutre) ---------- */
export const PROFILES: Profile[] = [
  { id: "u1", nom: "Direction sécurité", poste: "Responsable sécurité (RSSI)", role: "directeur", init: "DS" },
  { id: "u2", nom: "Agent A", poste: "Analyste SOC / Forensic", role: "agent", init: "A1" },
  { id: "u3", nom: "Agent B", poste: "Gouvernance & conformité", role: "agent", init: "A2" },
  { id: "u4", nom: "Agent C", poste: "Analyste SOC", role: "agent", init: "A3" },
  { id: "u5", nom: "Agent D", poste: "Renseignement menace", role: "agent", init: "A4" },
  { id: "u6", nom: "Agent E", poste: "Audit / Projets", role: "agent", init: "A5" },
  { id: "u7", nom: "Administration", poste: "Administrateur de l'application", role: "admin", init: "AX" },
];

export const DEFAULT_USER_ID = "u1";

export const profileById = (id: string): Profile =>
  PROFILES.find((u) => u.id === id) || PROFILES[0];

/* ---------- Helpers de seed ---------- */
let seq = 0;
const rid = (ref: string) => `${ref}-${(++seq).toString(36)}`;

const P = (name: string, kind: PersonKind = "destinataire"): Person => ({ name, kind });
const ev = (ago: number, kind: EventKind, label: string, author: string): TimelineEvent => ({
  date: daysAgo(ago),
  kind,
  label,
  author,
});

function mk(
  ref: string,
  metier: string,
  type: string,
  objet: string,
  ownerId: string,
  statut: Statut,
  priorite: Priorite,
  personnes: Person[],
  ageDays: number,
  pointsCles: string[],
  blocageCause: string | null,
  relancesCount: number,
  timeline: TimelineEvent[]
): Item {
  return {
    id: rid(ref),
    ref,
    metier,
    type,
    objet,
    ownerId,
    statut,
    priorite,
    personnes,
    pointsCles,
    blocageCause,
    relancesCount,
    dateCreation: daysAgo(ageDays),
    dateMaj: timeline[timeline.length - 1].date,
    dateRelancePrevue: null,
    timeline,
  };
}

/* ---------- ~14 objets de démo (texte neutre, aucune donnée sensible) ---------- */
export function seedItems(): Item[] {
  seq = 0;
  return [
    mk("SOC-2026-0042", "SOC", "ALERTE", "Vulnérabilité critique sur serveur de messagerie non corrigée", "u4", "En traitement", "Critique",
      [P("Service informatique — Systèmes"), P("Prestataire messagerie", "copie")], 6,
      ["Correctif disponible", "Fenêtre de maintenance à planifier"], null, 1,
      [ev(6, "creation", "Objet créé", "u4"), ev(6, "envoi", "Envoyé au service informatique", "u4"), ev(3, "relance", "Relance 1", "u4"), ev(1, "reponse", "Réponse : correctif planifié", "u4"), ev(1, "statut", "→ En traitement", "u4")]),

    mk("GRC-2026-0007", "GRC", "VALIDATION", "Politique de sécurité v2 : validation et signature", "u3", "En attente", "Élevé",
      [P("Direction générale"), P("Service informatique", "copie")], 9,
      ["Transmis pour signature", "Relance nécessaire avant comité"], null, 0,
      [ev(9, "creation", "Objet créé", "u3"), ev(9, "envoi", "Transmis à la direction", "u3")]),

    mk("CASE-1188", "CASE", "DEMANDE", "Confinement d'un serveur de fichiers compromis", "u2", "Bloqué", "Critique",
      [P("Service informatique — Réseau"), P("Prestataire hébergement", "impliqué")], 5,
      ["Isolation réseau non appliquée", "En attente d'action réseau"], "En attente DSI", 2,
      [ev(5, "creation", "Incident ouvert", "u2"), ev(5, "envoi", "Demande de confinement", "u2"), ev(3, "relance", "Relance 1", "u2"), ev(2, "relance", "Relance 2", "u2"), ev(2, "statut", "→ Bloqué : attente réseau", "u2")]),

    mk("AUD-2026-0003", "AUD", "RECO", "Plan de remédiation de l'annuaire (durcissement)", "u6", "En attente", "Élevé",
      [P("Service informatique — Annuaire")], 8,
      ["12 recommandations", "Priorité sur les élévations de privilèges"], null, 0,
      [ev(8, "creation", "Objet créé", "u6"), ev(8, "envoi", "Plan transmis", "u6")]),

    mk("CTI-2026-0021", "CTI", "SIGNAL", "Site frauduleux usurpant l'organisation", "u5", "Relancé", "Élevé",
      [P("Service informatique — Hébergement"), P("Hébergeur externe", "impliqué")], 4,
      ["Domaine signalé", "Demande de retrait envoyée"], null, 1,
      [ev(4, "creation", "Objet créé", "u5"), ev(4, "envoi", "Signalement", "u5"), ev(1, "relance", "Relance 1 à l'hébergeur", "u5")]),

    mk("PRE-2026-0014", "PRE", "VALIDATION", "Accès temporaire pour le prestataire de sauvegarde", "u3", "En attente", "Élevé",
      [P("Prestataire sauvegarde")], 10,
      ["Fenêtre du 20 au 24", "Validation d'accès en attente"], null, 0,
      [ev(10, "creation", "Objet créé", "u3"), ev(10, "envoi", "Demande d'accès", "u3")]),

    mk("INV-2026-0009", "INV", "DEMANDE", "Accès aux journaux proxy pour investigation", "u2", "En attente", "Moyenne",
      [P("Service informatique — Sécurité réseau")], 4,
      ["Fenêtre 01–07", "Journaux proxy requis"], null, 0,
      [ev(4, "creation", "Objet créé", "u2"), ev(4, "envoi", "Demande d'accès aux journaux", "u2")]),

    mk("SOC-2026-0051", "SOC", "INFO", "Rapport d'activité mensuel", "u4", "Clôturé", "Moyenne",
      [P("Direction sécurité")], 12,
      ["Diffusé", "Aucune action attendue"], null, 0,
      [ev(12, "creation", "Objet créé", "u4"), ev(12, "envoi", "Diffusé", "u4"), ev(11, "cloture", "Clôturé", "u4")]),

    mk("GRC-2026-0011", "GRC", "REUNION", "Point de coordination tripartite", "u3", "Clôturé", "Élevé",
      [P("Direction générale"), P("Service informatique")], 14,
      ["Réunion tenue", "Compte rendu diffusé"], null, 1,
      [ev(14, "creation", "Objet créé", "u3"), ev(14, "envoi", "Convocation", "u3"), ev(12, "reponse", "Confirmations reçues", "u3"), ev(9, "cloture", "Réunion tenue, clôturé", "u3")]),

    mk("AUD-2026-0005", "AUD", "INFO", "Rapport d'audit du domaine principal", "u6", "Clôturé", "Élevé",
      [P("Service informatique")], 15,
      ["Rapport transmis", "Suivi via AUD-0003"], null, 0,
      [ev(15, "creation", "Objet créé", "u6"), ev(15, "envoi", "Transmis", "u6"), ev(13, "reponse", "Accusé de réception", "u6"), ev(13, "cloture", "Clôturé", "u6")]),

    mk("PRJ-2026-0002", "PRJ", "DEMANDE", "Demande de changement — bascule du collecteur de logs", "u6", "En traitement", "Moyenne",
      [P("Service informatique — Exploitation")], 3,
      ["Demande soumise", "Validation conjointe en cours"], null, 0,
      [ev(3, "creation", "Objet créé", "u6"), ev(3, "envoi", "Demande soumise", "u6"), ev(1, "reponse", "En revue", "u6"), ev(1, "statut", "→ En traitement", "u6")]),

    mk("CTI-2026-0025", "CTI", "ALERTE", "Vulnérabilité critique sur pare-feu périmétrique", "u5", "En attente", "Critique",
      [P("Service informatique — Réseau")], 3,
      ["Correctif éditeur disponible", "À appliquer en urgence"], null, 0,
      [ev(3, "creation", "Objet créé", "u5"), ev(3, "envoi", "Alerte transmise", "u5")]),

    mk("SOC-2026-0055", "SOC", "SIGNAL", "Compte de service inactif détecté", "u4", "Envoyé", "Moyenne",
      [P("Service informatique — Annuaire")], 1,
      ["Compte inactif depuis 90 j", "Désactivation à confirmer"], null, 0,
      [ev(1, "creation", "Objet créé", "u4"), ev(1, "envoi", "Signalé", "u4")]),

    mk("ADM-2026-0004", "ADM", "DEMANDE", "Vérification du document de suivi mensuel", "u1", "En attente", "Moyenne",
      [P("Équipe sécurité")], 5,
      ["Contrôle mensuel", "Retours attendus"], null, 0,
      [ev(5, "creation", "Objet créé", "u1"), ev(5, "envoi", "Demande à l'équipe", "u1")]),
  ];
}

/* ==================================================================
 *  Interface commune de la couche de données (cf. §6).
 *  Ici : implémentation « mock », pure et immuable (renvoie de
 *  nouveaux tableaux) pour s'intégrer à l'état React.
 * ================================================================== */
export type Action = "relance" | "reponse" | "bloque" | "cloture";

export function listProfiles(): Profile[] {
  return PROFILES;
}

export function currentUser(id: string = DEFAULT_USER_ID): Profile {
  return profileById(id);
}

export function listItems(items: Item[]): Item[] {
  return items;
}

export function getItem(items: Item[], id: string): Item | undefined {
  return items.find((i) => i.id === id);
}

export function applyAction(
  items: Item[],
  item: Item,
  action: Action,
  cause: string | undefined,
  meId: string
): Item[] {
  const now = new Date();
  return items.map((it) => {
    if (it.id !== item.id) return it;
    const n: Item = { ...it, timeline: [...it.timeline], dateMaj: now };
    if (action === "relance") {
      n.relancesCount++;
      n.statut = "Relancé";
      n.timeline.push({ date: now, kind: "relance", label: `Relance ${n.relancesCount}`, author: meId });
    } else if (action === "reponse") {
      n.statut = "En traitement";
      n.timeline.push({ date: now, kind: "reponse", label: "Réponse reçue", author: meId });
    } else if (action === "bloque") {
      n.statut = "Bloqué";
      n.blocageCause = cause ?? null;
      n.timeline.push({ date: now, kind: "statut", label: `→ Bloqué : ${cause}`, author: meId });
    } else if (action === "cloture") {
      n.statut = "Clôturé";
      n.timeline.push({ date: now, kind: "cloture", label: "Clôturé", author: meId });
    }
    return n;
  });
}

export function createItem(
  items: Item[],
  parsed: ParsedSubject,
  prio: Priorite,
  dest: string,
  pointsRaw: string,
  meId: string
): Item[] {
  const now = new Date();
  const points = pointsRaw
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
  const it: Item = {
    id: rid(parsed.ref),
    ref: parsed.ref,
    metier: parsed.metier,
    type: parsed.type,
    objet: parsed.objet,
    ownerId: meId,
    statut: "Envoyé",
    priorite: prio,
    personnes: dest ? [{ name: dest, kind: "destinataire" }] : [],
    pointsCles: points.length ? points : ["—"],
    blocageCause: null,
    relancesCount: 0,
    dateCreation: now,
    dateMaj: now,
    dateRelancePrevue: null,
    timeline: [
      { date: now, kind: "creation", label: "Objet créé", author: meId },
      { date: now, kind: "envoi", label: "Envoyé", author: meId },
    ],
  };
  return [it, ...items];
}

/** Planifie (ou efface) la date de relance d'un objet — mode démo. */
export function setRelanceDate(items: Item[], itemId: string, dateISO: string | null): Item[] {
  return items.map((it) =>
    it.id === itemId ? { ...it, dateRelancePrevue: dateISO ? new Date(dateISO) : null } : it
  );
}

export function listScores(items: Item[], now: Date) {
  return computeScores(items, PROFILES, now);
}

export function listReminders(items: Item[], now: Date) {
  const dues = items.filter((i) => reminderState(i, now).level === "relance");
  const escal = items.filter((i) => reminderState(i, now).level === "escalade");
  const bloques = items.filter((i) => i.statut === "Bloqué");
  return { dues, escal, bloques };
}

export function listNotifications(items: Item[], now: Date, me: Profile): number {
  return items.filter((i) => {
    const l = reminderState(i, now).level;
    return me.role === "directeur"
      ? l === "escalade"
      : i.ownerId === me.id && (l === "relance" || l === "escalade");
  }).length;
}

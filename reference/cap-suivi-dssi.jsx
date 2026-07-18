import React, { useState, useMemo } from "react";
import {
  Bell, Plus, Search, LayoutDashboard, Users, AlertTriangle, BarChart3,
  Trophy, Settings, Clock, Mail, CheckCircle2, Circle, ChevronRight,
  Send, RotateCcw, Flag, Lock, X, Compass, TrendingUp, ShieldAlert, Inbox,
  ArrowUp, Award, Filter, UserCircle2, CalendarClock
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, CartesianGrid
} from "recharts";

/* ------------------------------------------------------------------ */
/*  Référentiel — le catalogue, cœur de l'app                          */
/* ------------------------------------------------------------------ */
const METIERS = {
  SOC:  { label: "Supervision & détection",        tone: "rose" },
  CASE: { label: "Réponse à incident",             tone: "rose" },
  INV:  { label: "Investigation numérique",        tone: "violet" },
  AUD:  { label: "Audit",                          tone: "sky" },
  CTI:  { label: "Renseignement menace",           tone: "violet" },
  GRC:  { label: "Gouvernance & conformité",       tone: "emerald" },
  PRJ:  { label: "Projets & ingénierie",           tone: "sky" },
  ADM:  { label: "Coordination interne",           tone: "slate" },
  PRE:  { label: "Prestataires & tiers",           tone: "amber" },
};

// SLA : relance = jours avant qu'une relance soit due ; escalade = jours avant remontée au Directeur
const TYPES = {
  INFO:       { sla: null },
  SIGNAL:     { sla: { relance: 3, escalade: 6 } },
  ALERTE:     { sla: { relance: 1, escalade: 2 } },
  RECO:       { sla: { relance: 4, escalade: 8 } },
  DEMANDE:    { sla: { relance: 3, escalade: 7 } },
  RELANCE:    { sla: { relance: 2, escalade: 4 } },
  VALIDATION: { sla: { relance: 4, escalade: 8 } },
  REUNION:    { sla: { relance: 2, escalade: 4 } },
  CR:         { sla: null },
  INTERDIT:   { sla: { relance: 1, escalade: 2 } },
  CLOTURE:    { sla: null },
};

const STATUTS = {
  "Brouillon":     { pct: 5,   stage: 0, color: "slate" },
  "Envoyé":        { pct: 25,  stage: 1, color: "sky" },
  "En attente":    { pct: 40,  stage: 1, color: "amber" },
  "Relancé":       { pct: 55,  stage: 2, color: "amber" },
  "En traitement": { pct: 75,  stage: 4, color: "emerald" },
  "Bloqué":        { pct: 50,  stage: 3, color: "rose" },
  "Clôturé":       { pct: 100, stage: 5, color: "emerald" },
};
const FIL = ["Créé", "Envoyé", "Relance", "Réponse", "Traitement", "Clôturé"];
const CAUSES = ["En attente DSI", "En attente prestataire", "Arbitrage requis", "Manque d'information", "Dépendance technique"];

/* ------------------------------------------------------------------ */
/*  Équipe                                                             */
/* ------------------------------------------------------------------ */
const USERS = [
  { id: "u1", nom: "Y. DOUKAKAS",  poste: "RSSI — Directrice", role: "directeur", init: "YD" },
  { id: "u2", nom: "MBOUISSOU",    poste: "Analyste SOC / Forensic", role: "agent", init: "MB" },
  { id: "u3", nom: "ROPIVIA",      poste: "GRC — PCA/PRA", role: "agent", init: "RO" },
  { id: "u4", nom: "NZAMBA",       poste: "Analyste SOC", role: "agent", init: "NZ" },
  { id: "u5", nom: "OYANE",        poste: "CTI — Veille", role: "agent", init: "OY" },
  { id: "u6", nom: "MOUSSAVOU",    poste: "Audit / Projets", role: "agent", init: "MO" },
];
const userById = (id) => USERS.find((u) => u.id === id) || USERS[0];

/* ------------------------------------------------------------------ */
/*  Helpers temps                                                      */
/* ------------------------------------------------------------------ */
const DAY = 864e5;
const daysAgo = (n) => new Date(Date.now() - n * DAY);
const daysBetween = (a, b) => Math.floor((b - a) / DAY);
const fmt = (d) => d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
const fmtLong = (d) => d.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "long" });

/* ------------------------------------------------------------------ */
/*  Parse d'objet normalisé  →  la saisie quasi nulle                  */
/* ------------------------------------------------------------------ */
function parseSubject(raw) {
  if (!raw) return null;
  let s = raw.trim();
  for (let i = 0; i < 4; i++) s = s.replace(/^(re|fwd|tr|fw)\s*:\s*/i, "");
  const m = s.match(/\[([A-Z]{2,6})-(?:2026-)?([0-9#]+)\]\s*(!?[A-Z]+)(?:\s+\d+)?\s*[—–-]\s*(.+)/);
  if (!m) return null;
  const metier = m[1].toUpperCase();
  const num = m[2];
  const type = m[3].replace("!", "").toUpperCase();
  if (!METIERS[metier] || !TYPES[type]) return null;
  return {
    metier, type,
    urgent: m[3].startsWith("!"),
    ref: `${metier}-${num}`,
    objet: m[4].trim(),
  };
}

/* ------------------------------------------------------------------ */
/*  État de relance d'un item                                          */
/* ------------------------------------------------------------------ */
function reminderState(item, now) {
  if (item.statut === "Clôturé") return { level: "none", days: 0 };
  const sla = TYPES[item.type]?.sla;
  const d = daysBetween(item.dateMaj, now);
  if (item.statut === "Bloqué") return { level: "bloque", days: d };
  if (!sla) return { level: "none", days: d };
  if (d >= sla.escalade) return { level: "escalade", days: d };
  if (d >= sla.relance) return { level: "relance", days: d };
  return { level: "ok", days: d, dueIn: sla.relance - d };
}

/* ------------------------------------------------------------------ */
/*  Données de démonstration                                           */
/* ------------------------------------------------------------------ */
const seedItems = () => [
  mk("SOC-2026-0042", "SOC", "ALERTE", "Vulnérabilité critique Exchange non corrigée", "u4", "En traitement", "Critique",
     [P("DSI — Admin. systèmes","destinataire"), P("Prestataire messagerie","copie")], 6,
     ["Patch KB5040 disponible", "Fenêtre de maintenance à planifier"], null, 1,
     [ev(6,"creation","Objet créé","u4"), ev(6,"envoi","Envoyé à la DSI","u4"), ev(3,"relance","Relance 1","u4"), ev(1,"reponse","Réponse DSI : patch planifié","u4"), ev(1,"statut","→ En traitement","u4")]),

  mk("GRC-2026-0007", "GRC", "VALIDATION", "PSSI v2 : validation et signature", "u3", "En attente", "Élevé",
     [P("Directeur Général","destinataire"), P("DSI","copie")], 9,
     ["Transmis pour signature", "Relance nécessaire avant Comité"], null, 0,
     [ev(9,"creation","Objet créé","u3"), ev(9,"envoi","Transmis au DG","u3")]),

  mk("CASE-1188", "CASE", "DEMANDE", "Confinement de SRV-FILE-01", "u2", "Bloqué", "Critique",
     [P("DSI — Réseau","destinataire"), P("Prestataire datacenter","impliqué")], 5,
     ["VLAN d'isolation non appliqué", "En attente d'action réseau DSI"], "En attente DSI", 2,
     [ev(5,"creation","Incident ouvert","u2"), ev(5,"envoi","Demande de confinement","u2"), ev(3,"relance","Relance 1","u2"), ev(2,"relance","Relance 2","u2"), ev(2,"statut","→ Bloqué : attente DSI","u2")]),

  mk("AUD-2026-0003", "AUD", "RECO", "Plan de remédiation AD (PingCastle)", "u6", "En attente", "Élevé",
     [P("DSI — Annuaire","destinataire")], 8,
     ["12 recommandations", "Priorité sur ESC4 et Zerologon"], null, 0,
     [ev(8,"creation","Objet créé","u6"), ev(8,"envoi","Plan transmis","u6")]),

  mk("CTI-2026-0021", "CTI", "SIGNAL", "Site frauduleux usurpant l'entité", "u5", "Relancé", "Élevé",
     [P("DSI — Hébergement","destinataire"), P("Hébergeur externe","impliqué")], 4,
     ["Domaine signalé", "Demande de takedown envoyée"], null, 1,
     [ev(4,"creation","Objet créé","u5"), ev(4,"envoi","Signalement","u5"), ev(1,"relance","Relance 1 hébergeur","u5")]),

  mk("PRE-2026-0014", "PRE", "VALIDATION", "Accès temporaire prestataire sauvegarde", "u3", "En attente", "Élevé",
     [P("Prestataire sauvegarde","destinataire")], 10,
     ["Fenêtre du 20 au 24", "Validation d'accès en attente"], null, 0,
     [ev(10,"creation","Objet créé","u3"), ev(10,"envoi","Demande d'accès","u3")]),

  mk("INV-2026-0009", "INV", "DEMANDE", "Accès aux journaux proxy pour investigation", "u2", "En attente", "Moyenne",
     [P("DSI — Sécurité réseau","destinataire")], 4,
     ["Fenêtre 01–07 juin", "Logs proxy requis"], null, 0,
     [ev(4,"creation","Objet créé","u2"), ev(4,"envoi","Demande d'accès logs","u2")]),

  mk("SOC-2026-0051", "SOC", "INFO", "Rapport d'activité SOC — juin", "u4", "Clôturé", "Moyenne",
     [P("Directrice RSSI","destinataire")], 12,
     ["Diffusé", "Aucune action attendue"], null, 0,
     [ev(12,"creation","Objet créé","u4"), ev(12,"envoi","Diffusé","u4"), ev(11,"cloture","Clôturé","u4")]),

  mk("GRC-2026-0011", "GRC", "REUNION", "Point tripartite DG/DSI/DSSI", "u3", "Clôturé", "Élevé",
     [P("DG","destinataire"), P("DSI","destinataire")], 14,
     ["Réunion tenue", "CR diffusé"], null, 1,
     [ev(14,"creation","Objet créé","u3"), ev(14,"envoi","Convocation","u3"), ev(12,"reponse","Confirmations reçues","u3"), ev(9,"cloture","Réunion tenue, clôturé","u3")]),

  mk("AUD-2026-0005", "AUD", "INFO", "Rapport d'audit dgdi.ga", "u6", "Clôturé", "Élevé",
     [P("DSI","destinataire")], 15,
     ["Rapport transmis", "Suivi via AUD-0003"], null, 0,
     [ev(15,"creation","Objet créé","u6"), ev(15,"envoi","Transmis","u6"), ev(13,"reponse","Accusé de réception","u6"), ev(13,"cloture","Clôturé","u6")]),

  mk("PRJ-2026-0002", "PRJ", "DEMANDE", "RFC — bascule collecteur SIEM", "u6", "En traitement", "Moyenne",
     [P("DSI — Exploitation","destinataire")], 3,
     ["RFC soumise", "Validation conjointe en cours"], null, 0,
     [ev(3,"creation","Objet créé","u6"), ev(3,"envoi","RFC soumise","u6"), ev(1,"reponse","DSI : en revue","u6"), ev(1,"statut","→ En traitement","u6")]),

  mk("CTI-2026-0025", "CTI", "ALERTE", "CVE critique sur pare-feu périmétrique", "u5", "En attente", "Critique",
     [P("DSI — Réseau","destinataire")], 3,
     ["CVE-2026-XXXX", "Correctif éditeur disponible"], null, 0,
     [ev(3,"creation","Objet créé","u5"), ev(3,"envoi","Alerte transmise","u5")]),

  mk("SOC-2026-0055", "SOC", "SIGNAL", "Compte de service inactif détecté", "u4", "Envoyé", "Moyenne",
     [P("DSI — Annuaire","destinataire")], 1,
     ["svc-legacy inactif 90j", "Désactivation à confirmer"], null, 0,
     [ev(1,"creation","Objet créé","u4"), ev(1,"envoi","Signalé","u4")]),

  mk("ADM-2026-0004", "ADM", "DEMANDE", "Vérification document de suivi mensuel", "u1", "En attente", "Moyenne",
     [P("Équipe DSSI","destinataire")], 5,
     ["Contrôle mensuel", "Retours attendus"], null, 0,
     [ev(5,"creation","Objet créé","u1"), ev(5,"envoi","Demande à l'équipe","u1")]),
];

function mk(ref, metier, type, objet, ownerId, statut, priorite, personnes, ageDays, pointsCles, blocageCause, relancesCount, timeline) {
  return { id: ref + "-" + Math.random().toString(36).slice(2, 6), ref, metier, type, objet, ownerId, statut, priorite,
    personnes, pointsCles, blocageCause, relancesCount,
    dateCreation: daysAgo(ageDays), dateMaj: timeline[timeline.length - 1].date, timeline };
}
function ev(ago, kind, label, author) { return { date: daysAgo(ago), kind, label, author }; }
function P(name, kind) { return { name, kind }; }

/* ------------------------------------------------------------------ */
/*  Scores — culture juste : on valorise faire avancer, pas le volume  */
/* ------------------------------------------------------------------ */
function computeScores(items, now) {
  const map = {};
  USERS.filter((u) => u.role === "agent").forEach((u) => {
    map[u.id] = { id: u.id, score: 0, closures: 0, relances: 0, reponses: 0, retard: 0, actifs: 0 };
  });
  items.forEach((it) => {
    const s = map[it.ownerId];
    if (!s) return;
    if (it.statut !== "Clôturé") s.actifs++;
    if (it.statut === "Clôturé") { s.score += 10; s.closures++; }
    if (it.relancesCount) { s.score += it.relancesCount * 5; s.relances += it.relancesCount; }
    if (it.timeline.some((e) => e.kind === "reponse")) { s.score += 8; s.reponses++; }
    const rs = reminderState(it, now);
    if (rs.level === "escalade") { s.score -= 4; s.retard++; }
  });
  Object.values(map).forEach((s) => {
    s.score = Math.max(0, s.score);
    s.badges = [];
    if (s.relances >= 3) s.badges.push("Relanceur");
    if (s.closures >= 2) s.badges.push("Closeur");
    if (s.retard === 0) s.badges.push("Zéro oubli");
    if (s.reponses >= 3) s.badges.push("Réactif");
  });
  return Object.values(map).sort((a, b) => b.score - a.score);
}

/* ------------------------------------------------------------------ */
/*  Atomes UI                                                          */
/* ------------------------------------------------------------------ */
const toneBg = {
  emerald: "bg-emerald-100 text-emerald-700", amber: "bg-amber-100 text-amber-700",
  rose: "bg-rose-100 text-rose-700", sky: "bg-sky-100 text-sky-700",
  violet: "bg-violet-100 text-violet-700", slate: "bg-slate-100 text-slate-600",
};
function Token({ children }) {
  return <span className="font-mono text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">{children}</span>;
}
function TypeTag({ t }) {
  const urgent = t === "ALERTE" || t === "INTERDIT";
  return <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${urgent ? "bg-rose-600 text-white" : "bg-slate-800 text-white"}`}>{t}</span>;
}
function MetierChip({ code }) {
  const m = METIERS[code];
  return <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${toneBg[m.tone]}`}>{code}</span>;
}
function Avatar({ id, size = "h-8 w-8" }) {
  const u = userById(id);
  return <div className={`${size} rounded-full bg-slate-800 text-white grid place-items-center text-[11px] font-semibold shrink-0`}>{u.init}</div>;
}
function Priority({ p }) {
  const c = p === "Critique" ? "text-rose-600" : p === "Élevé" ? "text-amber-600" : "text-slate-400";
  return <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${c}`}><Flag size={11} />{p}</span>;
}

/* Le fil — élément signature */
function Fil({ item, compact }) {
  const st = STATUTS[item.statut];
  const stage = item.timeline.some((e) => e.kind === "reponse") && st.stage < 3 ? 3 : st.stage;
  const blocked = item.statut === "Bloqué";
  return (
    <div className={compact ? "" : "px-1"}>
      <div className="flex items-center">
        {FIL.map((label, i) => {
          const done = i <= stage;
          const isBlockPoint = blocked && i === stage;
          const dot = isBlockPoint ? "bg-rose-500" : done ? "bg-emerald-500" : "bg-slate-200";
          return (
            <React.Fragment key={label}>
              <div className="flex flex-col items-center gap-1">
                <div className={`rounded-full ${compact ? "h-2 w-2" : "h-2.5 w-2.5"} ${dot}`} />
                {!compact && <span className={`text-[9px] ${done ? "text-slate-600" : "text-slate-300"}`}>{label}</span>}
              </div>
              {i < FIL.length - 1 && <div className={`h-0.5 flex-1 ${i < stage ? "bg-emerald-400" : "bg-slate-200"}`} />}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

function Card({ children, className = "" }) {
  return <div className={`bg-white border border-slate-200 rounded-xl ${className}`}>{children}</div>;
}
function KPI({ icon: Icon, label, value, tone = "slate", sub }) {
  return (
    <Card className="p-4 flex items-center gap-3">
      <div className={`h-10 w-10 rounded-lg grid place-items-center ${toneBg[tone]}`}><Icon size={18} /></div>
      <div>
        <div className="text-2xl font-semibold text-slate-800 leading-none">{value}</div>
        <div className="text-[12px] text-slate-500 mt-1">{label}{sub && <span className="text-slate-400"> · {sub}</span>}</div>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Carte d'objet                                                      */
/* ------------------------------------------------------------------ */
function ItemCard({ item, now, onOpen }) {
  const rs = reminderState(item, now);
  const bar = {
    relance: "border-l-amber-400", escalade: "border-l-rose-500",
    bloque: "border-l-rose-500", ok: "border-l-emerald-400", none: "border-l-slate-200",
  }[rs.level];
  return (
    <button onClick={() => onOpen(item)} className={`w-full text-left bg-white border border-slate-200 border-l-[3px] ${bar} rounded-xl p-4 hover:shadow-sm transition`}>
      <div className="flex items-center gap-2 mb-2">
        <MetierChip code={item.metier} />
        <TypeTag t={item.type} />
        <Token>{item.ref}</Token>
        <div className="ml-auto"><Priority p={item.priorite} /></div>
      </div>
      <div className="text-[14px] font-medium text-slate-800 mb-3 leading-snug">{item.objet}</div>
      <Fil item={item} compact />
      <div className="flex items-center gap-2 mt-3 text-[11px] text-slate-500">
        <Avatar id={item.ownerId} size="h-5 w-5" />
        <span>{userById(item.ownerId).nom}</span>
        <span className="text-slate-300">·</span>
        <span className="text-slate-500">{item.statut}</span>
        {rs.level === "relance" && <span className="ml-auto inline-flex items-center gap-1 text-amber-600 font-medium"><RotateCcw size={12} />Relance due (J+{rs.days})</span>}
        {rs.level === "escalade" && <span className="ml-auto inline-flex items-center gap-1 text-rose-600 font-medium"><ArrowUp size={12} />Escaladé (J+{rs.days})</span>}
        {rs.level === "bloque" && <span className="ml-auto inline-flex items-center gap-1 text-rose-600 font-medium"><ShieldAlert size={12} />{item.blocageCause}</span>}
        {rs.level === "ok" && rs.dueIn >= 0 && <span className="ml-auto text-slate-400">Relance dans {rs.dueIn}j</span>}
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Détail (drawer)                                                    */
/* ------------------------------------------------------------------ */
const evMeta = {
  creation: { icon: Circle, c: "text-slate-400" }, envoi: { icon: Send, c: "text-sky-500" },
  relance: { icon: RotateCcw, c: "text-amber-500" }, reponse: { icon: Inbox, c: "text-emerald-500" },
  statut: { icon: ChevronRight, c: "text-slate-500" }, note: { icon: Circle, c: "text-slate-400" },
  cloture: { icon: CheckCircle2, c: "text-emerald-600" }, escalade: { icon: ArrowUp, c: "text-rose-500" },
};
function Drawer({ item, now, onClose, onAction, canEdit }) {
  const [cause, setCause] = useState(item.blocageCause || CAUSES[0]);
  if (!item) return null;
  const tl = [...item.timeline].sort((a, b) => b.date - a.date);
  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/30" onClick={onClose} />
      <div className="relative w-full max-w-md bg-slate-50 h-full overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-start gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <MetierChip code={item.metier} /><TypeTag t={item.type} /><Token>{item.ref}</Token>
            </div>
            <div className="text-[15px] font-semibold text-slate-800 leading-snug">{item.objet}</div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        <div className="p-4 space-y-4">
          <Card className="p-4">
            <Fil item={item} />
            <div className="flex items-center justify-between mt-3 text-[12px]">
              <span className="text-slate-500">Statut : <span className="font-medium text-slate-700">{item.statut}</span></span>
              <span className="font-mono text-slate-400">{STATUTS[item.statut].pct}%</span>
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <Card className="p-3">
              <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-1">Responsable</div>
              <div className="flex items-center gap-2"><Avatar id={item.ownerId} size="h-6 w-6" /><span className="text-[13px] font-medium text-slate-700">{userById(item.ownerId).nom}</span></div>
            </Card>
            <Card className="p-3">
              <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-1">Relances</div>
              <div className="text-[13px] font-medium text-slate-700">{item.relancesCount} · maj il y a {daysBetween(item.dateMaj, now)}j</div>
            </Card>
          </div>

          <Card className="p-3">
            <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-2">Personnes impliquées</div>
            <div className="space-y-1.5">
              {item.personnes.map((p, i) => (
                <div key={i} className="flex items-center gap-2 text-[12px]">
                  <UserCircle2 size={14} className="text-slate-400" />
                  <span className="text-slate-700">{p.name}</span>
                  <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">{p.kind}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-3">
            <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-2">Points clés</div>
            <ul className="space-y-1">
              {item.pointsCles.map((k, i) => <li key={i} className="text-[12px] text-slate-700 flex gap-2"><span className="text-emerald-500 mt-0.5">▸</span>{k}</li>)}
            </ul>
          </Card>

          {item.statut === "Bloqué" && (
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-[12px] text-rose-700 flex items-center gap-2">
              <ShieldAlert size={15} /> Bloqué — {item.blocageCause}
            </div>
          )}

          <Card className="p-3">
            <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-3">Timeline</div>
            <div className="space-y-3">
              {tl.map((e, i) => {
                const M = evMeta[e.kind] || evMeta.note;
                return (
                  <div key={i} className="flex gap-3">
                    <M.icon size={15} className={`${M.c} mt-0.5 shrink-0`} />
                    <div className="flex-1">
                      <div className="text-[12px] text-slate-700">{e.label}</div>
                      <div className="text-[10px] text-slate-400">{fmt(e.date)} · {userById(e.author).nom}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {canEdit && item.statut !== "Clôturé" && (
            <Card className="p-3 space-y-2">
              <div className="text-[10px] uppercase tracking-wide text-slate-400 mb-1">Actions</div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => onAction(item, "relance")} className="flex items-center justify-center gap-1.5 text-[12px] font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded-lg py-2 hover:bg-amber-100"><RotateCcw size={14} />Relancer</button>
                <button onClick={() => onAction(item, "reponse")} className="flex items-center justify-center gap-1.5 text-[12px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg py-2 hover:bg-emerald-100"><Inbox size={14} />Réponse reçue</button>
                <button onClick={() => onAction(item, "bloque", cause)} className="flex items-center justify-center gap-1.5 text-[12px] font-medium bg-rose-50 text-rose-700 border border-rose-200 rounded-lg py-2 hover:bg-rose-100"><ShieldAlert size={14} />Marquer bloqué</button>
                <button onClick={() => onAction(item, "cloture")} className="flex items-center justify-center gap-1.5 text-[12px] font-medium bg-slate-800 text-white rounded-lg py-2 hover:bg-slate-700"><CheckCircle2 size={14} />Clôturer</button>
              </div>
              <select value={cause} onChange={(e) => setCause(e.target.value)} className="w-full text-[12px] border border-slate-200 rounded-lg px-2 py-1.5 text-slate-600">
                {CAUSES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Nouveau suivi (modal) — la saisie quasi nulle                      */
/* ------------------------------------------------------------------ */
function NewModal({ onClose, onCreate, ownerId }) {
  const [raw, setRaw] = useState("");
  const parsed = useMemo(() => parseSubject(raw), [raw]);
  const [points, setPoints] = useState("");
  const [prio, setPrio] = useState("Moyenne");
  const [dest, setDest] = useState("");
  return (
    <div className="fixed inset-0 z-40 grid place-items-center p-4">
      <div className="absolute inset-0 bg-slate-900/30" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-700 grid place-items-center"><Plus size={17} /></div>
          <div className="font-semibold text-slate-800">Nouveau suivi</div>
          <button onClick={onClose} className="ml-auto text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        <label className="text-[12px] font-medium text-slate-600">Colle l'objet du mail</label>
        <input autoFocus value={raw} onChange={(e) => setRaw(e.target.value)}
          placeholder="[SOC-2026-0042] ALERTE — Vulnérabilité critique…"
          className="w-full mt-1 font-mono text-[13px] border border-slate-200 rounded-lg px-3 py-2 focus:border-emerald-400 outline-none" />

        {raw && !parsed && <div className="text-[11px] text-rose-500 mt-1">Objet non reconnu — vérifie le format [MÉTIER-2026-####] TYPE — objet.</div>}
        {parsed && (
          <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-emerald-700 font-medium">Reconnu&nbsp;:</span>
            <MetierChip code={parsed.metier} /><TypeTag t={parsed.type} /><Token>{parsed.ref}</Token>
            <span className="text-[12px] text-slate-600 w-full mt-1">{parsed.objet}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <label className="text-[12px] font-medium text-slate-600">Priorité</label>
            <select value={prio} onChange={(e) => setPrio(e.target.value)} className="w-full mt-1 text-[13px] border border-slate-200 rounded-lg px-2 py-2">
              <option>Critique</option><option>Élevé</option><option>Moyenne</option>
            </select>
          </div>
          <div>
            <label className="text-[12px] font-medium text-slate-600">Destinataire principal</label>
            <input value={dest} onChange={(e) => setDest(e.target.value)} placeholder="DSI — Réseau" className="w-full mt-1 text-[13px] border border-slate-200 rounded-lg px-2 py-2" />
          </div>
        </div>

        <label className="text-[12px] font-medium text-slate-600 mt-3 block">Points clés (une ligne chacun)</label>
        <textarea value={points} onChange={(e) => setPoints(e.target.value)} rows={2} className="w-full mt-1 text-[13px] border border-slate-200 rounded-lg px-3 py-2" placeholder="Patch disponible&#10;Fenêtre à planifier" />

        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 text-[13px] text-slate-600 border border-slate-200 rounded-lg py-2 hover:bg-slate-50">Annuler</button>
          <button disabled={!parsed} onClick={() => onCreate(parsed, prio, dest, points)}
            className="flex-1 text-[13px] font-medium text-white bg-emerald-600 rounded-lg py-2 hover:bg-emerald-700 disabled:opacity-40">
            Créer le suivi
          </button>
        </div>
        <p className="text-[11px] text-slate-400 mt-3 text-center">Aucun mail sans trace — le suivi démarre ici.</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Vues                                                               */
/* ------------------------------------------------------------------ */
function MonEspace({ me, items, now, onOpen, onNew }) {
  const mine = items.filter((i) => i.ownerId === me.id);
  const attends = mine.filter((i) => ["relance", "escalade"].includes(reminderState(i, now).level));
  const actifs = mine.filter((i) => i.statut !== "Clôturé");
  const rank = computeScores(items, now).findIndex((s) => s.id === me.id);
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Bonjour, {me.nom}</h1>
          <p className="text-[13px] text-slate-500">{fmtLong(now)} · {actifs.length} suivis actifs{rank >= 0 && ` · ${rank + 1}ᵉ au classement`}</p>
        </div>
        <button onClick={onNew} className="flex items-center gap-1.5 text-[13px] font-medium text-white bg-emerald-600 rounded-lg px-3 py-2 hover:bg-emerald-700"><Plus size={16} />Nouveau suivi</button>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <Bell size={15} className="text-amber-500" />
          <h2 className="text-[13px] font-semibold text-slate-700 uppercase tracking-wide">Ce qui t'attend</h2>
          <span className="text-[11px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">{attends.length}</span>
        </div>
        {attends.length === 0
          ? <Card className="p-6 text-center text-[13px] text-slate-400">Rien ne t'attend. Tout est à jour.</Card>
          : <div className="space-y-3">{attends.map((i) => <ItemCard key={i.id} item={i} now={now} onOpen={onOpen} />)}</div>}
      </div>

      <div>
        <h2 className="text-[13px] font-semibold text-slate-700 uppercase tracking-wide mb-2">Mes suivis actifs</h2>
        {actifs.length === 0
          ? <Card className="p-6 text-center text-[13px] text-slate-400">Aucun suivi actif. Crée-en un pour commencer.</Card>
          : <div className="grid md:grid-cols-2 gap-3">{actifs.map((i) => <ItemCard key={i.id} item={i} now={now} onOpen={onOpen} />)}</div>}
      </div>
    </div>
  );
}

function VueGlobale({ items, now, onOpen }) {
  const [fMetier, setFMetier] = useState("Tous");
  const [fAgent, setFAgent] = useState("Tous");
  const actifs = items.filter((i) => i.statut !== "Clôturé");
  const enRetard = actifs.filter((i) => reminderState(i, now).level === "escalade").length;
  const bloques = actifs.filter((i) => i.statut === "Bloqué").length;
  const repondus = items.filter((i) => i.timeline.some((e) => e.kind === "reponse")).length;
  const taux = Math.round((repondus / items.length) * 100);
  const rows = actifs.filter((i) => (fMetier === "Tous" || i.metier === fMetier) && (fAgent === "Tous" || i.ownerId === fAgent));
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-800">Vue globale</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI icon={Inbox} label="Suivis actifs" value={actifs.length} tone="sky" />
        <KPI icon={ArrowUp} label="En retard" value={enRetard} tone="rose" />
        <KPI icon={ShieldAlert} label="Bloqués" value={bloques} tone="amber" />
        <KPI icon={TrendingUp} label="Taux de réponse" value={taux + "%"} tone="emerald" />
      </div>

      <Card>
        <div className="flex items-center gap-2 p-3 border-b border-slate-100">
          <Filter size={15} className="text-slate-400" />
          <select value={fMetier} onChange={(e) => setFMetier(e.target.value)} className="text-[12px] border border-slate-200 rounded-lg px-2 py-1">
            <option>Tous</option>{Object.keys(METIERS).map((m) => <option key={m}>{m}</option>)}
          </select>
          <select value={fAgent} onChange={(e) => setFAgent(e.target.value)} className="text-[12px] border border-slate-200 rounded-lg px-2 py-1">
            <option value="Tous">Tous les agents</option>{USERS.map((u) => <option key={u.id} value={u.id}>{u.nom}</option>)}
          </select>
          <span className="ml-auto text-[12px] text-slate-400">{rows.length} suivis</span>
        </div>
        <div className="divide-y divide-slate-100">
          {rows.map((i) => {
            const rs = reminderState(i, now);
            return (
              <button key={i.id} onClick={() => onOpen(i)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left">
                <Avatar id={i.ownerId} size="h-7 w-7" />
                <div className="flex items-center gap-2 w-40 shrink-0"><MetierChip code={i.metier} /><TypeTag t={i.type} /></div>
                <div className="flex-1 min-w-0"><div className="text-[13px] text-slate-800 truncate">{i.objet}</div><Token>{i.ref}</Token></div>
                <div className="text-[12px] text-slate-500 w-24 text-right">{i.statut}</div>
                <div className="w-28 text-right">
                  {rs.level === "escalade" && <span className="text-[11px] text-rose-600 font-medium">En retard J+{rs.days}</span>}
                  {rs.level === "relance" && <span className="text-[11px] text-amber-600 font-medium">Relance due</span>}
                  {rs.level === "bloque" && <span className="text-[11px] text-rose-600 font-medium">Bloqué</span>}
                  {rs.level === "ok" && <span className="text-[11px] text-slate-400">à jour</span>}
                </div>
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function Blocages({ items, now, onOpen }) {
  const risk = items.filter((i) => {
    const l = reminderState(i, now).level;
    return l === "escalade" || l === "bloque";
  }).sort((a, b) => reminderState(b, now).days - reminderState(a, now).days);
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Ce qui ne bouge pas</h1>
        <p className="text-[13px] text-slate-500">Les suivis à risque, du plus ancien au plus récent — et pourquoi.</p>
      </div>
      {risk.length === 0
        ? <Card className="p-8 text-center text-[13px] text-slate-400">Rien de bloqué. Tout avance.</Card>
        : risk.map((i) => {
          const rs = reminderState(i, now);
          return (
            <Card key={i.id} className="p-4 border-l-[3px] border-l-rose-500">
              <div className="flex items-center gap-2 mb-2">
                <MetierChip code={i.metier} /><TypeTag t={i.type} /><Token>{i.ref}</Token>
                <span className="ml-auto text-[12px] font-medium text-rose-600">Sans mouvement depuis {rs.days}j</span>
              </div>
              <div className="text-[14px] font-medium text-slate-800 mb-2">{i.objet}</div>
              <div className="flex items-center gap-3 text-[12px] text-slate-500">
                <span className="flex items-center gap-1"><Avatar id={i.ownerId} size="h-5 w-5" />{userById(i.ownerId).nom}</span>
                <span className="flex items-center gap-1 text-rose-600 font-medium"><ShieldAlert size={13} />{i.blocageCause || "Escaladé — sans réponse"}</span>
                <button onClick={() => onOpen(i)} className="ml-auto text-[12px] text-emerald-700 font-medium hover:underline">Ouvrir →</button>
              </div>
            </Card>
          );
        })}
    </div>
  );
}

function Stats({ items, now }) {
  const parMetier = Object.keys(METIERS).map((m) => ({ name: m, v: items.filter((i) => i.metier === m).length })).filter((x) => x.v);
  const parAgent = USERS.filter((u) => u.role === "agent").map((u) => {
    const mine = items.filter((i) => i.ownerId === u.id);
    const rep = mine.filter((i) => i.timeline.some((e) => e.kind === "reponse")).length;
    return { name: u.init, taux: mine.length ? Math.round((rep / mine.length) * 100) : 0 };
  });
  const relances = USERS.filter((u) => u.role === "agent").map((u) => ({
    name: u.init, v: items.filter((i) => i.ownerId === u.id).reduce((s, i) => s + i.relancesCount, 0),
  }));
  const box = "bg-white border border-slate-200 rounded-xl p-4";
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Statistiques</h1>
        <p className="text-[13px] text-slate-500">Le registre, en vivant. Ce qui avance, ce qui répond, qui fait bouger les lignes.</p>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className={box}>
          <div className="text-[13px] font-semibold text-slate-700 mb-3">Volume par métier</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={parMetier}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f6" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} allowDecimals={false} /><Tooltip />
              <Bar dataKey="v" radius={[4, 4, 0, 0]} fill="#1FA07A" /></BarChart>
          </ResponsiveContainer>
        </div>
        <div className={box}>
          <div className="text-[13px] font-semibold text-slate-700 mb-3">Taux de réponse par agent (%)</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={parAgent}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f6" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} domain={[0, 100]} /><Tooltip />
              <Bar dataKey="taux" radius={[4, 4, 0, 0]}>{parAgent.map((e, i) => <Cell key={i} fill={e.taux >= 60 ? "#1FA07A" : e.taux >= 30 ? "#D9943B" : "#C9503E"} />)}</Bar></BarChart>
          </ResponsiveContainer>
        </div>
        <div className={box}>
          <div className="text-[13px] font-semibold text-slate-700 mb-3">Relances effectuées par agent</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={relances}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f6" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} allowDecimals={false} /><Tooltip />
              <Bar dataKey="v" radius={[4, 4, 0, 0]} fill="#3E7CB1" /></BarChart>
          </ResponsiveContainer>
        </div>
        <div className={box}>
          <div className="text-[13px] font-semibold text-slate-700 mb-3">Répartition des statuts</div>
          <div className="space-y-2 mt-4">
            {Object.keys(STATUTS).map((s) => {
              const n = items.filter((i) => i.statut === s).length;
              const pct = Math.round((n / items.length) * 100);
              return (
                <div key={s} className="flex items-center gap-2 text-[12px]">
                  <span className="w-24 text-slate-600">{s}</span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-400" style={{ width: pct + "%" }} /></div>
                  <span className="w-6 text-right text-slate-400">{n}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function Classement({ items, now, me }) {
  const scores = computeScores(items, now);
  const medal = ["🥇", "🥈", "🥉"];
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Ceux qui font avancer les choses</h1>
        <p className="text-[13px] text-slate-500">Le score récompense relancer, obtenir des réponses et clôturer — pas le volume brut.</p>
      </div>
      <div className="space-y-2">
        {scores.map((s, i) => {
          const u = userById(s.id);
          const mine = s.id === me.id;
          return (
            <Card key={s.id} className={`p-4 flex items-center gap-3 ${mine ? "ring-2 ring-emerald-300" : ""}`}>
              <div className="w-8 text-center text-lg">{medal[i] || <span className="text-slate-400 text-sm font-semibold">{i + 1}</span>}</div>
              <Avatar id={s.id} />
              <div className="flex-1">
                <div className="text-[14px] font-medium text-slate-800">{u.nom}{mine && <span className="text-[11px] text-emerald-600 ml-1">· toi</span>}</div>
                <div className="flex gap-1.5 mt-1 flex-wrap">
                  {s.badges.map((b) => <span key={b} className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-full"><Award size={10} />{b}</span>)}
                  {s.badges.length === 0 && <span className="text-[11px] text-slate-400">Pas encore de badge</span>}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-semibold text-slate-800">{s.score}</div>
                <div className="text-[10px] text-slate-400">{s.closures} clôtures · {s.relances} relances</div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Rappels({ items, now, me, emailOn }) {
  const dues = items.filter((i) => reminderState(i, now).level === "relance");
  const escal = items.filter((i) => reminderState(i, now).level === "escalade");
  const isDir = me.role === "directeur";
  const Row = ({ i, tone }) => {
    const rs = reminderState(i, now);
    return (
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 last:border-0">
        <div className={`h-8 w-8 rounded-lg grid place-items-center ${tone === "rose" ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-600"}`}>
          {tone === "rose" ? <ArrowUp size={16} /> : <RotateCcw size={16} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] text-slate-800 truncate">{i.objet}</div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400"><Token>{i.ref}</Token><span>{userById(i.ownerId).nom}</span><span>· sans réponse depuis {rs.days}j</span></div>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-slate-400">
          <span className="px-1.5 py-0.5 bg-slate-100 rounded">in-app</span>
          {emailOn && <span className="px-1.5 py-0.5 bg-slate-100 rounded flex items-center gap-1"><Mail size={9} />e-mail</span>}
        </div>
      </div>
    );
  };
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Rappels</h1>
        <p className="text-[13px] text-slate-500">Le système relance à ta place — canaux : in-app{emailOn ? " + e-mail" : ""}.</p>
      </div>

      {isDir && (
        <Card className="p-4 bg-slate-800 border-slate-800">
          <div className="flex items-center gap-2 text-emerald-300 text-[11px] font-mono mb-2"><CalendarClock size={14} />DIGEST DU MATIN · 08:00</div>
          <div className="text-white text-[15px] font-medium mb-1">{escal.length} suivis escaladés · {items.filter((i) => i.statut === "Bloqué").length} bloqués</div>
          <div className="text-slate-300 text-[12px]">Envoyé automatiquement chaque matin. Tu n'as plus à courir après les suivis — ils remontent à toi.</div>
        </Card>
      )}

      <div>
        <div className="flex items-center gap-2 mb-2"><RotateCcw size={15} className="text-amber-500" /><h2 className="text-[13px] font-semibold text-slate-700 uppercase tracking-wide">Relances dues</h2><span className="text-[11px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{dues.length}</span></div>
        <Card>{dues.length ? dues.map((i) => <Row key={i.id} i={i} tone="amber" />) : <div className="p-6 text-center text-[13px] text-slate-400">Aucune relance due.</div>}</Card>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2"><ArrowUp size={15} className="text-rose-500" /><h2 className="text-[13px] font-semibold text-slate-700 uppercase tracking-wide">Escaladés au Directeur</h2><span className="text-[11px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">{escal.length}</span></div>
        <Card>{escal.length ? escal.map((i) => <Row key={i.id} i={i} tone="rose" />) : <div className="p-6 text-center text-[13px] text-slate-400">Aucune escalade.</div>}</Card>
      </div>
    </div>
  );
}

function Admin({ emailOn, setEmailOn }) {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-800">Administration</h1>

      <Card className="p-4">
        <div className="text-[13px] font-semibold text-slate-700 mb-3">Membres & rôles (RBAC)</div>
        <div className="divide-y divide-slate-100">
          {USERS.map((u) => (
            <div key={u.id} className="flex items-center gap-3 py-2.5">
              <Avatar id={u.id} size="h-7 w-7" />
              <div className="flex-1"><div className="text-[13px] text-slate-800">{u.nom}</div><div className="text-[11px] text-slate-400">{u.poste}</div></div>
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${u.role === "directeur" ? "bg-emerald-100 text-emerald-700" : u.role === "admin" ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-600"}`}>{u.role}</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="text-[13px] font-semibold text-slate-700 mb-3">Seuils de relance (SLA) par type</div>
          <div className="space-y-1.5">
            {Object.entries(TYPES).filter(([, v]) => v.sla).map(([t, v]) => (
              <div key={t} className="flex items-center gap-2 text-[12px]">
                <span className="w-24"><TypeTag t={t} /></span>
                <span className="text-slate-500">Relance J+{v.sla.relance}</span>
                <span className="text-slate-300">·</span>
                <span className="text-rose-500">Escalade J+{v.sla.escalade}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-[13px] font-semibold text-slate-700 mb-3">Canaux de notification</div>
          <label className="flex items-center gap-3 text-[13px] text-slate-700 cursor-pointer">
            <input type="checkbox" checked={emailOn} onChange={(e) => setEmailOn(e.target.checked)} className="h-4 w-4 accent-emerald-600" />
            Rappels par e-mail (en plus de l'in-app)
          </label>
          <div className="text-[11px] text-slate-400 mt-2">Le digest du matin au Directeur est toujours actif.</div>
          <div className="text-[13px] font-semibold text-slate-700 mt-4 mb-2">Catalogue</div>
          <div className="text-[12px] text-slate-500">9 métiers · 11 types · éditables ici. Ajouter un métier ou un type est immédiat — l'app s'étend sans refonte.</div>
        </Card>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  App                                                                */
/* ------------------------------------------------------------------ */
const NAV = [
  { id: "espace", label: "Mon espace", icon: LayoutDashboard, roles: ["agent", "directeur", "admin"] },
  { id: "global", label: "Vue globale", icon: Users, roles: ["agent", "directeur", "admin"] },
  { id: "blocages", label: "Ce qui ne bouge pas", icon: AlertTriangle, roles: ["directeur", "admin"] },
  { id: "stats", label: "Statistiques", icon: BarChart3, roles: ["directeur", "admin"] },
  { id: "classement", label: "Classement", icon: Trophy, roles: ["agent", "directeur", "admin"] },
  { id: "rappels", label: "Rappels", icon: Bell, roles: ["agent", "directeur", "admin"] },
  { id: "admin", label: "Administration", icon: Settings, roles: ["directeur", "admin"] },
];

export default function App() {
  const now = useMemo(() => new Date(), []);
  const [items, setItems] = useState(seedItems);
  const [meId, setMeId] = useState("u1");
  const [view, setView] = useState("espace");
  const [open, setOpen] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [emailOn, setEmailOn] = useState(true);
  const me = userById(meId);

  const nav = NAV.filter((n) => n.roles.includes(me.role));
  const myAlerts = items.filter((i) => {
    const l = reminderState(i, now).level;
    return me.role === "directeur" ? l === "escalade" : (i.ownerId === me.id && ["relance", "escalade"].includes(l));
  }).length;

  const act = (item, action, cause) => {
    setItems((prev) => prev.map((it) => {
      if (it.id !== item.id) return it;
      const n = { ...it, timeline: [...it.timeline], dateMaj: new Date() };
      if (action === "relance") { n.relancesCount++; n.statut = "Relancé"; n.timeline.push({ date: new Date(), kind: "relance", label: `Relance ${n.relancesCount}`, author: me.id }); }
      if (action === "reponse") { n.statut = "En traitement"; n.timeline.push({ date: new Date(), kind: "reponse", label: "Réponse reçue", author: me.id }); }
      if (action === "bloque") { n.statut = "Bloqué"; n.blocageCause = cause; n.timeline.push({ date: new Date(), kind: "statut", label: `→ Bloqué : ${cause}`, author: me.id }); }
      if (action === "cloture") { n.statut = "Clôturé"; n.timeline.push({ date: new Date(), kind: "cloture", label: "Clôturé", author: me.id }); }
      return n;
    }));
    setOpen(null);
  };

  const create = (parsed, prio, dest, pointsRaw) => {
    const points = pointsRaw.split("\n").map((x) => x.trim()).filter(Boolean);
    const it = {
      id: parsed.ref + "-" + Math.random().toString(36).slice(2, 6),
      ref: parsed.ref, metier: parsed.metier, type: parsed.type, objet: parsed.objet,
      ownerId: me.id, statut: "Envoyé", priorite: prio,
      personnes: dest ? [{ name: dest, kind: "destinataire" }] : [],
      pointsCles: points.length ? points : ["—"], blocageCause: null, relancesCount: 0,
      dateCreation: new Date(), dateMaj: new Date(),
      timeline: [{ date: new Date(), kind: "creation", label: "Objet créé", author: me.id }, { date: new Date(), kind: "envoi", label: "Envoyé", author: me.id }],
    };
    setItems((p) => [it, ...p]);
    setShowNew(false);
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900" style={{ fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}>
      {/* Sidebar */}
      <aside className="w-60 bg-slate-900 text-slate-300 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-500 grid place-items-center text-slate-900"><Compass size={18} /></div>
            <div>
              <div className="text-white font-semibold leading-none">Cap</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Rien ne dérive</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {nav.map((n) => (
            <button key={n.id} onClick={() => setView(n.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition ${view === n.id ? "bg-slate-800 text-white" : "hover:bg-slate-800/50"}`}>
              <n.icon size={16} />{n.label}
              {n.id === "rappels" && myAlerts > 0 && <span className="ml-auto text-[10px] bg-amber-500 text-slate-900 font-bold px-1.5 rounded-full">{myAlerts}</span>}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-800 text-[10px] text-slate-500">Aucun mail sans trace.</div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white border-b border-slate-200 flex items-center gap-3 px-5 shrink-0">
          <div className="relative flex-1 max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input placeholder="Rechercher une référence, un objet…" className="w-full pl-9 pr-3 py-1.5 text-[13px] bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-emerald-300" />
          </div>
          <button onClick={() => setView("rappels")} className="relative text-slate-500 hover:text-slate-700">
            <Bell size={19} />
            {myAlerts > 0 && <span className="absolute -top-1 -right-1 h-4 w-4 bg-rose-500 text-white text-[9px] font-bold rounded-full grid place-items-center">{myAlerts}</span>}
          </button>
          {/* Sélecteur d'utilisateur — démo RBAC */}
          <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
            <Avatar id={meId} size="h-8 w-8" />
            <select value={meId} onChange={(e) => { setMeId(e.target.value); const u = userById(e.target.value); if (!NAV.find((n) => n.id === view).roles.includes(u.role)) setView("espace"); }}
              className="text-[12px] border border-slate-200 rounded-lg px-2 py-1 bg-white">
              {USERS.map((u) => <option key={u.id} value={u.id}>{u.nom} · {u.role}</option>)}
            </select>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto">
            {view === "espace" && <MonEspace me={me} items={items} now={now} onOpen={setOpen} onNew={() => setShowNew(true)} />}
            {view === "global" && <VueGlobale items={items} now={now} onOpen={setOpen} />}
            {view === "blocages" && <Blocages items={items} now={now} onOpen={setOpen} />}
            {view === "stats" && <Stats items={items} now={now} />}
            {view === "classement" && <Classement items={items} now={now} me={me} />}
            {view === "rappels" && <Rappels items={items} now={now} me={me} emailOn={emailOn} />}
            {view === "admin" && <Admin emailOn={emailOn} setEmailOn={setEmailOn} />}
          </div>
        </main>
      </div>

      {open && <Drawer item={items.find((i) => i.id === open.id) || open} now={now} onClose={() => setOpen(null)} onAction={act} canEdit={me.role === "agent" ? open.ownerId === me.id : true} />}
      {showNew && <NewModal onClose={() => setShowNew(false)} onCreate={create} ownerId={meId} />}
    </div>
  );
}

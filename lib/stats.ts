/* ==================================================================
 *  lib/stats.ts — Statistiques détaillées (imputabilité).
 *  Ventilations par émetteur (agent), par destinataire, par criticité
 *  et par cause de blocage. Pur, réutilisé par la page Stats et le PDF.
 * ================================================================== */
import { reminderState, type Item, type Priorite, type Profile, type TypeDef } from "./domain";

export interface AgentStat {
  id: string;
  nom: string;
  suivis: number;
  relances: number;
  reponses: number;
  retards: number;
  bloques: number;
  clotures: number;
}
export interface DestStat {
  name: string;
  suivis: number;
  relances: number;
  retards: number;
  bloques: number;
  reponses: number;
}
export interface CritStat {
  priorite: Priorite;
  suivis: number;
  retards: number;
  bloques: number;
  tauxReponse: number;
}
export interface CauseStat {
  cause: string;
  n: number;
}
export interface ApprStat {
  appreciation: string;
  n: number;
}
export interface Breakdowns {
  parAgent: AgentStat[];
  parDestinataire: DestStat[];
  parCriticite: CritStat[];
  causes: CauseStat[];
  parAppreciation: ApprStat[];
}

const PRIORITES: Priorite[] = ["Critique", "Élevé", "Moyenne"];

export function computeBreakdowns(
  items: Item[],
  profiles: Profile[],
  now: Date,
  types: Record<string, TypeDef>
): Breakdowns {
  const nameById = new Map(profiles.map((p) => [p.id, p.nom]));
  const isLate = (i: Item) => reminderState(i, now, types).level === "escalade";
  const hasRep = (i: Item) => i.timeline.some((e) => e.kind === "reponse");

  /* --- Par émetteur (agent responsable) --- */
  const aMap = new Map<string, AgentStat>();
  const ensureA = (id: string): AgentStat => {
    let a = aMap.get(id);
    if (!a) {
      a = { id, nom: nameById.get(id) ?? "—", suivis: 0, relances: 0, reponses: 0, retards: 0, bloques: 0, clotures: 0 };
      aMap.set(id, a);
    }
    return a;
  };

  /* --- Par destinataire --- */
  const dMap = new Map<string, DestStat>();
  const ensureD = (name: string): DestStat => {
    let d = dMap.get(name);
    if (!d) {
      d = { name, suivis: 0, relances: 0, retards: 0, bloques: 0, reponses: 0 };
      dMap.set(name, d);
    }
    return d;
  };

  items.forEach((i) => {
    const late = isLate(i);
    const blocked = i.statut === "Bloqué";
    const rep = hasRep(i);

    const a = ensureA(i.ownerId);
    a.suivis++;
    a.relances += i.relancesCount;
    if (rep) a.reponses++;
    if (i.statut === "Clôturé") a.clotures++;
    if (blocked) a.bloques++;
    if (late) a.retards++;

    const dests = [...new Set(i.personnes.filter((p) => p.kind === "destinataire").map((p) => p.name))];
    dests.forEach((name) => {
      const d = ensureD(name);
      d.suivis++;
      d.relances += i.relancesCount;
      if (rep) d.reponses++;
      if (blocked) d.bloques++;
      if (late) d.retards++;
    });
  });

  /* --- Par criticité --- */
  const parCriticite: CritStat[] = PRIORITES.map((p) => {
    const of = items.filter((i) => i.priorite === p);
    const rep = of.filter(hasRep).length;
    return {
      priorite: p,
      suivis: of.length,
      retards: of.filter(isLate).length,
      bloques: of.filter((i) => i.statut === "Bloqué").length,
      tauxReponse: of.length ? Math.round((rep / of.length) * 100) : 0,
    };
  });

  /* --- Causes de blocage --- */
  const cMap = new Map<string, number>();
  items
    .filter((i) => i.statut === "Bloqué")
    .forEach((i) => {
      const c = i.blocageCause || "Non précisé";
      cMap.set(c, (cMap.get(c) ?? 0) + 1);
    });

  /* --- Par appréciation du motif (sur les suivis à risque) --- */
  const apprMap = new Map<string, number>();
  items
    .filter((i) => i.statut === "Bloqué" || isLate(i))
    .forEach((i) => {
      const a = i.appreciation || "Non précisée";
      apprMap.set(a, (apprMap.get(a) ?? 0) + 1);
    });

  return {
    parAppreciation: [...apprMap.entries()].map(([appreciation, n]) => ({ appreciation, n })).sort((a, b) => b.n - a.n),
    parAgent: [...aMap.values()].sort((a, b) => b.suivis - a.suivis),
    parDestinataire: [...dMap.values()].sort(
      (a, b) => b.retards + b.bloques - (a.retards + a.bloques) || b.suivis - a.suivis
    ),
    parCriticite,
    causes: [...cMap.entries()].map(([cause, n]) => ({ cause, n })).sort((a, b) => b.n - a.n),
  };
}

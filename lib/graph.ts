/* ==================================================================
 *  lib/graph.ts — Graphe de connaissance : construit les nœuds et les
 *  liens à partir de toutes les entités de l'application, et extrait
 *  le sous-graphe « égocentré » autour d'un nœud (façon Obsidian).
 *  Pur (sans DOM) → réutilisable et testable.
 * ================================================================== */
import { contactDisplayName } from "./domain";
import type {
  Contact,
  Item,
  Meeting,
  Negligence,
  NonConformite,
  Objective,
  Profile,
  Project,
  Task,
} from "./domain";

export type GraphNodeKind =
  | "item"
  | "project"
  | "task"
  | "negligence"
  | "nonconformite"
  | "objective"
  | "meeting"
  | "member"
  | "contact";

export interface GraphNode {
  id: string; // `${kind}:${rawId}`
  kind: GraphNodeKind;
  rawId: string;
  label: string;
}
export interface GraphEdge {
  source: string;
  target: string;
}
export interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export const nid = (kind: GraphNodeKind, rawId: string) => `${kind}:${rawId}`;

export interface GraphData {
  items: Item[];
  projects: Project[];
  tasks: Task[];
  negligences: Negligence[];
  nonConformites: NonConformite[];
  objectives: Objective[];
  meetings: Meeting[];
  profiles: Profile[];
  contacts: Contact[];
}

/** Construit le graphe complet (tous les nœuds et tous les liens connus). */
export function buildGraph(d: GraphData): Graph {
  const nodes = new Map<string, GraphNode>();
  const add = (kind: GraphNodeKind, rawId: string | null | undefined, label: string) => {
    if (!rawId) return;
    const id = nid(kind, rawId);
    if (!nodes.has(id)) nodes.set(id, { id, kind, rawId, label });
  };
  d.items.forEach((i) => add("item", i.id, `${i.ref} — ${i.objet}`));
  d.projects.forEach((p) => add("project", p.id, p.name));
  d.tasks.forEach((t) => add("task", t.id, t.title));
  d.negligences.forEach((n) => add("negligence", n.id, n.objet || "Négligence"));
  d.nonConformites.forEach((n) => add("nonconformite", n.id, n.objet || "Non-conformité"));
  d.objectives.forEach((o) => add("objective", o.id, o.title));
  d.meetings.forEach((m) => add("meeting", m.id, m.title));
  d.profiles.forEach((p) => add("member", p.id, p.nom));
  d.contacts.forEach((c) => add("contact", c.id, contactDisplayName(c) || c.email || "Contact"));

  const edges: GraphEdge[] = [];
  const seen = new Set<string>();
  const link = (a: string, b: string) => {
    if (!nodes.has(a) || !nodes.has(b) || a === b) return;
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    if (seen.has(key)) return;
    seen.add(key);
    edges.push({ source: a, target: b });
  };

  // Suivis ↔ projets
  d.items.forEach((i) => {
    if (i.projectId) link(nid("item", i.id), nid("project", i.projectId));
  });
  // Négligences / non-conformités ↔ suivi
  d.negligences.forEach((n) => n.itemId && link(nid("negligence", n.id), nid("item", n.itemId)));
  d.nonConformites.forEach((n) => n.itemId && link(nid("nonconformite", n.id), nid("item", n.itemId)));
  // Projets ↔ membres (responsable + équipe)
  d.projects.forEach((p) => {
    link(nid("project", p.id), nid("member", p.ownerId));
    p.memberIds.forEach((mid) => link(nid("project", p.id), nid("member", mid)));
  });
  // Tâches ↔ responsable + projet
  d.tasks.forEach((t) => {
    if (t.assigneeId) link(nid("task", t.id), nid("member", t.assigneeId));
    if (t.projectId) link(nid("task", t.id), nid("project", t.projectId));
  });
  // Objectifs ↔ projets / tâches / membres
  d.objectives.forEach((o) => {
    if (o.ownerId) link(nid("objective", o.id), nid("member", o.ownerId));
    o.projectIds.forEach((pid) => link(nid("objective", o.id), nid("project", pid)));
    o.taskIds.forEach((tid) => link(nid("objective", o.id), nid("task", tid)));
    o.memberIds.forEach((mid) => link(nid("objective", o.id), nid("member", mid)));
  });
  // Réunions ↔ sujets reliés + participants
  const linkKind: Record<string, GraphNodeKind> = {
    item: "item",
    project: "project",
    task: "task",
    negligence: "negligence",
    nonconformite: "nonconformite",
    objective: "objective",
  };
  d.meetings.forEach((m) => {
    m.links.forEach((l) => link(nid("meeting", m.id), nid(linkKind[l.type], l.id)));
    m.participants.forEach((p) => link(nid("meeting", m.id), nid(p.kind === "member" ? "member" : "contact", p.id)));
  });
  // Suivis ↔ contacts (destinataire retrouvé dans l'annuaire, par nom)
  const contactByName = new Map<string, string>();
  d.contacts.forEach((c) => {
    const n = contactDisplayName(c).toLowerCase();
    if (n && !contactByName.has(n)) contactByName.set(n, c.id);
  });
  d.items.forEach((i) => {
    i.personnes.forEach((p) => {
      const cid = contactByName.get((p.name || "").trim().toLowerCase());
      if (cid) link(nid("item", i.id), nid("contact", cid));
    });
  });

  return { nodes: [...nodes.values()], edges };
}

/** Sous-graphe égocentré : le nœud central + ses voisins jusqu'à `depth`. */
export function egoSubgraph(graph: Graph, centerId: string, depth = 1): Graph {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  if (!byId.has(centerId)) return { nodes: [], edges: [] };
  const adj = new Map<string, string[]>();
  for (const e of graph.edges) {
    (adj.get(e.source) ?? adj.set(e.source, []).get(e.source)!).push(e.target);
    (adj.get(e.target) ?? adj.set(e.target, []).get(e.target)!).push(e.source);
  }
  const keep = new Set<string>([centerId]);
  let frontier = [centerId];
  for (let d = 0; d < depth; d++) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const nb of adj.get(id) ?? []) {
        if (!keep.has(nb)) {
          keep.add(nb);
          next.push(nb);
        }
      }
    }
    frontier = next;
  }
  const nodes = graph.nodes.filter((n) => keep.has(n.id));
  const edges = graph.edges.filter((e) => keep.has(e.source) && keep.has(e.target));
  return { nodes, edges };
}

/** Degré (nombre de liens) de chaque nœud — pour dimensionner les bulles. */
export function degrees(graph: Graph): Map<string, number> {
  const deg = new Map<string, number>();
  for (const e of graph.edges) {
    deg.set(e.source, (deg.get(e.source) ?? 0) + 1);
    deg.set(e.target, (deg.get(e.target) ?? 0) + 1);
  }
  return deg;
}

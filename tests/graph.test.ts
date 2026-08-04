import { describe, it, expect } from "vitest";
import { buildGraph, egoSubgraph, nid, type GraphData } from "@/lib/graph";
import { mkItem, mkProject, mkObjective } from "./factories";

function emptyData(): GraphData {
  return {
    items: [],
    projects: [],
    tasks: [],
    negligences: [],
    nonConformites: [],
    objectives: [],
    meetings: [],
    profiles: [],
    contacts: [],
  };
}

describe("buildGraph", () => {
  it("relie un suivi à son projet et le projet à ses membres", () => {
    const d = emptyData();
    d.items = [mkItem({ id: "i1", ref: "SOC-2026-0001", projectId: "p1" })];
    d.projects = [mkProject({ id: "p1", ownerId: "u1", memberIds: ["u1", "u2"] })];
    d.profiles = [
      { id: "u1", nom: "A", poste: "", role: "agent", init: "A", extraPages: [], deniedPages: [], readonly: false, approved: true, mustChangePassword: false, totpEnabled: false },
      { id: "u2", nom: "B", poste: "", role: "agent", init: "B", extraPages: [], deniedPages: [], readonly: false, approved: true, mustChangePassword: false, totpEnabled: false },
    ];
    const g = buildGraph(d);
    const ids = new Set(g.nodes.map((n) => n.id));
    expect(ids.has(nid("item", "i1"))).toBe(true);
    expect(ids.has(nid("project", "p1"))).toBe(true);
    expect(ids.has(nid("member", "u1"))).toBe(true);

    const has = (a: string, b: string) => g.edges.some((e) => (e.source === a && e.target === b) || (e.source === b && e.target === a));
    expect(has(nid("item", "i1"), nid("project", "p1"))).toBe(true);
    expect(has(nid("project", "p1"), nid("member", "u1"))).toBe(true);
    expect(has(nid("project", "p1"), nid("member", "u2"))).toBe(true);
  });

  it("ne crée pas de lien vers un nœud inexistant", () => {
    const d = emptyData();
    d.items = [mkItem({ id: "i1", projectId: "ghost" })]; // projet 'ghost' absent
    const g = buildGraph(d);
    expect(g.edges).toHaveLength(0);
  });

  it("relie un objectif à ses projets", () => {
    const d = emptyData();
    d.projects = [mkProject({ id: "p1" })];
    d.objectives = [mkObjective({ id: "o1", ownerId: "", memberIds: [], projectIds: ["p1"] })];
    const g = buildGraph(d);
    expect(g.edges.some((e) => (e.source === nid("objective", "o1") && e.target === nid("project", "p1")) || (e.target === nid("objective", "o1") && e.source === nid("project", "p1")))).toBe(true);
  });
});

describe("egoSubgraph", () => {
  it("extrait le nœud central et ses voisins directs (profondeur 1)", () => {
    const d = emptyData();
    d.items = [mkItem({ id: "i1", projectId: "p1" })];
    d.projects = [mkProject({ id: "p1", ownerId: "u1", memberIds: ["u1"] })];
    d.profiles = [{ id: "u1", nom: "A", poste: "", role: "agent", init: "A", extraPages: [], deniedPages: [], readonly: false, approved: true, mustChangePassword: false, totpEnabled: false }];
    const g = buildGraph(d);
    const ego = egoSubgraph(g, nid("project", "p1"), 1);
    const ids = new Set(ego.nodes.map((n) => n.id));
    // Projet + suivi + membre (voisins directs)
    expect(ids.has(nid("project", "p1"))).toBe(true);
    expect(ids.has(nid("item", "i1"))).toBe(true);
    expect(ids.has(nid("member", "u1"))).toBe(true);
  });
  it("renvoie un graphe vide pour un centre inconnu", () => {
    const g = buildGraph(emptyData());
    expect(egoSubgraph(g, "item:nope", 1).nodes).toEqual([]);
  });
});

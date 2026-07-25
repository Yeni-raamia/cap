import { describe, it, expect } from "vitest";
import {
  computeScores,
  projectMetrics,
  memberProductivity,
  computeGame,
  type Score,
} from "@/lib/domain";
import { mkItem, mkTask, mkSubtask, mkProfile, mkProject, mkProjectTask, mkObjective } from "./factories";

describe("computeScores", () => {
  const now = new Date("2026-07-20T00:00:00Z");

  it("ne classe que les agents, ignore les autres rôles", () => {
    const profiles = [mkProfile({ id: "A" }), mkProfile({ id: "M", role: "manager" })];
    const scores = computeScores([], profiles, now);
    expect(scores.map((s) => s.id)).toEqual(["A"]);
  });

  it("agrège clôtures, relances, réponses et retards, puis trie par score", () => {
    const profiles = [mkProfile({ id: "A" }), mkProfile({ id: "B" })];
    const items = [
      // Agent A : 10 (clôture) + 15 (3 relances) + 8 (réponse) = 33, aucun retard.
      mkItem({ id: "a1", ownerId: "A", statut: "Clôturé" }),
      mkItem({ id: "a2", ownerId: "A", statut: "Envoyé", relancesCount: 3 }),
      mkItem({
        id: "a3",
        ownerId: "A",
        statut: "Envoyé",
        timeline: [{ date: now, kind: "reponse", label: "Réponse", author: "x" }],
      }),
      // Agent B : un suivi SIGNAL en escalade (créé il y a 10 j) → -4 (borné à 0), retard 1.
      mkItem({ id: "b1", ownerId: "B", type: "SIGNAL", statut: "Envoyé", dateCreation: new Date("2026-07-10T00:00:00Z") }),
      // Suivi d'un non-agent : ignoré.
      mkItem({ id: "z1", ownerId: "M", statut: "Clôturé" }),
    ];
    const scores = computeScores(items, profiles, now);
    const byId = Object.fromEntries(scores.map((s) => [s.id, s])) as Record<string, Score>;

    expect(scores).toHaveLength(2);
    expect(scores[0].id).toBe("A"); // trié par score décroissant

    expect(byId.A).toMatchObject({ score: 33, closures: 1, relances: 3, reponses: 1, retard: 0, actifs: 2 });
    expect(byId.A.badges).toContain("Relanceur"); // ≥ 3 relances
    expect(byId.A.badges).toContain("Zéro oubli"); // aucun retard

    expect(byId.B).toMatchObject({ score: 0, retard: 1, actifs: 1 }); // -4 borné à 0
    expect(byId.B.badges).not.toContain("Zéro oubli");
  });
});

describe("projectMetrics", () => {
  const now = new Date("2026-07-20T00:00:00Z");

  it("calcule total / faites / ouvertes / en retard / avancement", () => {
    const p = mkProject({
      tasks: [
        mkProjectTask({ id: "1", status: "fait" }),
        mkProjectTask({ id: "2", status: "fait" }),
        mkProjectTask({ id: "3", status: "à faire", dueDate: new Date("2026-07-10T00:00:00Z") }), // en retard
        mkProjectTask({ id: "4", status: "à faire", dueDate: new Date("2026-08-10T00:00:00Z") }), // à venir
      ],
    });
    expect(projectMetrics(p, now)).toEqual({ total: 4, done: 2, open: 2, late: 1, progress: 50 });
  });

  it("un projet terminé est à 100 % et sans retard", () => {
    const p = mkProject({
      status: "Terminé",
      tasks: [
        mkProjectTask({ id: "1", status: "fait" }),
        mkProjectTask({ id: "2", status: "à faire", dueDate: new Date("2026-07-10T00:00:00Z") }),
      ],
    });
    expect(projectMetrics(p, now)).toMatchObject({ progress: 100, late: 0 });
  });

  it("un projet sans tâche est à 0 %", () => {
    expect(projectMetrics(mkProject({ tasks: [] }), now)).toEqual({ total: 0, done: 0, open: 0, late: 0, progress: 0 });
  });
});

describe("memberProductivity", () => {
  const now = new Date("2026-07-20T00:00:00Z");

  it("agrège les tâches de la personne (charge pondérée, retards, récence)", () => {
    const tasks = [
      mkTask({ id: "1", assigneeId: "u1", status: "fait", completedAt: new Date("2026-07-15T00:00:00Z") }), // récente
      mkTask({ id: "2", assigneeId: "u1", status: "fait", completedAt: new Date("2026-06-01T00:00:00Z") }), // hors fenêtre
      mkTask({ id: "3", assigneeId: "u1", status: "à faire", priority: "Haute", dueDate: new Date("2026-07-10T00:00:00Z") }), // en retard
      mkTask({ id: "4", assigneeId: "u1", status: "bloqué", priority: "Urgente" }),
      mkTask({ id: "5", assigneeId: "u1", status: "en cours", priority: "Normale" }),
      mkTask({ id: "6", assigneeId: "u2", status: "fait" }), // autre personne, ignorée
    ];
    const p = memberProductivity("u1", tasks, now);
    expect(p).toMatchObject({
      id: "u1",
      tasksTotal: 5,
      tasksOpen: 3,
      tasksDone: 2,
      tasksLate: 1,
      tasksBlocked: 1,
      doneRecent: 1, // une seule achevée dans les 30 j
      completionRate: 40, // 2/5
      charge: 10, // Haute(3) + Urgente(5) + Normale(2)
    });
  });

  it("renvoie des compteurs nuls sans tâche", () => {
    expect(memberProductivity("u1", [], now)).toMatchObject({ tasksTotal: 0, completionRate: 0, charge: 0 });
  });
});

describe("computeGame", () => {
  it("calcule XP, niveau, progression et badges à partir de l'activité réelle", () => {
    const items = [
      mkItem({
        id: "a",
        ownerId: "u1",
        statut: "Clôturé",
        relancesCount: 2,
        timeline: [{ date: new Date("2026-07-05T00:00:00Z"), kind: "reponse", label: "Réponse", author: "x" }],
      }),
      mkItem({ id: "b", ownerId: "u1", statut: "Clôturé" }),
      mkItem({ id: "c", ownerId: "u1", statut: "Envoyé" }),
      mkItem({ id: "d", ownerId: "autre", statut: "Clôturé" }), // pas à u1
    ];
    const tasks = [
      mkTask({ id: "t1", assigneeId: "u1", status: "fait", subtasks: [mkSubtask({ id: "s1", done: true }), mkSubtask({ id: "s2", done: true }), mkSubtask({ id: "s3", done: false })] }),
      mkTask({ id: "t2", assigneeId: "u1", status: "fait" }),
      mkTask({ id: "t3", assigneeId: "autre", status: "fait" }),
    ];
    const projects = [mkProject({ id: "p1", ownerId: "u1", status: "Terminé" })];
    const objectives = [mkObjective({ id: "o1", ownerId: "u1", status: "atteint" })];

    const g = computeGame("u1", items, tasks, projects, objectives);

    // cloture 2×15 + reponse 1×10 + relance 2×3 + tache 2×5 + sousTache 2×1 + projet 1×50 + objectif 1×200
    expect(g.xp).toBe(30 + 10 + 6 + 10 + 2 + 50 + 200); // 308
    expect(g.level).toBe(1); // Éclaireur (≥ 150, < 450)
    expect(g.levelName).toBe("Éclaireur");
    expect(g.nextXp).toBe(450);
    expect(g.progressPct).toBe(53); // round((308-150)/(450-150)*100)

    const earned = new Set(g.badges.filter((b) => b.earned).map((b) => b.id));
    expect(earned.has("premiere")).toBe(true); // 1re clôture
    expect(earned.has("chef")).toBe(true); // un projet mené
    expect(earned.has("cap")).toBe(true); // un objectif atteint
    expect(earned.has("polyvalent")).toBe(true); // clôture + tâche + projet + objectif
    expect(earned.has("sentinelle")).toBe(false); // < 25 clôtures
  });

  it("un membre sans activité reste au niveau Novice", () => {
    const g = computeGame("vide", [], [], [], []);
    expect(g.xp).toBe(0);
    expect(g.level).toBe(0);
    expect(g.levelName).toBe("Novice");
    expect(g.badges.some((b) => b.earned)).toBe(false);
  });
});

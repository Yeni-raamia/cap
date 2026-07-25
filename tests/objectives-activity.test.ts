import { describe, it, expect } from "vitest";
import {
  filStage,
  subtaskProgress,
  objectiveProgress,
  objectiveTimePct,
  objectiveHealth,
  memberOfMonth,
  weeklyChallenges,
  weekStart,
  isReadOnly,
  isProjectArchived,
} from "@/lib/domain";
import { mkItem, mkTask, mkSubtask, mkProject, mkProjectTask, mkObjective } from "./factories";

describe("filStage", () => {
  it("suit le stade du statut", () => {
    expect(filStage(mkItem({ statut: "Brouillon" }))).toBe(0);
    expect(filStage(mkItem({ statut: "Clôturé" }))).toBe(5);
  });
  it("force l'étape Réponse (3) si une réponse est reçue en amont", () => {
    const item = mkItem({
      statut: "Envoyé", // stade 1
      timeline: [{ date: new Date("2026-07-05T00:00:00Z"), kind: "reponse", label: "Réponse", author: "x" }],
    });
    expect(filStage(item)).toBe(3);
  });
  it("ne rétrograde pas un stade déjà avancé malgré une réponse", () => {
    const item = mkItem({
      statut: "En traitement", // stade 4
      timeline: [{ date: new Date("2026-07-05T00:00:00Z"), kind: "reponse", label: "Réponse", author: "x" }],
    });
    expect(filStage(item)).toBe(4);
  });
});

describe("subtaskProgress", () => {
  it("calcule faites / total / pourcentage", () => {
    const t = mkTask({
      subtasks: [
        mkSubtask({ id: "a", done: true }),
        mkSubtask({ id: "b", done: false }),
        mkSubtask({ id: "c", done: false }),
        mkSubtask({ id: "d", done: false }),
      ],
    });
    expect(subtaskProgress(t)).toEqual({ done: 1, total: 4, pct: 25 });
  });
  it("renvoie 0 % sans sous-tâche", () => {
    expect(subtaskProgress(mkTask({ subtasks: [] }))).toEqual({ done: 0, total: 0, pct: 0 });
  });
});

describe("objectiveTimePct", () => {
  const o = mkObjective({ startDate: new Date("2026-01-01T00:00:00Z"), endDate: new Date("2026-01-11T00:00:00Z") });
  it("0 % avant le début, 100 % après la fin", () => {
    expect(objectiveTimePct(o, new Date("2025-12-01T00:00:00Z"))).toBe(0);
    expect(objectiveTimePct(o, new Date("2026-02-01T00:00:00Z"))).toBe(100);
  });
  it("proportionnel au milieu de la période", () => {
    expect(objectiveTimePct(o, new Date("2026-01-06T00:00:00Z"))).toBe(50);
  });
});

describe("objectiveProgress", () => {
  const now = new Date("2026-06-01T00:00:00Z");
  it("100 % si l'objectif est atteint", () => {
    expect(objectiveProgress(mkObjective({ status: "atteint" }), [], [], now)).toBe(100);
  });
  it("0 % sans projet ni tâche liés", () => {
    expect(objectiveProgress(mkObjective(), [], [], now)).toBe(0);
  });
  it("moyenne l'avancement des projets (50 %) et tâches (fait = 100 %) liés", () => {
    const project = mkProject({
      id: "p1",
      tasks: [mkProjectTask({ id: "1", status: "fait" }), mkProjectTask({ id: "2", status: "à faire" })], // 50 %
    });
    const task = mkTask({ id: "tk1", status: "fait" }); // 100 %
    const o = mkObjective({ projectIds: ["p1"], taskIds: ["tk1"] });
    expect(objectiveProgress(o, [project], [task], now)).toBe(75); // (50 + 100) / 2
  });
});

describe("objectiveHealth", () => {
  const o = mkObjective({ startDate: new Date("2026-01-01T00:00:00Z"), endDate: new Date("2026-01-11T00:00:00Z") });
  it("done / downgraded selon le statut", () => {
    expect(objectiveHealth(mkObjective({ status: "atteint" }), 40, new Date("2026-01-05"))).toBe("done");
    expect(objectiveHealth(mkObjective({ status: "declasse" }), 40, new Date("2026-01-05"))).toBe("downgraded");
  });
  it("planned avant le début", () => {
    expect(objectiveHealth(o, 0, new Date("2025-12-15T00:00:00Z"))).toBe("planned");
  });
  it("late après la fin si < 100 %", () => {
    expect(objectiveHealth(o, 80, new Date("2026-01-20T00:00:00Z"))).toBe("late");
  });
  it("at_risk si l'avancement décroche du temps écoulé", () => {
    // now à 80 % du temps, avancement 30 % → décrochage
    expect(objectiveHealth(o, 30, new Date("2026-01-09T00:00:00Z"))).toBe("at_risk");
  });
  it("on_track si l'avancement suit le temps", () => {
    expect(objectiveHealth(o, 70, new Date("2026-01-09T00:00:00Z"))).toBe("on_track");
  });
});

describe("memberOfMonth", () => {
  const now = new Date("2026-07-15T12:00:00Z");
  const clot = (author: string, date: string) => ({ date: new Date(date), kind: "cloture" as const, label: "Clôture", author });
  const rep = (author: string, date: string) => ({ date: new Date(date), kind: "reponse" as const, label: "Réponse", author });

  it("désigne le membre à la plus forte activité du mois", () => {
    const items = [
      mkItem({ id: "a", ownerId: "u1", timeline: [clot("u1", "2026-07-05T00:00:00Z"), clot("u1", "2026-07-08T00:00:00Z"), rep("u1", "2026-07-10T00:00:00Z")] }),
      mkItem({ id: "b", ownerId: "u2", timeline: [clot("u2", "2026-07-06T00:00:00Z")] }),
    ];
    // u1 = 2×3 + 1×2 = 8 ; u2 = 1×3 = 3
    expect(memberOfMonth(["u1", "u2"], items, [], now)).toBe("u1");
  });
  it("ignore l'activité hors du mois courant", () => {
    const items = [mkItem({ id: "a", ownerId: "u1", timeline: [clot("u1", "2026-06-20T00:00:00Z")] })];
    expect(memberOfMonth(["u1"], items, [], now)).toBeNull();
  });
});

describe("weeklyChallenges", () => {
  const now = new Date("2026-07-15T12:00:00Z"); // mercredi
  it("dérive les 3 défis de l'activité de la semaine", () => {
    const inWeek = "2026-07-14T12:00:00Z"; // mardi de la même semaine
    const items = [
      mkItem({
        id: "a",
        ownerId: "u1",
        timeline: [
          { date: new Date(inWeek), kind: "cloture", label: "Clôture", author: "u1" },
          { date: new Date(inWeek), kind: "reponse", label: "Réponse", author: "u1" },
        ],
      }),
    ];
    const tasks = [mkTask({ id: "t", assigneeId: "u1", status: "fait", completedAt: new Date(inWeek) })];
    const ch = weeklyChallenges("u1", items, tasks, now);
    const byId = Object.fromEntries(ch.map((c) => [c.id, c]));
    expect(byId.c_clot).toMatchObject({ current: 1, target: 5, done: false });
    expect(byId.c_rep).toMatchObject({ current: 1, target: 3, done: false });
    expect(byId.c_task).toMatchObject({ current: 1, target: 4, done: false });
  });
  it("weekStart tombe un lundi à minuit", () => {
    const ws = weekStart(now);
    expect(ws.getDay()).toBe(1); // lundi
    expect(ws.getHours()).toBe(0);
  });
});

describe("helpers de rôle / projet", () => {
  it("isReadOnly : DSI ou drapeau readonly", () => {
    expect(isReadOnly({ role: "dsi" })).toBe(true);
    expect(isReadOnly({ role: "agent", readonly: true })).toBe(true);
    expect(isReadOnly({ role: "agent" })).toBe(false);
  });
  it("isProjectArchived : Terminé ou Annulé", () => {
    expect(isProjectArchived(mkProject({ status: "Terminé" }))).toBe(true);
    expect(isProjectArchived(mkProject({ status: "Annulé" }))).toBe(true);
    expect(isProjectArchived(mkProject({ status: "En cours" }))).toBe(false);
  });
});

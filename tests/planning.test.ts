import { describe, it, expect } from "vitest";
import {
  buildPlanEvents,
  dayDropId,
  dayKey,
  groupByDay,
  HOUR_SLOTS,
  inMonth,
  isSamePlacement,
  monthGrid,
  movedDate,
  parseDropId,
  slotId,
  weekGrid,
  type PlanEvent,
} from "@/lib/planning";
import { mkProject, mkProjectTask } from "./factories";
import type { Meeting, Task } from "@/lib/domain";

const NOW = new Date(2026, 2, 11, 10, 0); // mercredi 11 mars 2026
const at = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min);

const task = (o: Partial<Task> = {}): Task =>
  ({
    id: "t1", title: "Tâche", description: "", assigneeId: "u1", createdBy: "u1", projectId: null,
    status: "à faire", priority: "Normale", startDate: null, dueDate: at(2026, 3, 11),
    createdAt: NOW, completedAt: null, subtasks: [], published: true, ...o,
  }) as Task;

const meeting = (o: Partial<Meeting> = {}): Meeting =>
  ({
    id: "m1", title: "Comité", agenda: "", date: at(2026, 3, 12, 14, 30), location: "Salle A",
    visioUrl: "", status: "planifiée", notes: "", decisions: [], participants: [], links: [],
    createdBy: "u1", createdAt: NOW, updatedAt: NOW, ...o,
  }) as Meeting;

describe("buildPlanEvents", () => {
  it("porte l'identifiant de l'objet sous-jacent et le caractère horaire", () => {
    const ev = buildPlanEvents({ tasks: [task()], projects: [], meetings: [meeting()], now: NOW });
    const t = ev.find((e) => e.kind === "tache")!;
    const m = ev.find((e) => e.kind === "reunion")!;
    expect(t.refId).toBe("t1");
    expect(t.timed).toBe(false); // une échéance de tâche n'a pas d'heure
    expect(m.refId).toBe("m1");
    expect(m.timed).toBe(true);
  });

  it("ignore ce qui n'a pas de date", () => {
    const ev = buildPlanEvents({ tasks: [task({ dueDate: null })], projects: [], meetings: [meeting({ date: null })], now: NOW });
    expect(ev).toEqual([]);
  });

  it("rassemble tâches, tâches de projet, échéances de projet et réunions", () => {
    const p = mkProject({ id: "p1", name: "Projet", deadline: at(2026, 3, 20), tasks: [mkProjectTask({ id: "pt1", dueDate: at(2026, 3, 13) })] });
    const ev = buildPlanEvents({ tasks: [task()], projects: [p], meetings: [meeting()], now: NOW });
    expect(ev.map((e) => e.kind).sort()).toEqual(["projet", "reunion", "tache", "tache-projet"]);
  });

  it("trie du plus ancien au plus récent", () => {
    const ev = buildPlanEvents({
      tasks: [task({ id: "a", dueDate: at(2026, 3, 20) }), task({ id: "b", dueDate: at(2026, 3, 5) })],
      projects: [], meetings: [], now: NOW,
    });
    expect(ev.map((e) => e.refId)).toEqual(["b", "a"]);
  });
});

describe("grilles", () => {
  it("le mois fait toujours 42 cases et commence un lundi", () => {
    const g = monthGrid(NOW);
    expect(g.length).toBe(42);
    expect(g[0].getDay()).toBe(1);
  });
  it("la semaine va du lundi au dimanche", () => {
    const w = weekGrid(NOW);
    expect(w.length).toBe(7);
    expect(w[0].getDate()).toBe(9);
    expect(w[6].getDate()).toBe(15);
  });
  it("distingue les jours hors du mois affiché", () => {
    expect(inMonth(at(2026, 3, 1), NOW)).toBe(true);
    expect(inMonth(at(2026, 4, 1), NOW)).toBe(false);
  });
  it("couvre une journée de bureau, pas 24 h", () => {
    expect(HOUR_SLOTS[0]).toBe(7);
    expect(HOUR_SLOTS.at(-1)).toBe(19);
  });
});

describe("groupByDay", () => {
  it("range les événements par jour civil local", () => {
    const ev = buildPlanEvents({
      tasks: [task({ id: "a", dueDate: at(2026, 3, 11, 23) }), task({ id: "b", dueDate: at(2026, 3, 12, 1) })],
      projects: [], meetings: [], now: NOW,
    });
    const g = groupByDay(ev);
    expect(g.get("2026-03-11")?.length).toBe(1);
    expect(g.get("2026-03-12")?.length).toBe(1);
  });
});

describe("zones de dépôt", () => {
  it("fait l'aller-retour sur un créneau", () => {
    const t = parseDropId(slotId(at(2026, 3, 11), 14))!;
    expect(dayKey(t.day)).toBe("2026-03-11");
    expect(t.hour).toBe(14);
  });
  it("fait l'aller-retour sur une journée entière", () => {
    const t = parseDropId(dayDropId(at(2026, 3, 11)))!;
    expect(dayKey(t.day)).toBe("2026-03-11");
    expect(t.hour).toBeNull();
  });
  it("rejette ce qui n'est pas une zone de dépôt", () => {
    expect(parseDropId("ev-tache-t1")).toBeNull();
    expect(parseDropId("")).toBeNull();
    expect(parseDropId("slot:pas-une-date:9")).toBeNull();
  });
});

describe("déplacement", () => {
  const ev = (o: Partial<PlanEvent> = {}): PlanEvent =>
    ({ id: "x", refId: "x", kind: "reunion", title: "T", date: at(2026, 3, 12, 14, 30), timed: true,
       personId: null, context: "", late: false, done: false, href: null, taskId: null, ...o });

  it("un dépôt sur un créneau impose l'heure, minutes remises à zéro", () => {
    const d = movedDate(ev(), { day: at(2026, 3, 16), hour: 9 });
    expect(d.getDate()).toBe(16);
    expect(d.getHours()).toBe(9);
    expect(d.getMinutes()).toBe(0);
  });

  it("un dépôt « toute la journée » conserve l'heure d'origine", () => {
    // Sans cela, glisser une réunion d'un jour à l'autre la ferait tomber à minuit.
    const d = movedDate(ev(), { day: at(2026, 3, 16), hour: null });
    expect(d.getDate()).toBe(16);
    expect(d.getHours()).toBe(14);
    expect(d.getMinutes()).toBe(30);
  });

  it("détecte un dépôt au même endroit", () => {
    expect(isSamePlacement(ev(), { day: at(2026, 3, 12), hour: null })).toBe(true);
    expect(isSamePlacement(ev(), { day: at(2026, 3, 12), hour: 14 })).toBe(false); // 14:30 → 14:00
    expect(isSamePlacement(ev(), { day: at(2026, 3, 13), hour: null })).toBe(false);
  });
});

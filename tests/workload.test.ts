import { describe, it, expect } from "vitest";
import {
  buildWorkload,
  collectLoadItems,
  isoWeekNumber,
  loadLevel,
  loadRatio,
  WEEK_CAPACITY_MINUTES,
  weeksFrom,
  type CellLoad,
} from "@/lib/workload";
import { mkProject, mkProjectTask } from "./factories";
import type { Task } from "@/lib/domain";

const NOW = new Date(2026, 2, 11, 9, 0); // mercredi 11 mars 2026
const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12);

const task = (o: Partial<Task> = {}): Task =>
  ({
    id: "t1", title: "Tâche", description: "", assigneeId: "u1", createdBy: "u1", projectId: null,
    status: "à faire", priority: "Normale", startDate: null, dueDate: at(2026, 3, 11),
    createdAt: NOW, completedAt: null, subtasks: [], published: true, ...o,
  }) as Task;

describe("isoWeekNumber", () => {
  it("numérote les semaines selon la norme ISO", () => {
    expect(isoWeekNumber(at(2026, 1, 1))).toBe(1);
    expect(isoWeekNumber(at(2026, 3, 11))).toBe(11);
  });
  it("rattache le 1er janvier à la semaine 53 quand il appartient à l'année précédente", () => {
    // 1er janvier 2027 = vendredi → semaine 53 de 2026.
    expect(isoWeekNumber(at(2027, 1, 1))).toBe(53);
  });
});

describe("weeksFrom", () => {
  it("produit des semaines consécutives commençant un lundi", () => {
    const w = weeksFrom(NOW, 4, NOW);
    expect(w.length).toBe(4);
    expect(w.map((x) => x.start.getDate())).toEqual([9, 16, 23, 30]);
    expect(w.every((x) => x.start.getDay() === 1)).toBe(true);
  });
  it("repère la semaine en cours", () => {
    const w = weeksFrom(NOW, 3, NOW);
    expect(w[0].isCurrent).toBe(true);
    expect(w[1].isCurrent).toBe(false);
  });
  it("étiquette la semaine de façon lisible", () => {
    expect(weeksFrom(NOW, 1, NOW)[0].label).toMatch(/9.*–.*15/);
  });
});

describe("collectLoadItems", () => {
  it("ignore ce qui est terminé — le passé ne charge personne", () => {
    const m = collectLoadItems([task({ status: "fait" })], [], NOW);
    expect(m.get("u1")).toBeUndefined();
  });
  it("ignore ce qui n'est assigné à personne", () => {
    const m = collectLoadItems([task({ assigneeId: null })], [], NOW);
    expect(m.size).toBe(0);
  });
  it("rassemble tâches et tâches de projet sous la même personne", () => {
    const p = mkProject({ id: "p1", name: "Projet", tasks: [mkProjectTask({ id: "pt1", assigneeId: "u1", dueDate: at(2026, 3, 12) })] });
    const m = collectLoadItems([task()], [p], NOW);
    expect(m.get("u1")?.map((i) => i.kind).sort()).toEqual(["tache", "tache-projet"]);
  });
  it("signale ce qui est déjà en retard", () => {
    const m = collectLoadItems([task({ dueDate: at(2026, 3, 1) })], [], NOW);
    expect(m.get("u1")?.[0].late).toBe(true);
  });
});

describe("buildWorkload", () => {
  const weeks = weeksFrom(NOW, 3, NOW);
  const build = (tasks: Task[], projects = []) =>
    buildWorkload({ people: ["u1"], tasks, projects, weeks, now: NOW })[0];

  it("range chaque travail dans la semaine de son échéance", () => {
    const r = build([
      task({ id: "a", dueDate: at(2026, 3, 11), estimatedMinutes: 60 }),
      task({ id: "b", dueDate: at(2026, 3, 18), estimatedMinutes: 120 }),
    ]);
    expect(r.cells[0].minutes).toBe(60);
    expect(r.cells[1].minutes).toBe(120);
    expect(r.cells[2].minutes).toBe(0);
  });

  it("compte à part les tâches non estimées, sans leur inventer de durée", () => {
    // Les ignorer donnerait une semaine faussement calme.
    const r = build([
      task({ id: "a", dueDate: at(2026, 3, 11), estimatedMinutes: 60 }),
      task({ id: "b", dueDate: at(2026, 3, 11), estimatedMinutes: null }),
    ]);
    expect(r.cells[0].minutes).toBe(60);
    expect(r.cells[0].estimated).toBe(1);
    expect(r.cells[0].unestimated).toBe(1);
  });

  it("isole ce qui n'a pas d'échéance plutôt que de le perdre", () => {
    const r = build([task({ id: "a", dueDate: null, estimatedMinutes: 60 })]);
    expect(r.cells.every((c) => c.minutes === 0)).toBe(true);
    expect(r.undated.minutes).toBe(60);
  });

  it("isole ce qui est en retard avant la première semaine affichée", () => {
    const r = build([task({ id: "a", dueDate: at(2026, 2, 20), estimatedMinutes: 90 })]);
    expect(r.overdue.minutes).toBe(90);
    expect(r.overdue.late).toBe(1);
  });

  it("laisse hors grille ce qui dépasse l'horizon", () => {
    const r = build([task({ id: "a", dueDate: at(2026, 6, 1), estimatedMinutes: 60 })]);
    expect(r.cells.every((c) => c.minutes === 0)).toBe(true);
    expect(r.undated.minutes).toBe(0);
    expect(r.overdue.minutes).toBe(0);
  });

  it("additionne les tâches de projet dans la même case", () => {
    const p = mkProject({
      id: "p1",
      tasks: [mkProjectTask({ id: "pt1", assigneeId: "u1", dueDate: at(2026, 3, 11), estimatedMinutes: 120 })],
    });
    const r = buildWorkload({ people: ["u1"], tasks: [task({ estimatedMinutes: 60 })], projects: [p], weeks, now: NOW })[0];
    expect(r.cells[0].minutes).toBe(180);
  });

  it("ne mélange pas les personnes", () => {
    const rows = buildWorkload({
      people: ["u1", "u2"],
      tasks: [task({ id: "a", assigneeId: "u2", estimatedMinutes: 60 })],
      projects: [],
      weeks,
      now: NOW,
    });
    expect(rows[0].cells[0].minutes).toBe(0);
    expect(rows[1].cells[0].minutes).toBe(60);
  });
});

describe("loadLevel", () => {
  const cell = (minutes: number, estimated = 1, unestimated = 0): CellLoad =>
    ({ minutes, estimated, unestimated, late: 0, items: [] });

  it("distingue une semaine vide d'une semaine calme", () => {
    expect(loadLevel(cell(0, 0, 0))).toBe("vide");
    expect(loadLevel(cell(60))).toBe("normal");
  });
  it("alerte à partir de 80 % de la capacité", () => {
    expect(loadLevel(cell(WEEK_CAPACITY_MINUTES * 0.79))).toBe("normal");
    expect(loadLevel(cell(WEEK_CAPACITY_MINUTES * 0.8))).toBe("charge");
    expect(loadLevel(cell(WEEK_CAPACITY_MINUTES))).toBe("charge");
  });
  it("ne parle de surcharge qu'au-delà de la capacité", () => {
    expect(loadLevel(cell(WEEK_CAPACITY_MINUTES + 1))).toBe("surcharge");
  });
  it("une semaine sans estimation n'est pas vide pour autant", () => {
    expect(loadLevel(cell(0, 0, 3))).toBe("normal");
  });
});

describe("loadRatio", () => {
  it("rapporte la charge à une semaine de 5 journées de 7 heures", () => {
    expect(WEEK_CAPACITY_MINUTES).toBe(2100);
    expect(loadRatio(2100)).toBe(1);
    expect(loadRatio(1050)).toBe(0.5);
  });
});

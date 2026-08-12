/* Test d'intégration des comptes rendus, sur une base SQLite jetable
 * (DATABASE_PATH défini avant le premier import du dépôt, car getDb() met la
 * connexion en cache). Vérifie l'écriture, le bornage de l'avancement et la
 * disparition en cascade quand l'objet rattaché est supprimé. */
import { describe, it, expect, beforeAll } from "vitest";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

process.env.DATABASE_PATH = join(tmpdir(), `cap-reports-${randomUUID()}.sqlite`);

let repo: typeof import("@/lib/db/reports");
let tasksRepo: typeof import("@/lib/db/tasks");

beforeAll(async () => {
  repo = await import("@/lib/db/reports");
  tasksRepo = await import("@/lib/db/tasks");
});

describe("comptes rendus", () => {
  it("enregistre et relit un compte rendu", () => {
    const id = repo.createReport({
      refType: "project",
      refId: "p1",
      authorId: "u1",
      kind: "periodique",
      title: "Point de la semaine",
      progress: 40,
      done: "Cartographie terminée.",
      difficulties: "Attente de l'exploitation.",
      nextSteps: "Rédiger la procédure.",
    });

    const r = repo.getReport(id)!;
    expect(r.title).toBe("Point de la semaine");
    expect(r.kind).toBe("periodique");
    expect(r.progress).toBe(40);
    expect(r.done).toBe("Cartographie terminée.");
    expect(repo.listReportsFor("project", "p1").length).toBe(1);
    expect(repo.listReportsFor("project", "autre").length).toBe(0);
  });

  it("borne l'avancement à 0–100 et se replie sur un type connu", () => {
    const trop = repo.createReport({ refType: "project", refId: "p2", authorId: "u1", progress: 250, done: "x" });
    expect(repo.getReport(trop)!.progress).toBe(100);

    const negatif = repo.createReport({ refType: "project", refId: "p2", authorId: "u1", progress: -10, done: "x" });
    expect(repo.getReport(negatif)!.progress).toBe(0);

    const inconnu = repo.createReport({ refType: "project", refId: "p2", authorId: "u1", kind: "n'importe quoi", done: "x" });
    expect(repo.getReport(inconnu)!.kind).toBe("periodique");
  });

  it("ne modifie que les champs fournis", () => {
    const id = repo.createReport({
      refType: "project",
      refId: "p3",
      authorId: "u1",
      title: "Initial",
      done: "Fait",
      difficulties: "Rien",
      progress: 20,
    });
    repo.updateReport(id, { progress: 80 });
    const r = repo.getReport(id)!;
    expect(r.progress).toBe(80);
    expect(r.title).toBe("Initial"); // inchangé
    expect(r.done).toBe("Fait");
    expect(r.difficulties).toBe("Rien");
  });

  it("disparaît avec la tâche à laquelle il est rattaché", () => {
    const taskId = tasksRepo.createTask({ title: "Tâche à clore", createdBy: "u1" });
    repo.createReport({ refType: "task", refId: taskId, authorId: "u1", kind: "cloture", done: "Livré." });
    expect(repo.listReportsFor("task", taskId).length).toBe(1);

    tasksRepo.deleteTask(taskId);
    expect(repo.listReportsFor("task", taskId).length).toBe(0);
  });

  it("se supprime sans toucher aux autres", () => {
    const a = repo.createReport({ refType: "project", refId: "p4", authorId: "u1", done: "A" });
    const b = repo.createReport({ refType: "project", refId: "p4", authorId: "u1", done: "B" });
    repo.deleteReport(a);
    expect(repo.getReport(a)).toBeNull();
    expect(repo.getReport(b)).not.toBeNull();
  });
});

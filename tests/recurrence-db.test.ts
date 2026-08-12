/* Test d'intégration du moteur de récurrence, contre une vraie base SQLite
 * jetable (DATABASE_PATH pointe vers un fichier temporaire, défini avant le
 * premier import du dépôt car getDb() met la connexion en cache).
 *
 * La logique de calendrier est couverte à part, sans base, par
 * tests/recurrence.test.ts ; ici on vérifie ce que la base seule peut dire :
 * idempotence, avancée du roulement, suspension, suppression. */
import { describe, it, expect, beforeAll } from "vitest";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

process.env.DATABASE_PATH = join(tmpdir(), `cap-recur-${randomUUID()}.sqlite`);

let db: typeof import("@/lib/db/recurrences");
let tasksRepo: typeof import("@/lib/db/tasks");

beforeAll(async () => {
  db = await import("@/lib/db/recurrences");
  tasksRepo = await import("@/lib/db/tasks");
});

const today = new Date();

describe("génération réelle des occurrences", () => {
  it("crée une tâche, puis reste idempotente", () => {
    const id = db.createRecurrence({
      title: "Revue quotidienne",
      frequency: "quotidien",
      assignMode: "libre",
      startDate: today.toISOString(),
      createdBy: "u1",
      active: true,
    });

    const first = db.generateDueTasks(today);
    expect(first.created).toBe(1);

    const second = db.generateDueTasks(today);
    expect(second.created).toBe(0); // même jour → pas de doublon

    const tasks = tasksRepo.listTasks().filter((t) => t.recurrenceId === id);
    expect(tasks.length).toBe(1);
    expect(tasks[0].title).toBe("Revue quotidienne");
    expect(tasks[0].status).toBe("à faire");
    expect(tasks[0].assigneeId).toBeNull();

    const rec = db.getRecurrence(id)!;
    expect(rec.occurrencesCount).toBe(1);
    expect(rec.lastRunOn).not.toBeNull();
  });

  it("fait tourner le roulement d'une occurrence à l'autre", () => {
    const start = new Date(today);
    start.setDate(start.getDate() - 2); // trois jours : avant-hier, hier, aujourd'hui
    const id = db.createRecurrence({
      title: "Astreinte du jour",
      frequency: "quotidien",
      assignMode: "rotation",
      rotationIds: ["a", "b"],
      startDate: start.toISOString(),
      createdBy: "u1",
      active: true,
    });

    const res = db.generateDueTasks(today);
    expect(res.created).toBeGreaterThanOrEqual(3);

    const mine = tasksRepo
      .listTasks()
      .filter((t) => t.recurrenceId === id)
      .sort((a, b) => (a.occurrenceDate ?? "").localeCompare(b.occurrenceDate ?? ""));
    expect(mine.map((t) => t.assigneeId)).toEqual(["a", "b", "a"]);
    expect(db.getRecurrence(id)!.rotationIndex).toBe(3);
  });

  it("respecte la suspension", () => {
    const id = db.createRecurrence({
      title: "Série suspendue",
      frequency: "quotidien",
      assignMode: "libre",
      startDate: today.toISOString(),
      createdBy: "u1",
      active: false,
    });
    expect(db.generateDueTasks(today).created).toBe(0);
    expect(tasksRepo.listTasks().filter((t) => t.recurrenceId === id).length).toBe(0);
  });

  it("conserve les occurrences quand le gabarit est supprimé", () => {
    const id = db.createRecurrence({
      title: "Série éphémère",
      frequency: "quotidien",
      assignMode: "fixe",
      assigneeId: "u1",
      startDate: today.toISOString(),
      createdBy: "u1",
      active: true,
    });
    db.generateDueTasks(today);
    const before = tasksRepo.listTasks().filter((t) => t.title === "Série éphémère").length;
    expect(before).toBe(1);

    db.deleteRecurrence(id);
    const after = tasksRepo.listTasks().filter((t) => t.title === "Série éphémère");
    expect(after.length).toBe(1); // la tâche survit…
    expect(after[0].recurrenceId).toBeNull(); // …détachée de la série
    expect(db.getRecurrence(id)).toBeNull();
  });
});

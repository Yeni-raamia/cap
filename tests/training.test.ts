import { describe, it, expect } from "vitest";
import { competencyRadar, courseProgress, trainingLevel, trainingXp, type CapaAction, type TrainingCourse, type TrainingDone, type TrainingLesson } from "@/lib/domain";
import { CURRICULUM } from "@/lib/data/trainingCurriculum";

const lesson = (id: string, xp: number): TrainingLesson =>
  ({ id, courseId: "c", order: 0, type: "lesson", title: id, content: "", xp, questions: [], steps: [], challengeHref: "" });
const course = (id: string, lessons: TrainingLesson[]): TrainingCourse =>
  ({ id, ref: "ACAD", title: id, description: "", category: "", icon: "🎓", badge: "", track: "grc", order: 0, published: true, lessons, createdBy: null, createdAt: new Date(), updatedAt: new Date() });
const done = (lessonId: string, score = 100): TrainingDone => ({ lessonId, score, completedAt: new Date() });

describe("trainingLevel", () => {
  it("paliers Débutant → Expert", () => {
    expect(trainingLevel(0).name).toBe("Débutant");
    expect(trainingLevel(200).name).toBe("Junior");
    expect(trainingLevel(500).name).toBe("Confirmé");
    expect(trainingLevel(900).name).toBe("Expert");
    expect(trainingLevel(900).nextXp).toBeNull();
  });
  it("progression vers le palier suivant", () => {
    // 275 XP : entre Junior (150) et Confirmé (400) → (275-150)/(400-150)=50%
    expect(trainingLevel(275).progressPct).toBe(50);
  });
});

describe("trainingXp", () => {
  it("somme des XP pondérées par le score", () => {
    const c = course("c", [lesson("l1", 20), lesson("l2", 30)]);
    // l1 à 100% = 20, l2 à 50% = 15 → 35
    expect(trainingXp([c], [done("l1", 100), done("l2", 50)])).toBe(35);
  });
  it("ignore les leçons inconnues", () => {
    const c = course("c", [lesson("l1", 20)]);
    expect(trainingXp([c], [done("inconnue", 100)])).toBe(0);
  });
});

describe("courseProgress", () => {
  it("part des leçons achevées", () => {
    const c = course("c", [lesson("l1", 10), lesson("l2", 10), lesson("l3", 10)]);
    expect(courseProgress(c, new Set(["l1", "l2"]))).toEqual({ done: 2, total: 3, pct: 67 });
  });
  it("parcours vide = 0%", () => {
    expect(courseProgress(course("c", []), new Set()).pct).toBe(0);
  });
});

describe("competencyRadar", () => {
  const courseCat = (cat: string, lessons: TrainingLesson[]): TrainingCourse => course("c-" + cat, lessons.map((l) => ({ ...l, courseId: "c-" + cat }))) as TrainingCourse & { category: string };
  const capa = (o: Partial<CapaAction>): CapaAction => ({ ownerId: "u1", status: "En cours", dueDate: null, ...o } as unknown as CapaAction);

  it("maîtrise = moyenne des scores sur les leçons du domaine + axe Plan d'action", () => {
    const risques = { ...courseCat("Gestion des risques", [lesson("r1", 20), lesson("r2", 20)]), category: "Gestion des risques" };
    const radar = competencyRadar([risques], [done("r1", 100), done("r2", 50)], [], "u1", new Date());
    const risquesAxis = radar.find((a) => a.axis === "Risques");
    expect(risquesAxis?.value).toBe(75); // (100 + 50) / 2
    // Un domaine sans leçon terminée → 0
    expect(radar.find((a) => a.axis === "Conformité")?.value).toBe(0);
    // L'axe Plan d'action est toujours présent
    expect(radar.some((a) => a.axis === "Plan d'action")).toBe(true);
  });

  it("le Plan d'action pénalise les actions en retard", () => {
    const past = new Date("2020-01-01");
    const owned = [capa({ ownerId: "u1", status: "En cours", dueDate: past }), capa({ ownerId: "u1", status: "En cours", dueDate: new Date("2999-01-01") })];
    const radar = competencyRadar([], [], owned, "u1", new Date());
    // 1 en retard sur 2 → 50
    expect(radar.find((a) => a.axis === "Plan d'action")?.value).toBe(50);
  });
});

describe("curriculum de départ", () => {
  it("propose plusieurs parcours couvrant les 4 formats", () => {
    expect(CURRICULUM.length).toBeGreaterThanOrEqual(3);
    const types = new Set(CURRICULUM.flatMap((c) => c.lessons.map((l) => l.type)));
    expect(types.has("lesson")).toBe(true);
    expect(types.has("quiz")).toBe(true);
    expect(types.has("case")).toBe(true);
    expect(types.has("challenge")).toBe(true);
  });
  it("chaque quiz a des questions avec un index de bonne réponse valide", () => {
    CURRICULUM.forEach((c) => c.lessons.filter((l) => l.type === "quiz").forEach((l) => {
      expect((l.questions ?? []).length).toBeGreaterThan(0);
      (l.questions ?? []).forEach((q) => expect(q.correct).toBeLessThan(q.options.length));
    }));
  });
});

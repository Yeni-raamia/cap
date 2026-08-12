import { describe, it, expect } from "vitest";
import {
  assigneeFor,
  describeFrequency,
  dueDateFor,
  dueOccurrences,
  isoWeekday,
  MAX_CATCHUP_DAYS,
  nextOccurrence,
  occursOn,
} from "@/lib/recurrence";
import { toDayInput } from "@/lib/period";
import type { TaskRecurrence } from "@/lib/domain";

// Mercredi 11 mars 2026.
const NOW = new Date(2026, 2, 11, 9, 0, 0);
const day = (y: number, m: number, d: number) => new Date(y, m - 1, d);

const mk = (over: Partial<TaskRecurrence> = {}): TaskRecurrence => ({
  id: "r1",
  title: "Revue des alertes",
  description: "",
  priority: "Normale",
  projectId: null,
  frequency: "quotidien",
  weekdays: [],
  monthDay: 1,
  intervalDays: 1,
  assignMode: "libre",
  assigneeId: null,
  rotationIds: [],
  rotationIndex: 0,
  dueOffsetDays: 0,
  startDate: day(2026, 3, 1),
  endDate: null,
  maxOccurrences: null,
  active: true,
  lastRunOn: null,
  occurrencesCount: 0,
  createdBy: "u1",
  createdAt: day(2026, 3, 1),
  updatedAt: day(2026, 3, 1),
  ...over,
});

describe("isoWeekday", () => {
  it("numérote du lundi (1) au dimanche (7)", () => {
    expect(isoWeekday(day(2026, 3, 9))).toBe(1); // lundi
    expect(isoWeekday(day(2026, 3, 13))).toBe(5); // vendredi
    expect(isoWeekday(day(2026, 3, 15))).toBe(7); // dimanche
  });
});

describe("occursOn", () => {
  it("quotidien : tous les jours à partir du début", () => {
    const r = mk();
    expect(occursOn(r, day(2026, 3, 11))).toBe(true);
    expect(occursOn(r, day(2026, 3, 15))).toBe(true); // dimanche compris
    expect(occursOn(r, day(2026, 2, 28))).toBe(false); // avant le début
  });

  it("jours ouvrés : exclut samedi et dimanche", () => {
    const r = mk({ frequency: "jours_ouvres" });
    expect(occursOn(r, day(2026, 3, 13))).toBe(true); // vendredi
    expect(occursOn(r, day(2026, 3, 14))).toBe(false); // samedi
    expect(occursOn(r, day(2026, 3, 15))).toBe(false); // dimanche
  });

  it("hebdomadaire : uniquement les jours choisis", () => {
    const r = mk({ frequency: "hebdomadaire", weekdays: [1, 4] }); // lundi, jeudi
    expect(occursOn(r, day(2026, 3, 9))).toBe(true);
    expect(occursOn(r, day(2026, 3, 12))).toBe(true);
    expect(occursOn(r, day(2026, 3, 11))).toBe(false);
  });

  it("mensuel : le jour choisi, replié sur le dernier jour des mois courts", () => {
    const r = mk({ frequency: "mensuel", monthDay: 31, startDate: day(2026, 1, 1) });
    expect(occursOn(r, day(2026, 3, 31))).toBe(true);
    expect(occursOn(r, day(2026, 4, 30))).toBe(true); // avril n'a pas de 31
    expect(occursOn(r, day(2026, 2, 28))).toBe(true); // février non bissextile
    expect(occursOn(r, day(2026, 4, 29))).toBe(false);
  });

  it("personnalisé : tous les N jours depuis la date de début", () => {
    const r = mk({ frequency: "personnalise", intervalDays: 3, startDate: day(2026, 3, 1) });
    expect(occursOn(r, day(2026, 3, 1))).toBe(true);
    expect(occursOn(r, day(2026, 3, 4))).toBe(true);
    expect(occursOn(r, day(2026, 3, 3))).toBe(false);
  });

  it("respecte la date de fin", () => {
    const r = mk({ endDate: day(2026, 3, 10) });
    expect(occursOn(r, day(2026, 3, 10))).toBe(true);
    expect(occursOn(r, day(2026, 3, 11))).toBe(false);
  });
});

describe("dueOccurrences", () => {
  it("engendre depuis le début de la série jusqu'à aujourd'hui inclus", () => {
    const r = mk({ startDate: day(2026, 3, 9) });
    const days = dueOccurrences(r, NOW).map(toDayInput);
    expect(days).toEqual(["2026-03-09", "2026-03-10", "2026-03-11"]);
  });

  it("ne devance jamais aujourd'hui", () => {
    const r = mk({ startDate: day(2026, 3, 1) });
    const days = dueOccurrences(r, NOW).map(toDayInput);
    expect(days.at(-1)).toBe("2026-03-11");
  });

  it("reprend au lendemain de la dernière occurrence engendrée", () => {
    const r = mk({ startDate: day(2026, 3, 1), lastRunOn: "2026-03-09" });
    expect(dueOccurrences(r, NOW).map(toDayInput)).toEqual(["2026-03-10", "2026-03-11"]);
  });

  it("ne réengendre rien quand la série est déjà à jour", () => {
    const r = mk({ lastRunOn: "2026-03-11" });
    expect(dueOccurrences(r, NOW)).toEqual([]);
  });

  it("plafonne le rattrapage après une longue absence", () => {
    const r = mk({ startDate: day(2025, 1, 1), lastRunOn: "2025-01-01" });
    const days = dueOccurrences(r, NOW);
    expect(days.length).toBe(MAX_CATCHUP_DAYS + 1); // fenêtre glissante, aujourd'hui inclus
    expect(toDayInput(days[0])).toBe("2026-02-25");
    expect(toDayInput(days.at(-1)!)).toBe("2026-03-11");
  });

  it("s'arrête au nombre maximal d'occurrences", () => {
    const r = mk({ startDate: day(2026, 3, 1), maxOccurrences: 3, occurrencesCount: 1 });
    expect(dueOccurrences(r, NOW).length).toBe(2);
  });

  it("ne produit plus rien quand le quota est atteint", () => {
    const r = mk({ maxOccurrences: 5, occurrencesCount: 5 });
    expect(dueOccurrences(r, NOW)).toEqual([]);
  });

  it("ne produit rien si la série est désactivée", () => {
    expect(dueOccurrences(mk({ active: false }), NOW)).toEqual([]);
  });

  it("ne produit rien avant la date de début", () => {
    expect(dueOccurrences(mk({ startDate: day(2026, 6, 1) }), NOW)).toEqual([]);
  });

  it("saute les week-ends en jours ouvrés", () => {
    const r = mk({ frequency: "jours_ouvres", startDate: day(2026, 3, 6) }); // vendredi
    expect(dueOccurrences(r, NOW).map(toDayInput)).toEqual([
      "2026-03-06",
      "2026-03-09",
      "2026-03-10",
      "2026-03-11",
    ]);
  });
});

describe("nextOccurrence", () => {
  it("trouve le prochain jour du rythme", () => {
    const r = mk({ frequency: "hebdomadaire", weekdays: [1] }); // lundi
    expect(toDayInput(nextOccurrence(r, NOW)!)).toBe("2026-03-16");
  });
  it("renvoie le jour même s'il correspond", () => {
    expect(toDayInput(nextOccurrence(mk(), NOW)!)).toBe("2026-03-11");
  });
  it("renvoie null pour une série close", () => {
    expect(nextOccurrence(mk({ endDate: day(2026, 3, 1) }), NOW)).toBeNull();
    expect(nextOccurrence(mk({ active: false }), NOW)).toBeNull();
    expect(nextOccurrence(mk({ maxOccurrences: 2, occurrencesCount: 2 }), NOW)).toBeNull();
  });
});

describe("assigneeFor", () => {
  const rot = ["a", "b", "c"];
  it("mode fixe : toujours la même personne", () => {
    expect(assigneeFor("fixe", { assigneeId: "u9", rotationIds: rot, index: 2 })).toBe("u9");
  });
  it("mode libre : personne", () => {
    expect(assigneeFor("libre", { assigneeId: "u9", rotationIds: rot, index: 0 })).toBeNull();
  });
  it("mode rotation : se relaient dans l'ordre puis reboucle", () => {
    expect(assigneeFor("rotation", { assigneeId: null, rotationIds: rot, index: 0 })).toBe("a");
    expect(assigneeFor("rotation", { assigneeId: null, rotationIds: rot, index: 1 })).toBe("b");
    expect(assigneeFor("rotation", { assigneeId: null, rotationIds: rot, index: 3 })).toBe("a");
  });
  it("mode rotation : reste valide si le roulement a rétréci", () => {
    expect(assigneeFor("rotation", { assigneeId: null, rotationIds: ["a"], index: 7 })).toBe("a");
  });
  it("mode rotation sans personne : se comporte comme « à prendre »", () => {
    expect(assigneeFor("rotation", { assigneeId: null, rotationIds: [], index: 0 })).toBeNull();
  });
});

describe("dueDateFor", () => {
  it("cale l'échéance sur le jour d'occurrence par défaut", () => {
    expect(toDayInput(dueDateFor(day(2026, 3, 11), 0))).toBe("2026-03-11");
  });
  it("applique le décalage demandé", () => {
    expect(toDayInput(dueDateFor(day(2026, 3, 11), 3))).toBe("2026-03-14");
  });
  it("ignore un décalage négatif", () => {
    expect(toDayInput(dueDateFor(day(2026, 3, 11), -5))).toBe("2026-03-11");
  });
});

describe("describeFrequency", () => {
  it("décrit chaque rythme en français", () => {
    expect(describeFrequency(mk())).toBe("Chaque jour");
    expect(describeFrequency(mk({ frequency: "jours_ouvres" }))).toBe("Du lundi au vendredi");
    expect(describeFrequency(mk({ frequency: "hebdomadaire", weekdays: [2] }))).toBe("Chaque mardi");
    expect(describeFrequency(mk({ frequency: "hebdomadaire", weekdays: [4, 1] }))).toBe("Chaque lundi, jeudi");
    expect(describeFrequency(mk({ frequency: "mensuel", monthDay: 1 }))).toBe("Le 1er de chaque mois");
    expect(describeFrequency(mk({ frequency: "mensuel", monthDay: 15 }))).toBe("Le 15 de chaque mois");
    expect(describeFrequency(mk({ frequency: "personnalise", intervalDays: 4 }))).toBe("Tous les 4 jours");
  });
});

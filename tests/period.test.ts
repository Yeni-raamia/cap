import { describe, it, expect } from "vitest";
import {
  endOfMonth,
  endOfWeek,
  isPeriodActive,
  matchesPeriod,
  parseDay,
  periodLabel,
  periodRange,
  sameDay,
  startOfMonth,
  startOfWeek,
  toDayInput,
} from "@/lib/period";

// Mercredi 11 mars 2026, 14 h 30 (heure locale).
const NOW = new Date(2026, 2, 11, 14, 30, 0);
const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h);

describe("bornes de semaine", () => {
  it("démarre la semaine le lundi", () => {
    const s = startOfWeek(NOW);
    expect(s.getDay()).toBe(1);
    expect(s.getDate()).toBe(9); // lundi 9 mars
    expect(s.getHours()).toBe(0);
  });
  it("termine la semaine le dimanche à 23:59", () => {
    const e = endOfWeek(NOW);
    expect(e.getDay()).toBe(0);
    expect(e.getDate()).toBe(15); // dimanche 15 mars
    expect(e.getHours()).toBe(23);
  });
  it("rattache le dimanche à la semaine qui s'achève, pas à la suivante", () => {
    const dimanche = at(2026, 3, 15);
    expect(startOfWeek(dimanche).getDate()).toBe(9);
  });
});

describe("bornes de mois", () => {
  it("couvre le 1er au dernier jour", () => {
    expect(startOfMonth(NOW).getDate()).toBe(1);
    expect(endOfMonth(NOW).getDate()).toBe(31); // mars
  });
  it("gère février d'une année bissextile", () => {
    expect(endOfMonth(at(2028, 2, 10)).getDate()).toBe(29);
  });
});

describe("matchesPeriod", () => {
  it("« tous » laisse tout passer, même sans date", () => {
    expect(matchesPeriod(null, false, { key: "tous" }, NOW)).toBe(true);
    expect(matchesPeriod(at(2020, 1, 1), false, { key: "tous" }, NOW)).toBe(true);
  });
  it("« jour » ne retient que la journée en cours", () => {
    expect(matchesPeriod(at(2026, 3, 11, 8), false, { key: "jour" }, NOW)).toBe(true);
    expect(matchesPeriod(at(2026, 3, 11, 23), false, { key: "jour" }, NOW)).toBe(true);
    expect(matchesPeriod(at(2026, 3, 12), false, { key: "jour" }, NOW)).toBe(false);
  });
  it("« semaine » retient lundi à dimanche", () => {
    expect(matchesPeriod(at(2026, 3, 9), false, { key: "semaine" }, NOW)).toBe(true);
    expect(matchesPeriod(at(2026, 3, 15), false, { key: "semaine" }, NOW)).toBe(true);
    expect(matchesPeriod(at(2026, 3, 8), false, { key: "semaine" }, NOW)).toBe(false);
    expect(matchesPeriod(at(2026, 3, 16), false, { key: "semaine" }, NOW)).toBe(false);
  });
  it("« mois » retient le mois civil en cours", () => {
    expect(matchesPeriod(at(2026, 3, 1), false, { key: "mois" }, NOW)).toBe(true);
    expect(matchesPeriod(at(2026, 3, 31), false, { key: "mois" }, NOW)).toBe(true);
    expect(matchesPeriod(at(2026, 4, 1), false, { key: "mois" }, NOW)).toBe(false);
  });
  it("écarte les éléments sans date dès qu'une période est demandée", () => {
    expect(matchesPeriod(null, false, { key: "semaine" }, NOW)).toBe(false);
  });
  it("« retard » s'appuie sur le drapeau fourni par l'appelant", () => {
    expect(matchesPeriod(at(2020, 1, 1), true, { key: "retard" }, NOW)).toBe(true);
    expect(matchesPeriod(at(2020, 1, 1), false, { key: "retard" }, NOW)).toBe(false);
  });
  it("« sans » ne retient que les éléments sans échéance", () => {
    expect(matchesPeriod(null, false, { key: "sans" }, NOW)).toBe(true);
    expect(matchesPeriod(at(2026, 3, 11), false, { key: "sans" }, NOW)).toBe(false);
  });
});

describe("période personnalisée", () => {
  const f = (from?: string, to?: string) => ({ key: "perso" as const, from, to });
  it("inclut les deux bornes", () => {
    expect(matchesPeriod(at(2026, 3, 1), false, f("2026-03-01", "2026-03-31"), NOW)).toBe(true);
    expect(matchesPeriod(at(2026, 3, 31, 23), false, f("2026-03-01", "2026-03-31"), NOW)).toBe(true);
    expect(matchesPeriod(at(2026, 4, 1), false, f("2026-03-01", "2026-03-31"), NOW)).toBe(false);
  });
  it("laisse l'autre borne ouverte quand une seule est saisie", () => {
    expect(matchesPeriod(at(2030, 1, 1), false, f("2026-03-01"), NOW)).toBe(true);
    expect(matchesPeriod(at(2020, 1, 1), false, f("2026-03-01"), NOW)).toBe(false);
    expect(matchesPeriod(at(2020, 1, 1), false, f(undefined, "2026-03-31"), NOW)).toBe(true);
  });
  it("ne filtre rien tant qu'aucune borne n'est saisie", () => {
    expect(periodRange(f(), NOW)).toBeNull();
    expect(matchesPeriod(null, false, f(), NOW)).toBe(true);
  });
});

describe("parseDay / toDayInput", () => {
  it("fait l'aller-retour sans décalage de fuseau", () => {
    expect(toDayInput(parseDay("2026-03-11"))).toBe("2026-03-11");
    expect(toDayInput(parseDay("2026-01-01"))).toBe("2026-01-01");
  });
  it("rejette les saisies invalides", () => {
    expect(parseDay("")).toBeNull();
    expect(parseDay("11/03/2026")).toBeNull();
    expect(parseDay(null)).toBeNull();
    expect(toDayInput(null)).toBe("");
  });
});

describe("sameDay", () => {
  it("ignore l'heure", () => {
    expect(sameDay(at(2026, 3, 11, 1), at(2026, 3, 11, 23))).toBe(true);
    expect(sameDay(at(2026, 3, 11), at(2026, 3, 12))).toBe(false);
  });
});

describe("isPeriodActive", () => {
  it("ne signale pas comme actif un filtre neutre", () => {
    expect(isPeriodActive({ key: "tous" })).toBe(false);
    expect(isPeriodActive({ key: "perso" })).toBe(false);
  });
  it("signale les filtres restrictifs", () => {
    expect(isPeriodActive({ key: "jour" })).toBe(true);
    expect(isPeriodActive({ key: "perso", from: "2026-03-01" })).toBe(true);
  });
});

describe("periodLabel", () => {
  it("décrit la période active en français", () => {
    expect(periodLabel({ key: "tous" }, NOW)).toBe("Toutes périodes");
    expect(periodLabel({ key: "semaine" }, NOW)).toContain("Semaine du");
    expect(periodLabel({ key: "perso", from: "2026-03-01" }, NOW)).toContain("À partir du");
    expect(periodLabel({ key: "perso", to: "2026-03-31" }, NOW)).toContain("Jusqu'au");
  });
});

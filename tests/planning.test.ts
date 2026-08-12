import { describe, it, expect } from "vitest";
import {
  buildPlanEvents,
  dayDropId,
  eventStartMinutes,
  dayKey,
  groupByDay,
  slotsFor,
  visibleHourRange,
  DEFAULT_START_HOUR,
  DEFAULT_END_HOUR,
  inMonth,
  isSamePlacement,
  monthGrid,
  movedDate,
  parseDropId,
  positionEvents,
  resizedDuration,
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
  it("découpe l'amplitude en demi-heures", () => {
    const s = slotsFor(DEFAULT_START_HOUR, DEFAULT_END_HOUR);
    expect(s[0]).toBe(6 * 60);
    expect(s[1]).toBe(6 * 60 + 30);
    expect(s.at(-1)).toBe(21 * 60 + 30);
    expect(s.length).toBe((22 - 6) * 2);
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
    const t = parseDropId(slotId(at(2026, 3, 11), 14 * 60 + 30))!;
    expect(dayKey(t.day)).toBe("2026-03-11");
    expect(t.minutes).toBe(14 * 60 + 30);
  });
  it("fait l'aller-retour sur une journée entière", () => {
    const t = parseDropId(dayDropId(at(2026, 3, 11)))!;
    expect(dayKey(t.day)).toBe("2026-03-11");
    expect(t.minutes).toBeNull();
  });
  it("rejette ce qui n'est pas une zone de dépôt", () => {
    expect(parseDropId("ev-tache-t1")).toBeNull();
    expect(parseDropId("")).toBeNull();
    expect(parseDropId("slot:pas-une-date:9")).toBeNull();
  });
});

describe("déplacement", () => {
  const ev = (o: Partial<PlanEvent> = {}): PlanEvent =>
    ({ id: "x", refId: "x", kind: "reunion", title: "T", date: at(2026, 3, 12, 14, 30), timed: true, durationMinutes: 60,
       personId: null, context: "", late: false, done: false, href: null, taskId: null, ...o });

  it("un dépôt sur un créneau impose l'heure de début, à la demi-heure près", () => {
    const d = movedDate(ev(), { day: at(2026, 3, 16), minutes: 9 * 60 + 30 });
    expect(d.getDate()).toBe(16);
    expect(d.getHours()).toBe(9);
    expect(d.getMinutes()).toBe(30);
  });

  it("un dépôt « toute la journée » conserve l'heure d'origine", () => {
    // Sans cela, glisser une réunion d'un jour à l'autre la ferait tomber à minuit.
    const d = movedDate(ev(), { day: at(2026, 3, 16), minutes: null });
    expect(d.getDate()).toBe(16);
    expect(d.getHours()).toBe(14);
    expect(d.getMinutes()).toBe(30);
  });

  it("détecte un dépôt au même endroit", () => {
    expect(isSamePlacement(ev(), { day: at(2026, 3, 12), minutes: null })).toBe(true);
    expect(isSamePlacement(ev(), { day: at(2026, 3, 12), minutes: 14 * 60 })).toBe(false); // 14:30 → 14:00
    expect(isSamePlacement(ev(), { day: at(2026, 3, 13), minutes: null })).toBe(false);
  });
});

describe("positionEvents — blocs horaires", () => {
  const mtg = (id: string, h: number, min: number, dur: number): PlanEvent => ({
    id, refId: id, kind: "reunion", title: id, date: at(2026, 3, 12, h, min), timed: true,
    durationMinutes: dur, personId: null, context: "", late: false, done: false, href: null, taskId: null,
  });
  const tache: PlanEvent = {
    id: "t", refId: "t", kind: "tache", title: "t", date: at(2026, 3, 12), timed: false,
    durationMinutes: 0, personId: null, context: "", late: false, done: false, href: null, taskId: "t",
  };

  it("ignore ce qui n'a pas d'heure", () => {
    expect(positionEvents([tache])).toEqual([]);
  });

  it("place le bloc à son heure et le dimensionne à sa durée", () => {
    // Grille à partir de 7 h, créneaux de 30 min : 9 h 00 = 4 créneaux plus bas.
    const [p] = positionEvents([mtg("a", 9, 0, 60)]);
    expect(p.offset).toBe(6); // 9 h depuis 6 h = 6 créneaux
    expect(p.span).toBe(2); // 60 min = 2 créneaux
  });

  it("gère les demi-heures", () => {
    const [p] = positionEvents([mtg("a", 14, 30, 90)]);
    expect(p.offset).toBe(17); // 14 h 30 depuis 6 h → (870 - 360) / 30
    expect(p.span).toBe(3); // 90 min
  });

  it("garde une hauteur minimale visible pour une réunion très courte", () => {
    const [p] = positionEvents([mtg("a", 9, 0, 5)]);
    expect(p.span).toBeGreaterThanOrEqual(0.5);
  });

  it("laisse toute la largeur quand rien ne se chevauche", () => {
    const out = positionEvents([mtg("a", 9, 0, 60), mtg("b", 11, 0, 60)]);
    expect(out.every((p) => p.lanes === 1 && p.lane === 0)).toBe(true);
  });

  it("partage la largeur entre réunions qui se chevauchent", () => {
    // Sans cela, la réunion courte disparaîtrait derrière la longue.
    const out = positionEvents([mtg("a", 9, 0, 120), mtg("b", 9, 30, 30)]);
    expect(out.map((p) => p.lanes)).toEqual([2, 2]);
    expect(out.map((p) => p.lane).sort()).toEqual([0, 1]);
  });

  it("réutilise une colonne libérée", () => {
    // a 9h–10h, b 9h30–10h30 (chevauche a), c 10h–11h (peut reprendre la colonne de a).
    const out = positionEvents([mtg("a", 9, 0, 60), mtg("b", 9, 30, 60), mtg("c", 10, 0, 60)]);
    const byId = Object.fromEntries(out.map((p) => [p.event.id, p]));
    expect(byId.a.lane).toBe(0);
    expect(byId.b.lane).toBe(1);
    expect(byId.c.lane).toBe(0);
  });

  it("sépare deux groupes de chevauchement indépendants", () => {
    const out = positionEvents([mtg("a", 9, 0, 60), mtg("b", 9, 0, 60), mtg("c", 15, 0, 60)]);
    const byId = Object.fromEntries(out.map((p) => [p.event.id, p]));
    expect(byId.a.lanes).toBe(2);
    expect(byId.c.lanes).toBe(1); // seul l'après-midi → pleine largeur
  });
});

describe("resizedDuration — redimensionnement à la souris", () => {
  const NEUF_H = 9 * 60;

  it("cale la durée sur le pas de 15 minutes", () => {
    expect(resizedDuration(60, 20, NEUF_H)).toBe(75); // 80 → 75
    expect(resizedDuration(60, 7, NEUF_H)).toBe(60); // 67 → 60
    expect(resizedDuration(60, 8, NEUF_H)).toBe(75); // 68 → 75
  });

  it("permet d'allonger comme de raccourcir", () => {
    expect(resizedDuration(60, 60, NEUF_H)).toBe(120);
    expect(resizedDuration(60, -30, NEUF_H)).toBe(30);
  });

  it("ne descend jamais sous une durée utilisable", () => {
    // Sans plancher, un geste brusque réduirait le bloc à zéro et le rendrait
    // impossible à rattraper à la souris.
    expect(resizedDuration(60, -500, NEUF_H)).toBe(15);
    expect(resizedDuration(15, -15, NEUF_H)).toBe(15);
  });

  it("ne déborde pas de la journée affichée", () => {
    // Amplitude par défaut jusqu'à 22 h : depuis 21 h, pas plus d'1 h.
    expect(resizedDuration(60, 600, 21 * 60)).toBe(60);
    expect(resizedDuration(60, 5000, NEUF_H)).toBe(13 * 60); // plafonné à 9 h → 22 h
    // Une amplitude élargie desserre la borne.
    expect(resizedDuration(60, 5000, 21 * 60, 24)).toBe(3 * 60);
  });

  it("reste utilisable même pour une réunion qui commence en fin de grille", () => {
    expect(resizedDuration(30, 0, 21 * 60 + 45)).toBe(15);
  });
});

describe("eventStartMinutes", () => {
  it("compte les minutes depuis minuit", () => {
    const e = { date: at(2026, 3, 12, 14, 30) } as PlanEvent;
    expect(eventStartMinutes(e)).toBe(870);
  });
});

describe("visibleHourRange — la grille s'adapte à ce qu'elle contient", () => {
  const mtg = (h: number, min: number, dur: number): PlanEvent => ({
    id: "m", refId: "m", kind: "reunion", title: "m", date: at(2026, 3, 12, h, min), timed: true,
    durationMinutes: dur, personId: null, context: "", late: false, done: false, href: null, taskId: null,
  });

  it("garde l'amplitude par défaut quand tout y tient", () => {
    expect(visibleHourRange([mtg(9, 0, 60)])).toEqual({ startHour: 6, endHour: 22 });
    expect(visibleHourRange([])).toEqual({ startHour: 6, endHour: 22 });
  });

  it("descend pour une réunion matinale", () => {
    // Sans cela, une réunion à 5 h n'existerait tout simplement plus dans cette vue.
    expect(visibleHourRange([mtg(5, 30, 60)]).startHour).toBe(5);
  });

  it("monte pour une réunion tardive, fin arrondie à l'heure", () => {
    expect(visibleHourRange([mtg(21, 0, 150)]).endHour).toBe(24); // 21 h + 2 h 30 → 23 h 30 → 24
    expect(visibleHourRange([mtg(22, 30, 30)]).endHour).toBe(23);
  });

  it("ne rétrécit jamais sous l'amplitude par défaut", () => {
    // La grille ne doit pas changer de taille d'une semaine à l'autre selon
    // qu'elle est chargée ou non.
    const r = visibleHourRange([mtg(10, 0, 60)]);
    expect(r.startHour).toBe(6);
    expect(r.endHour).toBe(22);
  });

  it("reste dans les bornes d'une journée", () => {
    expect(visibleHourRange([mtg(0, 15, 30)]).startHour).toBe(0);
    expect(visibleHourRange([mtg(23, 30, 120)]).endHour).toBe(24);
  });

  it("ignore les échéances sans heure", () => {
    const tache: PlanEvent = {
      id: "t", refId: "t", kind: "tache", title: "t", date: at(2026, 3, 12, 3, 0), timed: false,
      durationMinutes: 0, personId: null, context: "", late: false, done: false, href: null, taskId: "t",
    };
    expect(visibleHourRange([tache]).startHour).toBe(6);
  });

  it("couvre le plus large des événements de la semaine", () => {
    const r = visibleHourRange([mtg(5, 0, 30), mtg(9, 0, 60), mtg(21, 0, 120)]);
    expect(r).toEqual({ startHour: 5, endHour: 23 });
  });
});

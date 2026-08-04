import { describe, it, expect } from "vitest";
import {
  type Item,
  type Task,
  daysBetween,
  buildRef,
  nextRefNumber,
  parseSubject,
  parseEmail,
  applyTemplate,
  customDeadline,
  isOverDuration,
  isLateByDuration,
  lastOutboundDate,
  reminderState,
  isTaskLate,
  contactDisplayName,
} from "@/lib/domain";

/** Fabrique un suivi minimal complet ; on surcharge les champs utiles au test. */
function mkItem(over: Partial<Item> = {}): Item {
  const base: Item = {
    id: "i1",
    ref: "SOC-2026-0001",
    metier: "SOC",
    type: "SIGNAL", // SLA : relance 3, escalade 6
    objet: "Test",
    ownerId: "u1",
    statut: "Envoyé",
    priorite: "Moyenne",
    personnes: [],
    pointsCles: [],
    blocageCause: null,
    relancesCount: 0,
    dateCreation: new Date("2026-07-01T00:00:00Z"),
    dateMaj: new Date("2026-07-01T00:00:00Z"),
    dateRelancePrevue: null,
    projectId: null,
    appreciation: null,
    blocageActions: [],
    timeline: [],
  };
  return { ...base, ...over };
}

function mkTask(over: Partial<Task> = {}): Task {
  const base: Task = {
    id: "t1",
    title: "Tâche",
    description: "",
    assigneeId: "u1",
    createdBy: "u1",
    projectId: null,
    status: "à faire",
    priority: "Normale",
    startDate: null,
    dueDate: null,
    createdAt: new Date("2026-07-01T00:00:00Z"),
    completedAt: null,
    subtasks: [],
  };
  return { ...base, ...over };
}

describe("daysBetween", () => {
  it("compte les jours pleins écoulés", () => {
    expect(daysBetween(new Date("2026-07-01"), new Date("2026-07-11"))).toBe(10);
  });
  it("tronque les fractions de journée", () => {
    expect(daysBetween(new Date("2026-07-01T00:00:00Z"), new Date("2026-07-02T18:00:00Z"))).toBe(1);
  });
  it("est négatif si b précède a", () => {
    expect(daysBetween(new Date("2026-07-11"), new Date("2026-07-01"))).toBe(-10);
  });
});

describe("buildRef", () => {
  it("normalise avec année et zéros de tête", () => {
    expect(buildRef("SOC", 5)).toBe("SOC-2026-0005");
    expect(buildRef("GRC", 123)).toBe("GRC-2026-0123");
  });
  it("CASE n'a pas d'année (n° TheHive)", () => {
    expect(buildRef("CASE", 42)).toBe("CASE-42");
  });
  it("accepte une année explicite", () => {
    expect(buildRef("AUD", 7, 2025)).toBe("AUD-2025-0007");
  });
});

describe("nextRefNumber", () => {
  it("renvoie 1 si aucun suivi pour le métier", () => {
    expect(nextRefNumber([], "SOC")).toBe(1);
    expect(nextRefNumber([mkItem({ metier: "GRC", ref: "GRC-2026-0009" })], "SOC")).toBe(1);
  });
  it("renvoie le max observé + 1, filtré par métier", () => {
    const items = [
      mkItem({ id: "a", metier: "SOC", ref: "SOC-2026-0003" }),
      mkItem({ id: "b", metier: "SOC", ref: "SOC-2026-0007" }),
      mkItem({ id: "c", metier: "GRC", ref: "GRC-2026-0099" }), // ignoré
    ];
    expect(nextRefNumber(items, "SOC")).toBe(8);
  });
  it("utilise le dernier groupe de chiffres (CASE sans année)", () => {
    expect(nextRefNumber([mkItem({ metier: "CASE", ref: "CASE-512" })], "CASE")).toBe(513);
  });
});

describe("parseSubject", () => {
  it("extrait métier / type / réf / objet d'un objet normalisé", () => {
    const p = parseSubject("[SOC-2026-0001] SIGNAL — Incident réseau");
    expect(p).not.toBeNull();
    expect(p).toMatchObject({ metier: "SOC", type: "SIGNAL", urgent: false, ref: "SOC-0001", objet: "Incident réseau" });
  });
  it("marque l'urgence avec le préfixe !", () => {
    expect(parseSubject("[CASE-2026-0002] !ALERTE — Ransomware")?.urgent).toBe(true);
  });
  it("tolère les préfixes Re:/Fwd: empilés", () => {
    expect(parseSubject("Re: Fwd: [AUD-2026-0003] RECO — Audit")?.ref).toBe("AUD-0003");
  });
  it("rejette un métier ou type hors catalogue", () => {
    expect(parseSubject("[ZZZ-2026-0001] SIGNAL — X")).toBeNull();
    expect(parseSubject("[SOC-2026-0001] BOGUS — X")).toBeNull();
  });
  it("renvoie null pour une chaîne vide ou non conforme", () => {
    expect(parseSubject("")).toBeNull();
    expect(parseSubject("Bonjour, un mail normal")).toBeNull();
  });
});

describe("parseEmail", () => {
  it("extrait objet, expéditeur, destinataire et points", () => {
    const raw = [
      "Objet: Incident réseau",
      "De: Jean Dupont <jean@dssi.local>",
      "À: paul@presta.fr",
      "",
      "- Premier point important à traiter",
      "- Deuxième point important à suivre",
    ].join("\n");
    const r = parseEmail(raw);
    expect(r.subject).toBe("Incident réseau");
    expect(r.from).toBe("Jean Dupont"); // nom préféré à l'adresse
    expect(r.to).toBe("paul@presta.fr");
    expect(r.points).toContain("Premier point important à traiter");
    expect(r.points).toContain("Deuxième point important à suivre");
  });
});

describe("applyTemplate", () => {
  it("remplace les variables connues et laisse les inconnues intactes", () => {
    const out = applyTemplate("[{ref}] {objet} — de {moi}, inconnu {absent}", {
      ref: "SOC-0001",
      objet: "Test",
      moi: "Yeni",
    });
    expect(out).toBe("[SOC-0001] Test — de Yeni, inconnu {absent}");
  });
});

describe("échéance de traitement (durée acceptable)", () => {
  const created = new Date("2026-07-01T00:00:00Z");

  it("customDeadline = création + durée, ou null sans durée", () => {
    expect(customDeadline(mkItem({ dateCreation: created, dueDurationDays: 5 }))).toEqual(
      new Date("2026-07-06T00:00:00Z")
    );
    expect(customDeadline(mkItem({ dateCreation: created, dueDurationDays: null }))).toBeNull();
    expect(customDeadline(mkItem({ dateCreation: created, dueDurationDays: 0 }))).toBeNull();
  });

  it("isOverDuration vrai après l'échéance, faux avant", () => {
    const it5 = mkItem({ dateCreation: created, dueDurationDays: 5 });
    expect(isOverDuration(it5, new Date("2026-07-10T00:00:00Z"))).toBe(true);
    expect(isOverDuration(it5, new Date("2026-07-03T00:00:00Z"))).toBe(false);
  });

  it("un suivi clôturé n'est jamais en dépassement", () => {
    const closed = mkItem({ dateCreation: created, dueDurationDays: 5, statut: "Clôturé" });
    expect(isOverDuration(closed, new Date("2026-07-30T00:00:00Z"))).toBe(false);
    expect(isLateByDuration(closed, new Date("2026-07-30T00:00:00Z"))).toBe(false);
  });

  it("isLateByDuration vrai si marqué manuellement, même sans dépassement", () => {
    const marked = mkItem({ dateCreation: created, dueDurationDays: null, markedLate: true });
    expect(isLateByDuration(marked, new Date("2026-07-02T00:00:00Z"))).toBe(true);
  });
});

describe("lastOutboundDate", () => {
  it("prend le max entre création et derniers envois/relances", () => {
    const item = mkItem({
      dateCreation: new Date("2026-07-01T00:00:00Z"),
      timeline: [
        { date: new Date("2026-07-03T00:00:00Z"), kind: "envoi", label: "Envoi", author: "u1" },
        { date: new Date("2026-07-07T00:00:00Z"), kind: "relance", label: "Relance 1", author: "u1" },
        { date: new Date("2026-07-09T00:00:00Z"), kind: "note", label: "Note", author: "u1" }, // ignoré
      ],
    });
    expect(lastOutboundDate(item)).toEqual(new Date("2026-07-07T00:00:00Z"));
  });
  it("ignore notes / changements de statut (l'horloge SLA ne dérive pas)", () => {
    const item = mkItem({
      dateCreation: new Date("2026-07-01T00:00:00Z"),
      timeline: [{ date: new Date("2026-07-20T00:00:00Z"), kind: "statut", label: "Statut", author: "u1" }],
    });
    expect(lastOutboundDate(item)).toEqual(new Date("2026-07-01T00:00:00Z"));
  });
});

describe("reminderState (horloge SLA)", () => {
  const created = new Date("2026-07-01T00:00:00Z");

  it("aucun état pour un suivi clôturé", () => {
    expect(reminderState(mkItem({ statut: "Clôturé" }), new Date("2026-07-20"))).toEqual({ level: "none", days: 0 });
  });
  it("ok avant le seuil de relance, avec dueIn", () => {
    const s = reminderState(mkItem({ dateCreation: created }), new Date("2026-07-02T00:00:00Z"));
    expect(s).toMatchObject({ level: "ok", days: 1, dueIn: 2 });
  });
  it("relance atteinte au seuil (SIGNAL ≥ 3 j)", () => {
    expect(reminderState(mkItem({ dateCreation: created }), new Date("2026-07-05T00:00:00Z")).level).toBe("relance");
  });
  it("escalade au-delà du seuil (SIGNAL ≥ 6 j)", () => {
    expect(reminderState(mkItem({ dateCreation: created }), new Date("2026-07-08T00:00:00Z")).level).toBe("escalade");
  });
  it("« En traitement » suspend la relance (balle dans notre camp)", () => {
    const s = reminderState(mkItem({ dateCreation: created, statut: "En traitement" }), new Date("2026-07-30"));
    expect(s.level).toBe("ok");
  });
  it("« Bloqué » renvoie l'état bloque", () => {
    expect(reminderState(mkItem({ statut: "Bloqué" }), new Date("2026-07-10")).level).toBe("bloque");
  });
  it("aucun SLA pour un type sans échéance (INFO)", () => {
    expect(reminderState(mkItem({ type: "INFO", dateCreation: created }), new Date("2026-07-30")).level).toBe("none");
  });
  it("une relance récente remet l'horloge à zéro", () => {
    const item = mkItem({
      dateCreation: new Date("2026-07-01T00:00:00Z"),
      timeline: [{ date: new Date("2026-07-07T00:00:00Z"), kind: "relance", label: "Relance 1", author: "u1" }],
    });
    // Créé il y a 7 j mais relancé hier → toujours "ok", pas escalade.
    expect(reminderState(item, new Date("2026-07-08T00:00:00Z")).level).toBe("ok");
  });
});

describe("contactDisplayName", () => {
  it("assemble prénom + nom en compactant les espaces", () => {
    expect(contactDisplayName({ prenom: "Jean", nom: "Dupont" })).toBe("Jean Dupont");
    expect(contactDisplayName({ prenom: "", nom: "Dupont" })).toBe("Dupont");
    expect(contactDisplayName({ prenom: "Ana", nom: "" })).toBe("Ana");
    expect(contactDisplayName({})).toBe("");
  });
});

describe("isTaskLate", () => {
  const now = new Date("2026-07-10T00:00:00Z");
  it("en retard si échéance passée et non faite", () => {
    expect(isTaskLate(mkTask({ dueDate: new Date("2026-07-05T00:00:00Z") }), now)).toBe(true);
  });
  it("jamais en retard si faite", () => {
    expect(isTaskLate(mkTask({ dueDate: new Date("2026-07-05T00:00:00Z"), status: "fait" }), now)).toBe(false);
  });
  it("jamais en retard sans échéance", () => {
    expect(isTaskLate(mkTask({ dueDate: null }), now)).toBe(false);
  });
});

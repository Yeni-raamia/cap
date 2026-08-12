import { describe, it, expect } from "vitest";
import {
  type Item,
  type Task,
  daysBetween,
  fmt,
  fmtLong,
  formatWorkload,
  workloadVariance,
  publicationsInMonth,
  lastPublication,
  daysSinceLastPublication,
  policyPublicationStats,
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

describe("fmt / fmtLong — robustesse aux dates sérialisées", () => {
  // Une date qui traverse JSON revient en chaîne. Avant, fmt() appelait
  // toLocaleDateString dessus et faisait tomber toute la page (vu sur les
  // fichiers joints d'un projet, qui devenait alors impossible à supprimer).
  it("formate une vraie Date", () => {
    expect(fmt(new Date(2026, 2, 11))).toMatch(/11/);
    expect(fmtLong(new Date(2026, 2, 11))).toMatch(/11/);
  });
  it("accepte une date sérialisée sans lever d'exception", () => {
    const serialisee = "2026-03-11T00:00:00.000Z" as unknown as Date;
    expect(() => fmt(serialisee)).not.toThrow();
    expect(fmt(serialisee)).not.toBe("—");
    expect(() => fmtLong(serialisee)).not.toThrow();
  });
  it("renvoie un tiret plutôt que de planter sur une valeur inutilisable", () => {
    expect(fmt(null as unknown as Date)).toBe("—");
    expect(fmt("pas une date" as unknown as Date)).toBe("—");
    expect(fmt(undefined as unknown as Date)).toBe("—");
    expect(fmtLong({} as unknown as Date)).toBe("—");
  });
});

describe("formatWorkload", () => {
  it("exprime les petites charges en minutes puis en heures", () => {
    expect(formatWorkload(15)).toBe("15 min");
    expect(formatWorkload(59)).toBe("59 min");
    expect(formatWorkload(60)).toBe("1 h");
    expect(formatWorkload(90)).toBe("1 h 30");
  });
  it("bascule en jours au-delà d'une journée de travail", () => {
    // 420 min = 7 h = une journée : « 1 j » se compare à un planning,
    // « 420 min » ne parle à personne.
    expect(formatWorkload(420)).toBe("1 j");
    expect(formatWorkload(840)).toBe("2 j");
    expect(formatWorkload(480)).toBe("1 j 1 h");
  });
  it("renvoie un tiret quand il n'y a rien à afficher", () => {
    expect(formatWorkload(0)).toBe("—");
    expect(formatWorkload(null)).toBe("—");
    expect(formatWorkload(undefined)).toBe("—");
    expect(formatWorkload(-30)).toBe("—");
  });
});

describe("workloadVariance", () => {
  it("mesure le dépassement en pourcentage", () => {
    expect(workloadVariance(60, 90)).toBe(50);
    expect(workloadVariance(60, 30)).toBe(-50);
    expect(workloadVariance(60, 60)).toBe(0);
  });
  it("ne dit rien sans estimation — on ne compare pas à zéro", () => {
    expect(workloadVariance(null, 90)).toBeNull();
    expect(workloadVariance(0, 90)).toBeNull();
    expect(workloadVariance(undefined, 90)).toBeNull();
  });
});

describe("rediffusions de politique", () => {
  const pub = (iso: string) =>
    ({ id: iso, policyId: "p1", publishedAt: new Date(iso), version: "1.0", channel: "E-mail", audience: "", note: "", authorId: "u1", createdAt: new Date(iso) });
  const NOW = new Date(2026, 2, 20);

  it("compte les rediffusions du mois civil en cours", () => {
    // Le cas réel : une politique rappelée 3 fois dans le mois.
    const pubs = [pub("2026-03-02"), pub("2026-03-11"), pub("2026-03-19"), pub("2026-02-25")];
    expect(publicationsInMonth(pubs, NOW).length).toBe(3);
  });
  it("ne confond pas deux mois de la même année", () => {
    expect(publicationsInMonth([pub("2026-02-28")], NOW).length).toBe(0);
  });
  it("ne confond pas le même mois de deux années", () => {
    expect(publicationsInMonth([pub("2025-03-15")], NOW).length).toBe(0);
  });

  it("retrouve la rediffusion la plus récente, quel que soit l'ordre", () => {
    const pubs = [pub("2026-03-02"), pub("2026-03-19"), pub("2026-03-11")];
    expect(lastPublication(pubs)?.id).toBe("2026-03-19");
    expect(lastPublication([])).toBeNull();
  });

  it("mesure l'ancienneté de la dernière rediffusion", () => {
    expect(daysSinceLastPublication([pub("2026-03-13")], NOW)).toBe(7);
    // Jamais rediffusée : on ne renvoie pas 0, qui se lirait « aujourd'hui ».
    expect(daysSinceLastPublication([], NOW)).toBeNull();
  });
});

describe("policyPublicationStats", () => {
  const NOW = new Date(2026, 7, 20); // 20 août 2026
  const pub = (iso: string, channel = "E-mail") =>
    ({ id: iso + channel, policyId: "p", publishedAt: new Date(iso), version: "", channel, audience: "", note: "", authorId: null, createdAt: new Date(iso) });
  const pol = (id: string, title: string, status: string, pubs: ReturnType<typeof pub>[]) =>
    ({ id, title, status, publications: pubs });

  it("agrège le total et le mois en cours", () => {
    const s = policyPublicationStats(
      [pol("1", "Accès", "En vigueur", [pub("2026-08-03"), pub("2026-08-11"), pub("2026-07-02")])],
      NOW
    );
    expect(s.total).toBe(3);
    expect(s.ceMois).toBe(2);
  });

  it("ne compte que les politiques en vigueur pour « jamais rediffusée »", () => {
    // Une politique retirée n'a pas vocation à être rappelée : la compter
    // ferait croire à un manquement.
    const s = policyPublicationStats(
      [pol("1", "A", "En vigueur", []), pol("2", "B", "Retirée", []), pol("3", "C", "En vigueur", [pub("2026-08-01")])],
      NOW
    );
    expect(s.jamais).toBe(1);
    expect(s.moyenne).toBe(0.5); // (0 + 1) / 2 politiques en vigueur
  });

  it("construit une fenêtre mensuelle glissante, du plus ancien au plus récent", () => {
    const s = policyPublicationStats([pol("1", "A", "En vigueur", [pub("2026-08-05"), pub("2026-06-05")])], NOW, 3);
    expect(s.parMois.length).toBe(3);
    expect(s.parMois.map((m) => m.count)).toEqual([1, 0, 1]); // juin, juillet, août
    expect(s.parMois.at(-1)!.key).toBe("2026-08");
  });

  it("classe les politiques par nombre de rediffusions", () => {
    const s = policyPublicationStats(
      [pol("1", "Peu", "En vigueur", [pub("2026-08-01")]), pol("2", "Beaucoup", "En vigueur", [pub("2026-08-01"), pub("2026-08-02")])],
      NOW
    );
    expect(s.parPolitique.map((p) => p.titre)).toEqual(["Beaucoup", "Peu"]);
    expect(s.parPolitique[0].count).toBe(2);
  });

  it("répartit par canal et nomme les canaux manquants", () => {
    const s = policyPublicationStats(
      [pol("1", "A", "En vigueur", [pub("2026-08-01", "Réunion"), pub("2026-08-02", ""), pub("2026-08-03", "Réunion")])],
      NOW
    );
    expect(s.parCanal[0]).toEqual({ canal: "Réunion", count: 2 });
    expect(s.parCanal.find((c) => c.canal === "Non précisé")?.count).toBe(1);
  });

  it("ne divise pas par zéro sans politique en vigueur", () => {
    const s = policyPublicationStats([], NOW);
    expect(s.moyenne).toBe(0);
    expect(s.total).toBe(0);
  });
});

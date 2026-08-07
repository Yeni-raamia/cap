import { describe, it, expect } from "vitest";
import { computeGrcKpis, grcPosture, type GrcKpiInput, type GrcKpis } from "@/lib/grc/kpis";
import type { CapaAction, Incident, Risk } from "@/lib/domain";

const NOW = new Date("2026-08-07T00:00:00Z");

const empty: GrcKpiInput = {
  risks: [], controlAssessments: [], fieldControls: [], capaActions: [], incidents: [],
  processing: [], policies: [], continuityPlans: [], missions: [], assets: [], now: NOW,
};

const risk = (o: Partial<Risk>): Risk =>
  ({ id: "r", ref: "RSK", title: "T", description: "", category: "Cyber", probability: 3, impact: 3, residualProbability: 1, residualImpact: 1, assetId: null, threat: "", vulnerability: "", treatment: "Réduire", treatmentPlan: "", controls: [], status: "Ouvert", ownerId: "u", reviewDate: null, acceptedBy: null, acceptedAt: null, acceptUntil: null, acceptanceJustification: "", reviews: [], links: [], createdBy: null, createdAt: NOW, updatedAt: NOW, ...o } as Risk);

const capa = (o: Partial<CapaAction>): CapaAction =>
  ({ id: "c", ref: "CAPA", title: "T", description: "", source: "audit", sourceRef: "", type: "Corrective", ownerId: "u", dueDate: null, status: "Ouverte", priority: "Moyenne", progress: 0, evidence: "", links: [], createdBy: null, createdAt: NOW, updatedAt: NOW, ...o } as CapaAction);

const inc = (o: Partial<Incident>): Incident =>
  ({ id: "i", ref: "INC", title: "T", type: "Cyberattaque", severity: "Majeur", status: "Déclaré", dataBreach: false, detectedAt: null, declaredBy: "u", ownerId: "u", missionId: "", assetIds: [], description: "", impact: "", actionsTaken: "", resolvedAt: null, rootCause: "", lessons: "", createdBy: null, createdAt: NOW, updatedAt: NOW, ...o } as Incident);

describe("computeGrcKpis", () => {
  it("renvoie des zéros sur des entrées vides", () => {
    const k = computeGrcKpis(empty);
    expect(k.conformite).toBe(0);
    expect(k.risquesOuverts).toBe(0);
    expect(k.risquesCritiques).toBe(0);
    expect(k.incidentsOuverts).toBe(0);
    expect(k.joyauxPrioritaires).toBe(0);
  });

  it("compte les risques ouverts, critiques et acceptés", () => {
    const k = computeGrcKpis({
      ...empty,
      risks: [
        risk({ id: "a", residualProbability: 5, residualImpact: 5 }), // critique, ouvert
        risk({ id: "b", residualProbability: 1, residualImpact: 1 }), // faible, ouvert
        risk({ id: "c", status: "Clôturé", residualProbability: 5, residualImpact: 5 }), // clôturé → hors compte
        risk({ id: "d", acceptedBy: "u", residualProbability: 4, residualImpact: 4 }), // accepté + élevé
      ],
    });
    expect(k.risquesOuverts).toBe(3); // a, b, d (c clôturé)
    expect(k.risquesCritiques).toBe(2); // a (critique) + d (élevé), ouverts
    expect(k.risquesAcceptes).toBe(1); // d
  });

  it("distingue les actions en retard des actions ouvertes", () => {
    const past = new Date("2026-07-01T00:00:00Z");
    const future = new Date("2026-09-01T00:00:00Z");
    const k = computeGrcKpis({
      ...empty,
      capaActions: [
        capa({ id: "1", dueDate: past, status: "Ouverte" }), // en retard
        capa({ id: "2", dueDate: future, status: "Ouverte" }), // ouverte, à temps
        capa({ id: "3", dueDate: past, status: "Clôturée" }), // clôturée → pas en retard
      ],
    });
    expect(k.capaOuvertes).toBe(2); // 1 et 2
    expect(k.capaEnRetard).toBe(1); // 1
  });

  it("compte les incidents ouverts, critiques et les violations de données", () => {
    const k = computeGrcKpis({
      ...empty,
      incidents: [
        inc({ id: "1", severity: "Critique", status: "En traitement", dataBreach: true }),
        inc({ id: "2", severity: "Mineur", status: "Clôturé" }),
        inc({ id: "3", severity: "Majeur", status: "Déclaré" }),
      ],
    });
    expect(k.incidentsOuverts).toBe(2); // 1 et 3
    expect(k.incidentsCritiques).toBe(1); // 1
    expect(k.violationsDonnees).toBe(1); // 1
  });
});

describe("grcPosture", () => {
  const base: GrcKpis = {
    conformite: 80, risquesOuverts: 0, risquesCritiques: 0, risquesAcceptes: 0, controlesRealises: 0,
    ecartsOuverts: 0, tauxConformiteControles: 0, capaOuvertes: 0, capaEnRetard: 0, incidentsOuverts: 0,
    incidentsCritiques: 0, violationsDonnees: 0, traitements: 0, aipdARealiser: 0, politiquesEnVigueur: 0,
    applicabilitePolitiques: 0, continuiteATester: 0, joyauxPrioritaires: 0,
  };

  it("part de la conformité quand rien ne pénalise", () => {
    expect(grcPosture(base)).toBe(80);
  });

  it("pénalise les points d'attention", () => {
    // 80 - 2*4 (crit) - 1*3 (retard) - 1*5 (inc crit) - 2*2 (aipd) - 1*2 (continuité) = 80-8-3-5-4-2 = 58
    expect(grcPosture({ ...base, risquesCritiques: 2, capaEnRetard: 1, incidentsCritiques: 1, aipdARealiser: 2, continuiteATester: 1 })).toBe(58);
  });

  it("borne le score dans [0, 100]", () => {
    expect(grcPosture({ ...base, conformite: 10, incidentsCritiques: 10 })).toBe(0);
    expect(grcPosture({ ...base, conformite: 100 })).toBe(100);
  });
});

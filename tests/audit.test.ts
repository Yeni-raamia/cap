import { describe, it, expect } from "vitest";
import { auditConformityUpdates, computeAuditScore, defaultFindingSeverity, gridDomains, isAuditPlanActive, isAuditPlanLate, previousAudit, type Audit, type AuditPlanItem, type AuditQuestion, type AuditResponse } from "@/lib/domain";

const q = (id: string, domain: string, o: Partial<AuditQuestion> = {}): AuditQuestion =>
  ({ id, domain, text: `Q ${id}`, guidance: "", weight: 1, critical: false, frameworkId: "", controlCode: "", ...o });
const r = (questionId: string, answer: string): AuditResponse => ({ questionId, answer, note: "", evidence: "", severity: "", recommendation: "", mgmtResponse: "" });

describe("gridDomains", () => {
  it("liste les domaines distincts dans l'ordre d'apparition", () => {
    expect(gridDomains([q("1", "B"), q("2", "A"), q("3", "B")])).toEqual(["B", "A"]);
  });
  it("remplace un domaine vide par Général", () => {
    expect(gridDomains([q("1", "  ")])).toEqual(["Général"]);
  });
});

describe("computeAuditScore", () => {
  const questions = [q("1", "D1"), q("2", "D1"), q("3", "D2")];

  it("score vide sans réponse", () => {
    const s = computeAuditScore(questions, []);
    expect(s.global).toBe(0);
    expect(s.answered).toBe(0);
    expect(s.total).toBe(3);
    expect(s.coverage).toBe(0);
  });

  it("Oui=100, Partiel=50, Non=0", () => {
    const s = computeAuditScore(questions, [r("1", "Oui"), r("2", "Non"), r("3", "Partiel")]);
    // (100 + 0 + 50) / 3 = 50
    expect(s.global).toBe(50);
    expect(s.answered).toBe(3);
    expect(s.coverage).toBe(100);
  });

  it("exclut « Non applicable » et « À vérifier » du calcul", () => {
    const s = computeAuditScore(questions, [r("1", "Oui"), r("2", "Non applicable"), r("3", "À vérifier")]);
    // Seule Q1 comptée → 100 ; couverture = 1/3 = 33
    expect(s.global).toBe(100);
    expect(s.answered).toBe(1);
    expect(s.coverage).toBe(33);
  });

  it("pondère par le poids des questions", () => {
    const qs = [q("1", "D", { weight: 3 }), q("2", "D", { weight: 1 })];
    // (3*0 + 1*100) / (3+1) = 25
    const s = computeAuditScore(qs, [r("1", "Non"), r("2", "Oui")]);
    expect(s.global).toBe(25);
  });

  it("calcule un score par domaine (radar)", () => {
    const s = computeAuditScore(questions, [r("1", "Oui"), r("2", "Oui"), r("3", "Non")]);
    const d1 = s.byDomain.find((d) => d.domain === "D1")!;
    const d2 = s.byDomain.find((d) => d.domain === "D2")!;
    expect(d1.score).toBe(100);
    expect(d2.score).toBe(0);
    expect(s.byDomain.map((d) => d.domain)).toEqual(["D1", "D2"]);
  });

  it("cotation par défaut : Majeure si question critique, Mineure sinon", () => {
    expect(defaultFindingSeverity(q("1", "D", { critical: true }))).toBe("Majeure");
    expect(defaultFindingSeverity(q("2", "D", { critical: false }))).toBe("Mineure");
  });

  it("compte les constats (Non/Partiel) et les constats critiques", () => {
    const qs = [q("1", "D", { critical: true }), q("2", "D"), q("3", "D", { critical: true })];
    const s = computeAuditScore(qs, [r("1", "Non"), r("2", "Partiel"), r("3", "Oui")]);
    expect(s.gaps).toBe(2); // Q1 Non + Q2 Partiel
    expect(s.criticalGaps).toBe(1); // seule Q1 est critique ET en écart
  });
});

describe("auditConformityUpdates", () => {
  it("ignore les questions non rattachées à une mesure", () => {
    const qs = [q("1", "D"), q("2", "D", { frameworkId: "iso27001" })]; // controlCode vide
    expect(auditConformityUpdates(qs, [r("1", "Oui"), r("2", "Oui")])).toEqual([]);
  });

  it("déduit statut + maturité par mesure (Oui=5, Partiel=3, Non=1)", () => {
    const qs = [
      q("1", "D", { frameworkId: "iso27001", controlCode: "A.5.1" }),
      q("2", "D", { frameworkId: "iso27001", controlCode: "A.5.1" }),
      q("3", "D", { frameworkId: "iso27001", controlCode: "A.8.1" }),
    ];
    const up = auditConformityUpdates(qs, [r("1", "Oui"), r("2", "Partiel"), r("3", "Non")]);
    const a51 = up.find((u) => u.controlCode === "A.5.1")!;
    const a81 = up.find((u) => u.controlCode === "A.8.1")!;
    expect(a51.maturity).toBe(4); // moyenne(5,3)=4 → Implémenté
    expect(a51.status).toBe("Implémenté");
    expect(a51.count).toBe(2);
    expect(a81.maturity).toBe(1); // Non → 1 → Non implémenté
    expect(a81.status).toBe("Non implémenté");
  });

  it("exclut les réponses N-A / à vérifier", () => {
    const qs = [q("1", "D", { frameworkId: "iso27001", controlCode: "A.5.1" })];
    expect(auditConformityUpdates(qs, [r("1", "Non applicable")])).toEqual([]);
  });
});

describe("previousAudit", () => {
  const mk = (o: Partial<Audit> & { id: string }): Audit =>
    ({ ref: o.id, title: "", gridId: "g1", gridName: "", category: "", questions: [], targetAssetId: null, targetLabel: "SRV-1", auditorId: "u", date: null, status: "Terminé", responses: [], summary: "", createdBy: null, createdAt: new Date("2026-01-01"), updatedAt: new Date("2026-01-01"), ...o } as Audit);

  it("retourne l'audit précédent même grille + même cible, le plus récent avant", () => {
    const all = [
      mk({ id: "a", date: new Date("2026-01-10") }),
      mk({ id: "b", date: new Date("2026-03-10") }),
      mk({ id: "c", date: new Date("2026-06-10") }),
    ];
    expect(previousAudit(all[2], all)?.id).toBe("b"); // avant c (juin) → b (mars)
    expect(previousAudit(all[0], all)?.id).toBeUndefined(); // rien avant a
  });

  it("ignore une grille ou une cible différente", () => {
    const cur = mk({ id: "cur", date: new Date("2026-06-01") });
    const all = [
      mk({ id: "autreGrille", gridId: "g2", date: new Date("2026-01-01") }),
      mk({ id: "autreCible", targetLabel: "SRV-2", date: new Date("2026-02-01") }),
      cur,
    ];
    expect(previousAudit(cur, all)).toBeNull();
  });

  it("rapproche par actif quand la cible est un actif du registre", () => {
    const cur = mk({ id: "cur", targetAssetId: "asset-9", targetLabel: "", date: new Date("2026-06-01") });
    const older = mk({ id: "older", targetAssetId: "asset-9", targetLabel: "", date: new Date("2026-01-01") });
    expect(previousAudit(cur, [older, cur])?.id).toBe("older");
  });
});

describe("programme d'audit (AuditPlanItem)", () => {
  const NOW = new Date("2026-08-09T00:00:00Z");
  const mk = (o: Partial<AuditPlanItem>): AuditPlanItem =>
    ({ id: "p", ref: "PROG", title: "", category: "Autre", riskLevel: "Moyen", year: 2026, quarter: "T1", ownerId: "u", targetAssetId: null, targetLabel: "", gridId: "", auditId: "", plannedDate: null, status: "Planifié", objective: "", createdBy: null, createdAt: NOW, updatedAt: NOW, ...o } as AuditPlanItem);

  it("isAuditPlanLate : date passée et non réalisé/annulé", () => {
    expect(isAuditPlanLate(mk({ plannedDate: new Date("2026-07-01"), status: "Planifié" }), NOW)).toBe(true);
    expect(isAuditPlanLate(mk({ plannedDate: new Date("2026-07-01"), status: "Réalisé" }), NOW)).toBe(false);
    expect(isAuditPlanLate(mk({ plannedDate: new Date("2026-07-01"), status: "Annulé" }), NOW)).toBe(false);
    expect(isAuditPlanLate(mk({ plannedDate: new Date("2026-12-01"), status: "Planifié" }), NOW)).toBe(false);
    expect(isAuditPlanLate(mk({ plannedDate: null }), NOW)).toBe(false);
  });

  it("isAuditPlanActive : Planifié ou En cours", () => {
    expect(isAuditPlanActive(mk({ status: "Planifié" }))).toBe(true);
    expect(isAuditPlanActive(mk({ status: "En cours" }))).toBe(true);
    expect(isAuditPlanActive(mk({ status: "Réalisé" }))).toBe(false);
    expect(isAuditPlanActive(mk({ status: "Reporté" }))).toBe(false);
    expect(isAuditPlanActive(mk({ status: "Annulé" }))).toBe(false);
  });
});

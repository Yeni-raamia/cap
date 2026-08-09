import { describe, it, expect } from "vitest";
import { computeAuditScore, gridDomains, type AuditQuestion, type AuditResponse } from "@/lib/domain";

const q = (id: string, domain: string, o: Partial<AuditQuestion> = {}): AuditQuestion =>
  ({ id, domain, text: `Q ${id}`, guidance: "", weight: 1, critical: false, ...o });
const r = (questionId: string, answer: string): AuditResponse => ({ questionId, answer, note: "", evidence: "" });

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

  it("compte les constats (Non/Partiel) et les constats critiques", () => {
    const qs = [q("1", "D", { critical: true }), q("2", "D"), q("3", "D", { critical: true })];
    const s = computeAuditScore(qs, [r("1", "Non"), r("2", "Partiel"), r("3", "Oui")]);
    expect(s.gaps).toBe(2); // Q1 Non + Q2 Partiel
    expect(s.criticalGaps).toBe(1); // seule Q1 est critique ET en écart
  });
});

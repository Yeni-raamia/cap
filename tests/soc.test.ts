import { describe, it, expect } from "vitest";
import {
  computeSocKpis, currentOnCall, isIntelActive, isShiftActive, runbookCoversTechnique,
  type AttackCoverage, type IntelItem, type OnCallShift, type Runbook, type SocProcedure,
} from "@/lib/domain";

const NOW = new Date("2026-08-10T12:00:00Z");
const rb = (o: Partial<Runbook>): Runbook =>
  ({ id: "r", ref: "RB", title: "", category: "Autre", severity: "Majeur", trigger: "", objective: "", attackTechniques: [], steps: [], escalation: "", references: "", status: "Validé", ownerId: "u", createdBy: null, createdAt: NOW, updatedAt: NOW, ...o } as Runbook);
const proc = (o: Partial<SocProcedure>): SocProcedure =>
  ({ id: "p", ref: "PROC", title: "", type: "Autre", frequency: "Ponctuel", objective: "", content: "", items: [], references: "", status: "Validé", ownerId: "u", createdBy: null, createdAt: NOW, updatedAt: NOW, ...o } as SocProcedure);
const shift = (o: Partial<OnCallShift>): OnCallShift =>
  ({ id: "s", personId: "u", role: "Astreinte principale", start: NOW, end: NOW, contact: "", notes: "", createdBy: null, createdAt: NOW, updatedAt: NOW, ...o } as OnCallShift);
const intel = (o: Partial<IntelItem>): IntelItem =>
  ({ id: "i", ref: "INT", kind: "IOC", title: "", iocType: "Autre", value: "", tlp: "TLP:AMBER", severity: "Modéré", source: "", status: "Actif", description: "", action: "", attackTechniques: [], expiresAt: null, ownerId: "u", createdBy: null, createdAt: NOW, updatedAt: NOW, ...o } as IntelItem);

describe("runbookCoversTechnique", () => {
  it("associe par code exact, technique parente ou préfixe", () => {
    expect(runbookCoversTechnique(["T1566"], "T1566")).toBe(true);
    expect(runbookCoversTechnique(["T1566"], "T1566.001")).toBe(true); // parent couvre la sous-technique
    expect(runbookCoversTechnique(["t1566"], "T1566")).toBe(true); // insensible à la casse
    expect(runbookCoversTechnique(["T1486"], "T1566")).toBe(false);
  });
});

describe("isShiftActive / currentOnCall / isIntelActive", () => {
  const h = (n: number) => new Date(NOW.getTime() + n * 3600e3);
  it("garde active si maintenant ∈ [début, fin]", () => {
    expect(isShiftActive(shift({ start: h(-1), end: h(1) }), NOW)).toBe(true);
    expect(isShiftActive(shift({ start: h(1), end: h(2) }), NOW)).toBe(false);
    expect(currentOnCall([shift({ id: "a", start: h(-1), end: h(1) }), shift({ id: "b", start: h(2), end: h(3) })], NOW)).toHaveLength(1);
  });
  it("veille active si Actif/En traitement et non expirée", () => {
    expect(isIntelActive(intel({ status: "Actif", expiresAt: null }), NOW)).toBe(true);
    expect(isIntelActive(intel({ status: "Traité" }), NOW)).toBe(false);
    expect(isIntelActive(intel({ status: "Actif", expiresAt: h(-1) }), NOW)).toBe(false);
  });
});

describe("computeSocKpis", () => {
  const emptyInput = { runbooks: [], socProcedures: [], attackTechniqueIds: [], attackCoverage: [], intel: [], onCall: [], incidents: [], now: NOW };

  it("zéros sur entrées vides", () => {
    const k = computeSocKpis(emptyInput);
    expect(k.readiness).toBe(0);
    expect(k.runbookValidationPct).toBe(0);
    expect(k.mttrHeures).toBeNull();
  });

  it("readiness = 0.4*runbooks + 0.3*attack + 0.3*procédures (en %)", () => {
    const k = computeSocKpis({
      ...emptyInput,
      runbooks: [rb({ id: "1", status: "Validé", attackTechniques: ["T1566"] }), rb({ id: "2", status: "Brouillon" })], // 50% validés
      socProcedures: [proc({ id: "1", status: "Validé" }), proc({ id: "2", status: "Validé" })], // 100%
      attackTechniqueIds: ["T1566", "T1486"],
      attackCoverage: [{ techniqueId: "T1566", status: "Couverte", detectionNote: "", updatedBy: null, updatedAt: NOW } as AttackCoverage], // 1/2 = 50%
    });
    expect(k.runbookValidationPct).toBe(50);
    expect(k.procValidationPct).toBe(100);
    expect(k.attackCoveragePct).toBe(50);
    expect(k.attackReliees).toBe(1); // T1566 reliée au runbook
    // 0.4*50 + 0.3*50 + 0.3*100 = 20 + 15 + 30 = 65
    expect(k.readiness).toBe(65);
  });

  it("compte veille active/critique et gardes en cours", () => {
    const k = computeSocKpis({
      ...emptyInput,
      intel: [intel({ status: "Actif", severity: "Critique" }), intel({ status: "Traité", severity: "Critique" })],
      onCall: [shift({ start: new Date(NOW.getTime() - 3600e3), end: new Date(NOW.getTime() + 3600e3) })],
    });
    expect(k.veilleActive).toBe(1);
    expect(k.veilleCritique).toBe(1);
    expect(k.deGarde).toBe(1);
  });
});

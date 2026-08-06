import { describe, it, expect } from "vitest";
import { controlProgress, controlConformity, nextFieldStatus, type CheckItem, type FieldControl } from "@/lib/domain";

const item = (result: string): CheckItem => ({ id: "i" + Math.round(result.length), label: "x", result, note: "", frameworkId: "", controlCode: "" });
const control = (items: CheckItem[], status = "En cours"): FieldControl =>
  ({ id: "c", ref: "CTRL", title: "", type: "", service: "", location: "", date: null, inspectorId: "u", status, summary: "", items, events: [], createdBy: "u", createdAt: new Date(), updatedAt: new Date() } as FieldControl);

describe("controlProgress", () => {
  it("part des points évalués (≠ À vérifier)", () => {
    const c = control([item("Conforme"), item("Écart"), item("À vérifier"), item("Non applicable")]);
    const p = controlProgress(c);
    expect(p.total).toBe(4);
    expect(p.done).toBe(3);
    expect(p.pct).toBe(75);
  });
  it("sans points : 0% si planifié/en cours, 100% si réalisé/clôturé", () => {
    expect(controlProgress(control([], "Planifié")).pct).toBe(0);
    expect(controlProgress(control([], "Réalisé")).pct).toBe(100);
    expect(controlProgress(control([], "Clôturé")).pct).toBe(100);
  });
});

describe("controlConformity", () => {
  it("part des conformes parmi les points évalués (les À vérifier exclus)", () => {
    const c = control([item("Conforme"), item("Conforme"), item("Écart"), item("À vérifier")]);
    expect(controlConformity(c)).toBe(67); // 2 conformes / 3 évalués
  });
  it("0% si rien d'évalué", () => {
    expect(controlConformity(control([item("À vérifier")]))).toBe(0);
  });
});

describe("nextFieldStatus", () => {
  it("avance le long du cycle", () => {
    expect(nextFieldStatus("Planifié")).toBe("En cours");
    expect(nextFieldStatus("En cours")).toBe("Réalisé");
    expect(nextFieldStatus("Réalisé")).toBe("Clôturé");
  });
  it("null au terminus ou statut inconnu", () => {
    expect(nextFieldStatus("Clôturé")).toBeNull();
    expect(nextFieldStatus("Bidon")).toBeNull();
  });
});

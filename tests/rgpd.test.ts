import { describe, it, expect } from "vitest";
import { isRopaReviewLate, piaOutstanding, type ProcessingActivity } from "@/lib/domain";

const trt = (o: Partial<ProcessingActivity>): ProcessingActivity =>
  ({ id: "t", ref: "TRT", name: "N", purpose: "", legalBasis: "Contrat", dataCategories: [], sensitiveData: false, dataSubjects: "", recipients: "", retention: "", transfersOutsideEU: false, transferDetails: "", ownerId: "u", service: "", securityMeasures: "", assetIds: [], piaRequired: false, piaStatus: "Non requise", piaRisk: "Faible", piaNotes: "", status: "Actif", reviewDate: null, createdBy: null, createdAt: new Date(), updatedAt: new Date(), ...o } as ProcessingActivity);

describe("piaOutstanding", () => {
  it("AIPD requise et non réalisée = à faire", () => {
    expect(piaOutstanding(trt({ piaRequired: true, piaStatus: "À réaliser" }))).toBe(true);
    expect(piaOutstanding(trt({ piaRequired: true, piaStatus: "En cours" }))).toBe(true);
  });
  it("AIPD réalisée ou non requise = rien à faire", () => {
    expect(piaOutstanding(trt({ piaRequired: true, piaStatus: "Réalisée" }))).toBe(false);
    expect(piaOutstanding(trt({ piaRequired: false }))).toBe(false);
  });
  it("un traitement clôturé n'a pas d'AIPD en attente", () => {
    expect(piaOutstanding(trt({ piaRequired: true, piaStatus: "À réaliser", status: "Clôturé" }))).toBe(false);
  });
});

describe("isRopaReviewLate", () => {
  const now = new Date("2026-08-07T00:00:00Z");
  it("revue dépassée = en retard", () => {
    expect(isRopaReviewLate(trt({ reviewDate: new Date("2026-01-01") }), now)).toBe(true);
  });
  it("revue à venir ou absente = à l'heure", () => {
    expect(isRopaReviewLate(trt({ reviewDate: new Date("2026-12-01") }), now)).toBe(false);
    expect(isRopaReviewLate(trt({ reviewDate: null }), now)).toBe(false);
  });
});

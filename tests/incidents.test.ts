import { describe, it, expect } from "vitest";
import { incidentResolutionHours, isIncidentOpen, nextIncidentStatus, type Incident } from "@/lib/domain";

const inc = (o: Partial<Incident>): Incident =>
  ({ id: "i", ref: "INC", title: "T", type: "Cyberattaque", severity: "Majeur", status: "Déclaré", dataBreach: false, detectedAt: null, declaredBy: "u", ownerId: "u", missionId: "", assetIds: [], description: "", impact: "", actionsTaken: "", resolvedAt: null, rootCause: "", lessons: "", createdBy: null, createdAt: new Date(), updatedAt: new Date(), ...o } as Incident);

describe("isIncidentOpen", () => {
  it("ouvert tant que non résolu/clôturé", () => {
    expect(isIncidentOpen(inc({ status: "Déclaré" }))).toBe(true);
    expect(isIncidentOpen(inc({ status: "En traitement" }))).toBe(true);
    expect(isIncidentOpen(inc({ status: "Résolu" }))).toBe(false);
    expect(isIncidentOpen(inc({ status: "Clôturé" }))).toBe(false);
  });
});

describe("nextIncidentStatus", () => {
  it("suit le cycle ISO 27035", () => {
    expect(nextIncidentStatus("Déclaré")).toBe("Qualifié");
    expect(nextIncidentStatus("Qualifié")).toBe("En traitement");
    expect(nextIncidentStatus("En traitement")).toBe("Résolu");
    expect(nextIncidentStatus("Résolu")).toBe("Clôturé");
    expect(nextIncidentStatus("Clôturé")).toBeNull();
  });
});

describe("incidentResolutionHours", () => {
  it("délai entre détection et résolution", () => {
    const i = inc({ detectedAt: new Date("2026-08-01T10:00:00Z"), resolvedAt: new Date("2026-08-01T16:00:00Z") });
    expect(incidentResolutionHours(i)).toBe(6);
  });
  it("null si non résolu", () => {
    expect(incidentResolutionHours(inc({ detectedAt: new Date(), resolvedAt: null }))).toBeNull();
  });
});

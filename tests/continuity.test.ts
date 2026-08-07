import { describe, it, expect } from "vitest";
import { hasContinuityGap, isPlanReviewLate, isPlanTestStale, type ContinuityPlan } from "@/lib/domain";

const plan = (o: Partial<ContinuityPlan>): ContinuityPlan =>
  ({ id: "p", ref: "PCA", activity: "A", missionId: "", ownerId: "u", criticality: "Vitale", mtpd: "< 24h", rto: "< 24h", rpo: "< 24h", impacts: [], strategy: "", resources: "", procedure: "", assetIds: [], lastTestDate: null, reviewDate: null, status: "Validé", createdBy: null, createdAt: new Date(), updatedAt: new Date(), ...o } as ContinuityPlan);

describe("hasContinuityGap", () => {
  it("RTO plus long que la DMIA = écart", () => {
    // DMIA < 4h (score 6), RTO < 24h (score 4) → RTO plus long → écart
    expect(hasContinuityGap(plan({ mtpd: "< 4h", rto: "< 24h" }))).toBe(true);
  });
  it("RTO cohérent avec la DMIA = pas d'écart", () => {
    expect(hasContinuityGap(plan({ mtpd: "< 24h", rto: "< 4h" }))).toBe(false);
    expect(hasContinuityGap(plan({ mtpd: "< 24h", rto: "< 24h" }))).toBe(false);
  });
});

describe("isPlanTestStale", () => {
  const now = new Date("2026-08-07T00:00:00Z");
  it("jamais testé = à tester", () => {
    expect(isPlanTestStale(plan({ lastTestDate: null }), now)).toBe(true);
  });
  it("testé il y a plus d'un an = à tester", () => {
    expect(isPlanTestStale(plan({ lastTestDate: new Date("2025-01-01") }), now)).toBe(true);
  });
  it("testé récemment = à jour", () => {
    expect(isPlanTestStale(plan({ lastTestDate: new Date("2026-06-01") }), now)).toBe(false);
  });
  it("un plan obsolète n'est pas signalé à tester", () => {
    expect(isPlanTestStale(plan({ lastTestDate: null, status: "Obsolète" }), now)).toBe(false);
  });
});

describe("isPlanReviewLate", () => {
  const now = new Date("2026-08-07T00:00:00Z");
  it("revue dépassée = en retard", () => {
    expect(isPlanReviewLate(plan({ reviewDate: new Date("2026-01-01") }), now)).toBe(true);
  });
  it("revue à venir = à l'heure", () => {
    expect(isPlanReviewLate(plan({ reviewDate: new Date("2026-12-01") }), now)).toBe(false);
  });
});

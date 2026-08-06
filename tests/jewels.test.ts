import { describe, it, expect } from "vitest";
import { analyzeJewel, computeJewels, isJewel } from "@/lib/grc/jewels";
import type { Asset, FieldControl, Risk } from "@/lib/domain";

// Fabriques minimales : seuls les champs lus par le moteur JCA importent.
const asset = (o: Partial<Asset>): Asset =>
  ({ id: "a1", ref: "ACT-1", name: "SI Paie", type: "Application", description: "", ownerId: "u1", service: "RH", confidentiality: 1, integrity: 1, availability: 1, status: "Actif", ...o } as unknown as Asset);
const risk = (o: Partial<Risk>): Risk =>
  ({ id: "r1", assetId: "a1", status: "Identifié", probability: 3, impact: 3, residualProbability: 3, residualImpact: 3, controls: [], ...o } as unknown as Risk);
const control = (o: Partial<FieldControl>): FieldControl =>
  ({ id: "c1", service: "RH", status: "Réalisé", ...o } as unknown as FieldControl);

describe("analyzeJewel", () => {
  it("criticité = max(C,I,D) et critScore associé", () => {
    const j = analyzeJewel(asset({ confidentiality: 4, integrity: 2, availability: 1 }), [], []);
    expect(j.criticality).toBe("Critique");
    expect(j.critScore).toBe(4);
  });

  it("un actif faible sans risque n'est pas un joyau", () => {
    const j = analyzeJewel(asset({ confidentiality: 1, integrity: 1, availability: 1 }), [], []);
    expect(isJewel(j)).toBe(false);
  });

  it("un actif Élevé est un joyau", () => {
    const j = analyzeJewel(asset({ confidentiality: 3, integrity: 1, availability: 1 }), [], []);
    expect(isJewel(j)).toBe(true);
  });

  it("un actif faible avec risque résiduel élevé devient un joyau", () => {
    const j = analyzeJewel(asset({ confidentiality: 1 }), [risk({ residualProbability: 5, residualImpact: 5 })], []);
    expect(j.maxResidual).toBe("Critique");
    expect(isJewel(j)).toBe(true);
  });

  it("exposition = pire niveau résiduel parmi les risques liés (hors clôturés)", () => {
    const risks = [
      risk({ id: "r1", residualProbability: 1, residualImpact: 1 }),
      risk({ id: "r2", residualProbability: 5, residualImpact: 4 }),
      risk({ id: "r3", status: "Clôturé", residualProbability: 5, residualImpact: 5 }),
    ];
    const j = analyzeJewel(asset({ confidentiality: 3 }), risks, []);
    expect(j.linkedRisks.length).toBe(2); // le clôturé est exclu
    expect(j.maxResidual).toBe("Critique");
  });

  it("les risques d'un autre actif ne comptent pas", () => {
    const j = analyzeJewel(asset({ id: "a1", confidentiality: 3 }), [risk({ assetId: "autre", residualProbability: 5, residualImpact: 5 })], []);
    expect(j.linkedRisks.length).toBe(0);
    expect(j.maxResidual).toBeNull();
  });

  it("protection : mesures uniques + couverture contrôle terrain sur le service", () => {
    const risks = [risk({ controls: [{ frameworkId: "iso27001", controlCode: "A.5.1" }, { frameworkId: "iso27001", controlCode: "A.5.1" }, { frameworkId: "cis", controlCode: "1.1" }, { frameworkId: "cis", controlCode: "1.2" }] as Risk["controls"] })];
    const j = analyzeJewel(asset({ confidentiality: 4, service: "RH" }), risks, [control({ service: "RH", status: "Réalisé" })]);
    expect(j.mitigations).toBe(3); // A.5.1 dédupliqué
    expect(j.controlCoverage).toBe(1);
    expect(j.protectionScore).toBe(3); // >=1 mesure, >=3 mesures, >=1 contrôle
  });

  it("un contrôle non réalisé ou d'un autre service ne protège pas", () => {
    const j = analyzeJewel(asset({ confidentiality: 4, service: "RH" }), [], [control({ service: "RH", status: "Planifié" }), control({ service: "DSI", status: "Réalisé" })]);
    expect(j.controlCoverage).toBe(0);
  });

  it("la protection fait baisser le JRI (à criticité et exposition égales)", () => {
    const risks = [risk({ residualProbability: 5, residualImpact: 5, controls: [{ frameworkId: "iso27001", controlCode: "A.5.1" }, { frameworkId: "cis", controlCode: "1.1" }, { frameworkId: "cis", controlCode: "1.2" }] as Risk["controls"] })];
    const exposed = analyzeJewel(asset({ confidentiality: 4, service: "RH" }), [risk({ residualProbability: 5, residualImpact: 5 })], []);
    const protectedJ = analyzeJewel(asset({ confidentiality: 4, service: "RH" }), risks, [control({ service: "RH", status: "Réalisé" })]);
    expect(protectedJ.jri).toBeLessThan(exposed.jri);
    expect(exposed.band).toBe("Prioritaire");
  });

  it("recommande une analyse de risque quand aucun risque n'est rattaché", () => {
    const j = analyzeJewel(asset({ confidentiality: 4 }), [], []);
    expect(j.recommendations.some((r) => r.includes("analyse de risque"))).toBe(true);
  });
});

describe("computeJewels", () => {
  it("exclut les actifs retirés et classe par JRI décroissant", () => {
    const assets = [
      asset({ id: "a1", confidentiality: 4, service: "RH" }),
      asset({ id: "a2", confidentiality: 3, service: "DSI" }),
      asset({ id: "a3", confidentiality: 4, status: "Retiré" }),
    ];
    const risks = [risk({ id: "r1", assetId: "a1", residualProbability: 5, residualImpact: 5 })];
    const res = computeJewels(assets, risks, []);
    expect(res.length).toBe(2); // a3 retiré exclu
    expect(res[0].asset.id).toBe("a1"); // plus exposé → JRI le plus haut
    expect(res[0].jri).toBeGreaterThanOrEqual(res[1].jri);
  });
});

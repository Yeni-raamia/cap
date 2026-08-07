import { describe, it, expect } from "vitest";
import { directionPolicyRollup, directionServiceNames, type Direction, type Policy, type PolicyDiffusion } from "@/lib/domain";

const svc = (name: string) => ({ id: "s-" + name, name, headId: "" });
const dir = (o: Partial<Direction>): Direction =>
  ({ id: "d1", ref: "DIR-1", name: "Direction des systèmes d'information", code: "DSI", headId: "", description: "", services: [], createdBy: null, createdAt: new Date(), updatedAt: new Date(), ...o } as Direction);
const diff = (service: string, stage: string): PolicyDiffusion => ({ id: "x" + service + stage, policyId: "p", service, stage, note: "", updatedAt: new Date() });
const policy = (diffusions: PolicyDiffusion[]): Policy => ({ id: "p", diffusions } as Policy);

describe("directionServiceNames", () => {
  it("liste dédupliquée et triée des services de toutes les directions", () => {
    const ds = [dir({ services: [svc("Paie"), svc("Réseau")] }), dir({ id: "d2", services: [svc("Paie"), svc("Support")] })];
    expect(directionServiceNames(ds)).toEqual(["Paie", "Réseau", "Support"]);
  });
});

describe("directionPolicyRollup", () => {
  it("agrège les diffusions ciblant le sigle, le nom ou un service de la direction", () => {
    const d = dir({ code: "DSI", name: "Direction SI", services: [svc("Réseau"), svc("Support")] });
    const policies = [
      policy([diff("DSI", "Applicable"), diff("Réseau", "Comprise")]), // sigle + service
      policy([diff("Direction SI", "Consultée"), diff("RH", "Applicable")]), // nom (compte) + hors périmètre (ignoré)
    ];
    const r = directionPolicyRollup(d, policies);
    expect(r.total).toBe(3); // DSI, Réseau, Direction SI — pas RH
    expect(r.applicable).toBe(1); // seul « DSI » est Applicable
    expect(r.comprises).toBe(2); // Applicable + Comprise
    expect(r.pct).toBe(33); // 1/3
  });

  it("exclut les diffusions « Non applicable » du dénominateur", () => {
    const d = dir({ code: "RH", name: "RH", services: [] });
    const r = directionPolicyRollup(d, [policy([diff("RH", "Applicable"), diff("RH", "Non applicable")])]);
    expect(r.total).toBe(1);
    expect(r.pct).toBe(100);
    expect(r.byStage["Non applicable"]).toBe(1);
  });

  it("aucune correspondance → total 0, pct 0", () => {
    const r = directionPolicyRollup(dir({ code: "FIN", name: "Finance", services: [] }), [policy([diff("DSI", "Applicable")])]);
    expect(r.total).toBe(0);
    expect(r.pct).toBe(0);
  });
});

import { describe, it, expect } from "vitest";
import { seedAssets, seedRisks, seedPolicies, seedFieldControls, seedCapa, seedPlan } from "@/lib/data/grcDemo";
import { computeCyberBadges, earnedCount, type CyberBadgeData } from "@/lib/grc/badges";
import { computeJewels, isJewel } from "@/lib/grc/jewels";
import { POLICY_STAGE_ALL } from "@/lib/domain";

const data = (): CyberBadgeData => ({
  fieldControls: seedFieldControls(),
  capaActions: seedCapa(),
  risks: seedRisks(),
  policies: seedPolicies(),
  nonConformites: [],
  planItems: seedPlan(),
});
const GRC_MEMBERS = ["u1", "u3", "u6"]; // cohérent avec mock.ts (grcMember: true)

describe("jeu de démonstration GRC — volume", () => {
  it("chaque registre est alimenté", () => {
    expect(seedAssets().length).toBeGreaterThanOrEqual(5);
    expect(seedRisks().length).toBeGreaterThanOrEqual(5);
    expect(seedPolicies().length).toBeGreaterThanOrEqual(3);
    expect(seedFieldControls().length).toBeGreaterThanOrEqual(5);
    expect(seedCapa().length).toBeGreaterThanOrEqual(4);
    expect(seedPlan().length).toBeGreaterThanOrEqual(4);
  });
});

describe("jeu de démonstration GRC — cohérence référentielle", () => {
  it("chaque risque cible un actif existant (ou aucun)", () => {
    const ids = new Set(seedAssets().map((a) => a.id));
    seedRisks().forEach((r) => { if (r.assetId) expect(ids.has(r.assetId)).toBe(true); });
  });
  it("chaque diffusion référence bien sa politique et une étape valide", () => {
    seedPolicies().forEach((p) => p.diffusions.forEach((d) => {
      expect(d.policyId).toBe(p.id);
      expect(POLICY_STAGE_ALL).toContain(d.stage);
    }));
  });
  it("les CAPA issues d'un contrôle pointent vers un écart existant", () => {
    const gapIds = new Set(seedFieldControls().flatMap((c) => c.items.filter((it) => it.result === "Écart").map((it) => it.id)));
    seedCapa().filter((a) => a.sourceType === "controle" && a.sourceId).forEach((a) => {
      expect(gapIds.has(a.sourceId as string)).toBe(true);
    });
  });
});

describe("jeu de démonstration GRC — distinctions vivantes", () => {
  const d = data();
  it("les 3 membres GRC obtiennent chacun au moins une distinction", () => {
    GRC_MEMBERS.forEach((id) => {
      expect(earnedCount(computeCyberBadges(id, d))).toBeGreaterThanOrEqual(1);
    });
  });
  it("u6 (Audit) est le champion : Gardien, Œil de lynx et Clé de voûte", () => {
    const badges = computeCyberBadges("u6", d);
    const earned = new Set(badges.filter((b) => b.earned).map((b) => b.id));
    expect(earned.has("gardien")).toBe(true);
    expect(earned.has("oeil-de-lynx")).toBe(true);
    expect(earned.has("cle-de-voute")).toBe(true);
  });
  it("u3 (Gouvernance) obtient Gardien des politiques", () => {
    const earned = new Set(computeCyberBadges("u3", d).filter((b) => b.earned).map((b) => b.id));
    expect(earned.has("gardien-politiques")).toBe(true);
  });
  it("u1 (RSSI) obtient Dompteur (risque élevé maîtrisé)", () => {
    const earned = new Set(computeCyberBadges("u1", d).filter((b) => b.earned).map((b) => b.id));
    expect(earned.has("dompteur")).toBe(true);
  });
});

describe("jeu de démonstration GRC — joyaux", () => {
  it("l'annuaire (C/I/D = 4) ressort comme joyau prioritaire", () => {
    const jewels = computeJewels(seedAssets(), seedRisks(), seedFieldControls()).filter(isJewel);
    expect(jewels.length).toBeGreaterThanOrEqual(3);
    const ad = jewels.find((j) => j.asset.id === "da1");
    expect(ad).toBeTruthy();
    expect(ad!.criticality).toBe("Critique");
  });
});

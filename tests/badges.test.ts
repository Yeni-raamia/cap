import { describe, it, expect } from "vitest";
import { computeCyberBadges, earnedCount, type CyberBadgeData } from "@/lib/grc/badges";
import type { CapaAction, CheckItem, FieldControl, GrcPlanItem, NonConformite, Policy, Risk } from "@/lib/domain";

const D = new Date("2026-08-06T00:00:00Z");
const U = "u1"; // utilisateur testé

// Fabriques minimales : seuls les champs lus par le moteur de badges importent.
const item = (result: string): CheckItem => ({ id: "i", label: "x", result, note: "", frameworkId: "", controlCode: "" });
const control = (o: Partial<FieldControl>): FieldControl =>
  ({ id: "c", ref: "CTRL", title: "", type: "Ronde de sécurité", service: "", location: "", date: null, inspectorId: U, status: "Réalisé", summary: "", items: [], createdBy: U, createdAt: D, updatedAt: D, ...o } as FieldControl);
const capa = (o: Partial<CapaAction>): CapaAction =>
  ({ id: "a", ref: "CAPA", title: "", description: "", type: "Corrective", priority: "Normale", sourceType: "manuel", sourceId: null, ownerId: U, dueDate: null, status: "Ouverte", verification: "", closedAt: null, createdBy: U, createdAt: D, updatedAt: D, ...o } as CapaAction);
const risk = (o: Partial<Risk>): Risk => ({ ownerId: U, probability: 1, impact: 1, residualProbability: 1, residualImpact: 1, status: "Ouvert", ...o } as unknown as Risk);
const policy = (o: Partial<Policy>): Policy => ({ ownerId: U, status: "En vigueur", ...o } as unknown as Policy);
const nc = (o: Partial<NonConformite>): NonConformite => ({ createdBy: U, status: "Décision rendue", ...o } as unknown as NonConformite);
const plan = (o: Partial<GrcPlanItem>): GrcPlanItem => ({ ownerId: U, status: "Terminé", ...o } as unknown as GrcPlanItem);

const empty: CyberBadgeData = { fieldControls: [], capaActions: [], risks: [], policies: [], nonConformites: [], planItems: [] };
const badgeOf = (data: Partial<CyberBadgeData>, id = "gardien") =>
  computeCyberBadges(U, { ...empty, ...data }, D).find((b) => b.id === id)!;

describe("computeCyberBadges", () => {
  it("aucune donnée → aucun badge obtenu", () => {
    const badges = computeCyberBadges(U, empty, D);
    expect(badges).toHaveLength(10);
    expect(earnedCount(badges)).toBe(0);
  });

  it("Gardien : 5 rondes réalisées", () => {
    const fieldControls = Array.from({ length: 5 }, () => control({ status: "Réalisé" }));
    expect(badgeOf({ fieldControls }, "gardien").earned).toBe(true);
    // 4 seulement → non obtenu
    expect(badgeOf({ fieldControls: fieldControls.slice(1) }, "gardien").earned).toBe(false);
  });

  it("Gardien : les rondes non réalisées ne comptent pas", () => {
    const fieldControls = Array.from({ length: 5 }, () => control({ status: "Planifié" }));
    expect(badgeOf({ fieldControls }, "gardien").value).toBe(0);
  });

  it("Œil de lynx : 10 écarts détectés", () => {
    const fieldControls = [control({ items: Array.from({ length: 10 }, () => item("Écart")) })];
    expect(badgeOf({ fieldControls }, "oeil-de-lynx").earned).toBe(true);
  });

  it("Dompteur : risque élevé ramené à un résiduel maîtrisé", () => {
    const risks = [risk({ probability: 5, impact: 5, residualProbability: 2, residualImpact: 1 })];
    expect(badgeOf({ risks }, "dompteur").earned).toBe(true);
    // résiduel encore élevé → non
    const risks2 = [risk({ probability: 5, impact: 5, residualProbability: 5, residualImpact: 4 })];
    expect(badgeOf({ risks: risks2 }, "dompteur").earned).toBe(false);
  });

  it("Pompier : 10 actions clôturées portées par l'utilisateur", () => {
    const capaActions = Array.from({ length: 10 }, () => capa({ status: "Clôturée" }));
    expect(badgeOf({ capaActions }, "pompier").earned).toBe(true);
  });

  it("Zéro faille : aucune action en retard avec ≥ 5 actions", () => {
    const capaActions = Array.from({ length: 5 }, () => capa({ status: "En cours", dueDate: new Date("2026-12-31") }));
    expect(badgeOf({ capaActions }, "zero-faille").earned).toBe(true);
    // une action en retard casse le badge
    const late = [...capaActions, capa({ status: "En cours", dueDate: new Date("2026-01-01") })];
    expect(badgeOf({ capaActions: late }, "zero-faille").earned).toBe(false);
    // moins de 5 actions → non éligible
    expect(badgeOf({ capaActions: capaActions.slice(0, 4) }, "zero-faille").earned).toBe(false);
  });

  it("Clé de voûte : contribuer à ≥ 4 métiers GRC", () => {
    const data: Partial<CyberBadgeData> = {
      fieldControls: [control({ status: "Réalisé" })],
      risks: [risk({})],
      policies: [policy({})],
      capaActions: [capa({ status: "Clôturée" })],
    };
    expect(badgeOf(data, "cle-de-voute").earned).toBe(true); // 4 métiers
    // 3 métiers seulement → non
    expect(badgeOf({ fieldControls: data.fieldControls, risks: data.risks, policies: data.policies }, "cle-de-voute").earned).toBe(false);
  });

  it("Rempart : non-conformités traitées à l'initiative de l'utilisateur", () => {
    const nonConformites = Array.from({ length: 5 }, () => nc({ status: "Décision rendue" }));
    expect(badgeOf({ nonConformites }, "rempart").earned).toBe(true);
    // ouvertes → ne comptent pas
    const open = Array.from({ length: 5 }, () => nc({ status: "Ouverte" }));
    expect(badgeOf({ nonConformites: open }, "rempart").value).toBe(0);
  });

  it("les données d'un autre utilisateur ne créditent pas le badge", () => {
    const fieldControls = Array.from({ length: 5 }, () => control({ status: "Réalisé", inspectorId: "autre" }));
    expect(badgeOf({ fieldControls }, "gardien").value).toBe(0);
  });

  it("Sentinelle : chantiers du plan comptent via un autre métier (indirect)", () => {
    const planItems = Array.from({ length: 1 }, () => plan({ status: "Terminé" }));
    // le plan seul ne débloque pas Sentinelle, mais il compte comme métier pour Clé de voûte
    expect(badgeOf({ planItems }, "sentinelle").earned).toBe(false);
  });
});

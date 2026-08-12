import { describe, it, expect } from "vitest";
import { canAccess, hasPageAccess, NAV, navForUser } from "@/lib/nav";
import type { Profile, Role } from "@/lib/domain";

const user = (role: Role, over: Partial<Profile> = {}): Profile =>
  ({ id: "u1", nom: "Test", init: "T", email: "t@x", role, poste: "", extraPages: [], deniedPages: [], ...over }) as Profile;

describe("pages masquées du menu", () => {
  it("les registres d'écarts ne sont plus dans la barre latérale", () => {
    const ids = navForUser(user("admin")).map((n) => n.id);
    expect(ids).not.toContain("negligences");
    expect(ids).not.toContain("nonconformites");
    expect(ids).toContain("grc"); // ils y vivent désormais
  });

  it("mais leurs routes restent protégées par les mêmes rôles", () => {
    // Le point du masquage : sans entrée NAV, canAccess laisserait passer
    // n'importe quel compte authentifié sur /negligences/<id>.
    expect(canAccess("/negligences/abc", user("agent"))).toBe(false);
    expect(canAccess("/non-conformites/abc", user("agent"))).toBe(false);
    expect(canAccess("/negligences/abc", user("directeur"))).toBe(true);
    expect(canAccess("/non-conformites/abc", user("dsi"))).toBe(true);
  });

  it("restent accordables individuellement par un administrateur", () => {
    expect(hasPageAccess(user("agent", { extraPages: ["negligences"] }), "negligences")).toBe(true);
    expect(canAccess("/negligences/abc", user("agent", { extraPages: ["negligences"] }))).toBe(true);
  });

  it("un retrait explicite l'emporte toujours", () => {
    expect(canAccess("/negligences/abc", user("directeur", { deniedPages: ["negligences"] }))).toBe(false);
  });
});

describe("entrée Planning", () => {
  it("est visible par toute l'équipe", () => {
    expect(NAV.find((n) => n.id === "planning")?.roles).toContain("agent");
    expect(navForUser(user("agent")).map((n) => n.id)).toContain("planning");
  });
});

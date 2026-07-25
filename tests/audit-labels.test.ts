import { describe, it, expect } from "vitest";
import { actionLabel, ACTION_LABEL, SECURITY_ACTIONS } from "@/lib/audit-labels";

describe("actionLabel", () => {
  it("renvoie le libellé lisible d'une action connue", () => {
    expect(actionLabel("login")).toBe("Connexion");
    expect(actionLabel("item_relance_email")).toBe("Relance envoyée par e-mail");
    expect(actionLabel("2fa_enabled")).toBe("Double authentification activée");
  });
  it("se replie sur le code brut pour une action inconnue", () => {
    expect(actionLabel("action_totalement_inconnue")).toBe("action_totalement_inconnue");
  });
});

describe("SECURITY_ACTIONS", () => {
  it("regroupe bien les événements sensibles", () => {
    expect(SECURITY_ACTIONS).toContain("login");
    expect(SECURITY_ACTIONS).toContain("login_failed");
    expect(SECURITY_ACTIONS).toContain("2fa_enabled");
    expect(SECURITY_ACTIONS).toContain("security_settings");
  });
  it("n'inclut pas d'événement purement métier", () => {
    expect(SECURITY_ACTIONS).not.toContain("item_create");
    expect(SECURITY_ACTIONS).not.toContain("item_relance");
  });
  it("chaque action sécurité possède un libellé", () => {
    for (const a of SECURITY_ACTIONS) expect(ACTION_LABEL[a]).toBeTruthy();
  });
});

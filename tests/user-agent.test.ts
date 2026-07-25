import { describe, it, expect } from "vitest";
import { describeUserAgent } from "@/lib/auth/user-agent";

describe("describeUserAgent", () => {
  it("reconnaît Chrome sur Windows", () => {
    expect(
      describeUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36")
    ).toBe("Chrome sur Windows");
  });
  it("distingue Edge de Chrome (Edg/ prioritaire)", () => {
    expect(
      describeUserAgent("Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/120.0 Safari/537.36 Edg/120.0")
    ).toBe("Edge sur Windows");
  });
  it("reconnaît Firefox sur Linux", () => {
    expect(describeUserAgent("Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0")).toBe(
      "Firefox sur Linux"
    );
  });
  it("reconnaît Safari sur macOS", () => {
    expect(
      describeUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15")
    ).toBe("Safari sur macOS");
  });
  it("renvoie « Appareil inconnu » pour un UA vide ou nul", () => {
    expect(describeUserAgent("")).toBe("Appareil inconnu");
    expect(describeUserAgent(null)).toBe("Appareil inconnu");
    expect(describeUserAgent(undefined)).toBe("Appareil inconnu");
  });
  it("donne juste le navigateur si le système est inconnu", () => {
    expect(describeUserAgent("Firefox/121.0")).toBe("Firefox");
  });
});

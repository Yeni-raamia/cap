/* Mesure d'adoption : agrégation non nominative, sur une base jetable. */
import { describe, it, expect, beforeAll } from "vitest";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

process.env.DATABASE_PATH = join(tmpdir(), `cap-usage-${randomUUID()}.sqlite`);

let usage: typeof import("@/lib/db/usage");
beforeAll(async () => {
  usage = await import("@/lib/db/usage");
});

const at = (y: number, m: number, d: number, h = 10) => new Date(y, m - 1, d, h);
const NOW = at(2026, 3, 11); // mercredi 11 mars 2026

describe("marquage", () => {
  it("ne compte qu'une fois la même personne sur la même heure et la même page", () => {
    // Le battement de cœur passe toutes les 20 s : sans déduplication, une
    // personne pèserait 180 fois dans une heure.
    for (let i = 0; i < 5; i++) usage.markUsage("u1", "/espace", NOW);
    expect(usage.activeUserCount(30, NOW)).toBe(1);
  });

  it("compte des personnes distinctes, pas des visites", () => {
    usage.markUsage("u2", "/espace", NOW);
    usage.markUsage("u2", "/projets", NOW);
    usage.markUsage("u2", "/grc", NOW);
    expect(usage.activeUserCount(30, NOW)).toBe(2);
  });
});

describe("activeUsersPerDay", () => {
  it("renvoie une série continue, jours creux à zéro", () => {
    // Un jour sans usage doit apparaître à zéro : sinon la courbe mentirait
    // en reliant deux jours éloignés.
    const s = usage.activeUsersPerDay(7, NOW);
    expect(s.length).toBe(7);
    expect(s.at(-1)!.day).toBe("2026-03-11");
    expect(s.at(-1)!.users).toBe(2);
    expect(s[0].users).toBe(0);
  });

  it("sépare bien les journées", () => {
    usage.markUsage("u3", "/espace", at(2026, 3, 10));
    const s = usage.activeUsersPerDay(7, NOW);
    expect(s.find((d) => d.day === "2026-03-10")?.users).toBe(1);
    expect(s.find((d) => d.day === "2026-03-11")?.users).toBe(2);
  });
});

describe("usageHeatmap", () => {
  it("range les créneaux par jour de semaine, lundi en tête", () => {
    const h = usage.usageHeatmap(30, NOW);
    // 11 mars 2026 = mercredi → index 2 ; 10 mars = mardi → index 1.
    expect(h.find((x) => x.weekday === 2 && x.hour === 10)?.users).toBe(2);
    expect(h.find((x) => x.weekday === 1 && x.hour === 10)?.users).toBe(1);
  });
});

describe("topPages", () => {
  it("classe les pages par nombre de personnes distinctes", () => {
    const p = usage.topPages(30, 10, NOW);
    expect(p[0].page).toBe("/espace"); // u1, u2 et u3
    expect(p[0].users).toBe(3);
  });
});

describe("purgeUsageMarks", () => {
  it("efface les marques au-delà de la durée de conservation", () => {
    usage.markUsage("u9", "/espace", at(2025, 1, 5));
    expect(usage.activeUsersPerDay(500, NOW).some((d) => d.day === "2025-01-05" && d.users === 1)).toBe(true);

    const efface = usage.purgeUsageMarks(NOW, 90);
    expect(efface).toBeGreaterThan(0);
    expect(usage.activeUsersPerDay(500, NOW).some((d) => d.day === "2025-01-05" && d.users > 0)).toBe(false);
  });

  it("conserve les marques récentes", () => {
    // La purge ne doit pas emporter la période affichée.
    expect(usage.activeUserCount(30, NOW)).toBe(3);
  });
});

describe("accountActivity — journal nominatif", () => {
  it("renvoie une ligne par compte, y compris ceux sans activité", async () => {
    // Ce sont précisément les comptes silencieux que l'on cherche : les
    // omettre viderait la vue de son intérêt.
    const { getDb } = await import("@/lib/db/index");
    getDb().prepare("insert or ignore into profiles (id, email, password_hash, full_name, initials) values (?,?,?,?,?)")
      .run("u1", "u1@x", "h", "Un", "U");
    getDb().prepare("insert or ignore into profiles (id, email, password_hash, full_name, initials) values (?,?,?,?,?)")
      .run("zz", "zz@x", "h", "Zéro activité", "Z");

    const rows = usage.accountActivity(30, NOW);
    const inactif = rows.find((r) => r.profileId === "zz");
    expect(inactif).toBeDefined();
    expect(inactif!.activeDays).toBe(0);
    expect(inactif!.lastActiveDay).toBeNull();
  });

  it("compte les jours distincts et retient le dernier jour actif", () => {
    usage.markUsage("u1", "/espace", at(2026, 3, 9, 8));
    usage.markUsage("u1", "/espace", at(2026, 3, 9, 17));
    usage.markUsage("u1", "/projets", at(2026, 3, 11, 14));
    const r = usage.accountActivity(30, NOW).find((x) => x.profileId === "u1")!;
    expect(r.activeDays).toBeGreaterThanOrEqual(2);
    expect(r.lastActiveDay).toBe("2026-03-11");
  });

  it("donne l'amplitude horaire du dernier jour, pas une durée", () => {
    // min et max de l'heure : on ne prétend pas savoir ce qui s'est passé entre.
    usage.markUsage("u1", "/grc", at(2026, 3, 11, 9));
    usage.markUsage("u1", "/grc", at(2026, 3, 11, 18));
    const r = usage.accountActivity(30, NOW).find((x) => x.profileId === "u1")!;
    expect(r.firstHour).toBe(9);
    expect(r.lastHour).toBe(18);
  });
});

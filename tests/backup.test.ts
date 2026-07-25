import { describe, it, expect } from "vitest";
import Database from "better-sqlite3";
import { readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { validateSqlite } from "@/lib/db/backup";

const REQUIRED = ["profiles", "items", "sessions", "settings", "ref_metiers", "ref_types"];

/** Construit une base SQLite jetable avec les tables données et renvoie ses octets. */
function buildDb(tables: string[]): Buffer {
  const p = join(tmpdir(), `cap-test-${randomUUID()}.sqlite`);
  const db = new Database(p);
  for (const t of tables) db.exec(`create table ${t} (id text)`);
  db.close();
  const buf = readFileSync(p);
  rmSync(p, { force: true });
  return buf;
}

describe("validateSqlite", () => {
  it("accepte une base contenant toutes les tables requises", () => {
    expect(validateSqlite(buildDb(REQUIRED))).toEqual({ ok: true });
  });

  it("refuse un fichier qui n'est pas une base SQLite", () => {
    const r = validateSqlite(Buffer.from("ceci n'est vraiment pas une base de données SQLite du tout !!"));
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/SQLite valide/);
  });

  it("refuse une base à laquelle il manque des tables Cap", () => {
    const r = validateSqlite(buildDb(["profiles", "items"]));
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/tables manquantes/);
  });
});

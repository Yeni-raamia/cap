/* ==================================================================
 *  lib/db/backup.ts — Sauvegarde & restauration de la base SQLite.
 *  Serveur uniquement. Réservé aux administrateurs (garde en amont).
 * ================================================================== */
import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { closeDb, getDb, getDbPath } from "./index";

/** Début de l'en-tête magique SQLite (15 octets ASCII ; le 16e octet est un NUL). */
const SQLITE_MAGIC = "SQLite format 3";

/** Tables attendues dans une sauvegarde Cap valide (garde-fou de restauration). */
const REQUIRED_TABLES = ["profiles", "items", "sessions", "settings", "ref_metiers", "ref_types"];

/**
 * Produit un instantané cohérent de la base (inclut le contenu du WAL) et le
 * renvoie sous forme de Buffer. Utilise l'API de sauvegarde en ligne de SQLite,
 * jamais une simple copie du fichier (qui manquerait les pages non checkpointées).
 */
export async function makeBackup(): Promise<Buffer> {
  const tmp = join(tmpdir(), `cap-backup-${randomUUID()}.sqlite`);
  try {
    await getDb().backup(tmp);
    return readFileSync(tmp);
  } finally {
    rmSync(tmp, { force: true });
  }
}

/** Vérifie qu'un buffer est bien une base SQLite Cap exploitable. */
export function validateSqlite(buf: Buffer): { ok: boolean; error?: string } {
  if (buf.length < 100 || buf.subarray(0, 15).toString("latin1") !== SQLITE_MAGIC) {
    return { ok: false, error: "Ce fichier n'est pas une base SQLite valide." };
  }
  const tmp = join(tmpdir(), `cap-restore-check-${randomUUID()}.sqlite`);
  writeFileSync(tmp, buf);
  try {
    const db = new Database(tmp, { readonly: true, fileMustExist: true });
    const names = new Set(
      (db.prepare("select name from sqlite_master where type='table'").all() as { name: string }[]).map((r) => r.name)
    );
    db.close();
    const missing = REQUIRED_TABLES.filter((t) => !names.has(t));
    if (missing.length) {
      return { ok: false, error: `Sauvegarde incompatible — tables manquantes : ${missing.join(", ")}.` };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Fichier illisible ou corrompu." };
  } finally {
    rmSync(tmp, { force: true });
  }
}

/**
 * Remplace la base courante par le contenu fourni. Étapes :
 *  1. valider le fichier ; 2. faire un instantané de sécurité de la base actuelle ;
 *  3. sortir du mode WAL & fermer la connexion ; 4. écrire le nouveau fichier ;
 *  5. rouvrir (migrations & seeds → une sauvegarde plus ancienne est mise à niveau).
 * Renvoie le chemin de l'instantané de sécurité en cas de succès.
 */
export async function restoreFromBuffer(buf: Buffer): Promise<{ ok: boolean; error?: string; safetyBackup?: string }> {
  const v = validateSqlite(buf);
  if (!v.ok) return v;

  const dbPath = getDbPath();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const safety = `${dbPath}.${stamp}.bak`;

  // 1) Filet de sécurité : instantané de la base actuelle avant tout remplacement.
  const db = getDb();
  await db.backup(safety);

  // 2) Sortir proprement du mode WAL : SQLite supprime lui-même les fichiers
  //    -wal/-shm, ce qui évite un EPERM sous Windows (verrou résiduel).
  try {
    db.pragma("wal_checkpoint(TRUNCATE)");
    db.pragma("journal_mode = DELETE");
  } catch {
    /* best effort : la fermeture ci-dessous checkpointe de toute façon */
  }
  closeDb();

  // 3) Remplacer le fichier. Windows peut retenir le verrou un court instant
  //    après la fermeture : on réessaie brièvement.
  await withRetry(() => writeFileSync(dbPath, buf));
  for (const ext of ["-wal", "-shm"]) {
    const p = `${dbPath}${ext}`;
    try {
      if (existsSync(p)) rmSync(p, { force: true });
    } catch {
      /* résidus non bloquants : SQLite les régénère/ignore à la réouverture */
    }
  }

  // 4) Rouvrir : ensureColumns() met à niveau une sauvegarde d'un schéma antérieur.
  getDb();
  return { ok: true, safetyBackup: safety };
}

/** Réessaie une opération de fichier quelques fois (verrous Windows transitoires). */
async function withRetry(fn: () => void, tries = 6, delayMs = 80): Promise<void> {
  for (let i = 0; i < tries; i++) {
    try {
      fn();
      return;
    } catch (e) {
      if (i === tries - 1) throw e;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

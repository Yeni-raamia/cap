/* ==================================================================
 *  lib/db/backup.ts — Sauvegarde & restauration de la base SQLite.
 *  Serveur uniquement. Réservé aux administrateurs (garde en amont).
 * ================================================================== */
import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import type { ServerBackupFile } from "@/lib/domain";
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

/* ==================================================================
 *  Sauvegardes stockées sur le serveur (planifiées / manuelles)
 * ================================================================== */

/** Répertoire des sauvegardes serveur (à côté du fichier de base). */
export function backupDir(): string {
  return join(dirname(getDbPath()), "backups");
}

/**
 * Nom de fichier de sauvegarde sûr : basename simple, préfixe `cap-`,
 * extension `.sqlite`, aucune remontée de chemin. Empêche tout parcours
 * de répertoire lors des lectures/suppressions/restaurations par nom.
 */
export function isSafeBackupName(name: string): boolean {
  if (typeof name !== "string") return false;
  if (name.includes("/") || name.includes("\\") || name.includes("..")) return false;
  return /^cap-[\w.-]+\.sqlite$/.test(name);
}

/** Résout un nom de sauvegarde vers un chemin confiné au répertoire des sauvegardes. */
function resolveBackup(name: string): string | null {
  if (!isSafeBackupName(name)) return null;
  const dir = backupDir();
  const p = resolve(dir, name);
  // Garde-fou : le chemin résolu doit rester dans le répertoire des sauvegardes.
  if (p !== join(dir, name)) return null;
  return p;
}

/** Crée une sauvegarde sur le serveur, applique la rétention, et la renvoie. */
export async function runServerBackup(retention: number): Promise<ServerBackupFile> {
  const dir = backupDir();
  mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-"); // AAAA-MM-JJ-HH-MM-SS
  const name = `cap-auto-${stamp}-${randomUUID().slice(0, 4)}.sqlite`; // suffixe anti-collision
  const path = join(dir, name);
  await getDb().backup(path);
  pruneBackups(retention);
  const st = statSync(path);
  return { name, size: st.size, createdAt: st.mtime };
}

/** Liste les sauvegardes présentes sur le serveur (plus récentes d'abord). */
export function listServerBackups(): ServerBackupFile[] {
  const dir = backupDir();
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((n) => isSafeBackupName(n))
    .map((name) => {
      const st = statSync(join(dir, name));
      return { name, size: st.size, createdAt: st.mtime };
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/** Conserve les `retention` sauvegardes les plus récentes, supprime les autres. */
export function pruneBackups(retention: number): void {
  const keep = Math.max(1, Math.floor(retention));
  const files = listServerBackups();
  for (const f of files.slice(keep)) {
    try {
      rmSync(join(backupDir(), f.name), { force: true });
    } catch {
      /* non bloquant */
    }
  }
}

/** Lit une sauvegarde serveur par nom (null si nom invalide ou absente). */
export function readServerBackup(name: string): Buffer | null {
  const p = resolveBackup(name);
  if (!p || !existsSync(p)) return null;
  return readFileSync(p);
}

/** Supprime une sauvegarde serveur par nom. */
export function deleteServerBackup(name: string): boolean {
  const p = resolveBackup(name);
  if (!p || !existsSync(p)) return false;
  rmSync(p, { force: true });
  return true;
}

/** Restaure la base à partir d'une sauvegarde serveur. */
export async function restoreServerBackup(
  name: string
): Promise<{ ok: boolean; error?: string; safetyBackup?: string }> {
  const buf = readServerBackup(name);
  if (!buf) return { ok: false, error: "Sauvegarde introuvable." };
  return restoreFromBuffer(buf);
}

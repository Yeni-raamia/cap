/* ==================================================================
 *  lib/db/auditgrids.ts — Grilles (référentiels) d'audit technique.
 * ================================================================== */
import { randomUUID } from "node:crypto";
import { getDb } from "./index";
import { AUDIT_CATEGORIES, AUDIT_SOURCES, type AuditGrid, type AuditQuestion } from "@/lib/domain";
import { STARTER_AUDIT_GRIDS, starterQuestions } from "@/lib/data/auditGrids";

const now = () => new Date().toISOString();

interface Row {
  id: string; ref: string; name: string; category: string; source: string; description: string;
  questions: string; created_by: string | null; created_at: string; updated_at: string;
}

/** Nettoie/normalise les questions d'une grille (ids stables, poids borné). */
export function reviveQuestions(raw: unknown): AuditQuestion[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((q) => {
    const o = (q ?? {}) as Record<string, unknown>;
    const weight = Number(o.weight);
    return {
      id: typeof o.id === "string" && o.id ? o.id : randomUUID(),
      domain: String(o.domain ?? "").trim() || "Général",
      text: String(o.text ?? "").trim(),
      guidance: String(o.guidance ?? ""),
      weight: Number.isFinite(weight) && weight >= 1 && weight <= 3 ? Math.round(weight) : 1,
      critical: Boolean(o.critical),
    };
  }).filter((q) => q.text);
}

function mapRow(r: Row): AuditGrid {
  let questions: AuditQuestion[] = [];
  try { questions = reviveQuestions(JSON.parse(r.questions)); } catch { questions = []; }
  return {
    id: r.id, ref: r.ref, name: r.name, category: r.category, source: r.source, description: r.description,
    questions, createdBy: r.created_by, createdAt: new Date(r.created_at), updatedAt: new Date(r.updated_at),
  };
}

export function listAuditGrids(): AuditGrid[] {
  return (getDb().prepare("select * from audit_grids order by category, name").all() as Row[]).map(mapRow);
}
export function getAuditGrid(id: string): AuditGrid | null {
  const r = getDb().prepare("select * from audit_grids where id=?").get(id) as Row | undefined;
  return r ? mapRow(r) : null;
}
export const auditGridExists = (id: string) => Boolean(getDb().prepare("select 1 from audit_grids where id=?").get(id));
export const auditGridCount = () => (getDb().prepare("select count(*) as n from audit_grids").get() as { n: number }).n;

function nextRef(db = getDb()): string {
  const prefix = `GRID-${new Date().getFullYear()}-`;
  const rows = db.prepare("select ref from audit_grids where ref like ?").all(`${prefix}%`) as { ref: string }[];
  let max = 0;
  rows.forEach((r) => { const n = parseInt(r.ref.slice(prefix.length), 10); if (Number.isFinite(n) && n > max) max = n; });
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

interface Fields {
  name?: string; category?: string; source?: string; description?: string; questions?: AuditQuestion[];
}
export function createAuditGrid(input: Fields & { name: string; createdBy: string | null; ref?: string }): string {
  const id = randomUUID();
  const db = getDb();
  db.prepare("insert into audit_grids (id, ref, name, category, source, description, questions, created_by) values (?,?,?,?,?,?,?,?)").run(
    id, input.ref ?? nextRef(db), input.name,
    AUDIT_CATEGORIES.includes(input.category ?? "") ? input.category : "Autre",
    AUDIT_SOURCES.includes(input.source ?? "") ? input.source : "Interne",
    input.description ?? "",
    JSON.stringify(reviveQuestions(input.questions ?? [])), input.createdBy
  );
  return id;
}
export function updateAuditGrid(id: string, f: Fields): void {
  const db = getDb();
  const cur = db.prepare("select * from audit_grids where id=?").get(id) as Row | undefined;
  if (!cur) return;
  db.prepare("update audit_grids set name=?, category=?, source=?, description=?, questions=?, updated_at=? where id=?").run(
    f.name ?? cur.name,
    f.category !== undefined && AUDIT_CATEGORIES.includes(f.category) ? f.category : cur.category,
    f.source !== undefined && AUDIT_SOURCES.includes(f.source) ? f.source : cur.source,
    f.description !== undefined ? f.description : cur.description,
    f.questions !== undefined ? JSON.stringify(reviveQuestions(f.questions)) : cur.questions,
    now(), id
  );
}
export function deleteAuditGrid(id: string): void {
  getDb().prepare("delete from audit_grids where id=?").run(id);
}

/** Amorce/complète la bibliothèque de grilles de départ (top-up idempotent, une
 *  fois par process) : ajoute les grilles manquantes par nom, sans doublon ni
 *  suppression — les nouvelles grilles de la bibliothèque apparaissent au redémarrage. */
let ensured = false;
export function ensureAuditGrids(): void {
  if (ensured) return;
  ensured = true;
  try {
    const db = getDb();
    const existing = new Set((db.prepare("select name from audit_grids").all() as { name: string }[]).map((r) => r.name));
    for (const g of STARTER_AUDIT_GRIDS) {
      if (existing.has(g.name)) continue;
      createAuditGrid({ name: g.name, category: g.category, source: g.source, description: g.description, questions: starterQuestions(g), createdBy: null });
    }
  } catch {
    /* base non initialisée : sans effet */
  }
}

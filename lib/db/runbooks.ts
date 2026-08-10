/* ==================================================================
 *  lib/db/runbooks.ts — Runbooks de réponse (module SOC).
 * ================================================================== */
import { randomUUID } from "node:crypto";
import { getDb } from "./index";
import { RUNBOOK_CATEGORIES, RUNBOOK_PHASES, RUNBOOK_STATUS, type Runbook, type RunbookStep } from "@/lib/domain";
import { STARTER_RUNBOOKS, starterRunbookSteps } from "@/lib/data/runbooks";

const now = () => new Date().toISOString();
const parseArr = (s: string): string[] => { try { const v = JSON.parse(s); return Array.isArray(v) ? v.filter((x) => typeof x === "string") : []; } catch { return []; } };

interface Row {
  id: string; ref: string; title: string; category: string; severity: string; trigger: string; objective: string;
  attack_techniques: string; steps: string; escalation: string; references_: string; status: string; owner_id: string | null;
  created_by: string | null; created_at: string; updated_at: string;
}

/** Normalise les étapes d'un runbook (ids stables, phase valide). */
export function reviveSteps(raw: unknown): RunbookStep[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((s) => {
    const o = (s ?? {}) as Record<string, unknown>;
    const phase = String(o.phase ?? "");
    return {
      id: typeof o.id === "string" && o.id ? o.id : randomUUID(),
      phase: RUNBOOK_PHASES.includes(phase) ? phase : RUNBOOK_PHASES[0],
      title: String(o.title ?? "").trim(),
      detail: String(o.detail ?? ""),
      decision: Boolean(o.decision),
    };
  }).filter((s) => s.title || s.detail);
}

function mapRow(r: Row): Runbook {
  let steps: RunbookStep[] = [];
  try { steps = reviveSteps(JSON.parse(r.steps)); } catch { steps = []; }
  return {
    id: r.id, ref: r.ref, title: r.title, category: r.category, severity: r.severity, trigger: r.trigger, objective: r.objective,
    attackTechniques: parseArr(r.attack_techniques), steps, escalation: r.escalation, references: r.references_,
    status: r.status, ownerId: r.owner_id ?? "",
    createdBy: r.created_by, createdAt: new Date(r.created_at), updatedAt: new Date(r.updated_at),
  };
}

export function listRunbooks(): Runbook[] {
  return (getDb().prepare("select * from runbooks order by category, title").all() as Row[]).map(mapRow);
}
export function getRunbook(id: string): Runbook | null {
  const r = getDb().prepare("select * from runbooks where id=?").get(id) as Row | undefined;
  return r ? mapRow(r) : null;
}
export const runbookExists = (id: string) => Boolean(getDb().prepare("select 1 from runbooks where id=?").get(id));

function nextRef(db = getDb()): string {
  const prefix = `RB-${new Date().getFullYear()}-`;
  const rows = db.prepare("select ref from runbooks where ref like ?").all(`${prefix}%`) as { ref: string }[];
  let max = 0;
  rows.forEach((r) => { const n = parseInt(r.ref.slice(prefix.length), 10); if (Number.isFinite(n) && n > max) max = n; });
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

interface Fields {
  title?: string; category?: string; severity?: string; trigger?: string; objective?: string;
  attackTechniques?: string[]; steps?: RunbookStep[]; escalation?: string; references?: string; status?: string; ownerId?: string;
}
const vCat = (c?: string) => (RUNBOOK_CATEGORIES.includes(c ?? "") ? c! : "Autre");
const vStatus = (s?: string) => (RUNBOOK_STATUS.includes(s ?? "") ? s! : "Brouillon");

export function createRunbook(input: Fields & { title: string; createdBy: string | null; ref?: string }): string {
  const id = randomUUID();
  const db = getDb();
  db.prepare("insert into runbooks (id, ref, title, category, severity, trigger, objective, attack_techniques, steps, escalation, references_, status, owner_id, created_by) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?)").run(
    id, input.ref ?? nextRef(db), input.title, vCat(input.category), input.severity || "Majeur",
    input.trigger ?? "", input.objective ?? "",
    JSON.stringify(input.attackTechniques ?? []), JSON.stringify(reviveSteps(input.steps ?? [])),
    input.escalation ?? "", input.references ?? "", vStatus(input.status), input.ownerId || input.createdBy, input.createdBy
  );
  return id;
}
export function updateRunbook(id: string, f: Fields): void {
  const db = getDb();
  const cur = db.prepare("select * from runbooks where id=?").get(id) as Row | undefined;
  if (!cur) return;
  db.prepare("update runbooks set title=?, category=?, severity=?, trigger=?, objective=?, attack_techniques=?, steps=?, escalation=?, references_=?, status=?, owner_id=?, updated_at=? where id=?").run(
    f.title ?? cur.title,
    f.category !== undefined ? vCat(f.category) : cur.category,
    f.severity !== undefined ? f.severity : cur.severity,
    f.trigger !== undefined ? f.trigger : cur.trigger,
    f.objective !== undefined ? f.objective : cur.objective,
    f.attackTechniques !== undefined ? JSON.stringify(f.attackTechniques) : cur.attack_techniques,
    f.steps !== undefined ? JSON.stringify(reviveSteps(f.steps)) : cur.steps,
    f.escalation !== undefined ? f.escalation : cur.escalation,
    f.references !== undefined ? f.references : cur.references_,
    f.status !== undefined ? vStatus(f.status) : cur.status,
    f.ownerId !== undefined ? (f.ownerId || null) : cur.owner_id,
    now(), id
  );
}
export function deleteRunbook(id: string): void {
  getDb().prepare("delete from runbooks where id=?").run(id);
}

/** Amorce/complète la bibliothèque de runbooks de départ (top-up idempotent par titre). */
let ensured = false;
export function ensureRunbooks(): void {
  if (ensured) return;
  ensured = true;
  try {
    const db = getDb();
    const existing = new Set((db.prepare("select title from runbooks").all() as { title: string }[]).map((r) => r.title));
    for (const g of STARTER_RUNBOOKS) {
      if (existing.has(g.title)) continue;
      createRunbook({
        title: g.title, category: g.category, severity: g.severity, trigger: g.trigger, objective: g.objective,
        attackTechniques: g.attackTechniques, steps: starterRunbookSteps(g), escalation: g.escalation, references: g.references,
        status: "Validé", createdBy: null,
      });
    }
  } catch {
    /* base non initialisée : sans effet */
  }
}

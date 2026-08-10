/* ==================================================================
 *  lib/db/socprocedures.ts — Procédures & checklists de routine (SOC).
 * ================================================================== */
import { randomUUID } from "node:crypto";
import { getDb } from "./index";
import { RUNBOOK_STATUS, SOC_PROCEDURE_FREQ, SOC_PROCEDURE_TYPES, type SocChecklistItem, type SocProcedure } from "@/lib/domain";
import { STARTER_PROCEDURES, starterProcedureItems } from "@/lib/data/socProcedures";

const now = () => new Date().toISOString();

interface Row {
  id: string; ref: string; title: string; type: string; frequency: string; objective: string; content: string;
  items: string; references_: string; status: string; owner_id: string | null;
  created_by: string | null; created_at: string; updated_at: string;
}

export function reviveItems(raw: unknown): SocChecklistItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((it) => {
    const o = (it ?? {}) as Record<string, unknown>;
    return {
      id: typeof o.id === "string" && o.id ? o.id : randomUUID(),
      label: String(o.label ?? "").trim(),
      guidance: String(o.guidance ?? ""),
    };
  }).filter((it) => it.label);
}

function mapRow(r: Row): SocProcedure {
  let items: SocChecklistItem[] = [];
  try { items = reviveItems(JSON.parse(r.items)); } catch { items = []; }
  return {
    id: r.id, ref: r.ref, title: r.title, type: r.type, frequency: r.frequency, objective: r.objective, content: r.content,
    items, references: r.references_, status: r.status, ownerId: r.owner_id ?? "",
    createdBy: r.created_by, createdAt: new Date(r.created_at), updatedAt: new Date(r.updated_at),
  };
}

export function listSocProcedures(): SocProcedure[] {
  return (getDb().prepare("select * from soc_procedures order by type, title").all() as Row[]).map(mapRow);
}
export function getSocProcedure(id: string): SocProcedure | null {
  const r = getDb().prepare("select * from soc_procedures where id=?").get(id) as Row | undefined;
  return r ? mapRow(r) : null;
}
export const socProcedureExists = (id: string) => Boolean(getDb().prepare("select 1 from soc_procedures where id=?").get(id));

function nextRef(db = getDb()): string {
  const prefix = `PROC-${new Date().getFullYear()}-`;
  const rows = db.prepare("select ref from soc_procedures where ref like ?").all(`${prefix}%`) as { ref: string }[];
  let max = 0;
  rows.forEach((r) => { const n = parseInt(r.ref.slice(prefix.length), 10); if (Number.isFinite(n) && n > max) max = n; });
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

interface Fields {
  title?: string; type?: string; frequency?: string; objective?: string; content?: string;
  items?: SocChecklistItem[]; references?: string; status?: string; ownerId?: string;
}
const vType = (t?: string) => (SOC_PROCEDURE_TYPES.includes(t ?? "") ? t! : "Autre");
const vFreq = (f?: string) => (SOC_PROCEDURE_FREQ.includes(f ?? "") ? f! : "Ponctuel");
const vStatus = (s?: string) => (RUNBOOK_STATUS.includes(s ?? "") ? s! : "Brouillon");

export function createSocProcedure(input: Fields & { title: string; createdBy: string | null }): string {
  const id = randomUUID();
  const db = getDb();
  db.prepare("insert into soc_procedures (id, ref, title, type, frequency, objective, content, items, references_, status, owner_id, created_by) values (?,?,?,?,?,?,?,?,?,?,?,?)").run(
    id, nextRef(db), input.title, vType(input.type), vFreq(input.frequency),
    input.objective ?? "", input.content ?? "", JSON.stringify(reviveItems(input.items ?? [])),
    input.references ?? "", vStatus(input.status), input.ownerId || input.createdBy, input.createdBy
  );
  return id;
}
export function updateSocProcedure(id: string, f: Fields): void {
  const db = getDb();
  const cur = db.prepare("select * from soc_procedures where id=?").get(id) as Row | undefined;
  if (!cur) return;
  db.prepare("update soc_procedures set title=?, type=?, frequency=?, objective=?, content=?, items=?, references_=?, status=?, owner_id=?, updated_at=? where id=?").run(
    f.title ?? cur.title,
    f.type !== undefined ? vType(f.type) : cur.type,
    f.frequency !== undefined ? vFreq(f.frequency) : cur.frequency,
    f.objective !== undefined ? f.objective : cur.objective,
    f.content !== undefined ? f.content : cur.content,
    f.items !== undefined ? JSON.stringify(reviveItems(f.items)) : cur.items,
    f.references !== undefined ? f.references : cur.references_,
    f.status !== undefined ? vStatus(f.status) : cur.status,
    f.ownerId !== undefined ? (f.ownerId || null) : cur.owner_id,
    now(), id
  );
}
export function deleteSocProcedure(id: string): void {
  getDb().prepare("delete from soc_procedures where id=?").run(id);
}

/** Amorce/complète la bibliothèque de procédures de départ (top-up idempotent par titre). */
let ensured = false;
export function ensureSocProcedures(): void {
  if (ensured) return;
  ensured = true;
  try {
    const db = getDb();
    const existing = new Set((db.prepare("select title from soc_procedures").all() as { title: string }[]).map((r) => r.title));
    for (const p of STARTER_PROCEDURES) {
      if (existing.has(p.title)) continue;
      createSocProcedure({
        title: p.title, type: p.type, frequency: p.frequency, objective: p.objective, content: p.content,
        items: starterProcedureItems(p), references: p.references, status: "Validé", createdBy: null,
      });
    }
  } catch {
    /* base non initialisée : sans effet */
  }
}

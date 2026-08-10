/* ==================================================================
 *  lib/db/intel.ts — Veille & threat intelligence (IOCs, module SOC).
 * ================================================================== */
import { randomUUID } from "node:crypto";
import { getDb } from "./index";
import { INTEL_KINDS, INTEL_STATUS, IOC_TYPES, TLP_LEVELS, type IntelItem } from "@/lib/domain";

const now = () => new Date().toISOString();
const parseArr = (s: string): string[] => { try { const v = JSON.parse(s); return Array.isArray(v) ? v.filter((x) => typeof x === "string") : []; } catch { return []; } };

interface Row {
  id: string; ref: string; kind: string; title: string; ioc_type: string; value: string; tlp: string; severity: string;
  source: string; status: string; description: string; action: string; attack_techniques: string; expires_at: string | null;
  owner_id: string | null; created_by: string | null; created_at: string; updated_at: string;
}

function mapRow(r: Row): IntelItem {
  return {
    id: r.id, ref: r.ref, kind: r.kind, title: r.title, iocType: r.ioc_type, value: r.value, tlp: r.tlp, severity: r.severity,
    source: r.source, status: r.status, description: r.description, action: r.action, attackTechniques: parseArr(r.attack_techniques),
    expiresAt: r.expires_at ? new Date(r.expires_at) : null, ownerId: r.owner_id ?? "",
    createdBy: r.created_by, createdAt: new Date(r.created_at), updatedAt: new Date(r.updated_at),
  };
}

export function listIntel(): IntelItem[] {
  return (getDb().prepare("select * from intel_items order by coalesce(updated_at, created_at) desc").all() as Row[]).map(mapRow);
}
export function getIntel(id: string): IntelItem | null {
  const r = getDb().prepare("select * from intel_items where id=?").get(id) as Row | undefined;
  return r ? mapRow(r) : null;
}
export const intelExists = (id: string) => Boolean(getDb().prepare("select 1 from intel_items where id=?").get(id));

function nextRef(db = getDb()): string {
  const prefix = `INT-${new Date().getFullYear()}-`;
  const rows = db.prepare("select ref from intel_items where ref like ?").all(`${prefix}%`) as { ref: string }[];
  let max = 0;
  rows.forEach((r) => { const n = parseInt(r.ref.slice(prefix.length), 10); if (Number.isFinite(n) && n > max) max = n; });
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

interface Fields {
  kind?: string; title?: string; iocType?: string; value?: string; tlp?: string; severity?: string; source?: string;
  status?: string; description?: string; action?: string; attackTechniques?: string[]; expiresAt?: string | null; ownerId?: string;
}
const vKind = (k?: string) => (INTEL_KINDS.includes(k ?? "") ? k! : "IOC");
const vIoc = (t?: string) => (IOC_TYPES.includes(t ?? "") ? t! : "Autre");
const vTlp = (t?: string) => (TLP_LEVELS.includes(t ?? "") ? t! : "TLP:AMBER");
const vStatus = (s?: string) => (INTEL_STATUS.includes(s ?? "") ? s! : "Actif");

export function createIntel(input: Fields & { title: string; createdBy: string | null }): string {
  const id = randomUUID();
  const db = getDb();
  db.prepare("insert into intel_items (id, ref, kind, title, ioc_type, value, tlp, severity, source, status, description, action, attack_techniques, expires_at, owner_id, created_by) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").run(
    id, nextRef(db), vKind(input.kind), input.title, vIoc(input.iocType), input.value ?? "", vTlp(input.tlp),
    input.severity || "Modéré", input.source ?? "", vStatus(input.status), input.description ?? "", input.action ?? "",
    JSON.stringify(input.attackTechniques ?? []), input.expiresAt ?? null, input.ownerId || input.createdBy, input.createdBy
  );
  return id;
}
export function updateIntel(id: string, f: Fields): void {
  const db = getDb();
  const cur = db.prepare("select * from intel_items where id=?").get(id) as Row | undefined;
  if (!cur) return;
  db.prepare("update intel_items set kind=?, title=?, ioc_type=?, value=?, tlp=?, severity=?, source=?, status=?, description=?, action=?, attack_techniques=?, expires_at=?, owner_id=?, updated_at=? where id=?").run(
    f.kind !== undefined ? vKind(f.kind) : cur.kind,
    f.title ?? cur.title,
    f.iocType !== undefined ? vIoc(f.iocType) : cur.ioc_type,
    f.value !== undefined ? f.value : cur.value,
    f.tlp !== undefined ? vTlp(f.tlp) : cur.tlp,
    f.severity !== undefined ? f.severity : cur.severity,
    f.source !== undefined ? f.source : cur.source,
    f.status !== undefined ? vStatus(f.status) : cur.status,
    f.description !== undefined ? f.description : cur.description,
    f.action !== undefined ? f.action : cur.action,
    f.attackTechniques !== undefined ? JSON.stringify(f.attackTechniques) : cur.attack_techniques,
    f.expiresAt !== undefined ? f.expiresAt : cur.expires_at,
    f.ownerId !== undefined ? (f.ownerId || null) : cur.owner_id,
    now(), id
  );
}
export function deleteIntel(id: string): void {
  getDb().prepare("delete from intel_items where id=?").run(id);
}

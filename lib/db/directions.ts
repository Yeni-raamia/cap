/* ==================================================================
 *  lib/db/directions.ts — Organigramme GRC : Directions → Services.
 * ================================================================== */
import { randomUUID } from "node:crypto";
import { getDb } from "./index";
import type { Direction, OrgService } from "@/lib/domain";

const now = () => new Date().toISOString();

interface DirRow {
  id: string;
  ref: string;
  name: string;
  code: string;
  head_id: string | null;
  description: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
interface SvcRow {
  id: string;
  direction_id: string;
  name: string;
  head_id: string | null;
  ordre: number;
}

const mapSvc = (r: SvcRow): OrgService => ({ id: r.id, name: r.name, headId: r.head_id ?? "" });

function mapDir(r: DirRow, services: OrgService[]): Direction {
  return {
    id: r.id,
    ref: r.ref,
    name: r.name,
    code: r.code,
    headId: r.head_id ?? "",
    description: r.description,
    services,
    createdBy: r.created_by,
    createdAt: new Date(r.created_at),
    updatedAt: new Date(r.updated_at),
  };
}

export function listDirections(): Direction[] {
  const db = getDb();
  const rows = db.prepare("select * from directions order by name").all() as DirRow[];
  const svcs = db.prepare("select * from org_services order by ordre, rowid").all() as SvcRow[];
  const byDir = new Map<string, OrgService[]>();
  svcs.forEach((s) => byDir.set(s.direction_id, [...(byDir.get(s.direction_id) ?? []), mapSvc(s)]));
  return rows.map((r) => mapDir(r, byDir.get(r.id) ?? []));
}

export function getDirection(id: string): Direction | null {
  const db = getDb();
  const r = db.prepare("select * from directions where id=?").get(id) as DirRow | undefined;
  if (!r) return null;
  const svcs = (db.prepare("select * from org_services where direction_id=? order by ordre, rowid").all(id) as SvcRow[]).map(mapSvc);
  return mapDir(r, svcs);
}

export function directionExists(id: string): boolean {
  return Boolean(getDb().prepare("select 1 from directions where id=?").get(id));
}

function nextRef(db = getDb()): string {
  const year = new Date().getFullYear();
  const prefix = `DIR-${year}-`;
  const rows = db.prepare("select ref from directions where ref like ?").all(`${prefix}%`) as { ref: string }[];
  let max = 0;
  rows.forEach((r) => {
    const n = parseInt(r.ref.slice(prefix.length), 10);
    if (Number.isFinite(n) && n > max) max = n;
  });
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

interface SvcInput { name: string; headId?: string }
function setServices(directionId: string, services: SvcInput[]): void {
  const db = getDb();
  db.prepare("delete from org_services where direction_id=?").run(directionId);
  const ins = db.prepare("insert into org_services (id, direction_id, name, head_id, ordre) values (?,?,?,?,?)");
  services.filter((s) => s.name?.trim()).forEach((s, i) => ins.run(randomUUID(), directionId, s.name.trim(), s.headId || null, i));
}

interface DirFields {
  name?: string;
  code?: string;
  headId?: string | null;
  description?: string;
  services?: SvcInput[];
}

export function createDirection(input: DirFields & { name: string; createdBy: string }): string {
  const id = randomUUID();
  const db = getDb();
  db.prepare("insert into directions (id, ref, name, code, head_id, description, created_by) values (?,?,?,?,?,?,?)").run(
    id,
    nextRef(db),
    input.name,
    input.code ?? "",
    input.headId || null,
    input.description ?? "",
    input.createdBy
  );
  setServices(id, input.services ?? []);
  return id;
}

export function updateDirection(id: string, fields: DirFields): void {
  const db = getDb();
  const cur = db.prepare("select * from directions where id=?").get(id) as DirRow | undefined;
  if (!cur) return;
  db.prepare("update directions set name=?, code=?, head_id=?, description=?, updated_at=? where id=?").run(
    fields.name ?? cur.name,
    fields.code !== undefined ? fields.code : cur.code,
    fields.headId !== undefined ? (fields.headId || null) : cur.head_id,
    fields.description !== undefined ? fields.description : cur.description,
    now(),
    id
  );
  if (fields.services) setServices(id, fields.services);
}

export function deleteDirection(id: string): void {
  const db = getDb();
  db.prepare("delete from org_services where direction_id=?").run(id);
  db.prepare("delete from directions where id=?").run(id);
}

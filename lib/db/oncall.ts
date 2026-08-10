/* ==================================================================
 *  lib/db/oncall.ts — Astreinte / planning de garde (module SOC).
 * ================================================================== */
import { randomUUID } from "node:crypto";
import { getDb } from "./index";
import { SHIFT_ROLES, type OnCallShift } from "@/lib/domain";

const now = () => new Date().toISOString();

interface Row {
  id: string; person_id: string | null; role: string; start_at: string; end_at: string; contact: string; notes: string;
  created_by: string | null; created_at: string; updated_at: string;
}

function mapRow(r: Row): OnCallShift {
  return {
    id: r.id, personId: r.person_id ?? "", role: r.role, start: new Date(r.start_at), end: new Date(r.end_at),
    contact: r.contact, notes: r.notes, createdBy: r.created_by, createdAt: new Date(r.created_at), updatedAt: new Date(r.updated_at),
  };
}

export function listOnCall(): OnCallShift[] {
  return (getDb().prepare("select * from oncall_shifts order by start_at desc").all() as Row[]).map(mapRow);
}
export function getOnCall(id: string): OnCallShift | null {
  const r = getDb().prepare("select * from oncall_shifts where id=?").get(id) as Row | undefined;
  return r ? mapRow(r) : null;
}
export const onCallExists = (id: string) => Boolean(getDb().prepare("select 1 from oncall_shifts where id=?").get(id));

const vRole = (r?: string) => (SHIFT_ROLES.includes(r ?? "") ? r! : "Astreinte principale");

interface Fields { personId?: string; role?: string; start?: string; end?: string; contact?: string; notes?: string }
export function createOnCall(input: Fields & { start: string; end: string; createdBy: string | null }): string {
  const id = randomUUID();
  getDb().prepare("insert into oncall_shifts (id, person_id, role, start_at, end_at, contact, notes, created_by) values (?,?,?,?,?,?,?,?)").run(
    id, input.personId || null, vRole(input.role), input.start, input.end, input.contact ?? "", input.notes ?? "", input.createdBy
  );
  return id;
}
export function updateOnCall(id: string, f: Fields): void {
  const db = getDb();
  const cur = db.prepare("select * from oncall_shifts where id=?").get(id) as Row | undefined;
  if (!cur) return;
  db.prepare("update oncall_shifts set person_id=?, role=?, start_at=?, end_at=?, contact=?, notes=?, updated_at=? where id=?").run(
    f.personId !== undefined ? (f.personId || null) : cur.person_id,
    f.role !== undefined ? vRole(f.role) : cur.role,
    f.start !== undefined ? f.start : cur.start_at,
    f.end !== undefined ? f.end : cur.end_at,
    f.contact !== undefined ? f.contact : cur.contact,
    f.notes !== undefined ? f.notes : cur.notes,
    now(), id
  );
}
export function deleteOnCall(id: string): void {
  getDb().prepare("delete from oncall_shifts where id=?").run(id);
}

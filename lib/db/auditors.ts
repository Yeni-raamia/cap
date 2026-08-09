/* ==================================================================
 *  lib/db/auditors.ts — Registre des auditeurs (ISO 19011 §7).
 * ================================================================== */
import { randomUUID } from "node:crypto";
import { getDb } from "./index";
import { AUDITOR_ROLES, AUDITOR_STATUS, type Auditor } from "@/lib/domain";

const now = () => new Date().toISOString();
const parseArr = (s: string): string[] => { try { const v = JSON.parse(s); return Array.isArray(v) ? v.filter((x) => typeof x === "string") : []; } catch { return []; } };

interface Row {
  id: string; ref: string; profile_id: string; name: string; role: string; competencies: string;
  certifications: string; independence: string; status: string; notes: string;
  created_by: string | null; created_at: string; updated_at: string;
}

function mapRow(r: Row): Auditor {
  return {
    id: r.id, ref: r.ref, profileId: r.profile_id, name: r.name, role: r.role, competencies: parseArr(r.competencies),
    certifications: r.certifications, independence: r.independence, status: r.status, notes: r.notes,
    createdBy: r.created_by, createdAt: new Date(r.created_at), updatedAt: new Date(r.updated_at),
  };
}

export function listAuditors(): Auditor[] {
  return (getDb().prepare("select * from auditors order by case status when 'Actif' then 0 else 1 end, name").all() as Row[]).map(mapRow);
}
export function getAuditor(id: string): Auditor | null {
  const r = getDb().prepare("select * from auditors where id=?").get(id) as Row | undefined;
  return r ? mapRow(r) : null;
}
export const auditorExists = (id: string) => Boolean(getDb().prepare("select 1 from auditors where id=?").get(id));

function nextRef(db = getDb()): string {
  const prefix = `AUDR-${new Date().getFullYear()}-`;
  const rows = db.prepare("select ref from auditors where ref like ?").all(`${prefix}%`) as { ref: string }[];
  let max = 0;
  rows.forEach((r) => { const n = parseInt(r.ref.slice(prefix.length), 10); if (Number.isFinite(n) && n > max) max = n; });
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

interface Fields {
  profileId?: string; name?: string; role?: string; competencies?: string[];
  certifications?: string; independence?: string; status?: string; notes?: string;
}
const vRole = (r?: string) => (AUDITOR_ROLES.includes(r ?? "") ? r! : "Auditeur");
const vStatus = (s?: string) => (AUDITOR_STATUS.includes(s ?? "") ? s! : "Actif");

export function createAuditor(input: Fields & { name: string; createdBy: string | null }): string {
  const id = randomUUID();
  const db = getDb();
  db.prepare("insert into auditors (id, ref, profile_id, name, role, competencies, certifications, independence, status, notes, created_by) values (?,?,?,?,?,?,?,?,?,?,?)").run(
    id, nextRef(db), input.profileId ?? "", input.name, vRole(input.role),
    JSON.stringify(input.competencies ?? []), input.certifications ?? "", input.independence ?? "",
    vStatus(input.status), input.notes ?? "", input.createdBy
  );
  return id;
}
export function updateAuditor(id: string, f: Fields): void {
  const db = getDb();
  const cur = db.prepare("select * from auditors where id=?").get(id) as Row | undefined;
  if (!cur) return;
  db.prepare("update auditors set profile_id=?, name=?, role=?, competencies=?, certifications=?, independence=?, status=?, notes=?, updated_at=? where id=?").run(
    f.profileId !== undefined ? f.profileId : cur.profile_id,
    f.name ?? cur.name,
    f.role !== undefined ? vRole(f.role) : cur.role,
    f.competencies !== undefined ? JSON.stringify(f.competencies) : cur.competencies,
    f.certifications !== undefined ? f.certifications : cur.certifications,
    f.independence !== undefined ? f.independence : cur.independence,
    f.status !== undefined ? vStatus(f.status) : cur.status,
    f.notes !== undefined ? f.notes : cur.notes,
    now(), id
  );
}
export function deleteAuditor(id: string): void {
  getDb().prepare("delete from auditors where id=?").run(id);
}

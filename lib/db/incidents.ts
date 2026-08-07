/* ==================================================================
 *  lib/db/incidents.ts — Gestion des incidents (cycle ISO 27035, GRC).
 * ================================================================== */
import { randomUUID } from "node:crypto";
import { getDb } from "./index";
import { INCIDENT_SEVERITIES, INCIDENT_STATUS, INCIDENT_TYPES, type Incident } from "@/lib/domain";

const now = () => new Date().toISOString();
const parseArr = (s: string): string[] => { try { const v = JSON.parse(s); return Array.isArray(v) ? v.filter((x) => typeof x === "string") : []; } catch { return []; } };

interface Row {
  id: string; ref: string; title: string; type: string; severity: string; status: string;
  data_breach: number; detected_at: string | null; declared_by: string | null; owner_id: string | null; mission_id: string;
  asset_ids: string; description: string; impact: string; actions_taken: string;
  resolved_at: string | null; root_cause: string; lessons: string;
  created_by: string | null; created_at: string; updated_at: string;
}
function mapRow(r: Row): Incident {
  return {
    id: r.id, ref: r.ref, title: r.title, type: r.type, severity: r.severity, status: r.status,
    dataBreach: r.data_breach === 1, detectedAt: r.detected_at ? new Date(r.detected_at) : null,
    declaredBy: r.declared_by ?? "", ownerId: r.owner_id ?? "", missionId: r.mission_id, assetIds: parseArr(r.asset_ids),
    description: r.description, impact: r.impact, actionsTaken: r.actions_taken,
    resolvedAt: r.resolved_at ? new Date(r.resolved_at) : null, rootCause: r.root_cause, lessons: r.lessons,
    createdBy: r.created_by, createdAt: new Date(r.created_at), updatedAt: new Date(r.updated_at),
  };
}

export function listIncidents(): Incident[] {
  return (getDb().prepare("select * from incidents order by coalesce(detected_at, created_at) desc").all() as Row[]).map(mapRow);
}
export function getIncident(id: string): Incident | null {
  const r = getDb().prepare("select * from incidents where id=?").get(id) as Row | undefined;
  return r ? mapRow(r) : null;
}
export const incidentExists = (id: string) => Boolean(getDb().prepare("select 1 from incidents where id=?").get(id));

function nextRef(db = getDb()): string {
  const prefix = `INC-${new Date().getFullYear()}-`;
  const rows = db.prepare("select ref from incidents where ref like ?").all(`${prefix}%`) as { ref: string }[];
  let max = 0;
  rows.forEach((r) => { const n = parseInt(r.ref.slice(prefix.length), 10); if (Number.isFinite(n) && n > max) max = n; });
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

interface Fields {
  title?: string; type?: string; severity?: string; status?: string; dataBreach?: boolean;
  detectedAt?: string | null; declaredBy?: string; ownerId?: string; missionId?: string; assetIds?: string[];
  description?: string; impact?: string; actionsTaken?: string; resolvedAt?: string | null; rootCause?: string; lessons?: string;
}

export function createIncident(input: Fields & { title: string; createdBy: string }): string {
  const id = randomUUID();
  const db = getDb();
  db.prepare("insert into incidents (id, ref, title, type, severity, status, data_breach, detected_at, declared_by, owner_id, mission_id, asset_ids, description, impact, actions_taken, resolved_at, root_cause, lessons, created_by) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").run(
    id, nextRef(db), input.title,
    INCIDENT_TYPES.includes(input.type ?? "") ? input.type : "Autre",
    INCIDENT_SEVERITIES.includes(input.severity ?? "") ? input.severity : "Mineur",
    INCIDENT_STATUS.includes(input.status ?? "") ? input.status : "Déclaré",
    input.dataBreach ? 1 : 0, input.detectedAt ?? null, input.declaredBy || input.createdBy, input.ownerId || input.createdBy,
    input.missionId ?? "", JSON.stringify(input.assetIds ?? []),
    input.description ?? "", input.impact ?? "", input.actionsTaken ?? "",
    input.resolvedAt ?? null, input.rootCause ?? "", input.lessons ?? "", input.createdBy
  );
  return id;
}

export function updateIncident(id: string, f: Fields): void {
  const db = getDb();
  const cur = db.prepare("select * from incidents where id=?").get(id) as Row | undefined;
  if (!cur) return;
  const nextStatus = f.status !== undefined && INCIDENT_STATUS.includes(f.status) ? f.status : cur.status;
  // Renseigne la date de résolution au passage en Résolu/Clôturé si absente.
  let resolvedAt = f.resolvedAt !== undefined ? f.resolvedAt : cur.resolved_at;
  if ((nextStatus === "Résolu" || nextStatus === "Clôturé") && !resolvedAt) resolvedAt = now();
  db.prepare("update incidents set title=?, type=?, severity=?, status=?, data_breach=?, detected_at=?, declared_by=?, owner_id=?, mission_id=?, asset_ids=?, description=?, impact=?, actions_taken=?, resolved_at=?, root_cause=?, lessons=?, updated_at=? where id=?").run(
    f.title ?? cur.title,
    f.type !== undefined && INCIDENT_TYPES.includes(f.type) ? f.type : cur.type,
    f.severity !== undefined && INCIDENT_SEVERITIES.includes(f.severity) ? f.severity : cur.severity,
    nextStatus,
    f.dataBreach !== undefined ? (f.dataBreach ? 1 : 0) : cur.data_breach,
    f.detectedAt !== undefined ? f.detectedAt : cur.detected_at,
    f.declaredBy !== undefined ? f.declaredBy : cur.declared_by,
    f.ownerId !== undefined ? f.ownerId : cur.owner_id,
    f.missionId !== undefined ? f.missionId : cur.mission_id,
    f.assetIds !== undefined ? JSON.stringify(f.assetIds) : cur.asset_ids,
    f.description !== undefined ? f.description : cur.description,
    f.impact !== undefined ? f.impact : cur.impact,
    f.actionsTaken !== undefined ? f.actionsTaken : cur.actions_taken,
    resolvedAt, f.rootCause !== undefined ? f.rootCause : cur.root_cause, f.lessons !== undefined ? f.lessons : cur.lessons,
    now(), id
  );
}
export function deleteIncident(id: string): void {
  getDb().prepare("delete from incidents where id=?").run(id);
}

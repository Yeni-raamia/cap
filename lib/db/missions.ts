/* ==================================================================
 *  lib/db/missions.ts — Missions & dépendances de l'organisation (GRC).
 *  Actifs/personnes/dépendances stockés en JSON (chargement global).
 * ================================================================== */
import { randomUUID } from "node:crypto";
import { getDb } from "./index";
import { DEP_KINDS, MISSION_STATUS, MISSION_TYPES, MISSION_VALUES, type DepDirection, type Mission, type MissionDependency } from "@/lib/domain";

const now = () => new Date().toISOString();

interface Row {
  id: string; ref: string; name: string; type: string; value: string; description: string;
  owner_id: string | null; status: string; asset_ids: string; people_ids: string; deps: string;
  created_by: string | null; created_at: string; updated_at: string;
}

const parseArr = (s: string): string[] => { try { const v = JSON.parse(s); return Array.isArray(v) ? v.filter((x) => typeof x === "string") : []; } catch { return []; } };
function parseDeps(s: string): MissionDependency[] {
  try {
    const v = JSON.parse(s);
    if (!Array.isArray(v)) return [];
    return v.map((d) => ({
      id: String(d?.id || randomUUID()),
      direction: (d?.direction === "aval" ? "aval" : "amont") as DepDirection,
      kind: DEP_KINDS.includes(d?.kind) ? d.kind : DEP_KINDS[0],
      name: String(d?.name || ""),
      description: String(d?.description || ""),
      criticality: MISSION_VALUES.includes(d?.criticality) ? d.criticality : "Importante",
    })).filter((d) => d.name.trim());
  } catch { return []; }
}

function mapRow(r: Row): Mission {
  return {
    id: r.id, ref: r.ref, name: r.name, type: r.type, value: r.value, description: r.description,
    ownerId: r.owner_id ?? "", status: r.status,
    assetIds: parseArr(r.asset_ids), peopleIds: parseArr(r.people_ids), dependencies: parseDeps(r.deps),
    createdBy: r.created_by, createdAt: new Date(r.created_at), updatedAt: new Date(r.updated_at),
  };
}

export function listMissions(): Mission[] {
  return (getDb().prepare("select * from missions order by case value when 'Vitale' then 0 when 'Essentielle' then 1 when 'Importante' then 2 else 3 end, name").all() as Row[]).map(mapRow);
}
export function getMission(id: string): Mission | null {
  const r = getDb().prepare("select * from missions where id=?").get(id) as Row | undefined;
  return r ? mapRow(r) : null;
}
export const missionExists = (id: string) => Boolean(getDb().prepare("select 1 from missions where id=?").get(id));

function nextRef(db = getDb()): string {
  const prefix = `MIS-${new Date().getFullYear()}-`;
  const rows = db.prepare("select ref from missions where ref like ?").all(`${prefix}%`) as { ref: string }[];
  let max = 0;
  rows.forEach((r) => { const n = parseInt(r.ref.slice(prefix.length), 10); if (Number.isFinite(n) && n > max) max = n; });
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

interface Fields {
  name?: string; type?: string; value?: string; description?: string; ownerId?: string | null; status?: string;
  assetIds?: string[]; peopleIds?: string[]; dependencies?: Partial<MissionDependency>[];
}
const serializeDeps = (deps?: Partial<MissionDependency>[]) =>
  JSON.stringify((deps ?? []).filter((d) => (d?.name ?? "").trim()).map((d) => ({
    id: d.id || randomUUID(),
    direction: d.direction === "aval" ? "aval" : "amont",
    kind: DEP_KINDS.includes(d.kind ?? "") ? d.kind : DEP_KINDS[0],
    name: d.name, description: d.description ?? "",
    criticality: MISSION_VALUES.includes(d.criticality ?? "") ? d.criticality : "Importante",
  })));

export function createMission(input: Fields & { name: string; createdBy: string }): string {
  const id = randomUUID();
  const db = getDb();
  db.prepare("insert into missions (id, ref, name, type, value, description, owner_id, status, asset_ids, people_ids, deps, created_by) values (?,?,?,?,?,?,?,?,?,?,?,?)").run(
    id, nextRef(db), input.name,
    MISSION_TYPES.includes(input.type ?? "") ? input.type : "Métier",
    MISSION_VALUES.includes(input.value ?? "") ? input.value : "Importante",
    input.description ?? "", input.ownerId || input.createdBy,
    MISSION_STATUS.includes(input.status ?? "") ? input.status : "Active",
    JSON.stringify(input.assetIds ?? []), JSON.stringify(input.peopleIds ?? []), serializeDeps(input.dependencies),
    input.createdBy
  );
  return id;
}

export function updateMission(id: string, f: Fields): void {
  const db = getDb();
  const cur = db.prepare("select * from missions where id=?").get(id) as Row | undefined;
  if (!cur) return;
  db.prepare("update missions set name=?, type=?, value=?, description=?, owner_id=?, status=?, asset_ids=?, people_ids=?, deps=?, updated_at=? where id=?").run(
    f.name ?? cur.name,
    f.type !== undefined && MISSION_TYPES.includes(f.type) ? f.type : cur.type,
    f.value !== undefined && MISSION_VALUES.includes(f.value) ? f.value : cur.value,
    f.description !== undefined ? f.description : cur.description,
    f.ownerId !== undefined ? (f.ownerId || null) : cur.owner_id,
    f.status !== undefined && MISSION_STATUS.includes(f.status) ? f.status : cur.status,
    f.assetIds !== undefined ? JSON.stringify(f.assetIds) : cur.asset_ids,
    f.peopleIds !== undefined ? JSON.stringify(f.peopleIds) : cur.people_ids,
    f.dependencies !== undefined ? serializeDeps(f.dependencies) : cur.deps,
    now(), id
  );
}
export function deleteMission(id: string): void {
  getDb().prepare("delete from missions where id=?").run(id);
}

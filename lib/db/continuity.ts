/* ==================================================================
 *  lib/db/continuity.ts — Continuité d'activité : BIA + PCA/PRA (GRC).
 * ================================================================== */
import { randomUUID } from "node:crypto";
import { getDb } from "./index";
import { CONTINUITY_STATUS, IMPACT_DOMAINS, MISSION_VALUES, RECOVERY_SCALE, type ContinuityPlan } from "@/lib/domain";

const now = () => new Date().toISOString();
const parseArr = (s: string, allowed?: string[]): string[] => {
  try { const v = JSON.parse(s); return Array.isArray(v) ? v.filter((x) => typeof x === "string" && (!allowed || allowed.includes(x))) : []; } catch { return []; }
};

interface Row {
  id: string; ref: string; activity: string; mission_id: string; owner_id: string | null;
  criticality: string; mtpd: string; rto: string; rpo: string; impacts: string;
  strategy: string; resources: string; procedure: string; asset_ids: string;
  last_test_date: string | null; review_date: string | null; status: string;
  created_by: string | null; created_at: string; updated_at: string;
}
function mapRow(r: Row): ContinuityPlan {
  return {
    id: r.id, ref: r.ref, activity: r.activity, missionId: r.mission_id, ownerId: r.owner_id ?? "",
    criticality: r.criticality, mtpd: r.mtpd, rto: r.rto, rpo: r.rpo, impacts: parseArr(r.impacts, IMPACT_DOMAINS),
    strategy: r.strategy, resources: r.resources, procedure: r.procedure, assetIds: parseArr(r.asset_ids),
    lastTestDate: r.last_test_date ? new Date(r.last_test_date) : null,
    reviewDate: r.review_date ? new Date(r.review_date) : null,
    status: r.status, createdBy: r.created_by, createdAt: new Date(r.created_at), updatedAt: new Date(r.updated_at),
  };
}

export function listContinuityPlans(): ContinuityPlan[] {
  return (getDb().prepare("select * from continuity_plans order by case criticality when 'Vitale' then 0 when 'Essentielle' then 1 when 'Importante' then 2 else 3 end, activity").all() as Row[]).map(mapRow);
}
export function getContinuityPlan(id: string): ContinuityPlan | null {
  const r = getDb().prepare("select * from continuity_plans where id=?").get(id) as Row | undefined;
  return r ? mapRow(r) : null;
}
export const continuityPlanExists = (id: string) => Boolean(getDb().prepare("select 1 from continuity_plans where id=?").get(id));

function nextRef(db = getDb()): string {
  const prefix = `PCA-${new Date().getFullYear()}-`;
  const rows = db.prepare("select ref from continuity_plans where ref like ?").all(`${prefix}%`) as { ref: string }[];
  let max = 0;
  rows.forEach((r) => { const n = parseInt(r.ref.slice(prefix.length), 10); if (Number.isFinite(n) && n > max) max = n; });
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

interface Fields {
  activity?: string; missionId?: string; ownerId?: string | null; criticality?: string;
  mtpd?: string; rto?: string; rpo?: string; impacts?: string[]; strategy?: string; resources?: string; procedure?: string;
  assetIds?: string[]; lastTestDate?: string | null; reviewDate?: string | null; status?: string;
}
const scale = (v: string | undefined, cur: string) => (v !== undefined && RECOVERY_SCALE.includes(v) ? v : cur);

export function createContinuityPlan(input: Fields & { activity: string; createdBy: string }): string {
  const id = randomUUID();
  const db = getDb();
  db.prepare("insert into continuity_plans (id, ref, activity, mission_id, owner_id, criticality, mtpd, rto, rpo, impacts, strategy, resources, procedure, asset_ids, last_test_date, review_date, status, created_by) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").run(
    id, nextRef(db), input.activity, input.missionId ?? "", input.ownerId || input.createdBy,
    MISSION_VALUES.includes(input.criticality ?? "") ? input.criticality : "Importante",
    RECOVERY_SCALE.includes(input.mtpd ?? "") ? input.mtpd : "< 24h",
    RECOVERY_SCALE.includes(input.rto ?? "") ? input.rto : "< 24h",
    RECOVERY_SCALE.includes(input.rpo ?? "") ? input.rpo : "< 24h",
    JSON.stringify((input.impacts ?? []).filter((x) => IMPACT_DOMAINS.includes(x))),
    input.strategy ?? "", input.resources ?? "", input.procedure ?? "",
    JSON.stringify(input.assetIds ?? []), input.lastTestDate ?? null, input.reviewDate ?? null,
    CONTINUITY_STATUS.includes(input.status ?? "") ? input.status : "Brouillon", input.createdBy
  );
  return id;
}

export function updateContinuityPlan(id: string, f: Fields): void {
  const db = getDb();
  const cur = db.prepare("select * from continuity_plans where id=?").get(id) as Row | undefined;
  if (!cur) return;
  db.prepare("update continuity_plans set activity=?, mission_id=?, owner_id=?, criticality=?, mtpd=?, rto=?, rpo=?, impacts=?, strategy=?, resources=?, procedure=?, asset_ids=?, last_test_date=?, review_date=?, status=?, updated_at=? where id=?").run(
    f.activity ?? cur.activity,
    f.missionId !== undefined ? f.missionId : cur.mission_id,
    f.ownerId !== undefined ? (f.ownerId || null) : cur.owner_id,
    f.criticality !== undefined && MISSION_VALUES.includes(f.criticality) ? f.criticality : cur.criticality,
    scale(f.mtpd, cur.mtpd), scale(f.rto, cur.rto), scale(f.rpo, cur.rpo),
    f.impacts !== undefined ? JSON.stringify(f.impacts.filter((x) => IMPACT_DOMAINS.includes(x))) : cur.impacts,
    f.strategy !== undefined ? f.strategy : cur.strategy,
    f.resources !== undefined ? f.resources : cur.resources,
    f.procedure !== undefined ? f.procedure : cur.procedure,
    f.assetIds !== undefined ? JSON.stringify(f.assetIds) : cur.asset_ids,
    f.lastTestDate !== undefined ? f.lastTestDate : cur.last_test_date,
    f.reviewDate !== undefined ? f.reviewDate : cur.review_date,
    f.status !== undefined && CONTINUITY_STATUS.includes(f.status) ? f.status : cur.status,
    now(), id
  );
}
export function deleteContinuityPlan(id: string): void {
  getDb().prepare("delete from continuity_plans where id=?").run(id);
}

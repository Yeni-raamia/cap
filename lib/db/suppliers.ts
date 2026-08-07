/* ==================================================================
 *  lib/db/suppliers.ts — Fournisseurs & prestataires (tiers, GRC).
 * ================================================================== */
import { randomUUID } from "node:crypto";
import { getDb } from "./index";
import { DATA_ACCESS_LEVELS, SUPPLIER_CRITICALITIES, SUPPLIER_STATUS, SUPPLIER_TYPES, type Supplier } from "@/lib/domain";

const now = () => new Date().toISOString();

interface Row {
  id: string; ref: string; name: string; type: string; criticality: string; service: string;
  data_access: string; owner_id: string | null; status: string; contract_end: string | null; review_date: string | null;
  asset_ids: string; notes: string; created_by: string | null; created_at: string; updated_at: string;
}
const parseArr = (s: string): string[] => { try { const v = JSON.parse(s); return Array.isArray(v) ? v.filter((x) => typeof x === "string") : []; } catch { return []; } };

function mapRow(r: Row): Supplier {
  return {
    id: r.id, ref: r.ref, name: r.name, type: r.type, criticality: r.criticality, service: r.service,
    dataAccess: r.data_access, ownerId: r.owner_id ?? "", status: r.status,
    contractEnd: r.contract_end ? new Date(r.contract_end) : null,
    reviewDate: r.review_date ? new Date(r.review_date) : null,
    assetIds: parseArr(r.asset_ids), notes: r.notes,
    createdBy: r.created_by, createdAt: new Date(r.created_at), updatedAt: new Date(r.updated_at),
  };
}

export function listSuppliers(): Supplier[] {
  return (getDb().prepare("select * from suppliers order by case criticality when 'Critique' then 0 when 'Important' then 1 else 2 end, name").all() as Row[]).map(mapRow);
}
export function getSupplier(id: string): Supplier | null {
  const r = getDb().prepare("select * from suppliers where id=?").get(id) as Row | undefined;
  return r ? mapRow(r) : null;
}
export const supplierExists = (id: string) => Boolean(getDb().prepare("select 1 from suppliers where id=?").get(id));

function nextRef(db = getDb()): string {
  const prefix = `FRN-${new Date().getFullYear()}-`;
  const rows = db.prepare("select ref from suppliers where ref like ?").all(`${prefix}%`) as { ref: string }[];
  let max = 0;
  rows.forEach((r) => { const n = parseInt(r.ref.slice(prefix.length), 10); if (Number.isFinite(n) && n > max) max = n; });
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

interface Fields {
  name?: string; type?: string; criticality?: string; service?: string; dataAccess?: string;
  ownerId?: string | null; status?: string; contractEnd?: string | null; reviewDate?: string | null;
  assetIds?: string[]; notes?: string;
}
export function createSupplier(input: Fields & { name: string; createdBy: string }): string {
  const id = randomUUID();
  const db = getDb();
  db.prepare("insert into suppliers (id, ref, name, type, criticality, service, data_access, owner_id, status, contract_end, review_date, asset_ids, notes, created_by) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?)").run(
    id, nextRef(db), input.name,
    SUPPLIER_TYPES.includes(input.type ?? "") ? input.type : "Autre",
    SUPPLIER_CRITICALITIES.includes(input.criticality ?? "") ? input.criticality : "Standard",
    input.service ?? "",
    DATA_ACCESS_LEVELS.includes(input.dataAccess ?? "") ? input.dataAccess : "Aucune donnée",
    input.ownerId || input.createdBy,
    SUPPLIER_STATUS.includes(input.status ?? "") ? input.status : "Actif",
    input.contractEnd ?? null, input.reviewDate ?? null,
    JSON.stringify(input.assetIds ?? []), input.notes ?? "", input.createdBy
  );
  return id;
}
export function updateSupplier(id: string, f: Fields): void {
  const db = getDb();
  const cur = db.prepare("select * from suppliers where id=?").get(id) as Row | undefined;
  if (!cur) return;
  db.prepare("update suppliers set name=?, type=?, criticality=?, service=?, data_access=?, owner_id=?, status=?, contract_end=?, review_date=?, asset_ids=?, notes=?, updated_at=? where id=?").run(
    f.name ?? cur.name,
    f.type !== undefined && SUPPLIER_TYPES.includes(f.type) ? f.type : cur.type,
    f.criticality !== undefined && SUPPLIER_CRITICALITIES.includes(f.criticality) ? f.criticality : cur.criticality,
    f.service !== undefined ? f.service : cur.service,
    f.dataAccess !== undefined && DATA_ACCESS_LEVELS.includes(f.dataAccess) ? f.dataAccess : cur.data_access,
    f.ownerId !== undefined ? (f.ownerId || null) : cur.owner_id,
    f.status !== undefined && SUPPLIER_STATUS.includes(f.status) ? f.status : cur.status,
    f.contractEnd !== undefined ? f.contractEnd : cur.contract_end,
    f.reviewDate !== undefined ? f.reviewDate : cur.review_date,
    f.assetIds !== undefined ? JSON.stringify(f.assetIds) : cur.asset_ids,
    f.notes !== undefined ? f.notes : cur.notes,
    now(), id
  );
}
export function deleteSupplier(id: string): void {
  getDb().prepare("delete from suppliers where id=?").run(id);
}

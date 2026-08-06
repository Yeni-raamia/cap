/* ==================================================================
 *  lib/db/assets.ts — Registre des actifs (module GRC, ISO 27005).
 * ================================================================== */
import { randomUUID } from "node:crypto";
import { getDb } from "./index";
import { ASSET_STATUTS, type Asset } from "@/lib/domain";

const now = () => new Date().toISOString();
const clampCID = (v: unknown): number => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(4, Math.max(1, n)) : 1;
};

interface AssetRow {
  id: string;
  ref: string;
  name: string;
  type: string;
  description: string;
  owner_id: string | null;
  service: string;
  confidentiality: number;
  integrity: number;
  availability: number;
  status: string;
  review_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

function mapAsset(r: AssetRow): Asset {
  return {
    id: r.id,
    ref: r.ref,
    name: r.name,
    type: r.type,
    description: r.description,
    ownerId: r.owner_id ?? "",
    service: r.service,
    confidentiality: r.confidentiality,
    integrity: r.integrity,
    availability: r.availability,
    status: r.status,
    reviewDate: r.review_date ? new Date(r.review_date) : null,
    createdBy: r.created_by,
    createdAt: new Date(r.created_at),
    updatedAt: new Date(r.updated_at),
  };
}

export function listAssets(): Asset[] {
  return (getDb().prepare("select * from assets order by created_at desc").all() as AssetRow[]).map(mapAsset);
}
export function getAsset(id: string): Asset | null {
  const r = getDb().prepare("select * from assets where id=?").get(id) as AssetRow | undefined;
  return r ? mapAsset(r) : null;
}
export function assetExists(id: string): boolean {
  return Boolean(getDb().prepare("select 1 from assets where id=?").get(id));
}

function nextAssetRef(db = getDb()): string {
  const year = new Date().getFullYear();
  const prefix = `ACT-${year}-`;
  const rows = db.prepare("select ref from assets where ref like ?").all(`${prefix}%`) as { ref: string }[];
  let max = 0;
  rows.forEach((r) => {
    const n = parseInt(r.ref.slice(prefix.length), 10);
    if (Number.isFinite(n) && n > max) max = n;
  });
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

export function createAsset(input: {
  name: string;
  type?: string;
  description?: string;
  ownerId?: string | null;
  service?: string;
  confidentiality?: number;
  integrity?: number;
  availability?: number;
  status?: string;
  reviewDate?: string | null;
  createdBy: string;
}): string {
  const id = randomUUID();
  const db = getDb();
  db.prepare(
    "insert into assets (id, ref, name, type, description, owner_id, service, confidentiality, integrity, availability, status, review_date, created_by) values (?,?,?,?,?,?,?,?,?,?,?,?,?)"
  ).run(
    id,
    nextAssetRef(db),
    input.name,
    input.type ?? "",
    input.description ?? "",
    input.ownerId ?? input.createdBy,
    input.service ?? "",
    clampCID(input.confidentiality),
    clampCID(input.integrity),
    clampCID(input.availability),
    ASSET_STATUTS.includes(input.status ?? "") ? input.status : "Actif",
    input.reviewDate ?? null,
    input.createdBy
  );
  return id;
}

export function updateAsset(
  id: string,
  fields: {
    name?: string;
    type?: string;
    description?: string;
    ownerId?: string | null;
    service?: string;
    confidentiality?: number;
    integrity?: number;
    availability?: number;
    status?: string;
    reviewDate?: string | null;
  }
): void {
  const db = getDb();
  const cur = db.prepare("select * from assets where id=?").get(id) as AssetRow | undefined;
  if (!cur) return;
  db.prepare(
    "update assets set name=?, type=?, description=?, owner_id=?, service=?, confidentiality=?, integrity=?, availability=?, status=?, review_date=?, updated_at=? where id=?"
  ).run(
    fields.name ?? cur.name,
    fields.type !== undefined ? fields.type : cur.type,
    fields.description !== undefined ? fields.description : cur.description,
    fields.ownerId !== undefined ? fields.ownerId : cur.owner_id,
    fields.service !== undefined ? fields.service : cur.service,
    fields.confidentiality !== undefined ? clampCID(fields.confidentiality) : cur.confidentiality,
    fields.integrity !== undefined ? clampCID(fields.integrity) : cur.integrity,
    fields.availability !== undefined ? clampCID(fields.availability) : cur.availability,
    fields.status !== undefined && ASSET_STATUTS.includes(fields.status) ? fields.status : cur.status,
    fields.reviewDate !== undefined ? fields.reviewDate : cur.review_date,
    now(),
    id
  );
}

export function deleteAsset(id: string): void {
  getDb().prepare("delete from assets where id=?").run(id);
}

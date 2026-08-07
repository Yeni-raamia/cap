/* ==================================================================
 *  lib/db/rgpd.ts — RGPD : registre des traitements (ROPA) + AIPD.
 * ================================================================== */
import { randomUUID } from "node:crypto";
import { getDb } from "./index";
import { DATA_CATEGORIES, LEGAL_BASES, PIA_RISK_LEVELS, PIA_STATUS, PROCESSING_STATUS, type ProcessingActivity } from "@/lib/domain";

const now = () => new Date().toISOString();
const parseArr = (s: string, allowed?: string[]): string[] => {
  try { const v = JSON.parse(s); return Array.isArray(v) ? v.filter((x) => typeof x === "string" && (!allowed || allowed.includes(x))) : []; } catch { return []; }
};

interface Row {
  id: string; ref: string; name: string; purpose: string; legal_basis: string; data_categories: string;
  sensitive_data: number; data_subjects: string; recipients: string; retention: string; transfers_outside_eu: number; transfer_details: string;
  owner_id: string | null; service: string; security_measures: string; asset_ids: string;
  pia_required: number; pia_status: string; pia_risk: string; pia_notes: string; status: string; review_date: string | null;
  created_by: string | null; created_at: string; updated_at: string;
}
function mapRow(r: Row): ProcessingActivity {
  return {
    id: r.id, ref: r.ref, name: r.name, purpose: r.purpose, legalBasis: r.legal_basis, dataCategories: parseArr(r.data_categories, DATA_CATEGORIES),
    sensitiveData: r.sensitive_data === 1, dataSubjects: r.data_subjects, recipients: r.recipients, retention: r.retention,
    transfersOutsideEU: r.transfers_outside_eu === 1, transferDetails: r.transfer_details, ownerId: r.owner_id ?? "", service: r.service,
    securityMeasures: r.security_measures, assetIds: parseArr(r.asset_ids),
    piaRequired: r.pia_required === 1, piaStatus: r.pia_status, piaRisk: r.pia_risk, piaNotes: r.pia_notes,
    status: r.status, reviewDate: r.review_date ? new Date(r.review_date) : null,
    createdBy: r.created_by, createdAt: new Date(r.created_at), updatedAt: new Date(r.updated_at),
  };
}

export function listProcessing(): ProcessingActivity[] {
  return (getDb().prepare("select * from processing_activities order by name").all() as Row[]).map(mapRow);
}
export function getProcessing(id: string): ProcessingActivity | null {
  const r = getDb().prepare("select * from processing_activities where id=?").get(id) as Row | undefined;
  return r ? mapRow(r) : null;
}
export const processingExists = (id: string) => Boolean(getDb().prepare("select 1 from processing_activities where id=?").get(id));

function nextRef(db = getDb()): string {
  const prefix = `TRT-${new Date().getFullYear()}-`;
  const rows = db.prepare("select ref from processing_activities where ref like ?").all(`${prefix}%`) as { ref: string }[];
  let max = 0;
  rows.forEach((r) => { const n = parseInt(r.ref.slice(prefix.length), 10); if (Number.isFinite(n) && n > max) max = n; });
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

interface Fields {
  name?: string; purpose?: string; legalBasis?: string; dataCategories?: string[]; sensitiveData?: boolean; dataSubjects?: string;
  recipients?: string; retention?: string; transfersOutsideEU?: boolean; transferDetails?: string; ownerId?: string | null; service?: string;
  securityMeasures?: string; assetIds?: string[]; piaRequired?: boolean; piaStatus?: string; piaRisk?: string; piaNotes?: string;
  status?: string; reviewDate?: string | null;
}
const legal = (v?: string) => (LEGAL_BASES.includes(v ?? "") ? v! : "");

export function createProcessing(input: Fields & { name: string; createdBy: string }): string {
  const id = randomUUID();
  const db = getDb();
  db.prepare("insert into processing_activities (id, ref, name, purpose, legal_basis, data_categories, sensitive_data, data_subjects, recipients, retention, transfers_outside_eu, transfer_details, owner_id, service, security_measures, asset_ids, pia_required, pia_status, pia_risk, pia_notes, status, review_date, created_by) values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").run(
    id, nextRef(db), input.name, input.purpose ?? "", legal(input.legalBasis),
    JSON.stringify((input.dataCategories ?? []).filter((x) => DATA_CATEGORIES.includes(x))),
    input.sensitiveData ? 1 : 0, input.dataSubjects ?? "", input.recipients ?? "", input.retention ?? "",
    input.transfersOutsideEU ? 1 : 0, input.transferDetails ?? "", input.ownerId || input.createdBy, input.service ?? "",
    input.securityMeasures ?? "", JSON.stringify(input.assetIds ?? []),
    input.piaRequired ? 1 : 0,
    PIA_STATUS.includes(input.piaStatus ?? "") ? input.piaStatus : "Non requise",
    PIA_RISK_LEVELS.includes(input.piaRisk ?? "") ? input.piaRisk : "Faible", input.piaNotes ?? "",
    PROCESSING_STATUS.includes(input.status ?? "") ? input.status : "Actif", input.reviewDate ?? null, input.createdBy
  );
  return id;
}

export function updateProcessing(id: string, f: Fields): void {
  const db = getDb();
  const cur = db.prepare("select * from processing_activities where id=?").get(id) as Row | undefined;
  if (!cur) return;
  db.prepare("update processing_activities set name=?, purpose=?, legal_basis=?, data_categories=?, sensitive_data=?, data_subjects=?, recipients=?, retention=?, transfers_outside_eu=?, transfer_details=?, owner_id=?, service=?, security_measures=?, asset_ids=?, pia_required=?, pia_status=?, pia_risk=?, pia_notes=?, status=?, review_date=?, updated_at=? where id=?").run(
    f.name ?? cur.name, f.purpose !== undefined ? f.purpose : cur.purpose,
    f.legalBasis !== undefined ? legal(f.legalBasis) : cur.legal_basis,
    f.dataCategories !== undefined ? JSON.stringify(f.dataCategories.filter((x) => DATA_CATEGORIES.includes(x))) : cur.data_categories,
    f.sensitiveData !== undefined ? (f.sensitiveData ? 1 : 0) : cur.sensitive_data,
    f.dataSubjects !== undefined ? f.dataSubjects : cur.data_subjects,
    f.recipients !== undefined ? f.recipients : cur.recipients,
    f.retention !== undefined ? f.retention : cur.retention,
    f.transfersOutsideEU !== undefined ? (f.transfersOutsideEU ? 1 : 0) : cur.transfers_outside_eu,
    f.transferDetails !== undefined ? f.transferDetails : cur.transfer_details,
    f.ownerId !== undefined ? (f.ownerId || null) : cur.owner_id,
    f.service !== undefined ? f.service : cur.service,
    f.securityMeasures !== undefined ? f.securityMeasures : cur.security_measures,
    f.assetIds !== undefined ? JSON.stringify(f.assetIds) : cur.asset_ids,
    f.piaRequired !== undefined ? (f.piaRequired ? 1 : 0) : cur.pia_required,
    f.piaStatus !== undefined && PIA_STATUS.includes(f.piaStatus) ? f.piaStatus : cur.pia_status,
    f.piaRisk !== undefined && PIA_RISK_LEVELS.includes(f.piaRisk) ? f.piaRisk : cur.pia_risk,
    f.piaNotes !== undefined ? f.piaNotes : cur.pia_notes,
    f.status !== undefined && PROCESSING_STATUS.includes(f.status) ? f.status : cur.status,
    f.reviewDate !== undefined ? f.reviewDate : cur.review_date,
    now(), id
  );
}
export function deleteProcessing(id: string): void {
  getDb().prepare("delete from processing_activities where id=?").run(id);
}

/* ==================================================================
 *  lib/db/policies.ts — Politiques de sécurité & suivi de diffusion (GRC).
 * ================================================================== */
import { randomUUID } from "node:crypto";
import { getDb } from "./index";
import { POLICY_STAGE_ALL, POLICY_STATUTS, type Policy, type PolicyDiffusion } from "@/lib/domain";

const now = () => new Date().toISOString();

interface PolicyRow {
  id: string;
  ref: string;
  title: string;
  reference: string;
  domain: string;
  version: string;
  status: string;
  summary: string;
  url: string;
  owner_id: string | null;
  published_at: string | null;
  review_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
interface DiffRow {
  id: string;
  policy_id: string;
  service: string;
  stage: string;
  note: string;
  updated_at: string;
}

const mapDiff = (r: DiffRow): PolicyDiffusion => ({
  id: r.id,
  policyId: r.policy_id,
  service: r.service,
  stage: r.stage,
  note: r.note,
  updatedAt: new Date(r.updated_at),
});

function mapPolicy(r: PolicyRow, diffs: PolicyDiffusion[]): Policy {
  return {
    id: r.id,
    ref: r.ref,
    title: r.title,
    reference: r.reference,
    domain: r.domain,
    version: r.version,
    status: r.status,
    summary: r.summary,
    url: r.url,
    ownerId: r.owner_id ?? "",
    publishedAt: r.published_at ? new Date(r.published_at) : null,
    reviewDate: r.review_date ? new Date(r.review_date) : null,
    diffusions: diffs,
    createdBy: r.created_by,
    createdAt: new Date(r.created_at),
    updatedAt: new Date(r.updated_at),
  };
}

export function listPolicies(): Policy[] {
  const db = getDb();
  const rows = db.prepare("select * from policies order by updated_at desc").all() as PolicyRow[];
  const diffs = db.prepare("select * from policy_diffusions order by service").all() as DiffRow[];
  const byPolicy = new Map<string, PolicyDiffusion[]>();
  diffs.forEach((d) => byPolicy.set(d.policy_id, [...(byPolicy.get(d.policy_id) ?? []), mapDiff(d)]));
  return rows.map((r) => mapPolicy(r, byPolicy.get(r.id) ?? []));
}

export function getPolicy(id: string): Policy | null {
  const db = getDb();
  const r = db.prepare("select * from policies where id=?").get(id) as PolicyRow | undefined;
  if (!r) return null;
  const diffs = (db.prepare("select * from policy_diffusions where policy_id=? order by service").all(id) as DiffRow[]).map(mapDiff);
  return mapPolicy(r, diffs);
}

export function policyExists(id: string): boolean {
  return Boolean(getDb().prepare("select 1 from policies where id=?").get(id));
}

function nextPolicyRef(db = getDb()): string {
  const year = new Date().getFullYear();
  const prefix = `POL-${year}-`;
  const rows = db.prepare("select ref from policies where ref like ?").all(`${prefix}%`) as { ref: string }[];
  let max = 0;
  rows.forEach((r) => {
    const n = parseInt(r.ref.slice(prefix.length), 10);
    if (Number.isFinite(n) && n > max) max = n;
  });
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

export function createPolicy(input: {
  title: string;
  reference?: string;
  domain?: string;
  version?: string;
  status?: string;
  summary?: string;
  url?: string;
  ownerId?: string | null;
  publishedAt?: string | null;
  reviewDate?: string | null;
  createdBy: string;
}): string {
  const id = randomUUID();
  const db = getDb();
  db.prepare(
    "insert into policies (id, ref, title, reference, domain, version, status, summary, url, owner_id, published_at, review_date, created_by) values (?,?,?,?,?,?,?,?,?,?,?,?,?)"
  ).run(
    id,
    nextPolicyRef(db),
    input.title,
    input.reference ?? "",
    input.domain ?? "",
    input.version ?? "1.0",
    POLICY_STATUTS.includes(input.status ?? "") ? input.status : "Brouillon",
    input.summary ?? "",
    input.url ?? "",
    input.ownerId ?? input.createdBy,
    input.publishedAt ?? null,
    input.reviewDate ?? null,
    input.createdBy
  );
  return id;
}

export function updatePolicy(
  id: string,
  fields: {
    title?: string;
    reference?: string;
    domain?: string;
    version?: string;
    status?: string;
    summary?: string;
    url?: string;
    ownerId?: string | null;
    publishedAt?: string | null;
    reviewDate?: string | null;
  }
): void {
  const db = getDb();
  const cur = db.prepare("select * from policies where id=?").get(id) as PolicyRow | undefined;
  if (!cur) return;
  db.prepare(
    "update policies set title=?, reference=?, domain=?, version=?, status=?, summary=?, url=?, owner_id=?, published_at=?, review_date=?, updated_at=? where id=?"
  ).run(
    fields.title ?? cur.title,
    fields.reference !== undefined ? fields.reference : cur.reference,
    fields.domain !== undefined ? fields.domain : cur.domain,
    fields.version !== undefined ? fields.version : cur.version,
    fields.status !== undefined && POLICY_STATUTS.includes(fields.status) ? fields.status : cur.status,
    fields.summary !== undefined ? fields.summary : cur.summary,
    fields.url !== undefined ? fields.url : cur.url,
    fields.ownerId !== undefined ? fields.ownerId : cur.owner_id,
    fields.publishedAt !== undefined ? fields.publishedAt : cur.published_at,
    fields.reviewDate !== undefined ? fields.reviewDate : cur.review_date,
    now(),
    id
  );
}

export function deletePolicy(id: string): void {
  const db = getDb();
  db.prepare("delete from policy_diffusions where policy_id=?").run(id);
  db.prepare("delete from policies where id=?").run(id);
}

const touchPolicy = (db: ReturnType<typeof getDb>, policyId: string) =>
  db.prepare("update policies set updated_at=? where id=?").run(now(), policyId);

/** Crée ou met à jour le suivi de diffusion d'une politique pour un service donné. */
export function upsertDiffusion(policyId: string, service: string, stage: string, note = ""): void {
  const svc = service.trim();
  if (!svc || !POLICY_STAGE_ALL.includes(stage)) return;
  const db = getDb();
  const existing = db.prepare("select id from policy_diffusions where policy_id=? and service=?").get(policyId, svc) as { id: string } | undefined;
  if (existing) {
    db.prepare("update policy_diffusions set stage=?, note=?, updated_at=? where id=?").run(stage, note, now(), existing.id);
  } else {
    db.prepare("insert into policy_diffusions (id, policy_id, service, stage, note, updated_at) values (?,?,?,?,?,?)").run(
      randomUUID(),
      policyId,
      svc,
      stage,
      note,
      now()
    );
  }
  touchPolicy(db, policyId);
}

export function removeDiffusion(policyId: string, service: string): void {
  const db = getDb();
  db.prepare("delete from policy_diffusions where policy_id=? and service=?").run(policyId, service.trim());
  touchPolicy(db, policyId);
}

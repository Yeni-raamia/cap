/* ==================================================================
 *  lib/db/legaltexts.ts — Registre des textes légaux & réglementaires.
 *
 *  Contrairement aux référentiels (ISO, NIST…), figés dans le code, les
 *  lois dépendent du pays et du secteur : elles se saisissent ici.
 * ================================================================== */
import { randomUUID } from "node:crypto";
import { getDb } from "./index";
import { LEGAL_KINDS, LEGAL_STATUS, type LegalArticle, type LegalText } from "@/lib/domain";

interface LegalRow {
  id: string;
  ref: string;
  name: string;
  kind: string;
  authority: string;
  reference: string;
  published_at: string | null;
  effective_at: string | null;
  url: string;
  description: string;
  scope: string;
  status: string;
  applicable: number;
  articles: string;
  owner_id: string | null;
  review_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Normalise les articles reçus du client.
 *
 * Un article sans repère n'est pas exploitable : le code sert de clé pour
 * rattacher son évaluation. On écarte donc les entrées vides et les doublons,
 * qui feraient collision dans le tableau de conformité.
 */
function cleanArticles(v: unknown): LegalArticle[] {
  if (!Array.isArray(v)) return [];
  const seen = new Set<string>();
  const out: LegalArticle[] = [];
  for (const raw of v) {
    if (!raw || typeof raw !== "object") continue;
    const a = raw as Record<string, unknown>;
    const code = String(a.code ?? "").trim();
    if (!code || seen.has(code)) continue;
    seen.add(code);
    out.push({
      code,
      title: String(a.title ?? "").trim(),
      requirement: String(a.requirement ?? "").trim(),
      group: String(a.group ?? "").trim() || "Dispositions générales",
    });
  }
  return out;
}

function mapText(r: LegalRow): LegalText {
  let articles: LegalArticle[] = [];
  try {
    articles = cleanArticles(JSON.parse(r.articles || "[]"));
  } catch {
    articles = [];
  }
  return {
    id: r.id,
    ref: r.ref,
    name: r.name,
    kind: r.kind,
    authority: r.authority,
    reference: r.reference,
    publishedAt: r.published_at ? new Date(r.published_at) : null,
    effectiveAt: r.effective_at ? new Date(r.effective_at) : null,
    url: r.url,
    description: r.description,
    scope: r.scope,
    status: r.status,
    applicable: r.applicable === 1,
    articles,
    ownerId: r.owner_id,
    reviewDate: r.review_date ? new Date(r.review_date) : null,
    createdBy: r.created_by,
    createdAt: new Date(r.created_at),
    updatedAt: new Date(r.updated_at),
  };
}

export function listLegalTexts(): LegalText[] {
  const rows = getDb()
    .prepare("select * from legal_texts order by status, name collate nocase")
    .all() as LegalRow[];
  return rows.map(mapText);
}

export function getLegalText(id: string): LegalText | null {
  const r = getDb().prepare("select * from legal_texts where id=?").get(id) as LegalRow | undefined;
  return r ? mapText(r) : null;
}

function nextRef(): string {
  const year = new Date().getFullYear();
  const prefix = `LEX-${year}-`;
  const rows = getDb().prepare("select ref from legal_texts where ref like ?").all(`${prefix}%`) as { ref: string }[];
  let max = 0;
  rows.forEach((r) => {
    const n = parseInt(r.ref.slice(prefix.length), 10);
    if (Number.isFinite(n) && n > max) max = n;
  });
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

export interface LegalInput {
  name?: string;
  kind?: string;
  authority?: string;
  reference?: string;
  publishedAt?: string | null;
  effectiveAt?: string | null;
  url?: string;
  description?: string;
  scope?: string;
  status?: string;
  applicable?: boolean;
  articles?: unknown;
  ownerId?: string | null;
  reviewDate?: string | null;
}

const pickKind = (v: unknown, fallback: string) => (LEGAL_KINDS.includes(String(v)) ? String(v) : fallback);
const pickStatus = (v: unknown, fallback: string) => (LEGAL_STATUS.includes(String(v)) ? String(v) : fallback);

export function createLegalText(input: LegalInput & { createdBy: string }): string {
  const id = randomUUID();
  getDb()
    .prepare(
      "insert into legal_texts (id, ref, name, kind, authority, reference, published_at, effective_at, url, " +
        "description, scope, status, applicable, articles, owner_id, review_date, created_by) " +
        "values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
    )
    .run(
      id,
      nextRef(),
      (input.name ?? "").trim(),
      pickKind(input.kind, "Loi"),
      (input.authority ?? "").trim(),
      (input.reference ?? "").trim(),
      input.publishedAt ?? null,
      input.effectiveAt ?? null,
      (input.url ?? "").trim(),
      input.description ?? "",
      input.scope ?? "",
      pickStatus(input.status, "En vigueur"),
      input.applicable === false ? 0 : 1,
      JSON.stringify(cleanArticles(input.articles)),
      input.ownerId ?? null,
      input.reviewDate ?? null,
      input.createdBy
    );
  return id;
}

export function updateLegalText(id: string, input: LegalInput): void {
  const cur = getDb().prepare("select * from legal_texts where id=?").get(id) as LegalRow | undefined;
  if (!cur) return;
  getDb()
    .prepare(
      "update legal_texts set name=?, kind=?, authority=?, reference=?, published_at=?, effective_at=?, url=?, " +
        "description=?, scope=?, status=?, applicable=?, articles=?, owner_id=?, review_date=?, updated_at=? where id=?"
    )
    .run(
      input.name !== undefined ? input.name.trim() : cur.name,
      input.kind !== undefined ? pickKind(input.kind, cur.kind) : cur.kind,
      input.authority !== undefined ? input.authority.trim() : cur.authority,
      input.reference !== undefined ? input.reference.trim() : cur.reference,
      input.publishedAt !== undefined ? input.publishedAt : cur.published_at,
      input.effectiveAt !== undefined ? input.effectiveAt : cur.effective_at,
      input.url !== undefined ? input.url.trim() : cur.url,
      input.description !== undefined ? input.description : cur.description,
      input.scope !== undefined ? input.scope : cur.scope,
      input.status !== undefined ? pickStatus(input.status, cur.status) : cur.status,
      input.applicable !== undefined ? (input.applicable ? 1 : 0) : cur.applicable,
      input.articles !== undefined ? JSON.stringify(cleanArticles(input.articles)) : cur.articles,
      input.ownerId !== undefined ? input.ownerId : cur.owner_id,
      input.reviewDate !== undefined ? input.reviewDate : cur.review_date,
      new Date().toISOString(),
      id
    );
}

/**
 * Supprime un texte et les évaluations de ses articles.
 *
 * Les laisser en base ferait remonter des évaluations orphelines dans les
 * scores, rattachées à un référentiel qui n'existe plus.
 */
export function deleteLegalText(id: string): void {
  const db = getDb();
  const tx = db.transaction(() => {
    db.prepare("delete from control_assessments where framework_id=?").run(`loi:${id}`);
    db.prepare("delete from legal_texts where id=?").run(id);
  });
  tx();
}

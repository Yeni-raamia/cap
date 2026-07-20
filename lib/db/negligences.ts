/* ==================================================================
 *  lib/db/negligences.ts — Module Négligence (serveur).
 * ================================================================== */
import { randomUUID } from "node:crypto";
import { getDb } from "./index";
import type { Negligence } from "@/lib/domain";

interface NegRow {
  id: string;
  item_id: string;
  gravite: string;
  risque: string;
  impact: string;
  description: string;
  status: string;
  created_by: string | null;
  decided_by: string | null;
  created_at: string;
  updated_at: string;
  decided_at: string | null;
}

function mapNeg(r: NegRow, decisions: string[]): Negligence {
  return {
    id: r.id,
    itemId: r.item_id,
    gravite: r.gravite,
    risque: r.risque,
    impact: r.impact,
    description: r.description,
    status: r.status,
    decisions,
    createdBy: r.created_by ?? "",
    decidedBy: r.decided_by,
    createdAt: new Date(r.created_at),
    updatedAt: new Date(r.updated_at),
    decidedAt: r.decided_at ? new Date(r.decided_at) : null,
  };
}

export function listNegligences(): Negligence[] {
  const db = getDb();
  const rows = db.prepare("select * from negligences order by updated_at desc").all() as NegRow[];
  const decs = db.prepare("select negligence_id, decision from negligence_decisions").all() as {
    negligence_id: string;
    decision: string;
  }[];
  const byNeg = new Map<string, string[]>();
  decs.forEach((d) => byNeg.set(d.negligence_id, [...(byNeg.get(d.negligence_id) ?? []), d.decision]));
  return rows.map((r) => mapNeg(r, byNeg.get(r.id) ?? []));
}

export function getNegligence(id: string): Negligence | null {
  const db = getDb();
  const r = db.prepare("select * from negligences where id = ?").get(id) as NegRow | undefined;
  if (!r) return null;
  const decs = (db.prepare("select decision from negligence_decisions where negligence_id = ?").all(id) as { decision: string }[]).map((x) => x.decision);
  return mapNeg(r, decs);
}

export function getNegligenceItemId(id: string): string | null {
  const r = getDb().prepare("select item_id from negligences where id = ?").get(id) as { item_id: string } | undefined;
  return r?.item_id ?? null;
}

/** Crée la fiche négligence pour un objet si elle n'existe pas encore. */
export function ensureNegligence(itemId: string, createdBy: string): string {
  const existing = getDb().prepare("select id from negligences where item_id = ?").get(itemId) as { id: string } | undefined;
  if (existing) return existing.id;
  const id = randomUUID();
  getDb()
    .prepare("insert into negligences (id, item_id, created_by) values (?,?,?)")
    .run(id, itemId, createdBy);
  return id;
}

export function updateNegligence(
  id: string,
  fields: { gravite?: string; risque?: string; impact?: string; description?: string; status?: string }
): void {
  const cur = getDb().prepare("select * from negligences where id = ?").get(id) as NegRow | undefined;
  if (!cur) return;
  getDb()
    .prepare("update negligences set gravite=?, risque=?, impact=?, description=?, status=?, updated_at=? where id=?")
    .run(
      fields.gravite ?? cur.gravite,
      fields.risque ?? cur.risque,
      fields.impact ?? cur.impact,
      fields.description ?? cur.description,
      fields.status ?? cur.status,
      new Date().toISOString(),
      id
    );
}

/** Décisions du DG : remplace l'ensemble coché et marque qui a décidé. */
export function setNegligenceDecisions(id: string, decisions: string[], decidedBy: string): void {
  const db = getDb();
  const now = new Date().toISOString();
  const tx = db.transaction(() => {
    db.prepare("delete from negligence_decisions where negligence_id = ?").run(id);
    const ins = db.prepare("insert into negligence_decisions (id, negligence_id, decision) values (?,?,?)");
    decisions.forEach((d) => ins.run(randomUUID(), id, d));
    db.prepare("update negligences set decided_by=?, decided_at=?, status=?, updated_at=? where id=?").run(
      decidedBy,
      now,
      decisions.length ? "Décision rendue" : "Transmise au DG",
      now,
      id
    );
  });
  tx();
}

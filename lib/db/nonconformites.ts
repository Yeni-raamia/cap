/* ==================================================================
 *  lib/db/nonconformites.ts — Module Non-conformité (serveur).
 *  Même logique que lib/db/negligences.ts, registre parallèle.
 * ================================================================== */
import { randomUUID } from "node:crypto";
import { getDb } from "./index";
import type { NonConformite } from "@/lib/domain";

interface NcRow {
  id: string;
  item_id: string | null;
  objet: string;
  service: string;
  concerne: string;
  policy: string;
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

function mapNc(r: NcRow, decisions: string[]): NonConformite {
  return {
    id: r.id,
    itemId: r.item_id ?? null,
    objet: r.objet,
    service: r.service,
    concerne: r.concerne,
    policy: r.policy ?? "",
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

export function listNonConformites(): NonConformite[] {
  const db = getDb();
  const rows = db.prepare("select * from nonconformites order by updated_at desc").all() as NcRow[];
  const decs = db.prepare("select nonconformite_id, decision from nonconformite_decisions").all() as {
    nonconformite_id: string;
    decision: string;
  }[];
  const byNc = new Map<string, string[]>();
  decs.forEach((d) => byNc.set(d.nonconformite_id, [...(byNc.get(d.nonconformite_id) ?? []), d.decision]));
  return rows.map((r) => mapNc(r, byNc.get(r.id) ?? []));
}

export function getNonConformite(id: string): NonConformite | null {
  const db = getDb();
  const r = db.prepare("select * from nonconformites where id = ?").get(id) as NcRow | undefined;
  if (!r) return null;
  const decs = (db.prepare("select decision from nonconformite_decisions where nonconformite_id = ?").all(id) as { decision: string }[]).map((x) => x.decision);
  return mapNc(r, decs);
}

export function getNonConformiteItemId(id: string): string | null {
  const r = getDb().prepare("select item_id from nonconformites where id = ?").get(id) as { item_id: string } | undefined;
  return r?.item_id ?? null;
}

/** Crée la fiche non-conformité pour un suivi si elle n'existe pas encore. */
export function ensureNonConformite(
  itemId: string,
  createdBy: string,
  defaults?: { objet?: string; service?: string; concerne?: string }
): string {
  const existing = getDb().prepare("select id from nonconformites where item_id = ?").get(itemId) as { id: string } | undefined;
  if (existing) return existing.id;
  const id = randomUUID();
  getDb()
    .prepare("insert into nonconformites (id, item_id, objet, service, concerne, created_by) values (?,?,?,?,?,?)")
    .run(id, itemId, defaults?.objet ?? "", defaults?.service ?? "", defaults?.concerne ?? "", createdBy);
  return id;
}

/** Crée une fiche de non-conformité par formulaire (avec ou sans suivi lié). */
export function createNonConformiteRecord(input: {
  itemId?: string | null;
  objet: string;
  service: string;
  concerne: string;
  policy?: string;
  gravite: string;
  risque: string;
  impact: string;
  description: string;
  createdBy: string;
}): string {
  const id = randomUUID();
  getDb()
    .prepare(
      "insert into nonconformites (id, item_id, objet, service, concerne, policy, gravite, risque, impact, description, created_by) values (?,?,?,?,?,?,?,?,?,?,?)"
    )
    .run(
      id,
      input.itemId ?? null,
      input.objet,
      input.service,
      input.concerne,
      input.policy ?? "",
      input.gravite,
      input.risque,
      input.impact,
      input.description,
      input.createdBy
    );
  return id;
}

export function updateNonConformite(
  id: string,
  fields: {
    objet?: string;
    service?: string;
    concerne?: string;
    policy?: string;
    gravite?: string;
    risque?: string;
    impact?: string;
    description?: string;
    status?: string;
  }
): void {
  const cur = getDb().prepare("select * from nonconformites where id = ?").get(id) as NcRow | undefined;
  if (!cur) return;
  getDb()
    .prepare(
      "update nonconformites set objet=?, service=?, concerne=?, policy=?, gravite=?, risque=?, impact=?, description=?, status=?, updated_at=? where id=?"
    )
    .run(
      fields.objet ?? cur.objet,
      fields.service ?? cur.service,
      fields.concerne ?? cur.concerne,
      fields.policy ?? cur.policy ?? "",
      fields.gravite ?? cur.gravite,
      fields.risque ?? cur.risque,
      fields.impact ?? cur.impact,
      fields.description ?? cur.description,
      fields.status ?? cur.status,
      new Date().toISOString(),
      id
    );
}

/** Décisions : remplace l'ensemble coché et marque qui a décidé. */
export function setNonConformiteDecisions(id: string, decisions: string[], decidedBy: string): void {
  const db = getDb();
  const now = new Date().toISOString();
  const tx = db.transaction(() => {
    db.prepare("delete from nonconformite_decisions where nonconformite_id = ?").run(id);
    const ins = db.prepare("insert into nonconformite_decisions (id, nonconformite_id, decision) values (?,?,?)");
    decisions.forEach((d) => ins.run(randomUUID(), id, d));
    db.prepare("update nonconformites set decided_by=?, decided_at=?, status=?, updated_at=? where id=?").run(
      decidedBy,
      now,
      decisions.length ? "Décision rendue" : "Transmise au DG",
      now,
      id
    );
  });
  tx();
}

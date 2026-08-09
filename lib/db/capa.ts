/* ==================================================================
 *  lib/db/capa.ts — Plan d'actions correctives / préventives (CAPA).
 * ================================================================== */
import { randomUUID } from "node:crypto";
import { getDb } from "./index";
import { CAPA_PRIORITIES, CAPA_STATUS, CAPA_TYPES, type CapaAction, type CapaSource } from "@/lib/domain";

const now = () => new Date().toISOString();
const SOURCES: CapaSource[] = ["controle", "nonconformite", "risque", "incident", "audit", "manuel"];

interface CapaRow {
  id: string;
  ref: string;
  title: string;
  description: string;
  type: string;
  priority: string;
  source_type: string;
  source_id: string | null;
  owner_id: string | null;
  due_date: string | null;
  status: string;
  verification: string;
  closed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

function mapCapa(r: CapaRow): CapaAction {
  return {
    id: r.id,
    ref: r.ref,
    title: r.title,
    description: r.description,
    type: r.type,
    priority: r.priority,
    sourceType: (SOURCES.includes(r.source_type as CapaSource) ? r.source_type : "manuel") as CapaSource,
    sourceId: r.source_id,
    ownerId: r.owner_id ?? "",
    dueDate: r.due_date ? new Date(r.due_date) : null,
    status: r.status,
    verification: r.verification,
    closedAt: r.closed_at ? new Date(r.closed_at) : null,
    createdBy: r.created_by,
    createdAt: new Date(r.created_at),
    updatedAt: new Date(r.updated_at),
  };
}

export function listCapaActions(): CapaAction[] {
  return (getDb().prepare("select * from capa_actions order by created_at desc").all() as CapaRow[]).map(mapCapa);
}
export function getCapa(id: string): CapaAction | null {
  const r = getDb().prepare("select * from capa_actions where id=?").get(id) as CapaRow | undefined;
  return r ? mapCapa(r) : null;
}
export function capaExists(id: string): boolean {
  return Boolean(getDb().prepare("select 1 from capa_actions where id=?").get(id));
}

function nextRef(db = getDb()): string {
  const year = new Date().getFullYear();
  const prefix = `CAPA-${year}-`;
  const rows = db.prepare("select ref from capa_actions where ref like ?").all(`${prefix}%`) as { ref: string }[];
  let max = 0;
  rows.forEach((r) => {
    const n = parseInt(r.ref.slice(prefix.length), 10);
    if (Number.isFinite(n) && n > max) max = n;
  });
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

interface CapaFields {
  title?: string;
  description?: string;
  type?: string;
  priority?: string;
  sourceType?: string;
  sourceId?: string | null;
  ownerId?: string | null;
  dueDate?: string | null;
  status?: string;
  verification?: string;
}

export function createCapa(input: CapaFields & { title: string; createdBy: string }): string {
  const id = randomUUID();
  const db = getDb();
  db.prepare(
    "insert into capa_actions (id, ref, title, description, type, priority, source_type, source_id, owner_id, due_date, status, verification, created_by) values (?,?,?,?,?,?,?,?,?,?,?,?,?)"
  ).run(
    id,
    nextRef(db),
    input.title,
    input.description ?? "",
    CAPA_TYPES.includes(input.type ?? "") ? input.type : "Corrective",
    CAPA_PRIORITIES.includes(input.priority ?? "") ? input.priority : "Normale",
    SOURCES.includes(input.sourceType as CapaSource) ? input.sourceType : "manuel",
    input.sourceId ?? null,
    input.ownerId ?? input.createdBy,
    input.dueDate ?? null,
    CAPA_STATUS.includes(input.status ?? "") ? input.status : "Ouverte",
    input.verification ?? "",
    input.createdBy
  );
  return id;
}

export function updateCapa(id: string, fields: CapaFields): void {
  const db = getDb();
  const cur = db.prepare("select * from capa_actions where id=?").get(id) as CapaRow | undefined;
  if (!cur) return;
  const nextStatus = fields.status !== undefined && CAPA_STATUS.includes(fields.status) ? fields.status : cur.status;
  const closedAt = nextStatus === "Clôturée" ? cur.closed_at ?? now() : null;
  db.prepare(
    "update capa_actions set title=?, description=?, type=?, priority=?, owner_id=?, due_date=?, status=?, verification=?, closed_at=?, updated_at=? where id=?"
  ).run(
    fields.title ?? cur.title,
    fields.description !== undefined ? fields.description : cur.description,
    fields.type !== undefined && CAPA_TYPES.includes(fields.type) ? fields.type : cur.type,
    fields.priority !== undefined && CAPA_PRIORITIES.includes(fields.priority) ? fields.priority : cur.priority,
    fields.ownerId !== undefined ? fields.ownerId : cur.owner_id,
    fields.dueDate !== undefined ? fields.dueDate : cur.due_date,
    nextStatus,
    fields.verification !== undefined ? fields.verification : cur.verification,
    closedAt,
    now(),
    id
  );
}

export function deleteCapa(id: string): void {
  getDb().prepare("delete from capa_actions where id=?").run(id);
}

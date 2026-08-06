/* ==================================================================
 *  lib/db/fieldcontrols.ts — Contrôles terrain / rondes (module GRC).
 * ================================================================== */
import { randomUUID } from "node:crypto";
import { getDb } from "./index";
import { CHECK_RESULTS, FIELD_CONTROL_STATUS, type CheckItem, type FieldControl, type FieldControlEvent, type FieldEventKind } from "@/lib/domain";

const now = () => new Date().toISOString();

interface FcRow {
  id: string;
  ref: string;
  title: string;
  type: string;
  service: string;
  location: string;
  date: string | null;
  inspector_id: string | null;
  status: string;
  summary: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
interface ItemRow {
  id: string;
  control_id: string;
  label: string;
  result: string;
  note: string;
  framework_id: string;
  control_code: string;
  ordre: number;
}

interface EventRow {
  id: string;
  control_id: string;
  kind: string;
  label: string;
  from_status: string;
  to_status: string;
  author_id: string | null;
  at: string;
}

const mapItem = (r: ItemRow): CheckItem => ({
  id: r.id,
  label: r.label,
  result: CHECK_RESULTS.includes(r.result) ? r.result : "À vérifier",
  note: r.note,
  frameworkId: r.framework_id,
  controlCode: r.control_code,
});

const KINDS: FieldEventKind[] = ["creation", "statut", "action"];
const mapEvent = (r: EventRow): FieldControlEvent => ({
  id: r.id,
  kind: (KINDS.includes(r.kind as FieldEventKind) ? r.kind : "action") as FieldEventKind,
  label: r.label,
  fromStatus: r.from_status,
  toStatus: r.to_status,
  authorId: r.author_id,
  at: new Date(r.at),
});

function mapFc(r: FcRow, items: CheckItem[], events: FieldControlEvent[]): FieldControl {
  return {
    id: r.id,
    ref: r.ref,
    title: r.title,
    type: r.type,
    service: r.service,
    location: r.location,
    date: r.date ? new Date(r.date) : null,
    inspectorId: r.inspector_id ?? "",
    status: r.status,
    summary: r.summary,
    items,
    events,
    createdBy: r.created_by,
    createdAt: new Date(r.created_at),
    updatedAt: new Date(r.updated_at),
  };
}

function insertEvent(controlId: string, kind: FieldEventKind, label: string, fromStatus: string, toStatus: string, authorId: string | null): void {
  getDb()
    .prepare("insert into field_control_events (id, control_id, kind, label, from_status, to_status, author_id) values (?,?,?,?,?,?,?)")
    .run(randomUUID(), controlId, kind, label, fromStatus, toStatus, authorId);
}

export function listFieldControls(): FieldControl[] {
  const db = getDb();
  const rows = db.prepare("select * from field_controls order by coalesce(date, created_at) desc").all() as FcRow[];
  const items = db.prepare("select * from field_control_items order by ordre, rowid").all() as ItemRow[];
  const events = db.prepare("select * from field_control_events order by at asc, rowid").all() as EventRow[];
  const byControl = new Map<string, CheckItem[]>();
  items.forEach((it) => byControl.set(it.control_id, [...(byControl.get(it.control_id) ?? []), mapItem(it)]));
  const evByControl = new Map<string, FieldControlEvent[]>();
  events.forEach((e) => evByControl.set(e.control_id, [...(evByControl.get(e.control_id) ?? []), mapEvent(e)]));
  return rows.map((r) => mapFc(r, byControl.get(r.id) ?? [], evByControl.get(r.id) ?? []));
}

export function getFieldControl(id: string): FieldControl | null {
  const db = getDb();
  const r = db.prepare("select * from field_controls where id=?").get(id) as FcRow | undefined;
  if (!r) return null;
  const items = (db.prepare("select * from field_control_items where control_id=? order by ordre, rowid").all(id) as ItemRow[]).map(mapItem);
  const events = (db.prepare("select * from field_control_events where control_id=? order by at asc, rowid").all(id) as EventRow[]).map(mapEvent);
  return mapFc(r, items, events);
}

export function fieldControlExists(id: string): boolean {
  return Boolean(getDb().prepare("select 1 from field_controls where id=?").get(id));
}

function nextRef(db = getDb()): string {
  const year = new Date().getFullYear();
  const prefix = `CTRL-${year}-`;
  const rows = db.prepare("select ref from field_controls where ref like ?").all(`${prefix}%`) as { ref: string }[];
  let max = 0;
  rows.forEach((r) => {
    const n = parseInt(r.ref.slice(prefix.length), 10);
    if (Number.isFinite(n) && n > max) max = n;
  });
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

interface ItemInput {
  label: string;
  result?: string;
  note?: string;
  frameworkId?: string;
  controlCode?: string;
}
function setItems(controlId: string, items: ItemInput[]): void {
  const db = getDb();
  db.prepare("delete from field_control_items where control_id=?").run(controlId);
  const ins = db.prepare("insert into field_control_items (id, control_id, label, result, note, framework_id, control_code, ordre) values (?,?,?,?,?,?,?,?)");
  items
    .filter((it) => it.label?.trim())
    .forEach((it, idx) =>
      ins.run(randomUUID(), controlId, it.label.trim(), CHECK_RESULTS.includes(it.result ?? "") ? it.result : "À vérifier", it.note ?? "", it.frameworkId ?? "", it.controlCode ?? "", idx)
    );
}

interface FcFields {
  title?: string;
  type?: string;
  service?: string;
  location?: string;
  date?: string | null;
  inspectorId?: string | null;
  status?: string;
  summary?: string;
  items?: ItemInput[];
}

export function createFieldControl(input: FcFields & { title: string; createdBy: string }): string {
  const id = randomUUID();
  const db = getDb();
  db.prepare(
    "insert into field_controls (id, ref, title, type, service, location, date, inspector_id, status, summary, created_by) values (?,?,?,?,?,?,?,?,?,?,?)"
  ).run(
    id,
    nextRef(db),
    input.title,
    input.type ?? "",
    input.service ?? "",
    input.location ?? "",
    input.date ?? null,
    input.inspectorId ?? input.createdBy,
    FIELD_CONTROL_STATUS.includes(input.status ?? "") ? input.status : "Planifié",
    input.summary ?? "",
    input.createdBy
  );
  setItems(id, input.items ?? []);
  const st = FIELD_CONTROL_STATUS.includes(input.status ?? "") ? input.status! : "Planifié";
  insertEvent(id, "creation", `Contrôle créé (${st})`, "", st, input.createdBy);
  return id;
}

export function updateFieldControl(id: string, fields: FcFields, actorId: string | null = null): void {
  const db = getDb();
  const cur = db.prepare("select * from field_controls where id=?").get(id) as FcRow | undefined;
  if (!cur) return;
  const nextStatus = fields.status !== undefined && FIELD_CONTROL_STATUS.includes(fields.status) ? fields.status : cur.status;
  db.prepare(
    "update field_controls set title=?, type=?, service=?, location=?, date=?, inspector_id=?, status=?, summary=?, updated_at=? where id=?"
  ).run(
    fields.title ?? cur.title,
    fields.type !== undefined ? fields.type : cur.type,
    fields.service !== undefined ? fields.service : cur.service,
    fields.location !== undefined ? fields.location : cur.location,
    fields.date !== undefined ? fields.date : cur.date,
    fields.inspectorId !== undefined ? fields.inspectorId : cur.inspector_id,
    nextStatus,
    fields.summary !== undefined ? fields.summary : cur.summary,
    now(),
    id
  );
  if (fields.items) setItems(id, fields.items);
  // Trace automatique du changement d'état dans le fil de vie.
  if (nextStatus !== cur.status) {
    insertEvent(id, "statut", `Statut : ${cur.status} → ${nextStatus}`, cur.status, nextStatus, actorId);
  }
}

/** Ajoute une action de suivi (note datée) au fil de vie d'un contrôle. */
export function addFieldControlEvent(controlId: string, label: string, actorId: string | null): void {
  if (!label.trim()) return;
  insertEvent(controlId, "action", label.trim(), "", "", actorId);
  getDb().prepare("update field_controls set updated_at=? where id=?").run(now(), controlId);
}

/** Libellé d'un point de contrôle (pour tracer une action à partir d'un écart). */
export function checkItemLabel(itemId: string): string | null {
  const r = getDb().prepare("select label from field_control_items where id=?").get(itemId) as { label: string } | undefined;
  return r?.label ?? null;
}

export function deleteFieldControl(id: string): void {
  const db = getDb();
  db.prepare("delete from field_control_items where control_id=?").run(id);
  db.prepare("delete from field_control_events where control_id=?").run(id);
  db.prepare("delete from field_controls where id=?").run(id);
}

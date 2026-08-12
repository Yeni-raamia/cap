/* ==================================================================
 *  lib/db/meetings.ts — Module Réunion (serveur).
 *  Réunions autonomes ou reliées à des sujets existants + participants.
 * ================================================================== */
import { randomUUID } from "node:crypto";
import { getDb } from "./index";
import { DEFAULT_MEETING_DURATION, type Meeting, type MeetingAttachment, type MeetingLink, type MeetingParticipant, type MeetingPresence } from "@/lib/domain";

interface MeetingRow {
  id: string;
  title: string;
  agenda: string;
  date: string | null;
  location: string;
  visio_url: string;
  status: string;
  duration_minutes: number;
  notes: string;
  decisions: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Durée bornée : au moins 5 minutes, au plus une journée de 12 h. */
const cleanDuration = (v: unknown): number => {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return DEFAULT_MEETING_DURATION;
  return Math.min(720, Math.max(5, n));
};

const asPresence = (v: string): MeetingPresence =>
  v === "présent" || v === "absent" || v === "excusé" ? v : "invité";

function mapMeeting(
  r: MeetingRow,
  participants: MeetingParticipant[],
  links: MeetingLink[]
): Meeting {
  let decisions: string[] = [];
  try {
    decisions = JSON.parse(r.decisions || "[]");
  } catch {
    decisions = [];
  }
  return {
    id: r.id,
    title: r.title,
    agenda: r.agenda,
    date: r.date ? new Date(r.date) : null,
    location: r.location,
    visioUrl: r.visio_url ?? "",
    status: (r.status as Meeting["status"]) ?? "planifiée",
    durationMinutes: r.duration_minutes ?? DEFAULT_MEETING_DURATION,
    notes: r.notes,
    decisions,
    participants,
    links,
    createdBy: r.created_by ?? "",
    createdAt: new Date(r.created_at),
    updatedAt: new Date(r.updated_at),
  };
}

export function listMeetings(): Meeting[] {
  const db = getDb();
  const rows = db.prepare("select * from meetings order by coalesce(date, created_at) desc").all() as MeetingRow[];
  const parts = db.prepare("select meeting_id, kind, ref_id, presence from meeting_participants").all() as {
    meeting_id: string;
    kind: string;
    ref_id: string;
    presence: string;
  }[];
  const links = db.prepare("select meeting_id, ref_type, ref_id from meeting_links").all() as {
    meeting_id: string;
    ref_type: string;
    ref_id: string;
  }[];
  const pByM = new Map<string, MeetingParticipant[]>();
  parts.forEach((p) =>
    pByM.set(p.meeting_id, [
      ...(pByM.get(p.meeting_id) ?? []),
      { kind: p.kind === "contact" ? "contact" : "member", id: p.ref_id, presence: asPresence(p.presence) },
    ])
  );
  const lByM = new Map<string, MeetingLink[]>();
  links.forEach((l) =>
    lByM.set(l.meeting_id, [...(lByM.get(l.meeting_id) ?? []), { type: l.ref_type as MeetingLink["type"], id: l.ref_id }])
  );
  return rows.map((r) => mapMeeting(r, pByM.get(r.id) ?? [], lByM.get(r.id) ?? []));
}

export function getMeeting(id: string): Meeting | null {
  const db = getDb();
  const r = db.prepare("select * from meetings where id = ?").get(id) as MeetingRow | undefined;
  if (!r) return null;
  const participants = (db.prepare("select kind, ref_id, presence from meeting_participants where meeting_id = ?").all(id) as {
    kind: string;
    ref_id: string;
    presence: string;
  }[]).map((p) => ({ kind: p.kind === "contact" ? ("contact" as const) : ("member" as const), id: p.ref_id, presence: asPresence(p.presence) }));
  const links = (db.prepare("select ref_type, ref_id from meeting_links where meeting_id = ?").all(id) as {
    ref_type: string;
    ref_id: string;
  }[]).map((l) => ({ type: l.ref_type as MeetingLink["type"], id: l.ref_id }));
  return mapMeeting(r, participants, links);
}

function replaceParticipants(id: string, participants: MeetingParticipant[]): void {
  const db = getDb();
  db.prepare("delete from meeting_participants where meeting_id = ?").run(id);
  const ins = db.prepare("insert into meeting_participants (id, meeting_id, kind, ref_id, presence) values (?,?,?,?,?)");
  for (const p of participants) {
    if (!p?.id) continue;
    ins.run(randomUUID(), id, p.kind === "contact" ? "contact" : "member", p.id, asPresence(p.presence));
  }
}
function replaceLinks(id: string, links: MeetingLink[]): void {
  const db = getDb();
  db.prepare("delete from meeting_links where meeting_id = ?").run(id);
  const ins = db.prepare("insert into meeting_links (id, meeting_id, ref_type, ref_id) values (?,?,?,?)");
  for (const l of links) {
    if (!l?.id || !l?.type) continue;
    ins.run(randomUUID(), id, l.type, l.id);
  }
}

export function createMeeting(input: {
  title: string;
  agenda?: string;
  date?: string | null;
  location?: string;
  visioUrl?: string;
  status?: string;
  durationMinutes?: number;
  notes?: string;
  decisions?: string[];
  participants?: MeetingParticipant[];
  links?: MeetingLink[];
  createdBy: string;
}): string {
  const id = randomUUID();
  getDb()
    .prepare(
      "insert into meetings (id, title, agenda, date, location, visio_url, status, duration_minutes, notes, decisions, created_by) values (?,?,?,?,?,?,?,?,?,?,?)"
    )
    .run(
      id,
      input.title,
      input.agenda ?? "",
      input.date ?? null,
      input.location ?? "",
      input.visioUrl ?? "",
      input.status ?? "planifiée",
      cleanDuration(input.durationMinutes),
      input.notes ?? "",
      JSON.stringify(input.decisions ?? []),
      input.createdBy
    );
  replaceParticipants(id, input.participants ?? []);
  replaceLinks(id, input.links ?? []);
  return id;
}

export function updateMeeting(
  id: string,
  fields: {
    title?: string;
    agenda?: string;
    date?: string | null;
    location?: string;
    visioUrl?: string;
    status?: string;
    durationMinutes?: number;
    notes?: string;
    decisions?: string[];
    participants?: MeetingParticipant[];
    links?: MeetingLink[];
  }
): void {
  const db = getDb();
  const cur = db.prepare("select * from meetings where id = ?").get(id) as MeetingRow | undefined;
  if (!cur) return;
  db.prepare(
    "update meetings set title=?, agenda=?, date=?, location=?, visio_url=?, status=?, duration_minutes=?, notes=?, decisions=?, updated_at=datetime('now') where id=?"
  ).run(
    fields.title ?? cur.title,
    fields.agenda ?? cur.agenda,
    fields.date !== undefined ? fields.date : cur.date,
    fields.location ?? cur.location,
    fields.visioUrl ?? cur.visio_url,
    fields.status ?? cur.status,
    fields.durationMinutes !== undefined ? cleanDuration(fields.durationMinutes) : cur.duration_minutes,
    fields.notes ?? cur.notes,
    fields.decisions !== undefined ? JSON.stringify(fields.decisions) : cur.decisions,
    id
  );
  if (fields.participants !== undefined) replaceParticipants(id, fields.participants);
  if (fields.links !== undefined) replaceLinks(id, fields.links);
}

export function deleteMeeting(id: string): void {
  const db = getDb();
  const tx = db.transaction(() => {
    db.prepare("delete from meeting_participants where meeting_id = ?").run(id);
    db.prepare("delete from meeting_links where meeting_id = ?").run(id);
    db.prepare("delete from meeting_attachments where meeting_id = ?").run(id);
    db.prepare("delete from meetings where id = ?").run(id);
  });
  tx();
}

/* ---------- Pièces jointes ---------- */
interface AttRow {
  id: string;
  meeting_id: string;
  filename: string;
  mime: string;
  size: number;
  uploaded_by: string | null;
  created_at: string;
}
const mapAtt = (r: AttRow): MeetingAttachment => ({
  id: r.id,
  meetingId: r.meeting_id,
  filename: r.filename,
  mime: r.mime,
  size: r.size,
  uploadedBy: r.uploaded_by ?? "",
  createdAt: new Date(r.created_at),
});

export function listMeetingAttachments(meetingId: string): MeetingAttachment[] {
  return (
    getDb()
      .prepare("select id, meeting_id, filename, mime, size, uploaded_by, created_at from meeting_attachments where meeting_id = ? order by created_at")
      .all(meetingId) as AttRow[]
  ).map(mapAtt);
}
export function createMeetingAttachment(input: {
  meetingId: string;
  filename: string;
  mime: string;
  size: number;
  data: Buffer;
  uploadedBy: string;
}): MeetingAttachment {
  const id = randomUUID();
  getDb()
    .prepare("insert into meeting_attachments (id, meeting_id, filename, mime, size, data, uploaded_by) values (?,?,?,?,?,?,?)")
    .run(id, input.meetingId, input.filename, input.mime, input.size, input.data, input.uploadedBy);
  return mapAtt(
    getDb().prepare("select id, meeting_id, filename, mime, size, uploaded_by, created_at from meeting_attachments where id = ?").get(id) as AttRow
  );
}
export function getMeetingAttachmentData(id: string): { filename: string; mime: string; data: Buffer } | null {
  const r = getDb().prepare("select filename, mime, data from meeting_attachments where id = ?").get(id) as
    | { filename: string; mime: string; data: Buffer }
    | undefined;
  return r ?? null;
}
export function deleteMeetingAttachment(id: string): void {
  getDb().prepare("delete from meeting_attachments where id = ?").run(id);
}

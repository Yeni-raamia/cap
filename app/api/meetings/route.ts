/* Module Réunion. Lecture : tout utilisateur authentifié.
 * Écriture (créer/éditer/supprimer) : tout utilisateur non lecture seule. */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { denyReadOnly } from "@/lib/auth/guards";
import { createMeeting, deleteMeeting, getMeeting, listMeetings, updateMeeting } from "@/lib/db/meetings";
import { logActivity } from "@/lib/db/admin";
import { MEETING_LINK_TYPES, MEETING_STATUTS, type MeetingLink, type MeetingParticipant } from "@/lib/domain";

const LINK_TYPES = new Set(MEETING_LINK_TYPES.map((t) => t.type));
const toIso = (d?: string | null) => {
  if (!d) return null;
  const s = String(d);
  // Accepte "AAAA-MM-JJ" ou "AAAA-MM-JJTHH:MM".
  return s.includes("T") ? new Date(s).toISOString() : new Date(`${s}T00:00:00`).toISOString();
};
const cleanParticipants = (v: unknown): MeetingParticipant[] =>
  Array.isArray(v)
    ? v
        .filter((p): p is MeetingParticipant => !!p && typeof p.id === "string" && (p.kind === "member" || p.kind === "contact"))
        .map((p) => ({ kind: p.kind, id: p.id }))
    : [];
const cleanLinks = (v: unknown): MeetingLink[] =>
  Array.isArray(v)
    ? v
        .filter((l): l is MeetingLink => !!l && typeof l.id === "string" && LINK_TYPES.has(l.type))
        .map((l) => ({ type: l.type, id: l.id }))
    : [];
const cleanDecisions = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean).slice(0, 100) : [];

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  return NextResponse.json({ meetings: listMeetings() });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const ro = denyReadOnly(user);
  if (ro) return ro;

  const body = await request.json().catch(() => ({}));
  const op: string = body?.op;
  const status = MEETING_STATUTS.includes(body?.status) ? body.status : undefined;

  if (op === "create") {
    const title = String(body?.title || "").trim();
    if (!title) return NextResponse.json({ error: "Titre de la réunion requis." }, { status: 400 });
    const id = createMeeting({
      title,
      agenda: String(body?.agenda || ""),
      date: toIso(body?.date),
      location: String(body?.location || ""),
      status: status ?? "planifiée",
      notes: String(body?.notes || ""),
      decisions: cleanDecisions(body?.decisions),
      participants: cleanParticipants(body?.participants),
      links: cleanLinks(body?.links),
      createdBy: user.id,
    });
    logActivity(user.id, "meeting_create", title);
    return NextResponse.json({ meetings: listMeetings(), meeting: getMeeting(id) });
  }

  const id = String(body?.id || "");
  if (!id || !getMeeting(id)) return NextResponse.json({ error: "Réunion introuvable." }, { status: 404 });

  if (op === "update") {
    updateMeeting(id, {
      title: typeof body?.title === "string" ? body.title.trim() : undefined,
      agenda: typeof body?.agenda === "string" ? body.agenda : undefined,
      date: body?.date !== undefined ? toIso(body.date) : undefined,
      location: typeof body?.location === "string" ? body.location : undefined,
      status,
      notes: typeof body?.notes === "string" ? body.notes : undefined,
      decisions: body?.decisions !== undefined ? cleanDecisions(body.decisions) : undefined,
      participants: body?.participants !== undefined ? cleanParticipants(body.participants) : undefined,
      links: body?.links !== undefined ? cleanLinks(body.links) : undefined,
    });
    logActivity(user.id, "meeting_update", getMeeting(id)?.title ?? id);
    return NextResponse.json({ meetings: listMeetings(), meeting: getMeeting(id) });
  }

  if (op === "delete") {
    const title = getMeeting(id)?.title ?? id;
    deleteMeeting(id);
    logActivity(user.id, "meeting_delete", title);
    return NextResponse.json({ meetings: listMeetings() });
  }

  return NextResponse.json({ error: "Opération inconnue." }, { status: 400 });
}

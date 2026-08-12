/* Module Réunion. Lecture : tout utilisateur authentifié.
 * Écriture (créer/éditer/supprimer) : tout utilisateur non lecture seule. */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { denyReadOnly } from "@/lib/auth/guards";
import { createMeeting, deleteMeeting, getMeeting, listMeetings, updateMeeting } from "@/lib/db/meetings";
import { getEmailById, insertNotification } from "@/lib/db/repo";
import { getSettings, logActivity } from "@/lib/db/admin";
import { listContacts } from "@/lib/db/contacts";
import { isEmailConfigured, sendEmail } from "@/lib/reminders/email";
import { MEETING_LINK_TYPES, MEETING_PRESENCES, MEETING_STATUTS, type MeetingLink, type MeetingParticipant } from "@/lib/domain";

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
        .map((p) => ({ kind: p.kind, id: p.id, presence: MEETING_PRESENCES.includes(p.presence) ? p.presence : "invité" }))
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
      visioUrl: String(body?.visioUrl || ""),
      durationMinutes: body?.durationMinutes,
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
      visioUrl: typeof body?.visioUrl === "string" ? body.visioUrl : undefined,
      durationMinutes: body?.durationMinutes !== undefined ? Number(body.durationMinutes) : undefined,
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

  if (op === "invite") {
    const m = getMeeting(id);
    if (!m) return NextResponse.json({ error: "Réunion introuvable." }, { status: 404 });
    const whenTxt = m.date ? ` le ${m.date.toLocaleDateString("fr-FR")} à ${m.date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}` : "";
    const message = `Vous êtes invité·e à la réunion « ${m.title} »${whenTxt}${m.location ? ` — ${m.location}` : ""}.`;
    const emailOn = getSettings().emailEnabled && isEmailConfigured();
    const contactsById = new Map(listContacts().map((c) => [c.id, c]));
    let notified = 0;
    for (const p of m.participants) {
      if (p.kind === "member") {
        if (p.id !== user.id) {
          insertNotification({ userId: p.id, itemId: null, kind: "reunion", message, channel: emailOn ? ["in-app", "e-mail"] : ["in-app"] });
          notified++;
        }
        if (emailOn) {
          const to = getEmailById(p.id);
          if (to) void sendEmail(to, `Invitation — ${m.title}`, message).catch(() => {});
        }
      } else if (emailOn) {
        const c = contactsById.get(p.id);
        if (c?.email) void sendEmail(c.email, `Invitation — ${m.title}`, message).catch(() => {});
      }
    }
    logActivity(user.id, "meeting_invite", `${m.title} · ${m.participants.length} invité(s)`);
    return NextResponse.json({ meetings: listMeetings(), notified });
  }

  return NextResponse.json({ error: "Opération inconnue." }, { status: 400 });
}

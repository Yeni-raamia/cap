/* Pièces jointes d'une réunion (supports, PV…). Lecture : authentifié.
 * Écriture (upload/suppression) : utilisateur non lecture seule. */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { denyReadOnly } from "@/lib/auth/guards";
import {
  createMeetingAttachment,
  deleteMeetingAttachment,
  getMeeting,
  getMeetingAttachmentData,
  listMeetingAttachments,
} from "@/lib/db/meetings";
import { logActivity } from "@/lib/db/admin";
import { ATTACH_EXTS, ATTACH_MAX_BYTES, fileExt } from "@/lib/domain";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const p = new URL(request.url).searchParams;
  const dl = p.get("id");
  if (dl) {
    const a = getMeetingAttachmentData(dl);
    if (!a) return NextResponse.json({ error: "Pièce jointe introuvable." }, { status: 404 });
    return new Response(new Uint8Array(a.data), {
      headers: {
        "Content-Type": a.mime || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${a.filename}"`,
        "Content-Length": String(a.data.length),
        "Cache-Control": "no-store",
      },
    });
  }
  const meetingId = p.get("meetingId") || "";
  return NextResponse.json({ attachments: listMeetingAttachments(meetingId) });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const ro = denyReadOnly(user);
  if (ro) return ro;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
  const meetingId = String(form.get("meetingId") || "");
  const file = form.get("file");
  if (!getMeeting(meetingId)) return NextResponse.json({ error: "Réunion introuvable." }, { status: 404 });
  if (!(file instanceof File)) return NextResponse.json({ error: "Aucun fichier fourni." }, { status: 400 });
  if (file.size > ATTACH_MAX_BYTES) return NextResponse.json({ error: "Fichier trop volumineux (max 10 Mo)." }, { status: 400 });
  if (!ATTACH_EXTS.includes(fileExt(file.name))) {
    return NextResponse.json({ error: "Type de fichier non autorisé." }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  createMeetingAttachment({ meetingId, filename: file.name, mime: file.type || "", size: buf.length, data: buf, uploadedBy: user.id });
  logActivity(user.id, "meeting_update", `pièce jointe : ${file.name}`);
  return NextResponse.json({ attachments: listMeetingAttachments(meetingId) });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const ro = denyReadOnly(user);
  if (ro) return ro;
  const p = new URL(request.url).searchParams;
  const id = p.get("id") || "";
  const meetingId = p.get("meetingId") || "";
  if (!id) return NextResponse.json({ error: "Pièce jointe manquante." }, { status: 400 });
  deleteMeetingAttachment(id);
  return NextResponse.json({ attachments: listMeetingAttachments(meetingId) });
}

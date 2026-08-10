/* Pièce jointe d'un message : téléversement (POST multipart).
 * Crée un message (légende optionnelle) porteur du fichier, puis notifie. */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { denyReadOnly } from "@/lib/auth/guards";
import { listNotificationsFor } from "@/lib/db/repo";
import {
  canAccessConversation,
  ensureEntityConversation,
  listConversationsFor,
  listMessages,
  notifyMessage,
  postMessage,
} from "@/lib/db/messaging";
import { createMessageFile } from "@/lib/db/messagefiles";
import { logActivity } from "@/lib/db/admin";
import { ATTACH_EXTS, ATTACH_MAX_BYTES, fileExt } from "@/lib/domain";

const REF_TYPES = ["item", "negligence", "project", "meeting"];

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const ro = denyReadOnly(user); if (ro) return ro;

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Fichier manquant." }, { status: 400 });

  const ext = fileExt(file.name);
  if (!ATTACH_EXTS.includes(ext)) return NextResponse.json({ error: `Type de fichier non autorisé (.${ext}).` }, { status: 400 });
  if (file.size > ATTACH_MAX_BYTES) return NextResponse.json({ error: "Fichier trop volumineux (max 10 Mo)." }, { status: 400 });

  // Cible : conversation existante, ou fil d'entité (créé au besoin).
  let convId: string | null = (form?.get("convId") as string) || null;
  if (!convId) {
    const refType = String(form?.get("refType") || "");
    const refId = String(form?.get("refId") || "");
    if (!REF_TYPES.includes(refType) || !refId) return NextResponse.json({ error: "Conversation invalide." }, { status: 400 });
    convId = ensureEntityConversation(refType, refId, user.id);
  }
  if (!canAccessConversation(convId, user.id)) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const caption = String(form?.get("body") || "").trim().slice(0, 4000);
  const replyToRaw = form?.get("replyTo");
  const replyTo = typeof replyToRaw === "string" && replyToRaw ? replyToRaw : null;

  const messageId = postMessage(convId, user.id, caption, replyTo);
  const data = Buffer.from(await file.arrayBuffer());
  createMessageFile({
    messageId,
    conversationId: convId,
    filename: file.name.slice(0, 200),
    mime: file.type || "application/octet-stream",
    size: file.size,
    data,
    uploadedBy: user.id,
  });
  notifyMessage(convId, user.id, user.nom);
  logActivity(user.id, "message_file_add", file.name);

  return NextResponse.json({
    conversationId: convId,
    messages: listMessages(convId),
    conversations: listConversationsFor(user.id),
    notifications: listNotificationsFor(user.id),
  });
}

/* Suppression d'un message envoyé (auteur ou administrateur). */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { denyReadOnly } from "@/lib/auth/guards";
import {
  canAccessConversation,
  deleteMessage,
  listMessages,
  messageAuthor,
  messageConversation,
} from "@/lib/db/messaging";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const ro = denyReadOnly(user); if (ro) return ro;

  const body = await request.json().catch(() => ({}));
  const messageId: string = body?.messageId;
  if (!messageId) return NextResponse.json({ error: "Message manquant." }, { status: 400 });

  const convId = messageConversation(messageId);
  if (!convId) return NextResponse.json({ error: "Message introuvable." }, { status: 404 });
  if (!canAccessConversation(convId, user.id)) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  // Seul l'auteur du message (ou un administrateur) peut le supprimer.
  if (messageAuthor(messageId) !== user.id && user.role !== "admin") {
    return NextResponse.json({ error: "Vous ne pouvez supprimer que vos propres messages." }, { status: 403 });
  }

  deleteMessage(messageId);
  return NextResponse.json({ conversationId: convId, messages: listMessages(convId) });
}

/* ==================================================================
 *  /api/messages/react — Basculer une réaction emoji sur un message.
 * ================================================================== */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { denyReadOnly } from "@/lib/auth/guards";
import { canAccessConversation, listMessages, messageConversation, toggleReaction } from "@/lib/db/messaging";
import { REACTION_EMOJIS } from "@/lib/domain";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const _ro = denyReadOnly(user); if (_ro) return _ro;

  const body = await request.json().catch(() => ({}));
  const messageId: string = body?.messageId;
  const emoji: string = body?.emoji;
  if (!messageId || !emoji) return NextResponse.json({ error: "Paramètres manquants." }, { status: 400 });
  if (!REACTION_EMOJIS.includes(emoji)) return NextResponse.json({ error: "Réaction non autorisée." }, { status: 400 });

  const convId = messageConversation(messageId);
  if (!convId) return NextResponse.json({ error: "Message introuvable." }, { status: 404 });
  if (!canAccessConversation(convId, user.id)) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  toggleReaction(messageId, user.id, emoji);
  return NextResponse.json({ conversationId: convId, messages: listMessages(convId) });
}

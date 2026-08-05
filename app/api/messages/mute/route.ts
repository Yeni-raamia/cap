/* Couper / réactiver les notifications d'un fil de discussion, pour l'utilisateur
 * courant uniquement (préférence personnelle — pas une mutation partagée). */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { listNotificationsFor } from "@/lib/db/repo";
import {
  canAccessConversation,
  ensureEntityConversation,
  listConversationsFor,
  setConversationMute,
} from "@/lib/db/messaging";

const REF_TYPES = ["item", "negligence", "project", "meeting"];

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const muted = Boolean(body?.muted);
  let convId: string | null = typeof body?.convId === "string" && body.convId ? body.convId : null;
  if (!convId) {
    const refType: string = body?.refType;
    const refId: string = body?.refId;
    if (!REF_TYPES.includes(refType) || !refId) {
      return NextResponse.json({ error: "Conversation invalide." }, { status: 400 });
    }
    convId = ensureEntityConversation(refType, refId, user.id);
  }
  if (!canAccessConversation(convId, user.id)) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  setConversationMute(convId, user.id, muted);
  return NextResponse.json({
    conversationId: convId,
    muted,
    conversations: listConversationsFor(user.id),
    notifications: listNotificationsFor(user.id),
  });
}

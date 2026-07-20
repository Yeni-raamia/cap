import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { listNotificationsFor } from "@/lib/db/repo";
import {
  canAccessConversation,
  ensureEntityConversation,
  findEntityConversation,
  listConversationsFor,
  listMessages,
  markConvNotificationsRead,
  markRead,
  notifyMessage,
  postMessage,
} from "@/lib/db/messaging";

const REF_TYPES = ["item", "negligence", "project"];

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const url = new URL(request.url);
  let convId = url.searchParams.get("convId");
  const refType = url.searchParams.get("refType");
  const refId = url.searchParams.get("refId");

  if (!convId && refType && refId) convId = findEntityConversation(refType, refId);
  if (!convId) return NextResponse.json({ conversationId: null, messages: [] });
  if (!canAccessConversation(convId, user.id)) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  markRead(convId, user.id);
  markConvNotificationsRead(user.id, convId);
  return NextResponse.json({ conversationId: convId, messages: listMessages(convId), notifications: listNotificationsFor(user.id) });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const text = String(body?.body || "").trim();
  if (!text) return NextResponse.json({ error: "Message vide." }, { status: 400 });

  let convId: string | null = body?.convId ?? null;
  if (!convId) {
    const refType: string = body?.refType;
    const refId: string = body?.refId;
    if (!REF_TYPES.includes(refType) || !refId) {
      return NextResponse.json({ error: "Conversation invalide." }, { status: 400 });
    }
    convId = ensureEntityConversation(refType, refId, user.id);
  }
  if (!canAccessConversation(convId, user.id)) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  postMessage(convId, user.id, text);
  notifyMessage(convId, user.id, user.nom);

  return NextResponse.json({
    conversationId: convId,
    messages: listMessages(convId),
    conversations: listConversationsFor(user.id),
    notifications: listNotificationsFor(user.id),
  });
}

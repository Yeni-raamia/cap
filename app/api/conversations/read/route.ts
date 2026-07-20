import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { listNotificationsFor } from "@/lib/db/repo";
import { canAccessConversation, listConversationsFor, markConvNotificationsRead, markRead } from "@/lib/db/messaging";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const convId: string = body?.convId;
  if (!convId || !canAccessConversation(convId, user.id)) return NextResponse.json({ error: "Conversation invalide." }, { status: 400 });
  markRead(convId, user.id);
  markConvNotificationsRead(user.id, convId);
  return NextResponse.json({ conversations: listConversationsFor(user.id), notifications: listNotificationsFor(user.id) });
}

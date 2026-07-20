/* Suppression d'un groupe de discussion (créateur ou administrateur). */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { denyReadOnly } from "@/lib/auth/guards";
import { listNotificationsFor } from "@/lib/db/repo";
import { conversationMeta, deleteConversation, listConversationsFor } from "@/lib/db/messaging";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const ro = denyReadOnly(user); if (ro) return ro;

  const body = await request.json().catch(() => ({}));
  const convId: string = body?.convId;
  if (!convId) return NextResponse.json({ error: "Conversation manquante." }, { status: 400 });

  const meta = conversationMeta(convId);
  if (!meta) return NextResponse.json({ error: "Conversation introuvable." }, { status: 404 });
  if (meta.kind !== "group") {
    return NextResponse.json({ error: "Seuls les groupes peuvent être supprimés." }, { status: 400 });
  }
  // Seul le créateur du groupe ou un administrateur peut le supprimer.
  if (meta.createdBy !== user.id && user.role !== "admin") {
    return NextResponse.json({ error: "Seul le créateur du groupe peut le supprimer." }, { status: 403 });
  }

  deleteConversation(convId);
  return NextResponse.json({ conversations: listConversationsFor(user.id), notifications: listNotificationsFor(user.id) });
}

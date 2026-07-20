import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { denyReadOnly } from "@/lib/auth/guards";
import { listNotificationsFor } from "@/lib/db/repo";
import { createGroup, listConversationsFor } from "@/lib/db/messaging";

// Rafraîchissement (sondage) : conversations + notifications de l'utilisateur.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  return NextResponse.json({ conversations: listConversationsFor(user.id), notifications: listNotificationsFor(user.id) });
}

// Création d'un groupe de discussion.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const ro = denyReadOnly(user); if (ro) return ro;

  const body = await request.json().catch(() => ({}));
  const title = String(body?.title || "").trim();
  const memberIds: string[] = Array.isArray(body?.memberIds) ? body.memberIds.filter((x: unknown) => typeof x === "string") : [];
  if (!title) return NextResponse.json({ error: "Titre du groupe requis." }, { status: 400 });

  const id = createGroup(title, memberIds, user.id);
  return NextResponse.json({ conversationId: id, conversations: listConversationsFor(user.id) });
}

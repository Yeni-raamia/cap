import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { denyReadOnly } from "@/lib/auth/guards";
import { getProfileById, listNotificationsFor } from "@/lib/db/repo";
import { createGroup, ensureDirectConversation, listConversationsFor } from "@/lib/db/messaging";

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

  // Conversation privée (1:1) avec une autre personne.
  const directWith = typeof body?.directWith === "string" ? body.directWith : null;
  if (directWith) {
    if (directWith === user.id) return NextResponse.json({ error: "Conversation avec soi-même impossible." }, { status: 400 });
    const other = getProfileById(directWith);
    if (!other || !other.approved || other.role === "dsi") {
      return NextResponse.json({ error: "Destinataire invalide." }, { status: 400 });
    }
    const id = ensureDirectConversation(user.id, directWith);
    return NextResponse.json({ conversationId: id, conversations: listConversationsFor(user.id) });
  }

  const title = String(body?.title || "").trim();
  const memberIds: string[] = Array.isArray(body?.memberIds) ? body.memberIds.filter((x: unknown) => typeof x === "string") : [];
  if (!title) return NextResponse.json({ error: "Titre du groupe requis." }, { status: 400 });

  const id = createGroup(title, memberIds, user.id);
  return NextResponse.json({ conversationId: id, conversations: listConversationsFor(user.id) });
}

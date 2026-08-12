/* Présence par sondage (pas de WebSocket en local).
 * POST : battement de cœur ; état de saisie optionnel pour un fil.
 * Renvoie : en ligne, membres du fil, qui écrit, dernières lectures. */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { canAccessConversation, markRead, memberIds } from "@/lib/db/messaging";
import { markUsage } from "@/lib/db/usage";
import { conversationReadMap, onlineUserIds, setTyping, touchPresence, typingUserIds } from "@/lib/db/presence";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  touchPresence(user.id);

  const body = await request.json().catch(() => ({}));
  const convId: string | null = typeof body?.convId === "string" && body.convId ? body.convId : null;
  const typing = Boolean(body?.typing);

  /* Mesure d'adoption : on ne marque que si la personne a réellement interagi
   * récemment. Un onglet ouvert sans personne devant ne compte pas — sinon
   * la mesure dirait « présent » pour une journée de réunion. */
  if (body?.active === true) {
    markUsage(user.id, typeof body?.page === "string" ? body.page : "");
  }

  let members: string[] = [];
  let typers: string[] = [];
  let reads: Record<string, string> = {};
  if (convId && canAccessConversation(convId, user.id)) {
    setTyping(convId, user.id, typing);
    // L'utilisateur regarde ce fil : on rafraîchit sa lecture (accusés plus réactifs).
    markRead(convId, user.id);
    members = memberIds(convId);
    typers = typingUserIds(convId, user.id);
    reads = conversationReadMap(convId);
  }

  return NextResponse.json({ onlineIds: onlineUserIds(), memberIds: members, typing: typers, reads });
}

/* Sessions actives du compte : liste des appareils connectés et révocation.
 * La session courante est identifiée pour éviter de se déconnecter soi-même. */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAuthUser } from "@/lib/auth/session";
import { SESSION_COOKIE } from "@/lib/auth/session";
import { listSessionsForUser, revokeOtherSessions, revokeSession } from "@/lib/db/repo";
import { logActivity } from "@/lib/db/admin";

async function currentToken() {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  return NextResponse.json({ sessions: listSessionsForUser(user.id, await currentToken()) });
}

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const { action, id } = await request.json().catch(() => ({}));
  const token = await currentToken();

  if (action === "revoke_others") {
    const n = token ? revokeOtherSessions(user.id, token) : 0;
    if (n > 0) logActivity(user.id, "session_revoke_others", `${n} session(s)`);
  } else if (action === "revoke") {
    if (typeof id !== "string" || !id) {
      return NextResponse.json({ error: "Session invalide." }, { status: 400 });
    }
    // Refus de révoquer la session courante via cette action (utiliser la déconnexion).
    const target = listSessionsForUser(user.id, token).find((s) => s.id === id);
    if (target?.current) {
      return NextResponse.json({ error: "Utilisez « Se déconnecter » pour la session courante." }, { status: 400 });
    }
    if (!revokeSession(user.id, id)) {
      return NextResponse.json({ error: "Session introuvable." }, { status: 404 });
    }
    logActivity(user.id, "session_revoke", target?.device ?? "");
  } else {
    return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
  }

  return NextResponse.json({ sessions: listSessionsForUser(user.id, token) });
}

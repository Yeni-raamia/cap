import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { listNotificationsFor, markAllReadFor, markNotificationRead } from "@/lib/db/repo";

/** Marque comme lu(e) : une notification précise si `id` est fourni, sinon toutes. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const { id } = await request.json().catch(() => ({}));
  if (typeof id === "string" && id) markNotificationRead(user.id, id);
  else markAllReadFor(user.id);

  return NextResponse.json({ notifications: listNotificationsFor(user.id) });
}

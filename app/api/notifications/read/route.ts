import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { listNotificationsFor, markAllReadFor } from "@/lib/db/repo";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  markAllReadFor(user.id);
  return NextResponse.json({ notifications: listNotificationsFor(user.id) });
}

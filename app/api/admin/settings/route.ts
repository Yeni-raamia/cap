import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getSettings, listActivity, logActivity, setSetting } from "@/lib/db/admin";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Réservé aux administrateurs." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  if (typeof body?.orgName === "string") setSetting("org_name", body.orgName.trim() || "Équipe sécurité");
  if (typeof body?.emailEnabled === "boolean") setSetting("email_enabled", body.emailEnabled ? "1" : "0");
  if (typeof body?.digestHour === "string" && /^\d{2}:\d{2}$/.test(body.digestHour))
    setSetting("digest_hour", body.digestHour);

  logActivity(user.id, "settings_update", "Paramètres modifiés");
  return NextResponse.json({ settings: getSettings(), journal: listActivity(60) });
}

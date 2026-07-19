import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { adminCounts, getSettings, lastReminderRun, listActivity, listMembers } from "@/lib/db/admin";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Réservé aux administrateurs." }, { status: 403 });
  }
  return NextResponse.json({
    members: listMembers(),
    journal: listActivity(60),
    counts: adminCounts(),
    settings: getSettings(),
    lastReminder: lastReminderRun(),
  });
}

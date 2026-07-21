/* Paramètres de sécurité — lecture/écriture réservée aux administrateurs. */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getSecuritySettings, logActivity, setSecuritySettings } from "@/lib/db/admin";
import type { SecuritySettings } from "@/lib/domain";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Réservé aux administrateurs." }, { status: 403 });
  return NextResponse.json({ security: getSecuritySettings() });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Réservé aux administrateurs." }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as Partial<SecuritySettings>;
  const patch: Partial<SecuritySettings> = {};
  if (typeof body.approvalRequired === "boolean") patch.approvalRequired = body.approvalRequired;
  if (typeof body.hstsEnabled === "boolean") patch.hstsEnabled = body.hstsEnabled;
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
  if (num(body.passwordMinLength) !== undefined) patch.passwordMinLength = body.passwordMinLength;
  if (num(body.loginMaxAttempts) !== undefined) patch.loginMaxAttempts = body.loginMaxAttempts;
  if (num(body.loginWindowMin) !== undefined) patch.loginWindowMin = body.loginWindowMin;
  if (num(body.sessionDays) !== undefined) patch.sessionDays = body.sessionDays;
  if (num(body.passwordMaxAgeDays) !== undefined) patch.passwordMaxAgeDays = body.passwordMaxAgeDays;

  setSecuritySettings(patch);
  logActivity(user.id, "security_settings", Object.keys(patch).join(", ") || "—");
  return NextResponse.json({ security: getSecuritySettings() });
}

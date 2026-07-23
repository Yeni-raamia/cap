/* 2FA — étape 2 : confirme un code TOTP, active la 2FA et renvoie les codes
 * de secours (affichés UNE seule fois côté client). */
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/session";
import { enableTotp, getTotp } from "@/lib/db/repo";
import { generateBackupCodes, hashBackupCodes, verifyTotp } from "@/lib/auth/totp";
import { logActivity } from "@/lib/db/admin";

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user || !user.approved) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const { code } = await request.json().catch(() => ({}));
  const t = getTotp(user.id);
  if (!t?.secret) return NextResponse.json({ error: "Commencez par la configuration." }, { status: 400 });
  if (t.enabled) return NextResponse.json({ error: "La double authentification est déjà active." }, { status: 400 });
  if (!verifyTotp(t.secret, String(code || ""))) {
    return NextResponse.json({ error: "Code incorrect. Vérifiez l'heure de votre téléphone." }, { status: 401 });
  }

  const backupCodes = generateBackupCodes(8);
  enableTotp(user.id, hashBackupCodes(backupCodes));
  logActivity(user.id, "2fa_enabled");
  return NextResponse.json({ ok: true, backupCodes });
}

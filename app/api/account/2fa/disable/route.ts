/* 2FA — désactivation : exige le mot de passe courant, puis efface secret et
 * codes de secours. Refusé si l'admin impose la 2FA pour tous. */
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/session";
import { disableTotp, getPasswordHashById, getTotp } from "@/lib/db/repo";
import { verifyPassword } from "@/lib/auth/password";
import { getSecuritySettings, logActivity } from "@/lib/db/admin";

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user || !user.approved) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!getTotp(user.id)?.enabled) {
    return NextResponse.json({ error: "La double authentification n'est pas active." }, { status: 400 });
  }
  if (getSecuritySettings().twofaRequired) {
    return NextResponse.json(
      { error: "La double authentification est obligatoire (politique de l'organisation)." },
      { status: 403 }
    );
  }

  const { password } = await request.json().catch(() => ({}));
  const hash = getPasswordHashById(user.id);
  if (!hash || !verifyPassword(String(password || ""), hash)) {
    return NextResponse.json({ error: "Mot de passe incorrect." }, { status: 401 });
  }

  disableTotp(user.id);
  logActivity(user.id, "2fa_disabled");
  return NextResponse.json({ ok: true });
}

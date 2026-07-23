/* 2FA — étape 1 : génère un secret TOTP en attente et l'URL d'enrôlement.
 * Le secret n'est PAS encore actif : il faut confirmer un code via /enable. */
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/session";
import { getTotp, setTotpSecret } from "@/lib/db/repo";
import { generateTotpSecret, otpauthUrl } from "@/lib/auth/totp";
import { qrDataUrl } from "@/lib/auth/qr";
import { getSettings } from "@/lib/db/admin";

export async function POST() {
  const user = await getAuthUser();
  if (!user || !user.approved) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (getTotp(user.id)?.enabled) {
    return NextResponse.json({ error: "La double authentification est déjà active." }, { status: 400 });
  }
  const secret = generateTotpSecret();
  setTotpSecret(user.id, secret);
  const url = otpauthUrl(secret, user.nom, getSettings().orgName);
  return NextResponse.json({ secret, otpauthUrl: url, qr: await qrDataUrl(url) });
}

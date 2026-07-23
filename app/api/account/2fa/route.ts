/* État 2FA pour l'espace membre : indique si la double authentification est
 * imposée par la politique de sécurité (bouton « Désactiver » verrouillé). */
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/session";
import { getSecuritySettings } from "@/lib/db/admin";

export async function GET() {
  const user = await getAuthUser();
  if (!user || !user.approved) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  return NextResponse.json({ enabled: user.totpEnabled, forced: getSecuritySettings().twofaRequired });
}

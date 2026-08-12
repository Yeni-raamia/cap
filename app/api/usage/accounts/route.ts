/* ==================================================================
 *  /api/usage/accounts — Journal de connexion, nominatif.
 *
 *  Accès restreint : seuls directeur et administrateur voient toute
 *  l'équipe. Toute autre personne ne reçoit QUE sa propre ligne — c'est
 *  la contrepartie de la mesure : rien n'est observé dans son dos.
 * ================================================================== */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { accountActivity, USAGE_RETENTION_DAYS } from "@/lib/db/usage";

const canViewAll = (role: string) => role === "directeur" || role === "admin";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const url = new URL(request.url);
  const days = Math.min(180, Math.max(7, Number(url.searchParams.get("days") ?? 30)));
  const all = accountActivity(days);

  return NextResponse.json({
    days,
    retentionDays: USAGE_RETENTION_DAYS,
    scope: canViewAll(user.role) ? "equipe" : "moi",
    comptes: canViewAll(user.role) ? all : all.filter((a) => a.profileId === user.id),
  });
}

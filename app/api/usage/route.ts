/* ==================================================================
 *  /api/usage — Mesure d'adoption de l'application.
 *
 *  Sortie strictement NON NOMINATIVE : uniquement des comptages de
 *  personnes distinctes. Réservé aux rôles de pilotage.
 * ================================================================== */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { listProfiles } from "@/lib/db/repo";
import {
  activeUserCount,
  activeUsersPerDay,
  topPages,
  usageHeatmap,
  USAGE_RETENTION_DAYS,
} from "@/lib/db/usage";

const canView = (role: string) => ["manager", "directeur", "admin", "dsi"].includes(role);

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!canView(user.role)) {
    return NextResponse.json({ error: "Réservé aux rôles de pilotage." }, { status: 403 });
  }

  const url = new URL(request.url);
  const days = Math.min(180, Math.max(7, Number(url.searchParams.get("days") ?? 30)));

  // Dénominateur du taux d'adoption : les comptes de l'équipe.
  const comptes = listProfiles().length;

  return NextResponse.json({
    days,
    retentionDays: USAGE_RETENTION_DAYS,
    comptes,
    actifs7: activeUserCount(7),
    actifs30: activeUserCount(30),
    parJour: activeUsersPerDay(days),
    heures: usageHeatmap(days),
    pages: topPages(days, 10),
  });
}

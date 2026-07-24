/* Journal d'audit filtré (admin). Filtres : type d'événement (action),
 * acteur (actorId), périmètre sécurité (security=1), recherche (q), limite.
 * Utilisé par le panneau « Journal d'audit » et son export CSV. */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { queryActivity } from "@/lib/db/admin";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Réservé aux administrateurs." }, { status: 403 });
  }
  const p = new URL(request.url).searchParams;
  const limit = Number(p.get("limit"));
  const entries = queryActivity({
    action: p.get("action") || undefined,
    actorId: p.get("actorId") || undefined,
    securityOnly: p.get("security") === "1",
    q: p.get("q") || undefined,
    limit: Number.isFinite(limit) && limit > 0 ? limit : undefined,
  });
  return NextResponse.json({ entries });
}

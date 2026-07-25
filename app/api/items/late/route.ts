/* Marque (ou lève) l'état « En retard » d'un suivi. RBAC : propriétaire,
 * ou directeur/admin ; refusé en lecture seule. */
import { NextResponse } from "next/server";
import { canEditItem, getItem, listItems, setItemMarkedLate } from "@/lib/db/repo";
import { logActivity } from "@/lib/db/admin";
import { getCurrentUser } from "@/lib/auth/session";
import { denyReadOnly } from "@/lib/auth/guards";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const ro = denyReadOnly(user);
  if (ro) return ro;

  const { itemId, late } = await request.json().catch(() => ({}));
  if (!itemId || !getItem(itemId)) return NextResponse.json({ error: "Suivi introuvable." }, { status: 404 });
  if (!canEditItem(itemId, user)) {
    return NextResponse.json({ error: "Droits insuffisants sur cet objet." }, { status: 403 });
  }

  setItemMarkedLate(itemId, user.id, Boolean(late));
  logActivity(user.id, "item_late", `${getItem(itemId)?.ref ?? itemId} · ${late ? "en retard" : "retard levé"}`);
  return NextResponse.json({ items: listItems() });
}

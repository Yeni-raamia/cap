/* Publie un suivi (irréversible) : le rend visible par toute l'équipe.
 * RBAC : propriétaire, ou directeur/admin ; refusé en lecture seule. */
import { NextResponse } from "next/server";
import { canEditItem, getItem, listItems, publishItem } from "@/lib/db/repo";
import { logActivity } from "@/lib/db/admin";
import { getCurrentUser } from "@/lib/auth/session";
import { denyReadOnly } from "@/lib/auth/guards";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const ro = denyReadOnly(user);
  if (ro) return ro;

  const { itemId } = await request.json().catch(() => ({}));
  const item = itemId ? getItem(itemId) : null;
  if (!item) return NextResponse.json({ error: "Suivi introuvable." }, { status: 404 });
  if (!canEditItem(itemId, user)) {
    return NextResponse.json({ error: "Droits insuffisants sur cet objet." }, { status: 403 });
  }

  publishItem(itemId, user.id);
  logActivity(user.id, "item_publish", item.ref);
  return NextResponse.json({ items: listItems(user.id) });
}

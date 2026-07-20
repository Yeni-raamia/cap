import { NextResponse } from "next/server";
import { applyAction, canEditItem, getItem, listItems } from "@/lib/db/repo";
import { logActivity } from "@/lib/db/admin";
import { getCurrentUser } from "@/lib/auth/session";
import { denyReadOnly } from "@/lib/auth/guards";

const ACTIONS = ["relance", "reponse", "bloque", "cloture"] as const;
type Action = (typeof ACTIONS)[number];

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const _ro = denyReadOnly(user); if (_ro) return _ro;

  const body = await request.json().catch(() => ({}));
  const itemId: string = body?.itemId;
  const action: Action = body?.action;
  const cause: string | undefined = body?.cause;

  if (!itemId || !ACTIONS.includes(action)) {
    return NextResponse.json({ error: "Action invalide." }, { status: 400 });
  }

  // RBAC serveur : seul le propriétaire (ou directeur/admin) peut éditer.
  if (!canEditItem(itemId, user)) {
    return NextResponse.json({ error: "Droits insuffisants sur cet objet." }, { status: 403 });
  }

  applyAction(itemId, action, cause, user.id);
  logActivity(user.id, `item_${action}`, getItem(itemId)?.ref ?? itemId);
  return NextResponse.json({ items: listItems() });
}

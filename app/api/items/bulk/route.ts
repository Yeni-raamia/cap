/* Actions groupées sur des suivis : relance / réponse / clôture d'un lot.
 * Chaque suivi est traité si l'utilisateur a le droit de l'éditer ; les autres
 * sont ignorés et comptés. RBAC : propriétaire, ou directeur/admin. */
import { NextResponse } from "next/server";
import { applyAction, canEditItem, listItems } from "@/lib/db/repo";
import { logActivity } from "@/lib/db/admin";
import { getCurrentUser } from "@/lib/auth/session";
import { denyReadOnly } from "@/lib/auth/guards";

const ACTIONS = ["relance", "reponse", "cloture"] as const;
type Action = (typeof ACTIONS)[number];

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const ro = denyReadOnly(user);
  if (ro) return ro;

  const body = await request.json().catch(() => ({}));
  const action: Action = body?.action;
  const rawIds: unknown[] = Array.isArray(body?.ids) ? body.ids : [];
  const ids: string[] = [...new Set(rawIds.filter((x): x is string => typeof x === "string"))];

  if (!ACTIONS.includes(action)) {
    return NextResponse.json({ error: "Action groupée invalide." }, { status: 400 });
  }
  if (ids.length === 0) {
    return NextResponse.json({ error: "Aucun suivi sélectionné." }, { status: 400 });
  }
  if (ids.length > 200) {
    return NextResponse.json({ error: "Trop de suivis sélectionnés (max 200)." }, { status: 400 });
  }

  let applied = 0;
  let skipped = 0;
  for (const id of ids) {
    if (canEditItem(id, user)) {
      applyAction(id, action, undefined, user.id);
      applied++;
    } else {
      skipped++;
    }
  }

  logActivity(user.id, `item_bulk_${action}`, `${applied} suivi(s)${skipped ? `, ${skipped} ignoré(s)` : ""}`);
  return NextResponse.json({ items: listItems(), applied, skipped });
}

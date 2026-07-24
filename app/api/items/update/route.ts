/* Édition des métadonnées d'un suivi (objet, priorité, points clés, personnes).
 * RBAC : propriétaire, ou directeur/admin ; refusé en lecture seule. */
import { NextResponse } from "next/server";
import { canEditItem, getItem, listItems, updateItem } from "@/lib/db/repo";
import { logActivity } from "@/lib/db/admin";
import { getCurrentUser } from "@/lib/auth/session";
import { denyReadOnly } from "@/lib/auth/guards";
import type { Person, Priorite } from "@/lib/domain";

const PRIORITES: Priorite[] = ["Critique", "Élevé", "Moyenne"];
const KINDS: Person["kind"][] = ["destinataire", "copie", "impliqué"];

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const ro = denyReadOnly(user);
  if (ro) return ro;

  const body = await request.json().catch(() => ({}));
  const itemId: string = body?.itemId;
  if (!itemId) return NextResponse.json({ error: "Suivi invalide." }, { status: 400 });
  if (!canEditItem(itemId, user)) {
    return NextResponse.json({ error: "Droits insuffisants sur cet objet." }, { status: 403 });
  }

  const fields: { objet?: string; priorite?: Priorite; pointsCles?: string[]; personnes?: Person[] } = {};
  if (typeof body?.objet === "string") {
    if (!body.objet.trim()) return NextResponse.json({ error: "L'objet ne peut pas être vide." }, { status: 400 });
    fields.objet = body.objet;
  }
  if (typeof body?.priorite === "string") {
    if (!PRIORITES.includes(body.priorite)) return NextResponse.json({ error: "Priorité invalide." }, { status: 400 });
    fields.priorite = body.priorite;
  }
  if (Array.isArray(body?.pointsCles)) {
    fields.pointsCles = body.pointsCles.map((p: unknown) => String(p ?? "")).slice(0, 40);
  }
  if (Array.isArray(body?.personnes)) {
    fields.personnes = body.personnes
      .filter((p: Person) => p && typeof p.name === "string" && KINDS.includes(p.kind))
      .slice(0, 40)
      .map((p: Person) => ({ name: p.name, kind: p.kind, service: p.service ?? null }));
  }

  if (Object.keys(fields).length === 0) {
    return NextResponse.json({ error: "Aucune modification." }, { status: 400 });
  }

  updateItem(itemId, user.id, fields);
  logActivity(user.id, "item_update", getItem(itemId)?.ref ?? itemId);
  return NextResponse.json({ items: listItems() });
}

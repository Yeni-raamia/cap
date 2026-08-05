/* Correction/fusion d'un nom de destinataire sur tous les suivis.
 * Réservé aux administrateurs : nettoyage contrôlé des orthographes divergentes
 * qui faussent les statistiques (aucune modification possible depuis les stats). */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { listItems, renamePerson } from "@/lib/db/repo";
import { logActivity } from "@/lib/db/admin";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Réservé aux administrateurs." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const oldName = String(body?.oldName || "").trim();
  const newName = String(body?.newName || "").trim();
  if (!oldName || !newName) return NextResponse.json({ error: "Ancien et nouveau nom requis." }, { status: 400 });
  if (oldName === newName) return NextResponse.json({ error: "Les deux noms sont identiques." }, { status: 400 });

  const updated = renamePerson(oldName, newName);
  logActivity(user.id, "person_rename", `${oldName} → ${newName} (${updated})`);
  return NextResponse.json({ items: listItems(user.id), updated });
}

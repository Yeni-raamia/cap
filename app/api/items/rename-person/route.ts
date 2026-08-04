/* Renomme un destinataire/personne partout (correction d'orthographe, fusion).
 * Réservé aux directeurs/admins : c'est une correction transverse des données. */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { denyReadOnly } from "@/lib/auth/guards";
import { listItems, renamePerson } from "@/lib/db/repo";
import { logActivity } from "@/lib/db/admin";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const ro = denyReadOnly(user);
  if (ro) return ro;
  if (user.role !== "directeur" && user.role !== "admin") {
    return NextResponse.json({ error: "Réservé aux directeurs et administrateurs." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const oldName = String(body?.oldName || "").trim();
  const newName = String(body?.newName || "").trim();
  if (!oldName || !newName) return NextResponse.json({ error: "Ancien et nouveau nom requis." }, { status: 400 });
  if (oldName === newName) return NextResponse.json({ error: "Les deux noms sont identiques." }, { status: 400 });

  const updated = renamePerson(oldName, newName);
  logActivity(user.id, "person_rename", `${oldName} → ${newName} (${updated})`);
  return NextResponse.json({ items: listItems(), updated });
}

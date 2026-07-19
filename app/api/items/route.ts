import { NextResponse } from "next/server";
import { createItem, getCatalogue, listItems } from "@/lib/db/repo";
import { listProjects } from "@/lib/db/projects";
import { getCurrentUser } from "@/lib/auth/session";
import { type Priorite } from "@/lib/domain";

const PRIOS: Priorite[] = ["Critique", "Élevé", "Moyenne"];

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const parsed = body?.parsed;
  const prio: Priorite = PRIOS.includes(body?.prio) ? body.prio : "Moyenne";
  const dest = typeof body?.dest === "string" ? body.dest : "";
  const points = typeof body?.points === "string" ? body.points : "";

  const catalogue = getCatalogue();
  if (
    !parsed ||
    !parsed.ref ||
    !parsed.objet ||
    !catalogue.metiers[parsed.metier] ||
    !catalogue.types[parsed.type]
  ) {
    return NextResponse.json({ error: "Objet invalide (métier/type hors catalogue)." }, { status: 400 });
  }

  // L'objet appartient toujours à son créateur.
  createItem({ parsed, prio, dest, pointsRaw: points, ownerId: user.id });
  // On renvoie aussi les projets : un suivi PRJ crée son projet à la volée.
  return NextResponse.json({ items: listItems(), projects: listProjects() });
}

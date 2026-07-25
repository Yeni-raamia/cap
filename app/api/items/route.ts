import { NextResponse } from "next/server";
import { createItem, getCatalogue, listItems } from "@/lib/db/repo";
import { listProjects } from "@/lib/db/projects";
import { ensureNonConformite, listNonConformites } from "@/lib/db/nonconformites";
import { logActivity } from "@/lib/db/admin";
import { getCurrentUser } from "@/lib/auth/session";
import { denyReadOnly } from "@/lib/auth/guards";
import { type Priorite } from "@/lib/domain";

const PRIOS: Priorite[] = ["Critique", "Élevé", "Moyenne"];

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const _ro = denyReadOnly(user); if (_ro) return _ro;

  const body = await request.json().catch(() => ({}));
  const parsed = body?.parsed;
  const prio: Priorite = PRIOS.includes(body?.prio) ? body.prio : "Moyenne";
  const dest = typeof body?.dest === "string" ? body.dest : "";
  const destService = typeof body?.destService === "string" ? body.destService : "";
  const points = typeof body?.points === "string" ? body.points : "";
  const dueDurationDays =
    typeof body?.dueDurationDays === "number" && body.dueDurationDays > 0 ? Math.floor(body.dueDurationDays) : null;

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
  const item = createItem({ parsed, prio, dest, destService, pointsRaw: points, ownerId: user.id, dueDurationDays });
  logActivity(user.id, "item_create", `${parsed.ref} — ${parsed.objet}`);

  // Case « non-conformité à la politique de sécurité » : ouvre la fiche liée.
  if (body?.nonConformite === true) {
    ensureNonConformite(item.id, user.id, { objet: item.objet, service: destService, concerne: dest });
    logActivity(user.id, "nonconf_open", item.ref);
  }

  // On renvoie aussi les projets : un suivi PRJ crée son projet à la volée.
  return NextResponse.json({ items: listItems(), projects: listProjects(), nonconformites: listNonConformites() });
}

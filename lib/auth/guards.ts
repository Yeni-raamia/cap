/* Gardes d'écriture (serveur). Un compte en lecture seule (DSI, ou marqué
   comme tel par l'admin) ne peut effectuer aucune mutation. */
import { NextResponse } from "next/server";
import { isReadOnly, type Profile } from "@/lib/domain";

/**
 * Renvoie une réponse 403 si l'utilisateur est en lecture seule, sinon null.
 * À appeler en tête des routes mutantes :
 *   const ro = denyReadOnly(user); if (ro) return ro;
 */
export function denyReadOnly(user: Profile): NextResponse | null {
  if (isReadOnly(user)) {
    return NextResponse.json({ error: "Votre compte est en lecture seule." }, { status: 403 });
  }
  return null;
}

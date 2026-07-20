/* Session par cookie httpOnly (serveur uniquement). */
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/db/repo";
import type { Profile } from "@/lib/domain";

export const SESSION_COOKIE = "cap_session";
export const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 jours (secondes)

/**
 * Utilisateur authentifié d'après le cookie, quel que soit l'état
 * d'approbation (utile pour la page tampon d'attente). Renvoie null si
 * aucune session valide (ou compte désactivé).
 */
export async function getAuthUser(): Promise<Profile | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return getSessionUser(token);
}

/**
 * Utilisateur autorisé à l'application : authentifié ET approuvé par
 * l'administrateur. Toutes les routes/pages applicatives l'utilisent, si
 * bien qu'un compte en attente est traité comme non authentifié.
 */
export async function getCurrentUser(): Promise<Profile | null> {
  const user = await getAuthUser();
  return user && user.approved ? user : null;
}

/* Session par cookie httpOnly (serveur uniquement). */
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/db/repo";
import type { Profile } from "@/lib/domain";

export const SESSION_COOKIE = "cap_session";
export const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 jours (secondes)

/** Utilisateur connecté d'après le cookie de session, ou null. */
export async function getCurrentUser(): Promise<Profile | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return getSessionUser(token);
}

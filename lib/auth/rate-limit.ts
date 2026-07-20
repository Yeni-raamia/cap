/* Limiteur de débit en mémoire (serveur unique on-premise).
 * Fenêtre glissante par clé — protège la connexion (force brute) et
 * l'inscription (spam). Réinitialisé au redémarrage du serveur. */

const buckets = new Map<string, number[]>();

/** L'action est-elle actuellement bloquée pour cette clé ? */
export function isRateLimited(key: string, max: number, windowMs: number): { limited: boolean; retryAfter: number } {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  buckets.set(key, hits);
  if (hits.length >= max) {
    const retryAfter = Math.ceil((windowMs - (now - hits[0])) / 1000);
    return { limited: true, retryAfter };
  }
  return { limited: false, retryAfter: 0 };
}

/** Enregistre une tentative (échec) pour cette clé. */
export function recordAttempt(key: string, windowMs: number): void {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  hits.push(now);
  buckets.set(key, hits);
}

/** Réinitialise le compteur (après un succès). */
export function resetAttempts(key: string): void {
  buckets.delete(key);
}

/** IP cliente utilisable comme clé (derrière un proxy : x-forwarded-for). */
export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip")?.trim() || "local";
}

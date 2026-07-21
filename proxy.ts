/* ==================================================================
 *  proxy.ts — En-têtes de sécurité posés sur chaque réponse.
 *  S'exécute dans le runtime Node (défaut en Next 16), ce qui permet
 *  de lire les paramètres de sécurité en base à chaud (HSTS activable
 *  depuis l'administration, sans redémarrage).
 * ================================================================== */
import Database from "better-sqlite3";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";

const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "connect-src 'self'",
].join("; ");

// Lecture (mise en cache 30 s) du paramètre HSTS en base — connexion en lecture seule.
let db: Database.Database | null = null;
let hstsCache = { value: false, at: 0 };
function hstsEnabled(): boolean {
  const now = Date.now();
  if (now - hstsCache.at < 30_000) return hstsCache.value;
  try {
    if (!db) {
      const path = process.env.DATABASE_PATH || join(process.cwd(), "data", "cap.sqlite");
      if (!existsSync(path)) {
        hstsCache = { value: false, at: now };
        return false;
      }
      db = new Database(path, { readonly: true, fileMustExist: true });
    }
    const row = db.prepare("select value from settings where key = 'sec_hsts'").get() as { value: string } | undefined;
    hstsCache = { value: row?.value === "1", at: now };
  } catch {
    hstsCache = { value: false, at: now };
  }
  return hstsCache.value;
}

export function proxy() {
  const res = NextResponse.next();
  res.headers.set("Content-Security-Policy", CSP);
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), interest-cohort=()");
  res.headers.set("X-DNS-Prefetch-Control", "off");
  if (hstsEnabled()) {
    res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }
  return res;
}

export const config = {
  // Toutes les routes sauf les ressources statiques internes de Next.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

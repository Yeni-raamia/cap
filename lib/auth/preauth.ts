/* ==================================================================
 *  lib/auth/preauth.ts — Jeton court « mot de passe OK, 2FA en attente ».
 *
 *  Après vérification du mot de passe, si le compte a la double
 *  authentification active, on ne crée PAS encore la session : on pose
 *  un cookie httpOnly signé (HMAC-SHA256) valable quelques minutes, qui
 *  atteste uniquement « cet utilisateur a franchi l'étape mot de passe ».
 *  L'étape TOTP le vérifie, puis crée la vraie session.
 *
 *  Sans état côté serveur : la signature suffit à garantir l'intégrité.
 * ================================================================== */
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { NextResponse } from "next/server";
import { getSetting, setSetting } from "@/lib/db/admin";

export const PREAUTH_COOKIE = "cap_2fa";
export const PREAUTH_TTL_S = 5 * 60; // 5 minutes pour saisir le code

const SECURE = process.env.COOKIE_SECURE === "1";

/** Secret HMAC applicatif, persisté en base et généré à la volée si absent. */
function authSecret(): Buffer {
  let hex = getSetting("auth_secret");
  if (!hex || hex.length < 32) {
    hex = randomBytes(32).toString("hex");
    setSetting("auth_secret", hex);
  }
  return Buffer.from(hex, "hex");
}

const b64url = (b: Buffer) => b.toString("base64url");

function sign(payload: string): string {
  return createHmac("sha256", authSecret()).update(payload).digest("base64url");
}

/** Fabrique un jeton pré-auth signé pour un utilisateur (avec expiration). */
export function issuePreauthToken(userId: string, ttlS = PREAUTH_TTL_S): string {
  const exp = Math.floor(Date.now() / 1000) + ttlS;
  const body = b64url(Buffer.from(JSON.stringify({ uid: userId, exp })));
  return `${body}.${sign(body)}`;
}

/** Vérifie un jeton pré-auth : renvoie l'id utilisateur, ou null. */
export function verifyPreauthToken(token: string | undefined | null): string | null {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  const expected = sign(body);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const { uid, exp } = JSON.parse(Buffer.from(body, "base64url").toString()) as {
      uid?: string;
      exp?: number;
    };
    if (!uid || !exp || exp < Math.floor(Date.now() / 1000)) return null;
    return uid;
  } catch {
    return null;
  }
}

export function setPreauthCookie(res: NextResponse, token: string) {
  res.cookies.set(PREAUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: SECURE,
    path: "/",
    maxAge: PREAUTH_TTL_S,
  });
}

export function clearPreauthCookie(res: NextResponse) {
  res.cookies.set(PREAUTH_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: SECURE,
    path: "/",
    maxAge: 0,
  });
}

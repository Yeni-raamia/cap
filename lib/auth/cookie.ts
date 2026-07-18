import type { NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_MAX_AGE } from "./session";

// secure=false par défaut pour fonctionner en HTTP sur le LAN.
// Passer COOKIE_SECURE=1 si l'app est servie en HTTPS.
const SECURE = process.env.COOKIE_SECURE === "1";

export function setSessionCookie(res: NextResponse, token: string) {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: SECURE,
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: SECURE,
    path: "/",
    maxAge: 0,
  });
}

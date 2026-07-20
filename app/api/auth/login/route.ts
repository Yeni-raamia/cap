import { NextResponse } from "next/server";
import { createSession, getProfileById, getProfileRowByEmail } from "@/lib/db/repo";
import { verifyPassword } from "@/lib/auth/password";
import { setSessionCookie } from "@/lib/auth/cookie";
import { clientIp, isRateLimited, recordAttempt, resetAttempts } from "@/lib/auth/rate-limit";

const WINDOW = 15 * 60 * 1000; // 15 min
const MAX_PER_ACCOUNT = 5; // tentatives échouées par (IP, compte)
const MAX_PER_IP = 30; // tentatives échouées par IP (anti-énumération)

export async function POST(request: Request) {
  const { email, password } = await request.json().catch(() => ({}));
  if (!email || !password) {
    return NextResponse.json({ error: "E-mail et mot de passe requis." }, { status: 400 });
  }

  const ip = clientIp(request);
  const cleanEmail = String(email).trim().toLowerCase();
  const acctKey = `login:${ip}:${cleanEmail}`;
  const ipKey = `login-ip:${ip}`;

  const acct = isRateLimited(acctKey, MAX_PER_ACCOUNT, WINDOW);
  const perIp = isRateLimited(ipKey, MAX_PER_IP, WINDOW);
  if (acct.limited || perIp.limited) {
    const retryAfter = Math.max(acct.retryAfter, perIp.retryAfter);
    return NextResponse.json(
      { error: `Trop de tentatives. Réessayez dans ${Math.ceil(retryAfter / 60)} min.` },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  const row = getProfileRowByEmail(cleanEmail);
  if (!row || !verifyPassword(password, row.password_hash)) {
    // Échec : on compte la tentative (message volontairement générique).
    recordAttempt(acctKey, WINDOW);
    recordAttempt(ipKey, WINDOW);
    return NextResponse.json({ error: "E-mail ou mot de passe incorrect." }, { status: 401 });
  }
  if (row.active !== 1) {
    return NextResponse.json({ error: "Ce compte est désactivé." }, { status: 403 });
  }

  // Succès : réinitialise le compteur de ce compte.
  resetAttempts(acctKey);
  const token = createSession(row.id);
  const user = getProfileById(row.id);
  const res = NextResponse.json({ user, pending: !user?.approved });
  setSessionCookie(res, token);
  return res;
}

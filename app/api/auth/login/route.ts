import { NextResponse } from "next/server";
import { createSession, getProfileById, getProfileRowByEmail, setMustChangePassword } from "@/lib/db/repo";
import { getSecuritySettings, logActivity } from "@/lib/db/admin";
import { verifyPassword } from "@/lib/auth/password";
import { setSessionCookie } from "@/lib/auth/cookie";
import { issuePreauthToken, setPreauthCookie } from "@/lib/auth/preauth";
import { clientIp, isRateLimited, recordAttempt, resetAttempts } from "@/lib/auth/rate-limit";

const MAX_PER_IP_FACTOR = 6; // limite IP = maxAttempts × 6 (anti-énumération)

export async function POST(request: Request) {
  const { email, password } = await request.json().catch(() => ({}));
  if (!email || !password) {
    return NextResponse.json({ error: "E-mail et mot de passe requis." }, { status: 400 });
  }

  const sec = getSecuritySettings();
  const windowMs = sec.loginWindowMin * 60 * 1000;
  const ip = clientIp(request);
  const cleanEmail = String(email).trim().toLowerCase();
  const acctKey = `login:${ip}:${cleanEmail}`;
  const ipKey = `login-ip:${ip}`;

  const acct = isRateLimited(acctKey, sec.loginMaxAttempts, windowMs);
  const perIp = isRateLimited(ipKey, sec.loginMaxAttempts * MAX_PER_IP_FACTOR, windowMs);
  if (acct.limited || perIp.limited) {
    const retryAfter = Math.max(acct.retryAfter, perIp.retryAfter);
    return NextResponse.json(
      { error: `Trop de tentatives. Réessayez dans ${Math.ceil(retryAfter / 60)} min.` },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  const row = getProfileRowByEmail(cleanEmail);
  if (!row || !verifyPassword(password, row.password_hash)) {
    recordAttempt(acctKey, windowMs);
    recordAttempt(ipKey, windowMs);
    logActivity(row?.id ?? null, "login_failed", cleanEmail);
    return NextResponse.json({ error: "E-mail ou mot de passe incorrect." }, { status: 401 });
  }
  if (row.active !== 1) {
    return NextResponse.json({ error: "Ce compte est désactivé." }, { status: 403 });
  }

  // Politique de rotation : mot de passe trop ancien → renouvellement imposé.
  let mustChange = row.must_change_password === 1;
  if (sec.passwordMaxAgeDays > 0 && row.password_changed_at) {
    const ageDays = (Date.now() - new Date(row.password_changed_at).getTime()) / 864e5;
    if (ageDays > sec.passwordMaxAgeDays && !mustChange) {
      setMustChangePassword(row.id, true);
      mustChange = true;
    }
  }

  resetAttempts(acctKey);

  // Double authentification active : on ne crée pas encore la session. On pose
  // un jeton pré-auth signé (court) et on renvoie la main au client pour l'étape
  // TOTP (POST /api/auth/2fa), qui ouvrira la vraie session.
  if (row.totp_enabled === 1) {
    const res = NextResponse.json({ twofaRequired: true });
    setPreauthCookie(res, issuePreauthToken(row.id));
    return res;
  }

  const token = createSession(row.id, sec.sessionDays);
  logActivity(row.id, "login");
  const user = getProfileById(row.id);
  const res = NextResponse.json({ user, pending: !user?.approved, mustChangePassword: mustChange });
  setSessionCookie(res, token);
  return res;
}

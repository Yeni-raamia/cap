/* Login — étape 2 : vérifie le code TOTP (ou un code de secours) contre le
 * jeton pré-auth déposé après le mot de passe, puis ouvre la session. */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSession, getProfileById, getTotp, setTotpBackup } from "@/lib/db/repo";
import { getSecuritySettings, logActivity } from "@/lib/db/admin";
import { consumeBackupCode, verifyTotp } from "@/lib/auth/totp";
import { setSessionCookie } from "@/lib/auth/cookie";
import {
  PREAUTH_COOKIE,
  clearPreauthCookie,
  verifyPreauthToken,
} from "@/lib/auth/preauth";
import { clientIp, isRateLimited, recordAttempt, resetAttempts } from "@/lib/auth/rate-limit";

const WINDOW_MS = 10 * 60 * 1000; // fenêtre anti-force-brute du code (10 min)
const MAX_ATTEMPTS = 8;

export async function POST(request: Request) {
  const store = await cookies();
  const uid = verifyPreauthToken(store.get(PREAUTH_COOKIE)?.value);
  const expired = () => {
    const res = NextResponse.json(
      { error: "Session expirée. Reconnectez-vous.", expired: true },
      { status: 401 }
    );
    clearPreauthCookie(res);
    return res;
  };
  if (!uid) return expired();

  const t = getTotp(uid);
  if (!t?.enabled || !t.secret) return expired();

  const ip = clientIp(request);
  const key = `2fa:${ip}:${uid}`;
  const rl = isRateLimited(key, MAX_ATTEMPTS, WINDOW_MS);
  if (rl.limited) {
    return NextResponse.json(
      { error: `Trop de tentatives. Réessayez dans ${Math.ceil(rl.retryAfter / 60)} min.` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  const { code } = await request.json().catch(() => ({}));
  const codeStr = String(code || "");

  let usedBackup = false;
  let ok = verifyTotp(t.secret, codeStr);
  if (!ok) {
    // Repli sur un code de secours (usage unique).
    const remaining = consumeBackupCode(t.backup, codeStr);
    if (remaining !== null) {
      setTotpBackup(uid, remaining);
      ok = true;
      usedBackup = true;
    }
  }

  if (!ok) {
    recordAttempt(key, WINDOW_MS);
    return NextResponse.json({ error: "Code incorrect." }, { status: 401 });
  }

  resetAttempts(key);
  const sec = getSecuritySettings();
  const token = createSession(uid, sec.sessionDays);
  logActivity(uid, usedBackup ? "login_backup_code" : "login_2fa");

  const user = getProfileById(uid);
  const res = NextResponse.json({
    user,
    pending: !user?.approved,
    mustChangePassword: user?.mustChangePassword ?? false,
    backupCodeUsed: usedBackup,
  });
  setSessionCookie(res, token);
  clearPreauthCookie(res);
  return res;
}

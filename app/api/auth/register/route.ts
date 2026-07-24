import { NextResponse } from "next/server";
import {
  countProfiles,
  createProfile,
  createSession,
  getProfileRowByEmail,
  insertNotification,
  listAdmins,
} from "@/lib/db/repo";
import { getSecuritySettings } from "@/lib/db/admin";
import { hashPassword } from "@/lib/auth/password";
import { setSessionCookie } from "@/lib/auth/cookie";
import { clientIp, isRateLimited, recordAttempt } from "@/lib/auth/rate-limit";
import type { Role } from "@/lib/domain";

export async function POST(request: Request) {
  // Anti-spam : au plus 5 inscriptions par heure et par IP.
  const ip = clientIp(request);
  const rl = isRateLimited(`register:${ip}`, 5, 60 * 60 * 1000);
  if (rl.limited) {
    return NextResponse.json(
      { error: "Trop de demandes d'inscription. Réessayez plus tard." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  const { email, password, fullName } = await request.json().catch(() => ({}));

  const sec = getSecuritySettings();
  const cleanEmail = String(email || "").trim().toLowerCase();
  if (!cleanEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail) || !password || String(password).length < sec.passwordMinLength) {
    return NextResponse.json(
      { error: `E-mail valide et mot de passe (≥ ${sec.passwordMinLength} caractères) requis.` },
      { status: 400 }
    );
  }
  if (getProfileRowByEmail(cleanEmail)) {
    return NextResponse.json({ error: "Un compte existe déjà avec cet e-mail." }, { status: 409 });
  }

  // Le tout premier compte devient administrateur approuvé (amorçage on-premise).
  // Ensuite : approbation requise selon la politique de sécurité.
  const isFirst = countProfiles() === 0;
  const role: Role = isFirst ? "admin" : "agent";
  const approved = isFirst || !sec.approvalRequired;
  const name = (fullName && String(fullName).trim()) || cleanEmail.split("@")[0];
  const user = createProfile({
    email: cleanEmail,
    passwordHash: hashPassword(String(password)),
    fullName: name,
    role,
    approved,
  });

  // Notifier les administrateurs d'une nouvelle demande d'inscription en attente.
  if (!approved) {
    for (const admin of listAdmins()) {
      insertNotification({
        userId: admin.id,
        itemId: null,
        kind: "projet",
        message: `Nouvelle demande d'inscription : ${name} (${cleanEmail}) — à approuver.`,
        channel: ["in-app"],
      });
    }
  }

  recordAttempt(`register:${ip}`, 60 * 60 * 1000);

  // Une session est ouverte pour permettre l'accès à la page tampon d'attente.
  const token = createSession(user.id, sec.sessionDays, { userAgent: request.headers.get("user-agent"), ip });
  const res = NextResponse.json({ user, pending: !approved });
  setSessionCookie(res, token);
  return res;
}

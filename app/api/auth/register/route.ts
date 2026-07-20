import { NextResponse } from "next/server";
import {
  countProfiles,
  createProfile,
  createSession,
  getProfileRowByEmail,
  insertNotification,
  listAdmins,
} from "@/lib/db/repo";
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

  const cleanEmail = String(email || "").trim().toLowerCase();
  if (!cleanEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail) || !password || String(password).length < 8) {
    return NextResponse.json(
      { error: "E-mail valide et mot de passe (≥ 8 caractères) requis." },
      { status: 400 }
    );
  }
  if (getProfileRowByEmail(cleanEmail)) {
    return NextResponse.json({ error: "Un compte existe déjà avec cet e-mail." }, { status: 409 });
  }

  // Le tout premier compte devient administrateur approuvé (amorçage on-premise).
  // Tous les suivants sont en attente de validation par un administrateur.
  const isFirst = countProfiles() === 0;
  const role: Role = isFirst ? "admin" : "agent";
  const name = (fullName && String(fullName).trim()) || cleanEmail.split("@")[0];
  const user = createProfile({
    email: cleanEmail,
    passwordHash: hashPassword(String(password)),
    fullName: name,
    role,
    approved: isFirst,
  });

  // Notifier les administrateurs d'une nouvelle demande d'inscription.
  if (!isFirst) {
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
  const token = createSession(user.id);
  const res = NextResponse.json({ user, pending: !isFirst });
  setSessionCookie(res, token);
  return res;
}

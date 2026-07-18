import { NextResponse } from "next/server";
import { createProfile, createSession, countProfiles, getProfileRowByEmail } from "@/lib/db/repo";
import { hashPassword } from "@/lib/auth/password";
import { setSessionCookie } from "@/lib/auth/cookie";
import type { Role } from "@/lib/domain";

export async function POST(request: Request) {
  const { email, password, fullName } = await request.json().catch(() => ({}));

  if (!email || !password || password.length < 6) {
    return NextResponse.json(
      { error: "E-mail et mot de passe (≥ 6 caractères) requis." },
      { status: 400 }
    );
  }
  if (getProfileRowByEmail(email)) {
    return NextResponse.json({ error: "Un compte existe déjà avec cet e-mail." }, { status: 409 });
  }

  // Le tout premier compte devient administrateur (amorçage on-premise).
  const role: Role = countProfiles() === 0 ? "admin" : "agent";
  const user = createProfile({
    email,
    passwordHash: hashPassword(password),
    fullName: (fullName && String(fullName).trim()) || String(email).split("@")[0],
    role,
  });

  const token = createSession(user.id);
  const res = NextResponse.json({ user });
  setSessionCookie(res, token);
  return res;
}

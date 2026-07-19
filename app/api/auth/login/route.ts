import { NextResponse } from "next/server";
import { createSession, getProfileById, getProfileRowByEmail } from "@/lib/db/repo";
import { verifyPassword } from "@/lib/auth/password";
import { setSessionCookie } from "@/lib/auth/cookie";

export async function POST(request: Request) {
  const { email, password } = await request.json().catch(() => ({}));
  if (!email || !password) {
    return NextResponse.json({ error: "E-mail et mot de passe requis." }, { status: 400 });
  }

  const row = getProfileRowByEmail(email);
  if (!row || !verifyPassword(password, row.password_hash)) {
    return NextResponse.json({ error: "E-mail ou mot de passe incorrect." }, { status: 401 });
  }
  if (row.active !== 1) {
    return NextResponse.json({ error: "Ce compte est désactivé." }, { status: 403 });
  }

  const token = createSession(row.id);
  const res = NextResponse.json({ user: getProfileById(row.id) });
  setSessionCookie(res, token);
  return res;
}

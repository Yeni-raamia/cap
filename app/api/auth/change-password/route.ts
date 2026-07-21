/* Changement de mot de passe (renouvellement, éventuellement imposé par l'admin). */
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/session";
import { getPasswordHashById, setUserPassword } from "@/lib/db/repo";
import { getSecuritySettings } from "@/lib/db/admin";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!user.approved) return NextResponse.json({ error: "Compte en attente d'approbation." }, { status: 403 });

  const { currentPassword, newPassword } = await request.json().catch(() => ({}));
  const sec = getSecuritySettings();
  if (!newPassword || String(newPassword).length < sec.passwordMinLength) {
    return NextResponse.json({ error: `Nouveau mot de passe trop court (≥ ${sec.passwordMinLength}).` }, { status: 400 });
  }

  const hash = getPasswordHashById(user.id);
  if (!hash) return NextResponse.json({ error: "Compte introuvable." }, { status: 404 });
  if (!verifyPassword(String(currentPassword || ""), hash)) {
    return NextResponse.json({ error: "Mot de passe actuel incorrect." }, { status: 401 });
  }
  if (verifyPassword(String(newPassword), hash)) {
    return NextResponse.json({ error: "Le nouveau mot de passe doit être différent de l'ancien." }, { status: 400 });
  }

  setUserPassword(user.id, hashPassword(String(newPassword)));
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { listProfiles, updateRole } from "@/lib/db/repo";
import { getCurrentUser } from "@/lib/auth/session";
import type { Role } from "@/lib/domain";

const ROLES: Role[] = ["agent", "directeur", "admin"];

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Réservé aux administrateurs." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const userId: string = body?.userId;
  const role: Role = body?.role;

  if (!userId || !ROLES.includes(role)) {
    return NextResponse.json({ error: "Paramètres invalides." }, { status: 400 });
  }
  // Un admin ne peut pas retirer son propre rôle admin (évite de se verrouiller dehors).
  if (userId === user.id && role !== "admin") {
    return NextResponse.json(
      { error: "Tu ne peux pas retirer ton propre rôle administrateur." },
      { status: 400 }
    );
  }

  updateRole(userId, role);
  return NextResponse.json({ profiles: listProfiles() });
}

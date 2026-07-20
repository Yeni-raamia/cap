import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import {
  adminCounts,
  countAdmins,
  createMember,
  emailExists,
  listActivity,
  listMembers,
  logActivity,
  resetMemberPassword,
  setMemberActive,
  setMemberPages,
  setMemberPoste,
  setMemberRole,
} from "@/lib/db/admin";
import { getProfileById } from "@/lib/db/repo";
import { GRANTABLE_PAGES } from "@/lib/nav";
import { type Role } from "@/lib/domain";

const ROLES: Role[] = ["agent", "manager", "directeur", "admin", "dsi"];
const GRANTABLE = GRANTABLE_PAGES.map((p) => p.id);

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Réservé aux administrateurs." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const action: string = body?.action;
  const targetId: string = body?.id;
  const nameOf = (id: string) => getProfileById(id)?.nom ?? id;

  if (action === "create") {
    const email = String(body?.email || "").trim().toLowerCase();
    const fullName = String(body?.fullName || "").trim();
    const password = String(body?.password || "");
    const role: Role = ROLES.includes(body?.role) ? body.role : "agent";
    if (!email || !fullName || password.length < 6) {
      return NextResponse.json({ error: "E-mail, nom et mot de passe (≥ 6) requis." }, { status: 400 });
    }
    if (emailExists(email)) {
      return NextResponse.json({ error: "Un compte existe déjà avec cet e-mail." }, { status: 409 });
    }
    const m = createMember({ email, fullName, role, password });
    logActivity(user.id, "member_create", `${fullName} (${role})`);
    void m;
  } else if (action === "role") {
    const role: Role = ROLES.includes(body?.role) ? body.role : "agent";
    if (targetId === user.id && role !== "admin") {
      return NextResponse.json({ error: "Tu ne peux pas retirer ton propre rôle admin." }, { status: 400 });
    }
    setMemberRole(targetId, role);
    logActivity(user.id, "member_role", `${nameOf(targetId)} → ${role}`);
  } else if (action === "active") {
    const active = Boolean(body?.active);
    if (targetId === user.id && !active) {
      return NextResponse.json({ error: "Tu ne peux pas te désactiver toi-même." }, { status: 400 });
    }
    if (!active) {
      // Ne pas désactiver le dernier admin actif.
      const target = getProfileById(targetId);
      if (target?.role === "admin" && countAdmins() <= 1) {
        return NextResponse.json({ error: "Impossible : c'est le dernier administrateur actif." }, { status: 400 });
      }
    }
    setMemberActive(targetId, active);
    logActivity(user.id, "member_active", `${nameOf(targetId)} ${active ? "réactivé" : "désactivé"}`);
  } else if (action === "poste") {
    setMemberPoste(targetId, String(body?.poste || "").trim());
    logActivity(user.id, "member_poste", nameOf(targetId));
  } else if (action === "pages") {
    const pages: string[] = Array.isArray(body?.pages)
      ? body.pages.filter((p: string) => GRANTABLE.includes(p))
      : [];
    setMemberPages(targetId, pages);
    logActivity(user.id, "member_pages", `${nameOf(targetId)} → ${pages.join(", ") || "aucune"}`);
  } else if (action === "password") {
    const password = String(body?.password || "");
    if (password.length < 6) {
      return NextResponse.json({ error: "Mot de passe trop court (≥ 6)." }, { status: 400 });
    }
    resetMemberPassword(targetId, password);
    logActivity(user.id, "member_password", nameOf(targetId));
  } else {
    return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
  }

  return NextResponse.json({ members: listMembers(), journal: listActivity(60), counts: adminCounts() });
}

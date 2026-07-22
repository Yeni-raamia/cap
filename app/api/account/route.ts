/* Espace membre : mise à jour de son propre profil (nom, poste, avatar). */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { listProfiles, updateOwnProfile } from "@/lib/db/repo";
import { logActivity } from "@/lib/db/admin";

// Garde-fou : un avatar (data URL redimensionnée côté client à ~256 px) doit
// rester léger. On refuse au-delà de ~500 Ko pour ne pas gonfler la base.
const MAX_AVATAR_LEN = 500_000;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const fields: { fullName?: string; poste?: string; avatar?: string } = {};

  if (typeof body?.fullName === "string") {
    const nom = body.fullName.trim();
    if (nom.length < 2) {
      return NextResponse.json({ error: "Le nom doit comporter au moins 2 caractères." }, { status: 400 });
    }
    fields.fullName = nom;
  }
  if (typeof body?.poste === "string") {
    fields.poste = body.poste.trim().slice(0, 80);
  }
  if (typeof body?.avatar === "string") {
    const av = body.avatar;
    if (av !== "" && !/^data:image\/(png|jpe?g|webp);base64,/.test(av)) {
      return NextResponse.json({ error: "Format d'image non pris en charge." }, { status: 400 });
    }
    if (av.length > MAX_AVATAR_LEN) {
      return NextResponse.json({ error: "Image trop lourde (réduis la taille)." }, { status: 400 });
    }
    fields.avatar = av;
  }

  if (Object.keys(fields).length === 0) {
    return NextResponse.json({ error: "Aucune modification." }, { status: 400 });
  }

  updateOwnProfile(user.id, fields);
  logActivity(user.id, "account_update", Object.keys(fields).join(", "));
  return NextResponse.json({ ok: true, profiles: listProfiles() });
}

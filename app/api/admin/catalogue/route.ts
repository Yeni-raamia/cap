import { NextResponse } from "next/server";
import { addMetier, addType, getCatalogue } from "@/lib/db/repo";
import { getCurrentUser } from "@/lib/auth/session";
import { TONES, type Tone } from "@/lib/domain";

const METIER_RE = /^[A-Z]{2,6}$/; // le préfixe métier reste court (contrainte du parseur d'objet)
const TYPE_RE = /^[A-Z]{2,12}$/;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Réservé aux administrateurs." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const kind: string = body?.kind;
  const code: string = String(body?.code || "").trim().toUpperCase();
  const label: string = String(body?.label || "").trim();

  if (!label) {
    return NextResponse.json({ error: "Libellé requis." }, { status: 400 });
  }

  if (kind === "metier") {
    if (!METIER_RE.test(code)) {
      return NextResponse.json(
        { error: "Code métier invalide (2 à 6 lettres majuscules)." },
        { status: 400 }
      );
    }
    const tone: Tone = TONES.includes(body?.tone) ? body.tone : "slate";
    addMetier(code, label, tone);
  } else if (kind === "type") {
    if (!TYPE_RE.test(code)) {
      return NextResponse.json(
        { error: "Code type invalide (2 à 12 lettres majuscules)." },
        { status: 400 }
      );
    }
    const r = body?.slaRelance;
    const e = body?.slaEscalade;
    const slaRelance = r === "" || r == null ? null : Number(r);
    const slaEscalade = e === "" || e == null ? null : Number(e);
    if (
      (slaRelance != null && (!Number.isFinite(slaRelance) || slaRelance < 0)) ||
      (slaEscalade != null && (!Number.isFinite(slaEscalade) || slaEscalade < 0))
    ) {
      return NextResponse.json({ error: "Seuils SLA invalides." }, { status: 400 });
    }
    addType(code, label, slaRelance, slaEscalade, Boolean(body?.urgent));
  } else {
    return NextResponse.json({ error: "Type d'option inconnu." }, { status: 400 });
  }

  return NextResponse.json({ catalogue: getCatalogue() });
}

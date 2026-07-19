import { NextResponse } from "next/server";
import { addBlocageAction, canEditItem, getItem, listItems, setAppreciation } from "@/lib/db/repo";
import { logActivity } from "@/lib/db/admin";
import { getCurrentUser } from "@/lib/auth/session";
import { APPRECIATIONS, BLOCAGE_ACTIONS, blocageActionLabel } from "@/lib/domain";

const KINDS = BLOCAGE_ACTIONS.map((a) => a.kind);

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const op: string = body?.op; // "demarche" | "appreciation"
  const itemId: string = body?.itemId;
  if (!itemId) return NextResponse.json({ error: "Suivi manquant." }, { status: 400 });
  if (!canEditItem(itemId, user)) {
    return NextResponse.json({ error: "Droits insuffisants sur ce suivi." }, { status: 403 });
  }

  if (op === "demarche") {
    const kind = String(body?.kind || "");
    const concerne = String(body?.concerne || "").trim();
    const note = String(body?.note || "").trim();
    if (!KINDS.includes(kind as (typeof KINDS)[number])) {
      return NextResponse.json({ error: "Type de démarche inconnu." }, { status: 400 });
    }
    if (!concerne) {
      return NextResponse.json({ error: "La personne concernée doit être nommée." }, { status: 400 });
    }
    addBlocageAction({ itemId, kind: kind as (typeof KINDS)[number], concerne, note, authorId: user.id });
    logActivity(user.id, "blocage_demarche", `${blocageActionLabel(kind)} · ${getItem(itemId)?.ref ?? ""} · ${concerne}`);
  } else if (op === "appreciation") {
    const appreciation: string | null = body?.appreciation || null;
    if (appreciation && !APPRECIATIONS.includes(appreciation)) {
      return NextResponse.json({ error: "Appréciation inconnue." }, { status: 400 });
    }
    setAppreciation(itemId, appreciation);
    logActivity(user.id, "blocage_appreciation", `${getItem(itemId)?.ref ?? ""} · ${appreciation ?? "—"}`);
  } else {
    return NextResponse.json({ error: "Opération inconnue." }, { status: 400 });
  }

  return NextResponse.json({ items: listItems() });
}

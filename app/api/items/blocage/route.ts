import { NextResponse } from "next/server";
import { addBlocageAction, canEditItem, getItem, listItems, setAppreciation } from "@/lib/db/repo";
import { getRefLists, logActivity } from "@/lib/db/admin";
import { ensureNegligence, listNegligences } from "@/lib/db/negligences";
import { getCurrentUser } from "@/lib/auth/session";
import { denyReadOnly } from "@/lib/auth/guards";
import { APPRECIATION_NEGLIGENCE, blocageActionLabel } from "@/lib/domain";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const _ro = denyReadOnly(user); if (_ro) return _ro;

  const body = await request.json().catch(() => ({}));
  const op: string = body?.op; // "demarche" | "appreciation"
  const itemId: string = body?.itemId;
  if (!itemId) return NextResponse.json({ error: "Suivi manquant." }, { status: 400 });
  if (!canEditItem(itemId, user)) {
    return NextResponse.json({ error: "Droits insuffisants sur ce suivi." }, { status: 403 });
  }

  const refLists = getRefLists();

  if (op === "demarche") {
    const kind = String(body?.kind || "");
    const concerne = String(body?.concerne || "").trim();
    const note = String(body?.note || "").trim();
    if (!refLists.actions.some((a) => a.kind === kind)) {
      return NextResponse.json({ error: "Type de démarche inconnu." }, { status: 400 });
    }
    if (!concerne) {
      return NextResponse.json({ error: "La personne concernée doit être nommée." }, { status: 400 });
    }
    addBlocageAction({ itemId, kind, concerne, note, authorId: user.id });
    logActivity(user.id, "blocage_demarche", `${blocageActionLabel(kind, refLists.actions)} · ${getItem(itemId)?.ref ?? ""} · ${concerne}`);
  } else if (op === "appreciation") {
    const appreciation: string | null = body?.appreciation || null;
    if (appreciation && !refLists.appreciations.includes(appreciation)) {
      return NextResponse.json({ error: "Appréciation inconnue." }, { status: 400 });
    }
    setAppreciation(itemId, appreciation);
    logActivity(user.id, "blocage_appreciation", `${getItem(itemId)?.ref ?? ""} · ${appreciation ?? "—"}`);
    // Appréciation « Négligence » → ouvre la fiche négligence transmise au DG.
    if (appreciation === APPRECIATION_NEGLIGENCE) {
      const it = getItem(itemId);
      const dest = it?.personnes.find((p) => p.kind === "destinataire");
      ensureNegligence(itemId, user.id, {
        objet: it?.objet ?? "",
        service: dest?.service ?? "",
        concerne: dest?.name ?? "",
      });
      logActivity(user.id, "negligence_open", it?.ref ?? "");
    }
  } else {
    return NextResponse.json({ error: "Opération inconnue." }, { status: 400 });
  }

  return NextResponse.json({ items: listItems(user.id), negligences: listNegligences() });
}

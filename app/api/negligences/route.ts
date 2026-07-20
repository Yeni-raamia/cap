import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { canEditItem, getItem, listItems, setAppreciation } from "@/lib/db/repo";
import { getRefLists, logActivity } from "@/lib/db/admin";
import {
  ensureNegligence,
  getNegligence,
  getNegligenceItemId,
  listNegligences,
  setNegligenceDecisions,
  updateNegligence,
} from "@/lib/db/negligences";
import { APPRECIATION_NEGLIGENCE, NEGLIGENCE_GRAVITES, NEGLIGENCE_RISQUES, NEGLIGENCE_STATUTS } from "@/lib/domain";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const op: string = body?.op;
  const isDG = user.role === "directeur" || user.role === "admin";

  // Création manuelle depuis la page Négligences.
  if (op === "create") {
    const targetItem: string = body?.itemId;
    if (!targetItem || !getItem(targetItem)) {
      return NextResponse.json({ error: "Suivi introuvable." }, { status: 404 });
    }
    const canOpen = isDG || user.role === "dsi" || canEditItem(targetItem, user);
    if (!canOpen) return NextResponse.json({ error: "Droits insuffisants." }, { status: 403 });
    const negId = ensureNegligence(targetItem, user.id);
    setAppreciation(targetItem, APPRECIATION_NEGLIGENCE);
    logActivity(user.id, "negligence_open", getItem(targetItem)?.ref ?? "");
    return NextResponse.json({ negligences: listNegligences(), items: listItems(), negligence: getNegligence(negId) });
  }

  const id: string = body?.id;
  const itemId = id ? getNegligenceItemId(id) : null;
  if (!id || !itemId) return NextResponse.json({ error: "Fiche introuvable." }, { status: 404 });

  if (op === "update") {
    // Évaluation (gravité, risque, impact, description) : propriétaire ou directeur/admin.
    if (!canEditItem(itemId, user)) {
      return NextResponse.json({ error: "Droits insuffisants." }, { status: 403 });
    }
    const gravite = NEGLIGENCE_GRAVITES.includes(body?.gravite) ? body.gravite : undefined;
    const risque = NEGLIGENCE_RISQUES.includes(body?.risque) ? body.risque : undefined;
    updateNegligence(id, {
      gravite,
      risque,
      impact: typeof body?.impact === "string" ? body.impact : undefined,
      description: typeof body?.description === "string" ? body.description : undefined,
    });
    logActivity(user.id, "negligence_update", getItem(itemId)?.ref ?? "");
  } else if (op === "status") {
    if (!canEditItem(itemId, user)) {
      return NextResponse.json({ error: "Droits insuffisants." }, { status: 403 });
    }
    const status: string | undefined = NEGLIGENCE_STATUTS.includes(body?.status) ? body.status : undefined;
    if (!status) return NextResponse.json({ error: "Statut invalide." }, { status: 400 });
    updateNegligence(id, { status });
    logActivity(user.id, "negligence_status", `${getItem(itemId)?.ref ?? ""} · ${status}`);
  } else if (op === "decisions") {
    // Décisions du DG : directeur/admin uniquement.
    if (!isDG) {
      return NextResponse.json({ error: "Réservé au directeur." }, { status: 403 });
    }
    const allowed = getRefLists().decisions;
    const decisions: string[] = Array.isArray(body?.decisions)
      ? body.decisions.filter((d: string) => allowed.includes(d))
      : [];
    setNegligenceDecisions(id, decisions, user.id);
    logActivity(user.id, "negligence_decision", `${getItem(itemId)?.ref ?? ""} · ${decisions.join(", ") || "aucune"}`);
  } else {
    return NextResponse.json({ error: "Opération inconnue." }, { status: 400 });
  }

  return NextResponse.json({ negligences: listNegligences(), negligence: getNegligence(id) });
}

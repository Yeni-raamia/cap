import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { denyReadOnly } from "@/lib/auth/guards";
import { canEditItem, getItem, listItems } from "@/lib/db/repo";
import { getRefLists, logActivity } from "@/lib/db/admin";
import {
  createNonConformiteRecord,
  ensureNonConformite,
  getNonConformite,
  getNonConformiteItemId,
  listNonConformites,
  setNonConformiteDecisions,
  updateNonConformite,
} from "@/lib/db/nonconformites";
import { NEGLIGENCE_GRAVITES, NEGLIGENCE_RISQUES, NEGLIGENCE_STATUTS } from "@/lib/domain";

const cleanGravite = (v: unknown) => (NEGLIGENCE_GRAVITES.includes(v as string) ? (v as string) : "Modérée");
const cleanRisque = (v: unknown) => (NEGLIGENCE_RISQUES.includes(v as string) ? (v as string) : "Moyen");

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const _ro = denyReadOnly(user); if (_ro) return _ro;

  const body = await request.json().catch(() => ({}));
  const op: string = body?.op;
  const isDG = user.role === "directeur" || user.role === "admin";

  // Création par formulaire (avec ou sans suivi lié).
  if (op === "create") {
    const objet = String(body?.objet || "").trim();
    const service = String(body?.service || "").trim();
    const concerne = String(body?.concerne || "").trim();
    const policy = String(body?.policy || "").trim();
    const gravite = cleanGravite(body?.gravite);
    const risque = cleanRisque(body?.risque);
    const impact = String(body?.impact || "");
    const description = String(body?.description || "");
    const targetItem: string | null = body?.itemId || null;

    if (targetItem && !getItem(targetItem)) {
      return NextResponse.json({ error: "Suivi introuvable." }, { status: 404 });
    }
    if (!targetItem && !objet) {
      return NextResponse.json({ error: "Objet de la non-conformité requis." }, { status: 400 });
    }

    let ncId: string;
    if (targetItem) {
      ncId = ensureNonConformite(targetItem, user.id);
      updateNonConformite(ncId, { objet: objet || getItem(targetItem)?.objet || "", service, concerne, policy, gravite, risque, impact, description });
    } else {
      ncId = createNonConformiteRecord({ itemId: null, objet, service, concerne, policy, gravite, risque, impact, description, createdBy: user.id });
    }
    logActivity(user.id, "nonconf_open", objet || getItem(targetItem ?? "")?.ref || "");
    return NextResponse.json({ nonconformites: listNonConformites(), items: listItems(), nonconformite: getNonConformite(ncId) });
  }

  const id: string = body?.id;
  if (!id || !getNonConformite(id)) return NextResponse.json({ error: "Fiche introuvable." }, { status: 404 });
  const itemId = getNonConformiteItemId(id);

  if (op === "update") {
    const canEval = itemId ? canEditItem(itemId, user) : isDG || user.role === "dsi" || user.role === "manager";
    if (!canEval) return NextResponse.json({ error: "Droits insuffisants." }, { status: 403 });
    updateNonConformite(id, {
      objet: typeof body?.objet === "string" ? body.objet : undefined,
      service: typeof body?.service === "string" ? body.service : undefined,
      concerne: typeof body?.concerne === "string" ? body.concerne : undefined,
      policy: typeof body?.policy === "string" ? body.policy : undefined,
      gravite: NEGLIGENCE_GRAVITES.includes(body?.gravite) ? body.gravite : undefined,
      risque: NEGLIGENCE_RISQUES.includes(body?.risque) ? body.risque : undefined,
      impact: typeof body?.impact === "string" ? body.impact : undefined,
      description: typeof body?.description === "string" ? body.description : undefined,
    });
    logActivity(user.id, "nonconf_update", getItem(itemId ?? "")?.ref ?? id);
  } else if (op === "status") {
    const canEval = itemId ? canEditItem(itemId, user) : isDG || user.role === "dsi" || user.role === "manager";
    if (!canEval) return NextResponse.json({ error: "Droits insuffisants." }, { status: 403 });
    const status: string | undefined = NEGLIGENCE_STATUTS.includes(body?.status) ? body.status : undefined;
    if (!status) return NextResponse.json({ error: "Statut invalide." }, { status: 400 });
    updateNonConformite(id, { status });
    logActivity(user.id, "nonconf_status", `${getItem(itemId ?? "")?.ref ?? id} · ${status}`);
  } else if (op === "decisions") {
    if (!isDG) return NextResponse.json({ error: "Réservé au directeur." }, { status: 403 });
    const allowed = getRefLists().decisions;
    const decisions: string[] = Array.isArray(body?.decisions)
      ? body.decisions.filter((d: string) => allowed.includes(d))
      : [];
    setNonConformiteDecisions(id, decisions, user.id);
    logActivity(user.id, "nonconf_decision", `${getItem(itemId ?? "")?.ref ?? id} · ${decisions.join(", ") || "aucune"}`);
  } else {
    return NextResponse.json({ error: "Opération inconnue." }, { status: 400 });
  }

  return NextResponse.json({ nonconformites: listNonConformites(), nonconformite: getNonConformite(id) });
}

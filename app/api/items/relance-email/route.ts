/* Envoi RÉEL d'une relance au destinataire par e-mail (modèle appliqué).
 * Compte comme une relance (statut Relancé, +1, timeline). Reply-to = agent.
 * RBAC : propriétaire ou directeur/admin ; refusé en lecture seule. */
import { NextResponse } from "next/server";
import { canEditItem, getEmailById, getItem, listItems, listTemplates, recordRelanceEmail } from "@/lib/db/repo";
import { getSettings, logActivity } from "@/lib/db/admin";
import { getCurrentUser } from "@/lib/auth/session";
import { denyReadOnly } from "@/lib/auth/guards";
import { isEmailConfigured, sendEmail } from "@/lib/reminders/email";
import { applyTemplate, daysBetween } from "@/lib/domain";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const ro = denyReadOnly(user);
  if (ro) return ro;

  const { itemId, templateId } = await request.json().catch(() => ({}));
  const item = itemId ? getItem(itemId) : null;
  if (!item) return NextResponse.json({ error: "Suivi introuvable." }, { status: 404 });
  if (!canEditItem(itemId, user)) {
    return NextResponse.json({ error: "Droits insuffisants sur cet objet." }, { status: 403 });
  }
  if (item.statut === "Clôturé") {
    return NextResponse.json({ error: "Ce suivi est clôturé." }, { status: 400 });
  }
  if (!isEmailConfigured()) {
    return NextResponse.json({ error: "Envoi d'e-mail non configuré (RESEND_API_KEY)." }, { status: 400 });
  }
  if (!getSettings().emailEnabled) {
    return NextResponse.json({ error: "L'envoi d'e-mail est désactivé dans l'administration." }, { status: 400 });
  }

  const dest = item.personnes.find((p) => p.kind === "destinataire") ?? item.personnes[0];
  const to = dest?.email?.trim();
  if (!to) {
    return NextResponse.json({ error: "Aucune adresse e-mail pour le destinataire. Renseigne-la (Éditer le suivi)." }, { status: 400 });
  }

  const tpl = listTemplates().find((t) => t.id === templateId);
  if (!tpl) return NextResponse.json({ error: "Modèle introuvable." }, { status: 400 });

  const vars: Record<string, string> = {
    ref: item.ref,
    objet: item.objet,
    destinataire: dest?.name ?? "",
    service: dest?.service ?? "",
    jours: String(daysBetween(item.dateMaj, new Date())),
    relances: String(item.relancesCount),
    priorite: item.priorite,
    moi: user.nom,
  };
  const subject = applyTemplate(tpl.subject, vars);
  const body = applyTemplate(tpl.body, vars);

  const sent = await sendEmail(to, subject, body, { replyTo: getEmailById(user.id) });
  if (!sent) {
    return NextResponse.json({ error: "L'envoi a échoué (vérifie la configuration Resend)." }, { status: 502 });
  }

  recordRelanceEmail(itemId, user.id, to);
  logActivity(user.id, "item_relance_email", `${item.ref} → ${to}`);
  return NextResponse.json({ items: listItems(), sent: true, to });
}

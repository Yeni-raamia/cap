/* ==================================================================
 *  lib/reminders/engine.ts — Moteur de relance (cf. §8).
 *  À chaque exécution :
 *   - objet en « relance »  → notification à son propriétaire ;
 *   - objet en « escalade » → notification aux directeurs ;
 *   - digest agrégé (escaladés + bloqués) → notification aux directeurs.
 *  Canaux : toujours in-app ; e-mail en plus si Resend est configuré.
 *  Idempotent : pas de doublon non lu le même jour pour le même objet.
 * ================================================================== */
import { reminderState } from "@/lib/domain";
import {
  getCatalogue,
  getEmailById,
  insertNotification,
  listEscalationTargets,
  listItems,
  notifExistsToday,
  setRelanceDate,
} from "@/lib/db/repo";
import { getSettings, logActivity } from "@/lib/db/admin";
import { listObjectives } from "@/lib/db/objectives";
import { isEmailConfigured, sendEmail } from "./email";

export interface ReminderSummary {
  relances: number;
  escalades: number;
  digests: number;
  echeances: number;
  emailsSent: number;
  emailConfigured: boolean;
}

export async function runReminders(): Promise<ReminderSummary> {
  const now = new Date();
  const items = listItems();
  const types = getCatalogue().types; // SLA depuis le catalogue (y compris types ajoutés)
  const targets = listEscalationTargets(); // directeurs (ou admins à défaut)
  // E-mail effectif = Resend configuré ET activé dans les paramètres d'admin.
  const emailOn = isEmailConfigured() && getSettings().emailEnabled;
  const channel = emailOn ? ["in-app", "e-mail"] : ["in-app"];

  let relances = 0;
  let escalades = 0;
  let digests = 0;
  let echeances = 0;
  let emailsSent = 0;

  const emails: Array<{ to: string; subject: string; text: string }> = [];

  // Échéances de relance planifiées par les utilisateurs (calendrier).
  for (const item of items) {
    if (
      item.statut !== "Clôturé" &&
      item.dateRelancePrevue &&
      item.dateRelancePrevue.getTime() <= now.getTime()
    ) {
      const message = `Relance planifiée arrivée à échéance : [${item.ref}] ${item.objet}.`;
      insertNotification({ userId: item.ownerId, itemId: item.id, kind: "echeance", message, channel });
      echeances++;
      setRelanceDate(item.id, null); // ne se déclenche qu'une fois
      const to = getEmailById(item.ownerId);
      if (emailOn && to) emails.push({ to, subject: `Cap · Relance planifiée (${item.ref})`, text: message });
    }
  }

  for (const item of items) {
    const rs = reminderState(item, now, types);

    if (rs.level === "relance") {
      if (!notifExistsToday(item.ownerId, item.id, "relance")) {
        const message = `Relance due : [${item.ref}] ${item.objet} — sans réponse depuis ${rs.days} j.`;
        insertNotification({ userId: item.ownerId, itemId: item.id, kind: "relance", message, channel });
        relances++;
        const to = getEmailById(item.ownerId);
        if (emailOn && to) emails.push({ to, subject: `Cap · Relance due (${item.ref})`, text: message });
      }
    } else if (rs.level === "escalade") {
      const message = `Escalade : [${item.ref}] ${item.objet} — sans mouvement depuis ${rs.days} j.`;
      for (const dir of targets) {
        if (!notifExistsToday(dir.id, item.id, "escalade")) {
          insertNotification({ userId: dir.id, itemId: item.id, kind: "escalade", message, channel });
          escalades++;
          const to = getEmailById(dir.id);
          if (emailOn && to) emails.push({ to, subject: `Cap · Escalade (${item.ref})`, text: message });
        }
      }
    }
  }

  // Échéances d'objectifs annuels (Plan de l'année) : rappel au responsable
  // et à l'équipe quand la fin approche (≤ 7 jours) et que l'objectif n'est
  // ni atteint ni déclassé.
  for (const o of listObjectives()) {
    if (o.status === "atteint" || o.status === "declasse") continue;
    const daysLeft = (o.endDate.getTime() - now.getTime()) / 86400000;
    if (daysLeft < 0 || daysLeft > 7) continue;
    const message = `Objectif « ${o.title} » arrive à échéance le ${o.endDate.toLocaleDateString("fr-FR")}.`;
    const recipients = [...new Set([o.ownerId, ...o.memberIds])].filter(Boolean);
    for (const uid of recipients) {
      if (!notifExistsToday(uid, null, "echeance")) {
        insertNotification({ userId: uid, itemId: null, kind: "echeance", message, channel });
        echeances++;
        const to = getEmailById(uid);
        if (emailOn && to) emails.push({ to, subject: `Cap · Échéance d'objectif`, text: message });
      }
    }
  }

  // Digest du matin aux directeurs (toujours actif, un par jour et par directeur).
  const nbEscalades = items.filter((i) => reminderState(i, now, types).level === "escalade").length;
  const nbBloques = items.filter((i) => i.statut === "Bloqué").length;
  const digestMsg = `Digest du matin : ${nbEscalades} suivi(s) escaladé(s) · ${nbBloques} bloqué(s).`;
  for (const dir of targets) {
    if (!notifExistsToday(dir.id, null, "digest")) {
      insertNotification({ userId: dir.id, itemId: null, kind: "digest", message: digestMsg, channel });
      digests++;
      const to = getEmailById(dir.id);
      if (emailOn && to) emails.push({ to, subject: "Cap · Digest du matin", text: digestMsg });
    }
  }

  // Envoi des e-mails (best-effort) si Resend est configuré.
  for (const m of emails) {
    if (await sendEmail(m.to, m.subject, m.text)) emailsSent++;
  }

  logActivity(
    null,
    "reminders_run",
    `${relances} relance(s), ${escalades} escalade(s), ${echeances} échéance(s), ${digests} digest(s), ${emailsSent} e-mail(s)`
  );

  return { relances, escalades, digests, echeances, emailsSent, emailConfigured: emailOn };
}

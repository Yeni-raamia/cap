/* ==================================================================
 *  lib/auth/login-alert.ts — Alerte de connexion depuis un appareil inconnu.
 *
 *  Après ouverture d'une session, on compare l'appareil (navigateur + système)
 *  aux autres sessions actives du compte. S'il est inconnu — et que ce n'est
 *  pas la toute première session — on notifie l'utilisateur (in-app, et par
 *  e-mail si configuré) et on trace l'événement. Best effort : jamais bloquant.
 * ================================================================== */
import { describeUserAgent } from "@/lib/auth/user-agent";
import { getEmailById, getProfileById, insertNotification, otherSessionAgents } from "@/lib/db/repo";
import { getSettings, logActivity } from "@/lib/db/admin";
import { isEmailConfigured, sendEmail } from "@/lib/reminders/email";

/**
 * Notifie l'utilisateur si la session courante provient d'un appareil jamais
 * vu parmi ses autres sessions actives. `currentToken` = jeton de la session
 * qui vient d'être créée (exclu de la comparaison).
 */
export function maybeAlertNewLogin(
  userId: string,
  userAgent: string | null,
  ip: string | null,
  currentToken: string
): void {
  try {
    const priorAgents = otherSessionAgents(userId, currentToken);
    // Aucune autre session : on établit la référence, pas d'alerte.
    if (priorAgents.length === 0) return;

    const device = describeUserAgent(userAgent);
    // Appareil déjà connu (même navigateur + système) : rien à signaler.
    if (priorAgents.some((a) => describeUserAgent(a) === device)) return;

    const ipTxt = ip ? ` (IP ${ip})` : "";
    const message =
      `Nouvelle connexion à votre compte depuis ${device}${ipTxt}. ` +
      `Si ce n'était pas vous, changez votre mot de passe et déconnectez les autres sessions depuis « Mon compte ».`;

    const email = getEmailById(userId);
    const emailOn = getSettings().emailEnabled && isEmailConfigured() && Boolean(email);
    insertNotification({
      userId,
      itemId: null,
      kind: "securite",
      message,
      channel: emailOn ? ["in-app", "e-mail"] : ["in-app"],
    });
    logActivity(userId, "login_new_device", `${device}${ipTxt}`);

    if (emailOn && email) {
      const nom = getProfileById(userId)?.nom ?? "";
      void sendEmail(
        email,
        "Cap — nouvelle connexion à votre compte",
        `Bonjour ${nom},\n\n${message}\n\n— Cap (sécurité)`
      ).catch(() => {
        /* e-mail best effort : la notification in-app reste la garantie */
      });
    }
  } catch {
    /* ne jamais bloquer la connexion */
  }
}

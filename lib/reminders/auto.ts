/* ==================================================================
 *  lib/reminders/auto.ts — Filet de sécurité du moteur de relance.
 *
 *  Le cron externe (/api/cron/reminders) reste le mécanisme principal.
 *  Ceci déclenche le moteur en tâche de fond lors d'un accès à l'app, si
 *  sa dernière exécution (cron OU auto) date de trop — pour éviter qu'un
 *  oubli de cron gèle relances, escalades et digests.
 *
 *  Throttlé (au plus une exécution toutes les N heures) + verrou anti-
 *  concurrence dans le process. Le moteur étant idempotent par jour, une
 *  exécution redondante ne crée aucun doublon de notification.
 * ================================================================== */
import { lastReminderRun } from "@/lib/db/admin";
import { runReminders } from "./engine";

const MIN_INTERVAL_MS = 3 * 60 * 60 * 1000; // au plus une exécution auto / 3 h

let running = false;

/** Déclenche le moteur en arrière-plan si nécessaire. Retour immédiat. */
export function maybeRunRemindersInBackground(): void {
  if (running) return;
  let last: Date | null = null;
  try {
    last = lastReminderRun()?.createdAt ?? null;
  } catch {
    return; // base indisponible : on n'insiste pas
  }
  if (last && Date.now() - last.getTime() < MIN_INTERVAL_MS) return;

  running = true;
  void runReminders()
    .catch(() => {
      /* filet de sécurité : on avale les erreurs pour ne pas perturber la requête */
    })
    .finally(() => {
      running = false;
    });
}

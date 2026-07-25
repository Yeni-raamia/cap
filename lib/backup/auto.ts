/* ==================================================================
 *  lib/backup/auto.ts — Sauvegarde planifiée (filet in-app, sans cron).
 *
 *  Déclenchée en tâche de fond lors d'un accès à l'application : si la
 *  sauvegarde automatique est activée et que la dernière date de trop
 *  (quotidien ou hebdomadaire), on en crée une nouvelle sur le serveur
 *  puis on applique la rétention. Throttlé + verrou anti-concurrence.
 * ================================================================== */
import { getBackupSettings, logActivity, setBackupSettings } from "@/lib/db/admin";
import { runServerBackup } from "@/lib/db/backup";

const DAY_MS = 24 * 60 * 60 * 1000;

let running = false;

/** Déclenche une sauvegarde planifiée si nécessaire. Retour immédiat. */
export function maybeRunBackupInBackground(): void {
  if (running) return;

  let s;
  try {
    s = getBackupSettings();
  } catch {
    return; // base indisponible : on n'insiste pas
  }
  if (!s.autoEnabled) return;

  const interval = s.frequency === "weekly" ? 7 * DAY_MS : DAY_MS;
  const last = s.lastRunAt ? new Date(s.lastRunAt).getTime() : 0;
  if (last && Date.now() - last < interval) return;

  running = true;
  void (async () => {
    try {
      const file = await runServerBackup(s.retention);
      setBackupSettings({ lastRunAt: new Date().toISOString() });
      logActivity(null, "backup_auto", `${s.frequency === "weekly" ? "hebdo" : "quotidienne"} · ${file.name}`);
    } catch {
      /* filet de sécurité : on avale les erreurs pour ne pas perturber la requête */
    } finally {
      running = false;
    }
  })();
}

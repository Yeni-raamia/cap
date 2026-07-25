/* Sauvegardes serveur (planifiées / manuelles) — admin uniquement.
 *  GET  : réglages + liste des sauvegardes présentes sur le serveur.
 *  POST : { action: "save" | "run" | "delete" | "restore", ... }. */
import { getCurrentUser } from "@/lib/auth/session";
import { getBackupSettings, setBackupSettings, logActivity } from "@/lib/db/admin";
import {
  deleteServerBackup,
  listServerBackups,
  restoreServerBackup,
  runServerBackup,
} from "@/lib/db/backup";
import type { BackupFrequency } from "@/lib/domain";

function payload() {
  return { settings: getBackupSettings(), files: listServerBackups() };
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return Response.json({ error: "Réservé aux administrateurs." }, { status: 403 });
  }
  return Response.json(payload());
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return Response.json({ error: "Réservé aux administrateurs." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const action = body?.action as string;

  if (action === "save") {
    const freq: BackupFrequency = body.frequency === "weekly" ? "weekly" : "daily";
    setBackupSettings({
      autoEnabled: Boolean(body.autoEnabled),
      frequency: freq,
      retention: Number(body.retention) || 7,
    });
    logActivity(user.id, "backup_settings", `auto=${body.autoEnabled ? "on" : "off"} · ${freq} · ${Number(body.retention) || 7}`);
    return Response.json(payload());
  }

  if (action === "run") {
    const s = getBackupSettings();
    const file = await runServerBackup(s.retention);
    setBackupSettings({ lastRunAt: new Date().toISOString() });
    logActivity(user.id, "backup_auto", `manuelle · ${file.name}`);
    return Response.json(payload());
  }

  if (action === "delete") {
    const ok = deleteServerBackup(String(body.name || ""));
    if (!ok) return Response.json({ error: "Sauvegarde introuvable." }, { status: 404 });
    logActivity(user.id, "backup_delete", String(body.name));
    return Response.json(payload());
  }

  if (action === "restore") {
    const res = await restoreServerBackup(String(body.name || ""));
    if (!res.ok) return Response.json({ error: res.error ?? "Restauration impossible." }, { status: 400 });
    logActivity(user.id, "backup_restore", `serveur · ${body.name}`);
    return Response.json({ ok: true });
  }

  return Response.json({ error: "Action inconnue." }, { status: 400 });
}

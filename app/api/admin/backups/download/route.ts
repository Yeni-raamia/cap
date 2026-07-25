/* Téléchargement d'une sauvegarde serveur par nom (admin uniquement). */
import { getCurrentUser } from "@/lib/auth/session";
import { readServerBackup, isSafeBackupName } from "@/lib/db/backup";
import { logActivity } from "@/lib/db/admin";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return Response.json({ error: "Réservé aux administrateurs." }, { status: 403 });
  }
  const name = new URL(request.url).searchParams.get("name") || "";
  if (!isSafeBackupName(name)) return Response.json({ error: "Nom invalide." }, { status: 400 });

  const buf = readServerBackup(name);
  if (!buf) return Response.json({ error: "Sauvegarde introuvable." }, { status: 404 });

  logActivity(user.id, "backup_download", `serveur · ${name}`);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Content-Length": String(buf.length),
      "Cache-Control": "no-store",
    },
  });
}

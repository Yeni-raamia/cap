/* Téléchargement d'une sauvegarde complète de la base (admin uniquement).
 * Renvoie un instantané cohérent du fichier SQLite en pièce jointe. */
import { getCurrentUser } from "@/lib/auth/session";
import { makeBackup } from "@/lib/db/backup";
import { logActivity } from "@/lib/db/admin";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return Response.json({ error: "Réservé aux administrateurs." }, { status: 403 });
  }

  const buf = await makeBackup();
  const stamp = new Date()
    .toISOString()
    .slice(0, 16)
    .replace(/[:T]/g, "-"); // AAAA-MM-JJ-HH-MM
  const filename = `cap-backup-${stamp}.sqlite`;

  logActivity(user.id, "backup_download", `${(buf.length / 1024 / 1024).toFixed(1)} Mo`);

  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buf.length),
      "Cache-Control": "no-store",
    },
  });
}

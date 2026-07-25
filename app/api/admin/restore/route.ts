/* Restauration de la base depuis une sauvegarde téléversée (admin uniquement).
 * Valide le fichier, fait un instantané de sécurité, puis remplace la base. */
import { getCurrentUser } from "@/lib/auth/session";
import { restoreFromBuffer } from "@/lib/db/backup";
import { logActivity } from "@/lib/db/admin";

/** Taille maximale acceptée pour un fichier de restauration (200 Mo). */
const MAX_BYTES = 200 * 1024 * 1024;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return Response.json({ error: "Réservé aux administrateurs." }, { status: 403 });
  }

  let file: File | null = null;
  try {
    const form = await request.formData();
    const f = form.get("file");
    if (f instanceof File) file = f;
  } catch {
    return Response.json({ error: "Requête invalide." }, { status: 400 });
  }
  if (!file) return Response.json({ error: "Aucun fichier fourni." }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: "Fichier trop volumineux (max 200 Mo)." }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  const res = await restoreFromBuffer(buf);
  if (!res.ok) return Response.json({ error: res.error ?? "Restauration impossible." }, { status: 400 });

  // Écrit dans la base fraîchement restaurée : trace la restauration elle-même.
  logActivity(user.id, "backup_restore", `depuis ${file.name || "sauvegarde"}`);

  return Response.json({ ok: true });
}

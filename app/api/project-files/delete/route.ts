/* Suppression d'un fichier partagé de projet : l'auteur du dépôt ou un manager+. */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { deleteProjectFile, getProjectFileMeta, listProjectFiles } from "@/lib/db/projectfiles";
import { logActivity } from "@/lib/db/admin";
import { isReadOnly } from "@/lib/domain";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (isReadOnly(user)) return NextResponse.json({ error: "Compte en lecture seule." }, { status: 403 });

  const { id } = await request.json().catch(() => ({}));
  const f = getProjectFileMeta(String(id || ""));
  if (!f) return NextResponse.json({ error: "Fichier introuvable." }, { status: 404 });

  const isManager = ["manager", "directeur", "admin"].includes(user.role);
  if (f.uploadedBy !== user.id && !isManager) {
    return NextResponse.json({ error: "Suppression réservée à l'auteur du dépôt ou à un responsable." }, { status: 403 });
  }

  deleteProjectFile(f.id);
  logActivity(user.id, "project_file_delete", f.filename);
  return NextResponse.json({ files: listProjectFiles(f.projectId) });
}

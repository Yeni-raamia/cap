/* Fichiers partagés d'un projet : liste (GET) et téléversement (POST multipart). */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { createProjectFile, listProjectFiles, projectAccess } from "@/lib/db/projectfiles";
import { logActivity } from "@/lib/db/admin";
import { ATTACH_EXTS, ATTACH_MAX_BYTES, fileExt, isReadOnly, type Profile } from "@/lib/domain";

// Membres du projet (ou responsables manager+) hors lecture seule peuvent déposer.
function canWrite(user: Profile, isMember: boolean): boolean {
  if (isReadOnly(user)) return false;
  return isMember || ["manager", "directeur", "admin"].includes(user.role);
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const projectId = new URL(request.url).searchParams.get("projectId") || "";
  if (!projectId) return NextResponse.json({ error: "Projet manquant." }, { status: 400 });
  return NextResponse.json({ files: listProjectFiles(projectId) });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const form = await request.formData().catch(() => null);
  const projectId = String(form?.get("projectId") || "");
  const file = form?.get("file");
  if (!projectId || !(file instanceof File)) {
    return NextResponse.json({ error: "Fichier ou projet manquant." }, { status: 400 });
  }

  const acc = projectAccess(projectId, user.id);
  if (!acc.exists) return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });
  if (!canWrite(user, acc.isMember)) {
    return NextResponse.json({ error: "Réservé aux membres du projet (ou à un responsable)." }, { status: 403 });
  }

  const ext = fileExt(file.name);
  if (!ATTACH_EXTS.includes(ext)) {
    return NextResponse.json({ error: `Type de fichier non autorisé (.${ext}).` }, { status: 400 });
  }
  if (file.size > ATTACH_MAX_BYTES) {
    return NextResponse.json({ error: "Fichier trop volumineux (max 10 Mo)." }, { status: 400 });
  }

  const data = Buffer.from(await file.arrayBuffer());
  createProjectFile({
    projectId,
    filename: file.name.slice(0, 200),
    mime: file.type || "application/octet-stream",
    size: file.size,
    data,
    uploadedBy: user.id,
  });
  logActivity(user.id, "project_file_add", file.name);
  return NextResponse.json({ files: listProjectFiles(projectId) });
}

/* Preuves / pièces jointes d'un audit : liste (GET) et téléversement (POST multipart). */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { createAuditFile, listAuditFiles } from "@/lib/db/auditfiles";
import { auditExists } from "@/lib/db/audits";
import { logActivity } from "@/lib/db/admin";
import { ATTACH_EXTS, ATTACH_MAX_BYTES, fileExt, isReadOnly } from "@/lib/domain";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const auditId = new URL(request.url).searchParams.get("auditId") || "";
  if (!auditId) return NextResponse.json({ error: "Audit manquant." }, { status: 400 });
  return NextResponse.json({ files: listAuditFiles(auditId) });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (isReadOnly(user)) return NextResponse.json({ error: "Compte en lecture seule." }, { status: 403 });

  const form = await request.formData().catch(() => null);
  const auditId = String(form?.get("auditId") || "");
  const questionId = String(form?.get("questionId") || "");
  const file = form?.get("file");
  if (!auditId || !(file instanceof File)) {
    return NextResponse.json({ error: "Fichier ou audit manquant." }, { status: 400 });
  }
  if (!auditExists(auditId)) return NextResponse.json({ error: "Audit introuvable." }, { status: 404 });

  const ext = fileExt(file.name);
  if (!ATTACH_EXTS.includes(ext)) {
    return NextResponse.json({ error: `Type de fichier non autorisé (.${ext}).` }, { status: 400 });
  }
  if (file.size > ATTACH_MAX_BYTES) {
    return NextResponse.json({ error: "Fichier trop volumineux (max 10 Mo)." }, { status: 400 });
  }

  const data = Buffer.from(await file.arrayBuffer());
  createAuditFile({
    auditId, questionId,
    filename: file.name.slice(0, 200),
    mime: file.type || "application/octet-stream",
    size: file.size,
    data,
    uploadedBy: user.id,
  });
  logActivity(user.id, "audit_file_add", file.name);
  return NextResponse.json({ files: listAuditFiles(auditId) });
}

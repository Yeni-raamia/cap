/* Pièces jointes d'un suivi : liste (GET) et téléversement (POST multipart). */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { createAttachment, getItem, listAttachments } from "@/lib/db/repo";
import { logActivity } from "@/lib/db/admin";
import { ATTACH_EXTS, ATTACH_MAX_BYTES, fileExt, isReadOnly, type Profile } from "@/lib/domain";

// Un agent ne peut joindre que sur ses propres suivis ; les autres rôles (hors
// lecture seule) sur tous. La lecture/liste est ouverte à tout compte autorisé.
function canWrite(user: Profile, ownerId: string): boolean {
  if (isReadOnly(user)) return false;
  return user.role === "agent" ? ownerId === user.id : true;
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const itemId = new URL(request.url).searchParams.get("itemId") || "";
  if (!itemId) return NextResponse.json({ error: "Suivi manquant." }, { status: 400 });
  return NextResponse.json({ attachments: listAttachments(itemId) });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const form = await request.formData().catch(() => null);
  const itemId = String(form?.get("itemId") || "");
  const file = form?.get("file");
  if (!itemId || !(file instanceof File)) {
    return NextResponse.json({ error: "Fichier ou suivi manquant." }, { status: 400 });
  }

  const item = getItem(itemId);
  if (!item) return NextResponse.json({ error: "Suivi introuvable." }, { status: 404 });
  if (!canWrite(user, item.ownerId)) {
    return NextResponse.json({ error: "Vous n'avez pas le droit d'ajouter une pièce jointe à ce suivi." }, { status: 403 });
  }

  const ext = fileExt(file.name);
  if (!ATTACH_EXTS.includes(ext)) {
    return NextResponse.json({ error: `Type de fichier non autorisé (.${ext}).` }, { status: 400 });
  }
  if (file.size > ATTACH_MAX_BYTES) {
    return NextResponse.json({ error: "Fichier trop volumineux (max 10 Mo)." }, { status: 400 });
  }

  const data = Buffer.from(await file.arrayBuffer());
  createAttachment({
    itemId,
    filename: file.name.slice(0, 200),
    mime: file.type || "application/octet-stream",
    size: file.size,
    data,
    uploadedBy: user.id,
  });
  logActivity(user.id, "attachment_add", `${file.name} → ${item.ref}`);
  return NextResponse.json({ attachments: listAttachments(itemId) });
}

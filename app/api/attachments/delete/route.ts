/* Suppression d'une pièce jointe : l'auteur du dépôt ou un rôle manager+. */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { deleteAttachment, getAttachmentMeta, getItem, listAttachments } from "@/lib/db/repo";
import { logActivity } from "@/lib/db/admin";
import { isReadOnly } from "@/lib/domain";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (isReadOnly(user)) return NextResponse.json({ error: "Compte en lecture seule." }, { status: 403 });

  const { id } = await request.json().catch(() => ({}));
  const att = getAttachmentMeta(String(id || ""));
  if (!att) return NextResponse.json({ error: "Pièce jointe introuvable." }, { status: 404 });

  const isManager = ["manager", "directeur", "admin"].includes(user.role);
  if (att.uploadedBy !== user.id && !isManager) {
    return NextResponse.json({ error: "Suppression réservée à l'auteur du dépôt ou à un responsable." }, { status: 403 });
  }

  deleteAttachment(att.id);
  const item = getItem(att.itemId);
  logActivity(user.id, "attachment_delete", `${att.filename}${item ? ` (${item.ref})` : ""}`);
  return NextResponse.json({ attachments: listAttachments(att.itemId) });
}

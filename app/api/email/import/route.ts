/* Importe un e-mail .eml comme réponse sur un suivi : ajoute l'événement
 * « réponse », repasse le suivi « En traitement » et attache l'e-mail original. */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { denyReadOnly } from "@/lib/auth/guards";
import { canEditItem, getItem, listItems, recordEmailResponse } from "@/lib/db/repo";
import { logActivity } from "@/lib/db/admin";
import { extractRefToken, parseEml } from "@/lib/email/eml";

const MAX_BYTES = 25 * 1024 * 1024; // 25 Mo

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const ro = denyReadOnly(user);
  if (ro) return ro;

  let file: File | null = null;
  let itemId = "";
  try {
    const form = await request.formData();
    const f = form.get("file");
    if (f instanceof File) file = f;
    itemId = String(form.get("itemId") || "");
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
  if (!file) return NextResponse.json({ error: "Aucun fichier fourni." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Fichier trop volumineux (max 25 Mo)." }, { status: 400 });
  if (!itemId || !canEditItem(itemId, user)) {
    return NextResponse.json({ error: "Droits insuffisants sur ce suivi." }, { status: 403 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const p = parseEml(buf);
  const filename = /\.eml$/i.test(file.name) ? file.name : `${extractRefToken(p.subject) || "reponse"}.eml`;
  const ok = recordEmailResponse(itemId, user.id, { from: p.from || p.fromEmail }, { filename, content: buf });
  if (!ok) return NextResponse.json({ error: "Suivi introuvable." }, { status: 404 });

  logActivity(user.id, "email_import", `${getItem(itemId)?.ref ?? itemId} ← ${p.fromEmail || p.from}`);
  return NextResponse.json({ items: listItems() });
}

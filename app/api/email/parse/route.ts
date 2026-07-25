/* Analyse un e-mail .eml téléversé (aperçu avant import) et tente de le
 * rattacher à un suivi existant via la référence contenue dans l'objet. */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { findItemByRef } from "@/lib/db/repo";
import { bodyToPoints, extractRefToken, parseEml } from "@/lib/email/eml";

const MAX_BYTES = 25 * 1024 * 1024; // 25 Mo

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  let file: File | null = null;
  try {
    const f = (await request.formData()).get("file");
    if (f instanceof File) file = f;
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
  if (!file) return NextResponse.json({ error: "Aucun fichier fourni." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Fichier trop volumineux (max 25 Mo)." }, { status: 400 });
  if (/\.msg$/i.test(file.name)) {
    return NextResponse.json(
      { error: "Format .msg (Outlook) non pris en charge — exportez l'e-mail au format .eml." },
      { status: 400 }
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const p = parseEml(buf);
  const refToken = extractRefToken(p.subject);
  const match = refToken ? findItemByRef(refToken) : null;

  return NextResponse.json({
    subject: p.subject,
    from: p.from,
    fromEmail: p.fromEmail,
    to: p.to,
    date: p.date,
    text: p.text,
    points: bodyToPoints(p.text),
    refToken,
    match,
    attachments: p.attachments.map((a) => ({ filename: a.filename, mime: a.mime, size: a.content.length })),
  });
}

/* Crée un nouveau suivi de mail à partir d'un e-mail .eml non rattaché.
 * Le métier/type sont choisis par l'utilisateur ; objet, destinataire et
 * points clés sont pré-remplis depuis l'e-mail, qui est attaché comme preuve. */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { denyReadOnly } from "@/lib/auth/guards";
import { createAttachment, createItem, getCatalogue, listItems } from "@/lib/db/repo";
import { logActivity } from "@/lib/db/admin";
import { bodyToPoints, parseEml } from "@/lib/email/eml";
import { buildRef, isUrgentType, type Priorite } from "@/lib/domain";

const MAX_BYTES = 25 * 1024 * 1024; // 25 Mo
const PRIOS: Priorite[] = ["Critique", "Élevé", "Moyenne"];

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const ro = denyReadOnly(user);
  if (ro) return ro;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Aucun fichier fourni." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Fichier trop volumineux (max 25 Mo)." }, { status: 400 });

  const metier = String(form.get("metier") || "");
  const type = String(form.get("type") || "");
  const prioRaw = String(form.get("prio") || "Moyenne");
  const prio: Priorite = PRIOS.includes(prioRaw as Priorite) ? (prioRaw as Priorite) : "Moyenne";
  const objetOverride = String(form.get("objet") || "").trim();
  const destOverride = String(form.get("dest") || "").trim();

  const cat = getCatalogue();
  if (!cat.metiers[metier] || !cat.types[type]) {
    return NextResponse.json({ error: "Métier ou type invalide." }, { status: 400 });
  }
  if (metier === "CASE") {
    return NextResponse.json(
      { error: "Créer un CASE depuis un e-mail n'est pas pris en charge (numéro TheHive requis)." },
      { status: 400 }
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const p = parseEml(buf);
  const objet = objetOverride || p.subject || "(sans objet)";
  const dest = destOverride || p.from || p.fromEmail;

  const parsed = { metier, type, urgent: isUrgentType(type, cat.types), ref: buildRef(metier, 0), objet };
  const item = createItem({
    parsed,
    prio,
    dest,
    destService: null,
    destEmail: p.fromEmail || null,
    pointsRaw: bodyToPoints(p.text).join("\n"),
    ownerId: user.id,
  });

  const filename = /\.eml$/i.test(file.name) ? file.name : `${item.ref}.eml`;
  createAttachment({
    itemId: item.id,
    filename,
    mime: "message/rfc822",
    size: buf.length,
    data: buf,
    uploadedBy: user.id,
  });

  logActivity(user.id, "item_create", `${item.ref} (import e-mail)`);
  return NextResponse.json({ items: listItems(), item });
}

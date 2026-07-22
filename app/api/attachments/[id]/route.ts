/* Téléchargement d'une pièce jointe (authentifié). */
import { getCurrentUser } from "@/lib/auth/session";
import { getAttachmentData } from "@/lib/db/repo";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Non authentifié.", { status: 401 });

  const { id } = await params;
  const att = getAttachmentData(id);
  if (!att) return new Response("Introuvable.", { status: 404 });

  // Content-Disposition inline pour les images/PDF (aperçu), attachment sinon.
  const inlineTypes = /^(image\/|application\/pdf)/;
  const disp = inlineTypes.test(att.mime) ? "inline" : "attachment";
  const safeName = att.filename.replace(/["\\\r\n]/g, "_");

  return new Response(new Uint8Array(att.data), {
    headers: {
      "Content-Type": att.mime || "application/octet-stream",
      "Content-Disposition": `${disp}; filename="${safeName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

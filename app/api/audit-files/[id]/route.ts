/* Téléchargement d'une preuve d'audit (authentifié). */
import { getCurrentUser } from "@/lib/auth/session";
import { getAuditFileData } from "@/lib/db/auditfiles";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Non authentifié.", { status: 401 });

  const { id } = await params;
  const f = getAuditFileData(id);
  if (!f) return new Response("Introuvable.", { status: 404 });

  const inlineTypes = /^(image\/|application\/pdf)/;
  const disp = inlineTypes.test(f.mime) ? "inline" : "attachment";
  const safeName = f.filename.replace(/["\\\r\n]/g, "_");

  return new Response(new Uint8Array(f.data), {
    headers: {
      "Content-Type": f.mime || "application/octet-stream",
      "Content-Disposition": `${disp}; filename="${safeName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

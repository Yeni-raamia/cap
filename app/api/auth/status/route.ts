/* État d'approbation de la session courante (pour la page tampon d'attente). */
import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/session";

export async function GET() {
  const user = await getAuthUser();
  return NextResponse.json(
    {
      authenticated: Boolean(user),
      approved: Boolean(user?.approved),
      name: user?.nom ?? null,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

/* ==================================================================
 *  /api/legal-texts — Registre des textes légaux & réglementaires.
 *  POST op=create / update / delete
 *  La suppression est réservée aux manager/directeur/admin : elle emporte
 *  les évaluations des articles.
 * ================================================================== */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { denyReadOnly } from "@/lib/auth/guards";
import {
  createLegalText,
  deleteLegalText,
  getLegalText,
  listLegalTexts,
  updateLegalText,
  type LegalInput,
} from "@/lib/db/legaltexts";
import { logActivity } from "@/lib/db/admin";

const toIso = (d?: string | null) => (d ? new Date(`${d}T00:00:00`).toISOString() : null);
const canDelete = (role: string) => ["manager", "directeur", "admin"].includes(role);

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  return NextResponse.json({ legalTexts: listLegalTexts() });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const ro = denyReadOnly(user);
  if (ro) return ro;

  const body = await request.json().catch(() => ({}));
  const op: string = body?.op;

  const fields = (): LegalInput => ({
    name: typeof body?.name === "string" ? body.name : undefined,
    kind: body?.kind,
    authority: typeof body?.authority === "string" ? body.authority : undefined,
    reference: typeof body?.reference === "string" ? body.reference : undefined,
    publishedAt: body?.publishedAt !== undefined ? toIso(body.publishedAt) : undefined,
    effectiveAt: body?.effectiveAt !== undefined ? toIso(body.effectiveAt) : undefined,
    url: typeof body?.url === "string" ? body.url : undefined,
    description: typeof body?.description === "string" ? body.description : undefined,
    scope: typeof body?.scope === "string" ? body.scope : undefined,
    status: body?.status,
    applicable: typeof body?.applicable === "boolean" ? body.applicable : undefined,
    articles: body?.articles,
    ownerId: body?.ownerId !== undefined ? body.ownerId || null : undefined,
    reviewDate: body?.reviewDate !== undefined ? toIso(body.reviewDate) : undefined,
  });

  if (op === "create") {
    const name = String(body?.name || "").trim();
    if (!name) return NextResponse.json({ error: "Intitulé du texte requis." }, { status: 400 });
    createLegalText({ ...fields(), name, createdBy: user.id });
    logActivity(user.id, "grc.loi.creation", name);
    return NextResponse.json({ legalTexts: listLegalTexts() });
  }

  const id: string = body?.id;
  const cur = id ? getLegalText(id) : null;
  if (!cur) return NextResponse.json({ error: "Texte introuvable." }, { status: 404 });

  if (op === "update") {
    updateLegalText(id, fields());
    return NextResponse.json({ legalTexts: listLegalTexts() });
  }

  if (op === "delete") {
    if (!canDelete(user.role)) {
      return NextResponse.json(
        { error: "Suppression réservée aux manager, directeur ou administrateur." },
        { status: 403 }
      );
    }
    deleteLegalText(id);
    logActivity(user.id, "grc.loi.suppression", cur.name);
    return NextResponse.json({ legalTexts: listLegalTexts() });
  }

  return NextResponse.json({ error: "Opération inconnue." }, { status: 400 });
}

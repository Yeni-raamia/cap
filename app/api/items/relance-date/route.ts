import { NextResponse } from "next/server";
import { canEditItem, listItems, setRelanceDate } from "@/lib/db/repo";
import { getCurrentUser } from "@/lib/auth/session";
import { denyReadOnly } from "@/lib/auth/guards";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const _ro = denyReadOnly(user); if (_ro) return _ro;

  const body = await request.json().catch(() => ({}));
  const itemId: string = body?.itemId;
  const date: string | null = body?.date ?? null; // "YYYY-MM-DD" ou null

  if (!itemId) return NextResponse.json({ error: "Objet manquant." }, { status: 400 });
  if (!canEditItem(itemId, user)) {
    return NextResponse.json({ error: "Droits insuffisants sur cet objet." }, { status: 403 });
  }
  // Normalise une date "YYYY-MM-DD" en ISO (début de journée), ou efface avec null.
  const iso = date ? new Date(`${date}T00:00:00`).toISOString() : null;
  setRelanceDate(itemId, iso);
  return NextResponse.json({ items: listItems(user.id) });
}

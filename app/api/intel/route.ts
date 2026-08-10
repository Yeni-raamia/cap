/* ==================================================================
 *  /api/intel — Veille & threat intelligence (IOCs, module SOC).
 *  op=create / update / delete. Édition hors lecture seule ;
 *  suppression réservée aux manager/directeur/admin.
 * ================================================================== */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { denyReadOnly } from "@/lib/auth/guards";
import { createIntel, deleteIntel, getIntel, listIntel, intelExists, updateIntel } from "@/lib/db/intel";
import { logActivity } from "@/lib/db/admin";

const canDelete = (role: string) => ["manager", "directeur", "admin"].includes(role);
const toIso = (d?: string | null) => (d ? new Date(`${d}T00:00:00`).toISOString() : null);
const S = (v: unknown) => (typeof v === "string" ? v : undefined);
const techniques = (v: unknown): string[] =>
  Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === "string").map((s) => s.trim().toUpperCase()).filter(Boolean))] : [];

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const ro = denyReadOnly(user); if (ro) return ro;

  const body = await request.json().catch(() => ({}));
  const op: string = body?.op;

  if (op === "create") {
    const title = String(body?.title || "").trim();
    if (!title) return NextResponse.json({ error: "Intitulé requis." }, { status: 400 });
    const id = createIntel({
      title, kind: S(body?.kind), iocType: S(body?.iocType), value: String(body?.value || ""),
      tlp: S(body?.tlp), severity: S(body?.severity), source: String(body?.source || ""), status: S(body?.status),
      description: String(body?.description || ""), action: String(body?.action || ""),
      attackTechniques: techniques(body?.attackTechniques), expiresAt: toIso(body?.expiresAt), ownerId: S(body?.ownerId),
      createdBy: user.id,
    });
    logActivity(user.id, "intel.creation", title);
    return NextResponse.json({ intel: listIntel(), item: getIntel(id) });
  }

  const id: string = body?.id;
  if (!id || !intelExists(id)) return NextResponse.json({ error: "Élément introuvable." }, { status: 404 });

  if (op === "update") {
    updateIntel(id, {
      kind: S(body?.kind), title: typeof body?.title === "string" ? body.title.trim() : undefined,
      iocType: S(body?.iocType), value: S(body?.value), tlp: S(body?.tlp), severity: S(body?.severity),
      source: S(body?.source), status: S(body?.status), description: S(body?.description), action: S(body?.action),
      attackTechniques: body?.attackTechniques !== undefined ? techniques(body.attackTechniques) : undefined,
      expiresAt: body?.expiresAt !== undefined ? toIso(body.expiresAt) : undefined, ownerId: S(body?.ownerId),
    });
  } else if (op === "delete") {
    if (!canDelete(user.role)) return NextResponse.json({ error: "Suppression réservée aux manager/directeur/admin." }, { status: 403 });
    deleteIntel(id);
    return NextResponse.json({ intel: listIntel() });
  } else {
    return NextResponse.json({ error: "Opération inconnue." }, { status: 400 });
  }

  return NextResponse.json({ intel: listIntel(), item: getIntel(id) });
}

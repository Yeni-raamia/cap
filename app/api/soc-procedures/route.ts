/* ==================================================================
 *  /api/soc-procedures — Procédures & checklists de routine (SOC).
 *  op=create / update / delete. Édition hors lecture seule ;
 *  suppression réservée aux manager/directeur/admin.
 * ================================================================== */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { denyReadOnly } from "@/lib/auth/guards";
import { createSocProcedure, deleteSocProcedure, getSocProcedure, listSocProcedures, socProcedureExists, updateSocProcedure } from "@/lib/db/socprocedures";
import { logActivity } from "@/lib/db/admin";
import type { SocChecklistItem } from "@/lib/domain";

const canDelete = (role: string) => ["manager", "directeur", "admin"].includes(role);
const S = (v: unknown) => (typeof v === "string" ? v : undefined);

function parseItems(v: unknown): SocChecklistItem[] {
  if (!Array.isArray(v)) return [];
  return v.map((it) => {
    const o = (it ?? {}) as Record<string, unknown>;
    return { id: typeof o.id === "string" ? o.id : "", label: String(o.label ?? ""), guidance: String(o.guidance ?? "") };
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const ro = denyReadOnly(user); if (ro) return ro;

  const body = await request.json().catch(() => ({}));
  const op: string = body?.op;

  if (op === "create") {
    const title = String(body?.title || "").trim();
    if (!title) return NextResponse.json({ error: "Titre de la procédure requis." }, { status: 400 });
    const id = createSocProcedure({
      title, type: S(body?.type), frequency: S(body?.frequency),
      objective: String(body?.objective || ""), content: String(body?.content || ""),
      items: parseItems(body?.items), references: String(body?.references || ""),
      status: S(body?.status), ownerId: S(body?.ownerId), createdBy: user.id,
    });
    logActivity(user.id, "socprocedure.creation", title);
    return NextResponse.json({ socProcedures: listSocProcedures(), socProcedure: getSocProcedure(id) });
  }

  const id: string = body?.id;
  if (!id || !socProcedureExists(id)) return NextResponse.json({ error: "Procédure introuvable." }, { status: 404 });

  if (op === "update") {
    updateSocProcedure(id, {
      title: typeof body?.title === "string" ? body.title.trim() : undefined,
      type: S(body?.type), frequency: S(body?.frequency),
      objective: S(body?.objective), content: S(body?.content),
      items: body?.items !== undefined ? parseItems(body.items) : undefined,
      references: S(body?.references), status: S(body?.status), ownerId: S(body?.ownerId),
    });
  } else if (op === "delete") {
    if (!canDelete(user.role)) return NextResponse.json({ error: "Suppression réservée aux manager/directeur/admin." }, { status: 403 });
    deleteSocProcedure(id);
    return NextResponse.json({ socProcedures: listSocProcedures() });
  } else {
    return NextResponse.json({ error: "Opération inconnue." }, { status: 400 });
  }

  return NextResponse.json({ socProcedures: listSocProcedures(), socProcedure: getSocProcedure(id) });
}

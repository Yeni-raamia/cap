/* ==================================================================
 *  /api/oncall — Astreinte / planning de garde (module SOC).
 *  op=create / update / delete. Édition hors lecture seule ;
 *  suppression réservée aux manager/directeur/admin.
 * ================================================================== */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { denyReadOnly } from "@/lib/auth/guards";
import { createOnCall, deleteOnCall, getOnCall, listOnCall, onCallExists, updateOnCall } from "@/lib/db/oncall";
import { logActivity } from "@/lib/db/admin";

const canDelete = (role: string) => ["manager", "directeur", "admin"].includes(role);
const S = (v: unknown) => (typeof v === "string" ? v : undefined);
// Une garde est une plage datetime ; accepte "YYYY-MM-DDTHH:mm" (input datetime-local).
const toIso = (d?: unknown): string | null => {
  if (typeof d !== "string" || !d) return null;
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? null : dt.toISOString();
};

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const ro = denyReadOnly(user); if (ro) return ro;

  const body = await request.json().catch(() => ({}));
  const op: string = body?.op;

  if (op === "create") {
    const start = toIso(body?.start), end = toIso(body?.end);
    if (!start || !end) return NextResponse.json({ error: "Dates de début et de fin requises." }, { status: 400 });
    if (new Date(end).getTime() < new Date(start).getTime()) return NextResponse.json({ error: "La fin doit suivre le début." }, { status: 400 });
    const id = createOnCall({
      personId: S(body?.personId), role: S(body?.role), start, end,
      contact: String(body?.contact || ""), notes: String(body?.notes || ""), createdBy: user.id,
    });
    logActivity(user.id, "oncall.creation", `${start} → ${end}`);
    return NextResponse.json({ onCall: listOnCall(), shift: getOnCall(id) });
  }

  const id: string = body?.id;
  if (!id || !onCallExists(id)) return NextResponse.json({ error: "Garde introuvable." }, { status: 404 });

  if (op === "update") {
    updateOnCall(id, {
      personId: S(body?.personId), role: S(body?.role),
      start: body?.start !== undefined ? (toIso(body.start) ?? undefined) : undefined,
      end: body?.end !== undefined ? (toIso(body.end) ?? undefined) : undefined,
      contact: S(body?.contact), notes: S(body?.notes),
    });
  } else if (op === "delete") {
    if (!canDelete(user.role)) return NextResponse.json({ error: "Suppression réservée aux manager/directeur/admin." }, { status: 403 });
    deleteOnCall(id);
    return NextResponse.json({ onCall: listOnCall() });
  } else {
    return NextResponse.json({ error: "Opération inconnue." }, { status: 400 });
  }

  return NextResponse.json({ onCall: listOnCall(), shift: getOnCall(id) });
}

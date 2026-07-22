/* ==================================================================
 *  /api/objectives — Plan de l'année. Gestion réservée aux
 *  managers / directeurs / admin. Lecture pour tous (via GET global).
 * ================================================================== */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { denyReadOnly } from "@/lib/auth/guards";
import {
  achieveObjective,
  createObjective,
  deleteObjective,
  downgradeObjective,
  listObjectives,
  objectiveExists,
  updateObjective,
} from "@/lib/db/objectives";
import { logActivity } from "@/lib/db/admin";
import { OBJECTIVE_COLORS } from "@/lib/domain";

const toIso = (d?: string | null) => (d ? new Date(`${d}T00:00:00`).toISOString() : null);
const canManage = (role: string) => ["manager", "directeur", "admin"].includes(role);

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const ro = denyReadOnly(user); if (ro) return ro;
  if (!canManage(user.role)) {
    return NextResponse.json({ error: "Réservé aux managers et directeurs." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const op: string = body?.op;
  const arr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x) => typeof x === "string") : []);

  if (op === "create") {
    const title = String(body?.title || "").trim();
    const start = toIso(body?.startDate);
    const end = toIso(body?.endDate);
    if (!title || !start || !end) return NextResponse.json({ error: "Titre, date de début et de fin requis." }, { status: 400 });
    if (new Date(end) < new Date(start)) return NextResponse.json({ error: "La date de fin doit suivre la date de début." }, { status: 400 });
    createObjective({
      title,
      description: String(body?.description || ""),
      startDate: start,
      endDate: end,
      ownerId: typeof body?.ownerId === "string" && body.ownerId ? body.ownerId : user.id,
      color: OBJECTIVE_COLORS.includes(body?.color) ? body.color : OBJECTIVE_COLORS[0],
      createdBy: user.id,
      projectIds: arr(body?.projectIds),
      taskIds: arr(body?.taskIds),
      memberIds: arr(body?.memberIds),
    });
    logActivity(user.id, "objectif.creation", title);
    return NextResponse.json({ objectives: listObjectives() });
  }

  const id: string = body?.id;
  if (!id || !objectiveExists(id)) return NextResponse.json({ error: "Objectif introuvable." }, { status: 404 });

  if (op === "update") {
    updateObjective(id, {
      title: typeof body?.title === "string" ? body.title.trim() : undefined,
      description: typeof body?.description === "string" ? body.description : undefined,
      startDate: body?.startDate !== undefined ? toIso(body.startDate) ?? undefined : undefined,
      endDate: body?.endDate !== undefined ? toIso(body.endDate) ?? undefined : undefined,
      ownerId: typeof body?.ownerId === "string" ? body.ownerId : undefined,
      color: OBJECTIVE_COLORS.includes(body?.color) ? body.color : undefined,
      status: ["planifie", "en_cours", "atteint"].includes(body?.status) ? body.status : undefined,
      projectIds: body?.projectIds !== undefined ? arr(body.projectIds) : undefined,
      taskIds: body?.taskIds !== undefined ? arr(body.taskIds) : undefined,
      memberIds: body?.memberIds !== undefined ? arr(body.memberIds) : undefined,
    });
  } else if (op === "downgrade") {
    const reason = String(body?.reason || "").trim();
    if (!reason) return NextResponse.json({ error: "Motif de déclassement requis." }, { status: 400 });
    downgradeObjective(id, reason, user.id);
    logActivity(user.id, "objectif.declassement", reason);
  } else if (op === "achieve") {
    achieveObjective(id);
    logActivity(user.id, "objectif.atteint", id);
  } else if (op === "delete") {
    deleteObjective(id);
  } else {
    return NextResponse.json({ error: "Opération inconnue." }, { status: 400 });
  }

  return NextResponse.json({ objectives: listObjectives() });
}

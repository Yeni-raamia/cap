/* ==================================================================
 *  /api/tasks/recurrences — Gabarits de tâches récurrentes.
 *  GET             → { recurrences, counts }
 *  POST op=create  → créer un gabarit
 *  POST op=update  → modifier
 *  POST op=toggle  → activer / suspendre
 *  POST op=delete  → supprimer (les occurrences déjà créées sont conservées)
 *  POST op=run     → engendrer maintenant les occurrences dues
 * ================================================================== */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { denyReadOnly } from "@/lib/auth/guards";
import {
  createRecurrence,
  deleteRecurrence,
  generateDueTasks,
  getRecurrence,
  listRecurrences,
  recurrenceTaskCounts,
  setRecurrenceActive,
  updateRecurrence,
  type RecurrenceInput,
} from "@/lib/db/recurrences";
import { listTasks } from "@/lib/db/tasks";
import { logActivity } from "@/lib/db/admin";
import type { TaskRecurrence } from "@/lib/domain";

const toIso = (d?: string | null) => (d ? new Date(`${d}T00:00:00`).toISOString() : null);
const canAssignOthers = (role: string) => ["manager", "directeur", "admin"].includes(role);

/** Réponse commune : les gabarits, leurs compteurs, et les tâches à jour. */
function payload(userId: string) {
  const counts = recurrenceTaskCounts();
  return {
    recurrences: listRecurrences(),
    counts: Object.fromEntries(counts),
    tasks: listTasks(userId),
  };
}

/** Le gabarit attribue-t-il du travail à quelqu'un d'autre que soi ? */
function assignsOthers(body: Record<string, unknown>, userId: string): boolean {
  const mode = body?.assignMode;
  if (mode === "fixe") return Boolean(body?.assigneeId) && body.assigneeId !== userId;
  if (mode === "rotation") {
    const ids = Array.isArray(body?.rotationIds) ? (body.rotationIds as string[]) : [];
    return ids.some((id) => id && id !== userId);
  }
  return false;
}

/** Seuls le créateur du gabarit et les encadrants peuvent le modifier. */
const canEdit = (rec: TaskRecurrence, user: { id: string; role: string }) =>
  rec.createdBy === user.id || canAssignOthers(user.role);

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  // Lecture = bon moment pour rattraper les occurrences dues (idempotent).
  generateDueTasks();
  return NextResponse.json(payload(user.id));
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const ro = denyReadOnly(user);
  if (ro) return ro;

  const body = await request.json().catch(() => ({}));
  const op: string = body?.op;

  const input = (): RecurrenceInput => ({
    title: String(body?.title || "").trim(),
    description: typeof body?.description === "string" ? body.description : undefined,
    priority: body?.priority,
    projectId: body?.projectId !== undefined ? body.projectId || null : undefined,
    frequency: body?.frequency,
    weekdays: body?.weekdays,
    monthDay: body?.monthDay,
    intervalDays: body?.intervalDays,
    assignMode: body?.assignMode,
    assigneeId: body?.assigneeId !== undefined ? body.assigneeId || null : undefined,
    rotationIds: body?.rotationIds,
    dueOffsetDays: body?.dueOffsetDays,
    startDate: body?.startDate !== undefined ? toIso(body.startDate) : undefined,
    endDate: body?.endDate !== undefined ? toIso(body.endDate) : undefined,
    maxOccurrences: body?.maxOccurrences,
    active: body?.active,
  });

  if (op === "create") {
    const title = String(body?.title || "").trim();
    if (!title) return NextResponse.json({ error: "Intitulé requis." }, { status: 400 });
    if (assignsOthers(body, user.id) && !canAssignOthers(user.role)) {
      return NextResponse.json(
        { error: "Seul un manager ou directeur peut attribuer une tâche récurrente à d'autres personnes." },
        { status: 403 }
      );
    }
    const startDate = toIso(body?.startDate) ?? new Date().toISOString();
    createRecurrence({ ...input(), startDate, createdBy: user.id });
    logActivity(user.id, "tache.recurrence_creation", title);
    // Une série qui commence aujourd'hui doit produire sa tâche tout de suite.
    generateDueTasks();
    return NextResponse.json(payload(user.id));
  }

  if (op === "update") {
    const id: string = body?.id;
    const cur = id ? getRecurrence(id) : null;
    if (!cur) return NextResponse.json({ error: "Tâche récurrente introuvable." }, { status: 404 });
    if (!canEdit(cur, user)) return NextResponse.json({ error: "Droits insuffisants." }, { status: 403 });
    if (assignsOthers(body, user.id) && !canAssignOthers(user.role)) {
      return NextResponse.json(
        { error: "Seul un manager ou directeur peut attribuer une tâche récurrente à d'autres personnes." },
        { status: 403 }
      );
    }
    updateRecurrence(id, input());
    generateDueTasks();
    return NextResponse.json(payload(user.id));
  }

  if (op === "toggle") {
    const id: string = body?.id;
    const cur = id ? getRecurrence(id) : null;
    if (!cur) return NextResponse.json({ error: "Tâche récurrente introuvable." }, { status: 404 });
    if (!canEdit(cur, user)) return NextResponse.json({ error: "Droits insuffisants." }, { status: 403 });
    setRecurrenceActive(id, !cur.active);
    // Réactiver une série ne fait pas rattraper les jours de suspension :
    // `last_run_on` reste où il était, et le plafond de rattrapage s'applique.
    if (!cur.active) generateDueTasks();
    return NextResponse.json(payload(user.id));
  }

  if (op === "delete") {
    const id: string = body?.id;
    const cur = id ? getRecurrence(id) : null;
    if (!cur) return NextResponse.json({ error: "Tâche récurrente introuvable." }, { status: 404 });
    if (!canEdit(cur, user)) return NextResponse.json({ error: "Droits insuffisants." }, { status: 403 });
    deleteRecurrence(id);
    logActivity(user.id, "tache.recurrence_suppression", cur.title);
    return NextResponse.json(payload(user.id));
  }

  if (op === "run") {
    const res = generateDueTasks();
    return NextResponse.json({ ...payload(user.id), created: res.created });
  }

  return NextResponse.json({ error: "Opération inconnue." }, { status: 400 });
}

/* ==================================================================
 *  /api/tasks — Tâches assignables (module Productivité).
 *  GET            → { tasks }
 *  POST op=create → créer (managers/directeurs/admin peuvent assigner
 *                   à autrui ; un agent crée pour lui-même)
 *  POST op=update → modifier (assigné, créateur, ou manager/dir/admin)
 *  POST op=delete → supprimer (créateur ou manager/dir/admin)
 * ================================================================== */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { denyReadOnly } from "@/lib/auth/guards";
import { createTask, deleteTask, getTask, listTasks, publishTask, updateTask } from "@/lib/db/tasks";
import { insertNotification } from "@/lib/db/repo";
import { logActivity } from "@/lib/db/admin";
import { TASK_PRIORITIES, TASK_STATUTS, type TaskPriority, type TaskStatus } from "@/lib/domain";

const toIso = (d?: string | null) => (d ? new Date(`${d}T00:00:00`).toISOString() : null);
const canAssignOthers = (role: string) => ["manager", "directeur", "admin"].includes(role);

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  return NextResponse.json({ tasks: listTasks(user.id) });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const ro = denyReadOnly(user); if (ro) return ro;

  const body = await request.json().catch(() => ({}));
  const op: string = body?.op;

  if (op === "create") {
    const title = String(body?.title || "").trim();
    if (!title) return NextResponse.json({ error: "Titre requis." }, { status: 400 });
    // Un agent ne peut assigner qu'à lui-même ; les managers/dir/admin à qui ils veulent.
    let assigneeId: string | null = typeof body?.assigneeId === "string" && body.assigneeId ? body.assigneeId : null;
    if (assigneeId && assigneeId !== user.id && !canAssignOthers(user.role)) {
      return NextResponse.json({ error: "Seul un manager ou directeur peut assigner à une autre personne." }, { status: 403 });
    }
    if (!assigneeId) assigneeId = user.id;
    const priority: TaskPriority = TASK_PRIORITIES.includes(body?.priority) ? body.priority : "Normale";
    createTask({
      title,
      description: String(body?.description || ""),
      assigneeId,
      createdBy: user.id,
      projectId: typeof body?.projectId === "string" && body.projectId ? body.projectId : null,
      priority,
      startDate: toIso(body?.startDate),
      dueDate: toIso(body?.dueDate),
    });
    if (assigneeId !== user.id) {
      insertNotification({
        userId: assigneeId,
        itemId: null,
        kind: "tache",
        message: `${user.nom} vous a assigné une tâche : « ${title} ».`,
        channel: ["in-app"],
      });
    }
    logActivity(user.id, "tache.creation", title);
    return NextResponse.json({ tasks: listTasks(user.id) });
  }

  if (op === "update") {
    const id: string = body?.id;
    const cur = id ? getTask(id) : null;
    if (!cur) return NextResponse.json({ error: "Tâche introuvable." }, { status: 404 });
    const isMine = cur.assigneeId === user.id || cur.createdBy === user.id;
    if (!isMine && !canAssignOthers(user.role)) {
      return NextResponse.json({ error: "Droits insuffisants sur cette tâche." }, { status: 403 });
    }
    // La réassignation à autrui reste réservée aux managers/dir/admin.
    let assigneeId = body?.assigneeId;
    if (assigneeId !== undefined && assigneeId !== user.id && !canAssignOthers(user.role)) {
      assigneeId = undefined; // ignoré
    }
    const status: TaskStatus | undefined = TASK_STATUTS.includes(body?.status) ? body.status : undefined;
    const priority: TaskPriority | undefined = TASK_PRIORITIES.includes(body?.priority) ? body.priority : undefined;
    updateTask(id, {
      title: typeof body?.title === "string" ? body.title.trim() : undefined,
      description: typeof body?.description === "string" ? body.description : undefined,
      assigneeId: assigneeId !== undefined ? (assigneeId || null) : undefined,
      projectId: body?.projectId !== undefined ? (body.projectId || null) : undefined,
      status,
      priority,
      startDate: body?.startDate !== undefined ? toIso(body.startDate) : undefined,
      dueDate: body?.dueDate !== undefined ? toIso(body.dueDate) : undefined,
    });
    // Notifier la nouvelle personne assignée.
    if (assigneeId !== undefined && assigneeId && assigneeId !== user.id && assigneeId !== cur.assigneeId) {
      insertNotification({
        userId: assigneeId,
        itemId: null,
        kind: "tache",
        message: `${user.nom} vous a assigné une tâche : « ${cur.title} ».`,
        channel: ["in-app"],
      });
    }
    return NextResponse.json({ tasks: listTasks(user.id) });
  }

  if (op === "delete") {
    const id: string = body?.id;
    const cur = id ? getTask(id) : null;
    if (!cur) return NextResponse.json({ error: "Tâche introuvable." }, { status: 404 });
    if (cur.createdBy !== user.id && !canAssignOthers(user.role)) {
      return NextResponse.json({ error: "Droits insuffisants." }, { status: 403 });
    }
    deleteTask(id);
    return NextResponse.json({ tasks: listTasks(user.id) });
  }

  if (op === "publish") {
    const id: string = body?.id;
    const cur = id ? getTask(id) : null;
    if (!cur) return NextResponse.json({ error: "Tâche introuvable." }, { status: 404 });
    if (cur.createdBy !== user.id && !canAssignOthers(user.role)) {
      return NextResponse.json({ error: "Droits insuffisants." }, { status: 403 });
    }
    publishTask(id);
    logActivity(user.id, "tache.publication", cur.title);
    return NextResponse.json({ tasks: listTasks(user.id) });
  }

  return NextResponse.json({ error: "Opération inconnue." }, { status: 400 });
}

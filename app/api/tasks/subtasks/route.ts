/* ==================================================================
 *  /api/tasks/subtasks — Checklist de sous-tâches.
 *  op = add | toggle | rename | delete
 *  Éditable par l'assigné, le créateur, ou un manager/directeur/admin.
 * ================================================================== */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { denyReadOnly } from "@/lib/auth/guards";
import { addSubtask, deleteSubtask, getTask, listTasks, subtaskTaskId, updateSubtask } from "@/lib/db/tasks";

const canEditParent = (task: { assigneeId: string | null; createdBy: string | null }, role: string, uid: string) =>
  task.assigneeId === uid || task.createdBy === uid || ["manager", "directeur", "admin"].includes(role);

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const _ro = denyReadOnly(user); if (_ro) return _ro;

  const body = await request.json().catch(() => ({}));
  const op: string = body?.op;

  // Résoudre la tâche parente (via taskId direct ou via la sous-tâche visée).
  const taskId: string | null = body?.taskId ?? (body?.subtaskId ? subtaskTaskId(body.subtaskId) : null);
  const task = taskId ? getTask(taskId) : null;
  if (!task) return NextResponse.json({ error: "Tâche introuvable." }, { status: 404 });
  if (!canEditParent(task, user.role, user.id)) {
    return NextResponse.json({ error: "Droits insuffisants sur cette tâche." }, { status: 403 });
  }

  if (op === "add") {
    const title = String(body?.title || "").trim();
    if (!title) return NextResponse.json({ error: "Intitulé requis." }, { status: 400 });
    addSubtask(task.id, title);
  } else if (op === "toggle") {
    if (!body?.subtaskId) return NextResponse.json({ error: "Sous-tâche manquante." }, { status: 400 });
    updateSubtask(body.subtaskId, { done: Boolean(body?.done) });
  } else if (op === "rename") {
    if (!body?.subtaskId) return NextResponse.json({ error: "Sous-tâche manquante." }, { status: 400 });
    updateSubtask(body.subtaskId, { title: String(body?.title || "").trim() });
  } else if (op === "delete") {
    if (!body?.subtaskId) return NextResponse.json({ error: "Sous-tâche manquante." }, { status: 400 });
    deleteSubtask(body.subtaskId);
  } else {
    return NextResponse.json({ error: "Opération inconnue." }, { status: 400 });
  }

  return NextResponse.json({ tasks: listTasks() });
}

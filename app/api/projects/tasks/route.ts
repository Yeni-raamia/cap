import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { denyReadOnly } from "@/lib/auth/guards";
import { canEditProjectBoard } from "@/lib/auth/project-guard";
import { addTask, deleteTask, getProjectOwner, getProjectTaskInfo, listProjects, updateTask } from "@/lib/db/projects";
import { insertNotification } from "@/lib/db/repo";
import { TASK_PRIORITIES, TASK_STATUTS, type TaskPriority, type TaskStatus } from "@/lib/domain";

const toIso = (d?: string | null) => (d ? new Date(`${d}T00:00:00`).toISOString() : null);

/** Notifie la personne nouvellement assignée à une tâche de projet. */
function notifyAssignee(assigneeId: string, byName: string, byId: string, projectId: string, projName: string, taskTitle: string) {
  if (!assigneeId || assigneeId === byId) return;
  insertNotification({
    userId: assigneeId,
    itemId: null,
    kind: "tache",
    message: `${byName} vous a assigné la tâche « ${taskTitle} » sur le projet « ${projName} ».`,
    channel: ["in-app"],
    link: `/projets/${projectId}`,
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const _ro = denyReadOnly(user); if (_ro) return _ro;

  const body = await request.json().catch(() => ({}));
  const action: string = body?.action;

  const projName = (pid: string) => listProjects().find((p) => p.id === pid)?.name ?? "un projet";

  if (action === "add") {
    const projectId: string = body?.projectId;
    const title = String(body?.title || "").trim();
    if (!projectId || !title) return NextResponse.json({ error: "Titre requis." }, { status: 400 });
    if (!canEditProjectBoard(projectId, user)) {
      return NextResponse.json({ error: "Réservé au propriétaire et aux membres. Proposez plutôt une tâche." }, { status: 403 });
    }
    const assigneeId: string | null = body?.assigneeId || null;
    const addPriority: TaskPriority | undefined = TASK_PRIORITIES.includes(body?.priority) ? body.priority : undefined;
    addTask({ projectId, title, assigneeId, startDate: toIso(body?.startDate), dueDate: toIso(body?.dueDate), description: typeof body?.description === "string" ? body.description : undefined, priority: addPriority });
    // Prévenir la personne assignée (si ce n'est pas soi-même).
    if (assigneeId) notifyAssignee(assigneeId, user.nom, user.id, projectId, projName(projectId), title);
  } else if (action === "update" || action === "delete") {
    const taskId: string = body?.taskId;
    const info = taskId ? getProjectTaskInfo(taskId) : null;
    if (!info) return NextResponse.json({ error: "Tâche introuvable." }, { status: 404 });
    const projectId = info.projectId;
    if (!canEditProjectBoard(projectId, user)) {
      return NextResponse.json({ error: "Réservé au propriétaire et aux membres du projet." }, { status: 403 });
    }
    if (action === "delete") {
      deleteTask(taskId);
    } else {
      const status: TaskStatus | undefined = TASK_STATUTS.includes(body?.status) ? body.status : undefined;
      const priority: TaskPriority | undefined = TASK_PRIORITIES.includes(body?.priority) ? body.priority : undefined;
      updateTask(taskId, {
        title: typeof body?.title === "string" ? body.title.trim() : undefined,
        assigneeId: body?.assigneeId !== undefined ? body.assigneeId || null : undefined,
        status,
        startDate: body?.startDate !== undefined ? toIso(body.startDate) : undefined,
        dueDate: body?.dueDate !== undefined ? toIso(body.dueDate) : undefined,
        description: typeof body?.description === "string" ? body.description : undefined,
        priority,
      });
      // (Ré)assignation → prévenir la nouvelle personne assignée.
      if (body?.assigneeId !== undefined) {
        const newAssignee: string | null = body.assigneeId || null;
        if (newAssignee && newAssignee !== info.assigneeId) {
          const title = (typeof body?.title === "string" && body.title.trim()) || info.title;
          notifyAssignee(newAssignee, user.nom, user.id, projectId, projName(projectId), title);
        }
      }
      // Tâche terminée / bloquée → prévenir le propriétaire du projet.
      if (status && status !== info.status && (status === "fait" || status === "bloqué")) {
        const owner = getProjectOwner(projectId);
        if (owner && owner !== user.id) {
          insertNotification({
            userId: owner,
            itemId: null,
            kind: "tache",
            message: status === "fait"
              ? `${user.nom} a terminé la tâche « ${info.title} » du projet « ${projName(projectId)} ».`
              : `${user.nom} a marqué « bloquée » la tâche « ${info.title} » du projet « ${projName(projectId)} ».`,
            channel: ["in-app"],
            link: `/projets/${projectId}`,
          });
        }
      }
    }
  } else {
    return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
  }

  return NextResponse.json({ projects: listProjects(user.id) });
}

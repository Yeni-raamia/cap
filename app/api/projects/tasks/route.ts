import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { canContributeProject } from "@/lib/auth/project-guard";
import { addTask, deleteTask, listProjects, taskProjectId, updateTask } from "@/lib/db/projects";
import { TASK_STATUTS, type TaskStatus } from "@/lib/domain";

const toIso = (d?: string | null) => (d ? new Date(`${d}T00:00:00`).toISOString() : null);

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const action: string = body?.action;

  if (action === "add") {
    const projectId: string = body?.projectId;
    const title = String(body?.title || "").trim();
    if (!projectId || !title) return NextResponse.json({ error: "Titre requis." }, { status: 400 });
    if (!canContributeProject(projectId, user)) {
      return NextResponse.json({ error: "Droits insuffisants." }, { status: 403 });
    }
    addTask({ projectId, title, assigneeId: body?.assigneeId || null, dueDate: toIso(body?.dueDate) });
  } else if (action === "update" || action === "delete") {
    const taskId: string = body?.taskId;
    const projectId = taskId ? taskProjectId(taskId) : null;
    if (!projectId) return NextResponse.json({ error: "Tâche introuvable." }, { status: 404 });
    if (!canContributeProject(projectId, user)) {
      return NextResponse.json({ error: "Droits insuffisants." }, { status: 403 });
    }
    if (action === "delete") {
      deleteTask(taskId);
    } else {
      const status: TaskStatus | undefined = TASK_STATUTS.includes(body?.status) ? body.status : undefined;
      updateTask(taskId, {
        title: typeof body?.title === "string" ? body.title.trim() : undefined,
        assigneeId: body?.assigneeId !== undefined ? body.assigneeId || null : undefined,
        status,
        dueDate: body?.dueDate !== undefined ? toIso(body.dueDate) : undefined,
      });
    }
  } else {
    return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
  }

  return NextResponse.json({ projects: listProjects() });
}

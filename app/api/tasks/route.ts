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
import { createTask, deleteTask, getTask, listTasks, logTaskEvent, publishTask, updateTask } from "@/lib/db/tasks";
import { generateDueTasks } from "@/lib/db/recurrences";
import { insertNotification } from "@/lib/db/repo";
import { logActivity } from "@/lib/db/admin";
import { fmt, TASK_PRIORITIES, TASK_STATUTS, type TaskPriority, type TaskStatus } from "@/lib/domain";

const toIso = (d?: string | null) => (d ? new Date(`${d}T00:00:00`).toISOString() : null);
const canAssignOthers = (role: string) => ["manager", "directeur", "admin"].includes(role);

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  // Rattrapage paresseux : sans cron actif, les occurrences du jour naissent
  // à la première lecture des tâches. L'opération est idempotente.
  generateDueTasks();
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
    const newId = createTask({
      title,
      description: String(body?.description || ""),
      assigneeId,
      createdBy: user.id,
      projectId: typeof body?.projectId === "string" && body.projectId ? body.projectId : null,
      priority,
      startDate: toIso(body?.startDate),
      dueDate: toIso(body?.dueDate),
      estimatedMinutes: body?.estimatedMinutes,
    });
    logTaskEvent(newId, "creation", `Tâche créée par ${user.nom}.`, user.id);
    if (assigneeId !== user.id) {
      insertNotification({
        userId: assigneeId,
        itemId: null,
        kind: "tache",
        message: `${user.nom} vous a assigné une tâche : « ${title} ».`,
        channel: ["in-app"],
        link: "/productivite",
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
    const blockedReason = typeof body?.blockedReason === "string" ? body.blockedReason.trim() : undefined;

    // Une tâche « bloquée » sans motif ne mène à rien : on l'exige au passage
    // en blocage (et on l'accepte aussi pour préciser un blocage déjà posé).
    if (status === "bloqué" && cur.status !== "bloqué" && !blockedReason) {
      return NextResponse.json({ error: "Indiquez ce qui bloque cette tâche." }, { status: 400 });
    }

    updateTask(id, {
      blockedReason,
      title: typeof body?.title === "string" ? body.title.trim() : undefined,
      description: typeof body?.description === "string" ? body.description : undefined,
      assigneeId: assigneeId !== undefined ? (assigneeId || null) : undefined,
      projectId: body?.projectId !== undefined ? (body.projectId || null) : undefined,
      status,
      priority,
      startDate: body?.startDate !== undefined ? toIso(body.startDate) : undefined,
      dueDate: body?.dueDate !== undefined ? toIso(body.dueDate) : undefined,
      estimatedMinutes: body?.estimatedMinutes,
      spentMinutes: body?.spentMinutes,
    });
    /* Journal : on ne consigne que ce qui a réellement changé, en phrases
     * lisibles — le but est de répondre à « qui a déplacé cette échéance ? ». */
    if (status && status !== cur.status) {
      if (status === "bloqué") {
        logTaskEvent(id, "blocage", `${user.nom} a bloqué la tâche — ${blockedReason}`, user.id);
      } else if (cur.status === "bloqué") {
        logTaskEvent(id, "deblocage", `${user.nom} a débloqué la tâche (statut « ${status} »).`, user.id);
      } else {
        logTaskEvent(id, "statut", `${user.nom} a changé le statut : ${cur.status} → ${status}.`, user.id);
      }
    } else if (status === "bloqué" && blockedReason && blockedReason !== cur.blockedReason) {
      logTaskEvent(id, "blocage", `${user.nom} a précisé le blocage — ${blockedReason}`, user.id);
    }
    if (assigneeId !== undefined && (assigneeId || null) !== cur.assigneeId) {
      logTaskEvent(id, "assignation", `${user.nom} a modifié l'attribution de la tâche.`, user.id);
    }
    if (body?.dueDate !== undefined) {
      const avant = cur.dueDate ? fmt(cur.dueDate) : "aucune";
      const apres = body.dueDate ? fmt(new Date(`${body.dueDate}T00:00:00`)) : "aucune";
      if (avant !== apres) logTaskEvent(id, "echeance", `${user.nom} a changé l'échéance : ${avant} → ${apres}.`, user.id);
    }
    if (priority && priority !== cur.priority) {
      logTaskEvent(id, "priorite", `${user.nom} a changé la priorité : ${cur.priority} → ${priority}.`, user.id);
    }
    if (typeof body?.title === "string" && body.title.trim() && body.title.trim() !== cur.title) {
      logTaskEvent(id, "titre", `${user.nom} a renommé la tâche (était « ${cur.title} »).`, user.id);
    }

    // Blocage : prévenir ceux qui peuvent lever l'obstacle.
    if (status === "bloqué" && cur.status !== "bloqué") {
      const cibles = new Set([cur.createdBy, cur.assigneeId].filter((x): x is string => Boolean(x) && x !== user.id));
      cibles.forEach((uid) =>
        insertNotification({
          userId: uid,
          itemId: null,
          kind: "tache",
          message: `${user.nom} a bloqué la tâche « ${cur.title} » — ${blockedReason}`,
          channel: ["in-app"],
          link: "/productivite",
        })
      );
    }

    // Notifier la nouvelle personne assignée.
    if (assigneeId !== undefined && assigneeId && assigneeId !== user.id && assigneeId !== cur.assigneeId) {
      insertNotification({
        userId: assigneeId,
        itemId: null,
        kind: "tache",
        message: `${user.nom} vous a assigné une tâche : « ${cur.title} ».`,
        channel: ["in-app"],
        link: "/productivite",
      });
    }
    // Prévenir le créateur/délégateur quand la tâche est terminée ou bloquée.
    if (status && status !== cur.status && (status === "fait" || status === "bloqué") && cur.createdBy && cur.createdBy !== user.id) {
      insertNotification({
        userId: cur.createdBy,
        itemId: null,
        kind: "tache",
        message: status === "fait"
          ? `${user.nom} a terminé la tâche : « ${cur.title} ».`
          : `${user.nom} a marqué « bloquée » la tâche : « ${cur.title} ».`,
        channel: ["in-app"],
        link: "/productivite",
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

/* ==================================================================
 *  /api/projects/lifecycle — Archivage & suppression d'un projet.
 *  op=archive        : archive/désarchive (tout contributeur).
 *  op=request_delete : soumet une demande de suppression (tout contributeur).
 *  op=approve_delete : manager/directeur/admin → supprime définitivement.
 *  op=reject_delete  : manager/directeur/admin → rejette la demande.
 * ================================================================== */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { denyReadOnly } from "@/lib/auth/guards";
import {
  clearProjectDeletion,
  deleteProject,
  getProjectDeletionRequester,
  listProjects,
  requestProjectDeletion,
  setProjectArchived,
} from "@/lib/db/projects";
import { insertNotification, listItems, listProfiles } from "@/lib/db/repo";
import { logActivity } from "@/lib/db/admin";

const isApprover = (role: string) => role === "manager" || role === "directeur" || role === "admin";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const ro = denyReadOnly(user);
  if (ro) return ro;

  const body = await request.json().catch(() => ({}));
  const op: string = body?.op;
  const id: string = body?.id;
  if (!id) return NextResponse.json({ error: "Projet manquant." }, { status: 400 });
  const proj = listProjects().find((p) => p.id === id);
  if (!proj) return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });
  const projName = proj.name;

  if (op === "archive") {
    const archived = Boolean(body?.archived);
    setProjectArchived(id, archived);
    logActivity(user.id, "projet.archive", `${archived ? "archivé" : "désarchivé"} : ${projName}`);
    return NextResponse.json({ projects: listProjects(user.id) });
  }

  if (op === "request_delete") {
    const reason = String(body?.reason || "").trim();
    if (!reason) return NextResponse.json({ error: "Un motif de suppression est requis." }, { status: 400 });
    requestProjectDeletion(id, user.id, reason);
    // Notifier les approbateurs (managers, directeurs, admins).
    listProfiles()
      .filter((p) => isApprover(p.role))
      .forEach((p) =>
        insertNotification({
          userId: p.id,
          itemId: null,
          kind: "projet",
          message: `${user.nom} demande la suppression du projet « ${projName} » — à approuver.`,
          channel: ["in-app"],
        })
      );
    logActivity(user.id, "projet.suppression.demande", `${projName} — ${reason}`);
    return NextResponse.json({ projects: listProjects(user.id) });
  }

  if (op === "approve_delete") {
    if (!isApprover(user.role)) {
      return NextResponse.json({ error: "Seul un manager, directeur ou admin peut approuver la suppression." }, { status: 403 });
    }
    const requester = getProjectDeletionRequester(id);
    deleteProject(id);
    if (requester && requester !== user.id) {
      insertNotification({
        userId: requester,
        itemId: null,
        kind: "projet",
        message: `Votre demande de suppression du projet « ${projName} » a été approuvée par ${user.nom}.`,
        channel: ["in-app"],
      });
    }
    logActivity(user.id, "projet.suppression", projName);
    return NextResponse.json({ projects: listProjects(user.id), items: listItems(user.id) });
  }

  if (op === "reject_delete") {
    if (!isApprover(user.role)) {
      return NextResponse.json({ error: "Seul un manager, directeur ou admin peut décider." }, { status: 403 });
    }
    const requester = getProjectDeletionRequester(id);
    clearProjectDeletion(id);
    const note = String(body?.note || "").trim();
    if (requester && requester !== user.id) {
      insertNotification({
        userId: requester,
        itemId: null,
        kind: "projet",
        message: `Votre demande de suppression du projet « ${projName} » a été refusée par ${user.nom}${note ? ` : ${note}` : ""}.`,
        channel: ["in-app"],
      });
    }
    logActivity(user.id, "projet.suppression.refus", projName);
    return NextResponse.json({ projects: listProjects(user.id) });
  }

  return NextResponse.json({ error: "Opération inconnue." }, { status: 400 });
}

/* ==================================================================
 *  /api/projects/proposals — Propositions de tâches (Lot 3).
 *  op=create : un utilisateur propose une tâche sur un projet.
 *  op=decide : le PROPRIÉTAIRE du projet approuve (merge → tâche) ou refuse.
 * ================================================================== */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { denyReadOnly } from "@/lib/auth/guards";
import {
  createProposal,
  decideProposal,
  getPendingProposal,
  getProjectOwner,
  listProjects,
} from "@/lib/db/projects";
import { insertNotification } from "@/lib/db/repo";
import { logActivity } from "@/lib/db/admin";

const toIso = (d?: string | null) => (d ? new Date(`${d}T00:00:00`).toISOString() : null);

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const ro = denyReadOnly(user); if (ro) return ro;

  const body = await request.json().catch(() => ({}));
  const op: string = body?.op;

  if (op === "create") {
    const projectId: string = body?.projectId;
    const title = String(body?.title || "").trim();
    const owner = projectId ? getProjectOwner(projectId) : null;
    if (!owner) return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });
    if (!title) return NextResponse.json({ error: "Titre de la tâche requis." }, { status: 400 });

    createProposal({
      projectId,
      title,
      description: String(body?.description || "").trim(),
      dueDate: toIso(body?.dueDate),
      proposedBy: user.id,
    });
    const projName = listProjects().find((p) => p.id === projectId)?.name ?? "un projet";
    // Notifier le propriétaire du projet.
    if (owner !== user.id) {
      insertNotification({
        userId: owner,
        itemId: null,
        kind: "projet",
        message: `${user.nom} propose une tâche « ${title} » sur le projet « ${projName} » — à approuver.`,
        channel: ["in-app"],
        link: `/projets/${projectId}`,
      });
    }
    logActivity(user.id, "projet.proposition", `${projName} · ${title}`);
    return NextResponse.json({ projects: listProjects(user.id) });
  }

  if (op === "decide") {
    const proposalId: string = body?.proposalId;
    const pending = proposalId ? getPendingProposal(proposalId) : null;
    if (!pending) return NextResponse.json({ error: "Aucune proposition en attente." }, { status: 400 });
    // Le propriétaire décide ; un manager/directeur/admin peut trancher en secours.
    const isStaff = user.role === "manager" || user.role === "directeur" || user.role === "admin";
    if (getProjectOwner(pending.projectId) !== user.id && !isStaff) {
      return NextResponse.json({ error: "Réservé au propriétaire du projet (ou à un manager/directeur/admin)." }, { status: 403 });
    }
    const approve = Boolean(body?.approve);
    const note = String(body?.note || "").trim();
    decideProposal(proposalId, approve, user.id, note);
    const projName = listProjects().find((p) => p.id === pending.projectId)?.name ?? "un projet";
    // Notifier l'auteur de la proposition.
    if (pending.proposedBy && pending.proposedBy !== user.id) {
      insertNotification({
        userId: pending.proposedBy,
        itemId: null,
        kind: "projet",
        message: approve
          ? `Votre proposition « ${pending.title} » a été intégrée au projet « ${projName} » par ${user.nom}.`
          : `Votre proposition « ${pending.title} » (projet « ${projName} ») a été refusée par ${user.nom}${note ? ` : ${note}` : ""}.`,
        channel: ["in-app"],
        link: `/projets/${pending.projectId}`,
      });
    }
    logActivity(user.id, approve ? "projet.proposition.merge" : "projet.proposition.refus", `${projName} · ${pending.title}`);
    return NextResponse.json({ projects: listProjects(user.id) });
  }

  return NextResponse.json({ error: "Opération inconnue." }, { status: 400 });
}

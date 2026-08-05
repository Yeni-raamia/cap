/* ==================================================================
 *  /api/projects/status — Workflow de validation du statut projet.
 *  op = "request" : un manager (ou le responsable) propose un statut.
 *  op = "decide"  : le directeur/admin valide (approve) ou rejette.
 * ================================================================== */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { denyReadOnly } from "@/lib/auth/guards";
import {
  decideStatusChange,
  getProjectPending,
  listProjects,
  requestStatusChange,
} from "@/lib/db/projects";
import { insertNotification, listEscalationTargets } from "@/lib/db/repo";
import { logActivity } from "@/lib/db/admin";
import { PROJECT_STATUTS, type ProjectStatus } from "@/lib/domain";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const _ro = denyReadOnly(user); if (_ro) return _ro;

  const body = await request.json().catch(() => ({}));
  const op: string = body?.op;
  const id: string = body?.id;
  if (!id) return NextResponse.json({ error: "Projet manquant." }, { status: 400 });

  const pending = getProjectPending(id);
  if (!pending) return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });
  const projName = listProjects().find((p) => p.id === id)?.name ?? "Projet";

  if (op === "request") {
    // Proposer un changement de statut : manager, responsable, directeur/admin.
    const isOwner = pending.ownerId === user.id;
    const canPropose = ["manager", "directeur", "admin"].includes(user.role) || isOwner;
    if (!canPropose) {
      return NextResponse.json({ error: "Seul un manager ou le responsable peut proposer un changement de statut." }, { status: 403 });
    }
    const status = body?.status as ProjectStatus;
    if (!PROJECT_STATUTS.includes(status)) {
      return NextResponse.json({ error: "Statut invalide." }, { status: 400 });
    }
    requestStatusChange(id, status, user.id);
    // Notifier les directeurs (à défaut, les admins).
    listEscalationTargets().forEach((dir) =>
      insertNotification({
        userId: dir.id,
        itemId: null,
        kind: "projet",
        message: `${user.nom} propose de passer « ${projName} » en statut « ${status} » — à valider.`,
        channel: ["in-app"],
      })
    );
    logActivity(user.id, "projet.statut.proposition", `${projName} → ${status}`);
    return NextResponse.json({ projects: listProjects(user.id) });
  }

  if (op === "decide") {
    // Valider / rejeter : directeur ou admin uniquement.
    if (user.role !== "directeur" && user.role !== "admin") {
      return NextResponse.json({ error: "Seul le directeur peut valider un changement de statut." }, { status: 403 });
    }
    if (!pending.pendingStatus) {
      return NextResponse.json({ error: "Aucune proposition en attente." }, { status: 400 });
    }
    const approve = Boolean(body?.approve);
    const target = pending.pendingStatus;
    decideStatusChange(id, approve);
    // Notifier l'auteur de la proposition.
    if (pending.pendingBy) {
      insertNotification({
        userId: pending.pendingBy,
        itemId: null,
        kind: "projet",
        message: approve
          ? `Statut « ${target} » validé pour « ${projName} » par ${user.nom}.`
          : `Changement de statut « ${target} » refusé pour « ${projName} » par ${user.nom}.`,
        channel: ["in-app"],
      });
    }
    logActivity(user.id, approve ? "projet.statut.validation" : "projet.statut.refus", `${projName} → ${target}`);
    return NextResponse.json({ projects: listProjects(user.id) });
  }

  return NextResponse.json({ error: "Opération inconnue." }, { status: 400 });
}

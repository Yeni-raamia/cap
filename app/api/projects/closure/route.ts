/* ==================================================================
 *  /api/projects/closure — Demande de clôture d'un projet.
 *  op=request : l'agent (contributeur) soumet récap + livrables.
 *  op=decide  : le manager/directeur/admin valide (→ Terminé) ou rejette.
 * ================================================================== */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { denyReadOnly } from "@/lib/auth/guards";
import { canContributeProject } from "@/lib/auth/project-guard";
import {
  decideClosure,
  getPendingClosure,
  getProjectOwner,
  listProjects,
  requestClosure,
} from "@/lib/db/projects";
import { insertNotification, listEscalationTargets } from "@/lib/db/repo";
import { logActivity } from "@/lib/db/admin";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const _ro = denyReadOnly(user); if (_ro) return _ro;

  const body = await request.json().catch(() => ({}));
  const op: string = body?.op;
  const id: string = body?.id;
  if (!id) return NextResponse.json({ error: "Projet manquant." }, { status: 400 });
  const projName = listProjects().find((p) => p.id === id)?.name ?? "Projet";

  if (op === "request") {
    // La demande de clôture est initiée par un agent ; le manager/directeur décide.
    if (user.role !== "agent") {
      return NextResponse.json({ error: "La demande de clôture est faite par un agent ; le manager/directeur la valide." }, { status: 403 });
    }
    if (!canContributeProject(id, user)) {
      return NextResponse.json({ error: "Droits insuffisants sur ce projet." }, { status: 403 });
    }
    const summary = String(body?.summary || "").trim();
    const deliverables: string[] = Array.isArray(body?.deliverables)
      ? body.deliverables.map((x: unknown) => String(x).trim()).filter(Boolean)
      : [];
    if (!summary) return NextResponse.json({ error: "Récapitulatif requis." }, { status: 400 });
    requestClosure({ projectId: id, requestedBy: user.id, summary, deliverables });
    // Notifier les décideurs (directeurs, à défaut admins).
    listEscalationTargets().forEach((dir) =>
      insertNotification({
        userId: dir.id,
        itemId: null,
        kind: "projet",
        message: `${user.nom} demande la clôture du projet « ${projName} » — à valider.`,
        channel: ["in-app"],
      })
    );
    logActivity(user.id, "projet.cloture.demande", projName);
    return NextResponse.json({ projects: listProjects(user.id) });
  }

  if (op === "decide") {
    if (user.role !== "manager" && user.role !== "directeur" && user.role !== "admin") {
      return NextResponse.json({ error: "Seul un manager ou le directeur peut décider." }, { status: 403 });
    }
    const pending = getPendingClosure(id);
    if (!pending) return NextResponse.json({ error: "Aucune demande en attente." }, { status: 400 });
    const approve = Boolean(body?.approve);
    const note = String(body?.note || "").trim();
    decideClosure(id, approve, user.id, note);
    // Notifier le demandeur.
    const requester = pending.requestedBy ?? getProjectOwner(id);
    if (requester) {
      insertNotification({
        userId: requester,
        itemId: null,
        kind: "projet",
        message: approve
          ? `Clôture du projet « ${projName} » validée par ${user.nom}.`
          : `Clôture du projet « ${projName} » refusée par ${user.nom}${note ? ` : ${note}` : ""}.`,
        channel: ["in-app"],
      });
    }
    logActivity(user.id, approve ? "projet.cloture.validation" : "projet.cloture.refus", projName);
    return NextResponse.json({ projects: listProjects(user.id) });
  }

  return NextResponse.json({ error: "Opération inconnue." }, { status: 400 });
}

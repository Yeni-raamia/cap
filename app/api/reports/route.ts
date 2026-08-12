/* ==================================================================
 *  /api/reports — Comptes rendus de tâches et de projets.
 *  GET            → { reports }
 *  POST op=create → rédiger un compte rendu
 *  POST op=update → modifier (auteur, ou manager/directeur/admin)
 *  POST op=delete → supprimer (auteur, ou manager/directeur/admin)
 * ================================================================== */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { denyReadOnly } from "@/lib/auth/guards";
import { canContributeProject } from "@/lib/auth/project-guard";
import { createReport, deleteReport, getReport, listReports, updateReport } from "@/lib/db/reports";
import { getTask } from "@/lib/db/tasks";
import type { Profile, ReportRefType } from "@/lib/domain";

const toIso = (d?: string | null) => (d ? new Date(`${d}T00:00:00`).toISOString() : null);
const isStaff = (role: string) => ["manager", "directeur", "admin"].includes(role);

/**
 * Peut-on rédiger un compte rendu sur cet objet ?
 * On calque les droits de l'objet lui-même : contribuer au projet, ou être
 * concerné par la tâche.
 */
function canWriteOn(refType: ReportRefType, refId: string, user: Profile): boolean {
  if (refType === "project") return canContributeProject(refId, user);
  const task = getTask(refId);
  if (!task) return false;
  return task.assigneeId === user.id || task.createdBy === user.id || isStaff(user.role);
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  return NextResponse.json({ reports: listReports() });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const ro = denyReadOnly(user);
  if (ro) return ro;

  const body = await request.json().catch(() => ({}));
  const op: string = body?.op;

  const fields = () => ({
    title: typeof body?.title === "string" ? body.title : undefined,
    kind: body?.kind,
    periodStart: body?.periodStart !== undefined ? toIso(body.periodStart) : undefined,
    periodEnd: body?.periodEnd !== undefined ? toIso(body.periodEnd) : undefined,
    progress: body?.progress,
    done: typeof body?.done === "string" ? body.done : undefined,
    difficulties: typeof body?.difficulties === "string" ? body.difficulties : undefined,
    nextSteps: typeof body?.nextSteps === "string" ? body.nextSteps : undefined,
  });

  if (op === "create") {
    const refType: ReportRefType = body?.refType === "project" ? "project" : "task";
    const refId: string = body?.refId;
    if (!refId) return NextResponse.json({ error: "Objet manquant." }, { status: 400 });
    if (!canWriteOn(refType, refId, user)) {
      return NextResponse.json({ error: "Droits insuffisants sur cet élément." }, { status: 403 });
    }
    createReport({ ...fields(), refType, refId, authorId: user.id });
    return NextResponse.json({ reports: listReports() });
  }

  if (op === "update" || op === "delete") {
    const id: string = body?.id;
    const cur = id ? getReport(id) : null;
    if (!cur) return NextResponse.json({ error: "Compte rendu introuvable." }, { status: 404 });
    // Un compte rendu engage son auteur : lui seul le réécrit (ou l'encadrement).
    if (cur.authorId !== user.id && !isStaff(user.role)) {
      return NextResponse.json({ error: "Seul l'auteur peut modifier ce compte rendu." }, { status: 403 });
    }
    if (op === "delete") deleteReport(id);
    else updateReport(id, fields());
    return NextResponse.json({ reports: listReports() });
  }

  return NextResponse.json({ error: "Opération inconnue." }, { status: 400 });
}

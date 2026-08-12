import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { denyReadOnly } from "@/lib/auth/guards";
import { canManageProject } from "@/lib/auth/project-guard";
import { listProjects, updateProject } from "@/lib/db/projects";
import { PROJECT_STATUTS, type ProjectStatus } from "@/lib/domain";

const toIso = (d?: string | null) => (d ? new Date(`${d}T00:00:00`).toISOString() : null);

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const _ro = denyReadOnly(user); if (_ro) return _ro;

  const body = await request.json().catch(() => ({}));
  const id: string = body?.id;
  if (!id) return NextResponse.json({ error: "Projet manquant." }, { status: 400 });
  if (!canManageProject(id, user)) {
    return NextResponse.json({ error: "Droits insuffisants sur ce projet." }, { status: 403 });
  }

  // Le changement de statut direct est réservé au directeur/admin (validateurs).
  // Les autres passent par le workflow de proposition (/api/projects/status).
  const canSetStatus = user.role === "directeur" || user.role === "admin";
  const status: ProjectStatus | undefined =
    canSetStatus && PROJECT_STATUTS.includes(body?.status) ? body.status : undefined;

  updateProject(id, {
    name: typeof body?.name === "string" ? body.name.trim() : undefined,
    description: typeof body?.description === "string" ? body.description : undefined,
    status,
    startDate: body?.startDate !== undefined ? toIso(body.startDate) : undefined,
    deadline: body?.deadline !== undefined ? toIso(body.deadline) : undefined,
  });
  return NextResponse.json({ projects: listProjects(user.id) });
}

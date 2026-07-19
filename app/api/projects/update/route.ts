import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { canManageProject } from "@/lib/auth/project-guard";
import { listProjects, updateProject } from "@/lib/db/projects";
import { PROJECT_STATUTS, type ProjectStatus } from "@/lib/domain";

const toIso = (d?: string | null) => (d ? new Date(`${d}T00:00:00`).toISOString() : null);

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const id: string = body?.id;
  if (!id) return NextResponse.json({ error: "Projet manquant." }, { status: 400 });
  if (!canManageProject(id, user)) {
    return NextResponse.json({ error: "Droits insuffisants sur ce projet." }, { status: 403 });
  }

  const status: ProjectStatus | undefined = PROJECT_STATUTS.includes(body?.status)
    ? body.status
    : undefined;

  updateProject(id, {
    name: typeof body?.name === "string" ? body.name.trim() : undefined,
    description: typeof body?.description === "string" ? body.description : undefined,
    status,
    deadline: body?.deadline !== undefined ? toIso(body.deadline) : undefined,
  });
  return NextResponse.json({ projects: listProjects() });
}

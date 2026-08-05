/* Publie un projet (irréversible) : le rend visible par toute l'équipe.
 * RBAC : propriétaire, ou manager/directeur/admin ; refusé en lecture seule. */
import { NextResponse } from "next/server";
import { getProjectOwner, listProjects, publishProject } from "@/lib/db/projects";
import { logActivity } from "@/lib/db/admin";
import { getCurrentUser } from "@/lib/auth/session";
import { denyReadOnly } from "@/lib/auth/guards";

const canPublish = (role: string) => ["manager", "directeur", "admin"].includes(role);

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const ro = denyReadOnly(user);
  if (ro) return ro;

  const { projectId } = await request.json().catch(() => ({}));
  const owner = projectId ? getProjectOwner(projectId) : null;
  if (!owner) return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });
  if (owner !== user.id && !canPublish(user.role)) {
    return NextResponse.json({ error: "Droits insuffisants sur ce projet." }, { status: 403 });
  }

  publishProject(projectId);
  logActivity(user.id, "project_publish", projectId);
  return NextResponse.json({ projects: listProjects(user.id) });
}

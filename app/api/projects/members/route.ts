import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { denyReadOnly } from "@/lib/auth/guards";
import { canManageProject } from "@/lib/auth/project-guard";
import { addMember, isProjectMember, listProjects, removeMember } from "@/lib/db/projects";
import { insertNotification } from "@/lib/db/repo";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const _ro = denyReadOnly(user); if (_ro) return _ro;

  const body = await request.json().catch(() => ({}));
  const action: string = body?.action;
  const projectId: string = body?.projectId;
  const profileId: string = body?.profileId;
  if (!projectId || !profileId) return NextResponse.json({ error: "Paramètres manquants." }, { status: 400 });
  if (!canManageProject(projectId, user)) {
    return NextResponse.json({ error: "Droits insuffisants sur ce projet." }, { status: 403 });
  }

  if (action === "add") {
    const already = isProjectMember(projectId, profileId);
    addMember(projectId, profileId);
    if (!already && profileId !== user.id) {
      const projName = listProjects().find((p) => p.id === projectId)?.name ?? "un projet";
      insertNotification({
        userId: profileId,
        itemId: null,
        kind: "projet",
        message: `${user.nom} vous a assigné au projet « ${projName} ».`,
        channel: ["in-app"],
        link: `/projets/${projectId}`,
      });
    }
  } else if (action === "remove") {
    const wasMember = isProjectMember(projectId, profileId);
    removeMember(projectId, profileId);
    if (wasMember && profileId !== user.id) {
      const projName = listProjects().find((p) => p.id === projectId)?.name ?? "un projet";
      insertNotification({
        userId: profileId,
        itemId: null,
        kind: "projet",
        message: `${user.nom} vous a retiré du projet « ${projName} ».`,
        channel: ["in-app"],
        link: `/projets/${projectId}`,
      });
    }
  } else return NextResponse.json({ error: "Action inconnue." }, { status: 400 });

  return NextResponse.json({ projects: listProjects(user.id) });
}

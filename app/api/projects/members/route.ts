import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { canManageProject } from "@/lib/auth/project-guard";
import { addMember, isProjectMember, listProjects, removeMember } from "@/lib/db/projects";
import { insertNotification } from "@/lib/db/repo";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

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
      });
    }
  } else if (action === "remove") removeMember(projectId, profileId);
  else return NextResponse.json({ error: "Action inconnue." }, { status: 400 });

  return NextResponse.json({ projects: listProjects() });
}

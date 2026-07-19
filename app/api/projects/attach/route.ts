import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { canContributeProject } from "@/lib/auth/project-guard";
import { attachItem, listProjects } from "@/lib/db/projects";
import { canEditItem, listItems } from "@/lib/db/repo";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const itemId: string = body?.itemId;
  const projectId: string | null = body?.projectId ?? null;
  if (!itemId) return NextResponse.json({ error: "Suivi manquant." }, { status: 400 });
  if (!canEditItem(itemId, user)) {
    return NextResponse.json({ error: "Droits insuffisants sur ce suivi." }, { status: 403 });
  }
  if (projectId && !canContributeProject(projectId, user)) {
    return NextResponse.json({ error: "Droits insuffisants sur ce projet." }, { status: 403 });
  }

  attachItem(itemId, projectId);
  return NextResponse.json({ projects: listProjects(), items: listItems() });
}

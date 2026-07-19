import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { canContributeProject } from "@/lib/auth/project-guard";
import { addNote, listProjects } from "@/lib/db/projects";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const projectId: string = body?.projectId;
  const noteBody = String(body?.body || "").trim();
  if (!projectId || !noteBody) return NextResponse.json({ error: "Note vide." }, { status: 400 });
  if (!canContributeProject(projectId, user)) {
    return NextResponse.json({ error: "Droits insuffisants." }, { status: 403 });
  }

  addNote(projectId, user.id, noteBody);
  return NextResponse.json({ projects: listProjects() });
}

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { createProject, listProjects } from "@/lib/db/projects";

const toIso = (d?: string | null) => (d ? new Date(`${d}T00:00:00`).toISOString() : null);

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const name = String(body?.name || "").trim();
  if (!name) return NextResponse.json({ error: "Nom du projet requis." }, { status: 400 });

  createProject({
    name,
    description: String(body?.description || ""),
    ownerId: user.id,
    deadline: toIso(body?.deadline),
  });
  return NextResponse.json({ projects: listProjects() });
}

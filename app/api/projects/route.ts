import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { denyReadOnly } from "@/lib/auth/guards";
import { createProject, listProjects } from "@/lib/db/projects";
import { insertNotification } from "@/lib/db/repo";
import { logActivity } from "@/lib/db/admin";

const toIso = (d?: string | null) => (d ? new Date(`${d}T00:00:00`).toISOString() : null);

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const _ro = denyReadOnly(user); if (_ro) return _ro;

  const body = await request.json().catch(() => ({}));
  const name = String(body?.name || "").trim();
  if (!name) return NextResponse.json({ error: "Nom du projet requis." }, { status: 400 });

  const memberIds: string[] = Array.isArray(body?.memberIds)
    ? body.memberIds.filter((x: unknown) => typeof x === "string")
    : [];

  createProject({
    name,
    description: String(body?.description || ""),
    ownerId: user.id,
    startDate: toIso(body?.startDate),
    deadline: toIso(body?.deadline),
    memberIds,
  });

  // Notifier les personnes assignées (hors créateur).
  [...new Set(memberIds)]
    .filter((id) => id && id !== user.id)
    .forEach((id) =>
      insertNotification({
        userId: id,
        itemId: null,
        kind: "projet",
        message: `${user.nom} vous a assigné au projet « ${name} ».`,
        channel: ["in-app"],
      })
    );
  logActivity(user.id, "projet.creation", name);
  return NextResponse.json({ projects: listProjects(user.id) });
}

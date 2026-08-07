/* ==================================================================
 *  /api/missions — Missions & dépendances de l'organisation (GRC).
 *  op=create / update / delete. Édition hors lecture seule ;
 *  suppression réservée aux manager/directeur/admin.
 * ================================================================== */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { denyReadOnly } from "@/lib/auth/guards";
import { createMission, deleteMission, getMission, listMissions, missionExists, updateMission } from "@/lib/db/missions";
import { logActivity } from "@/lib/db/admin";

const canDelete = (role: string) => ["manager", "directeur", "admin"].includes(role);
const strArr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x) => typeof x === "string") : []);
const parseDeps = (v: unknown) =>
  Array.isArray(v)
    ? v.map((d) => ({
        id: typeof (d as { id?: unknown })?.id === "string" ? (d as { id: string }).id : undefined,
        direction: ((d as { direction?: unknown })?.direction === "aval" ? "aval" : "amont") as "amont" | "aval",
        kind: String((d as { kind?: unknown })?.kind || ""),
        name: String((d as { name?: unknown })?.name || ""),
        description: String((d as { description?: unknown })?.description || ""),
        criticality: String((d as { criticality?: unknown })?.criticality || ""),
      }))
    : [];

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const ro = denyReadOnly(user); if (ro) return ro;

  const body = await request.json().catch(() => ({}));
  const op: string = body?.op;

  if (op === "create") {
    const name = String(body?.name || "").trim();
    if (!name) return NextResponse.json({ error: "Nom de la mission requis." }, { status: 400 });
    const id = createMission({
      name,
      type: typeof body?.type === "string" ? body.type : undefined,
      value: typeof body?.value === "string" ? body.value : undefined,
      description: String(body?.description || ""),
      ownerId: typeof body?.ownerId === "string" ? body.ownerId : "",
      status: typeof body?.status === "string" ? body.status : undefined,
      assetIds: strArr(body?.assetIds),
      peopleIds: strArr(body?.peopleIds),
      dependencies: parseDeps(body?.dependencies),
      createdBy: user.id,
    });
    logActivity(user.id, "mission.creation", name);
    return NextResponse.json({ missions: listMissions(), mission: getMission(id) });
  }

  const id: string = body?.id;
  if (!id || !missionExists(id)) return NextResponse.json({ error: "Mission introuvable." }, { status: 404 });

  if (op === "update") {
    updateMission(id, {
      name: typeof body?.name === "string" ? body.name.trim() : undefined,
      type: typeof body?.type === "string" ? body.type : undefined,
      value: typeof body?.value === "string" ? body.value : undefined,
      description: typeof body?.description === "string" ? body.description : undefined,
      ownerId: body?.ownerId !== undefined ? String(body.ownerId || "") : undefined,
      status: typeof body?.status === "string" ? body.status : undefined,
      assetIds: body?.assetIds !== undefined ? strArr(body.assetIds) : undefined,
      peopleIds: body?.peopleIds !== undefined ? strArr(body.peopleIds) : undefined,
      dependencies: body?.dependencies !== undefined ? parseDeps(body.dependencies) : undefined,
    });
  } else if (op === "delete") {
    if (!canDelete(user.role)) return NextResponse.json({ error: "Suppression réservée aux manager/directeur/admin." }, { status: 403 });
    deleteMission(id);
    return NextResponse.json({ missions: listMissions() });
  } else {
    return NextResponse.json({ error: "Opération inconnue." }, { status: 400 });
  }

  return NextResponse.json({ missions: listMissions(), mission: getMission(id) });
}

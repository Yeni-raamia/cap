/* ==================================================================
 *  /api/field-controls — Contrôles terrain / rondes (module GRC).
 *  op=create / update / delete. Édition par tout utilisateur non
 *  lecture-seule ; suppression réservée aux manager/directeur/admin.
 * ================================================================== */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { denyReadOnly } from "@/lib/auth/guards";
import { addFieldControlEvent, createFieldControl, deleteFieldControl, fieldControlExists, getFieldControl, listFieldControls, updateFieldControl } from "@/lib/db/fieldcontrols";
import { logActivity } from "@/lib/db/admin";
import { frameworkById } from "@/lib/grc/frameworks";

const toIso = (d?: string | null) => (d ? new Date(`${d}T00:00:00`).toISOString() : null);
const canDelete = (role: string) => ["manager", "directeur", "admin"].includes(role);

const parseItems = (v: unknown) =>
  Array.isArray(v)
    ? v
        .map((it) => {
          const frameworkId = String(it?.frameworkId || "");
          const controlCode = String(it?.controlCode || "");
          const validCtrl = frameworkById(frameworkId)?.controls.some((c) => c.code === controlCode);
          return {
            label: String(it?.label || ""),
            result: typeof it?.result === "string" ? it.result : undefined,
            note: String(it?.note || ""),
            frameworkId: validCtrl ? frameworkId : "",
            controlCode: validCtrl ? controlCode : "",
          };
        })
        .filter((it) => it.label.trim())
    : [];

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const ro = denyReadOnly(user); if (ro) return ro;

  const body = await request.json().catch(() => ({}));
  const op: string = body?.op;

  if (op === "create") {
    const title = String(body?.title || "").trim();
    if (!title) return NextResponse.json({ error: "Intitulé du contrôle requis." }, { status: 400 });
    const id = createFieldControl({
      title,
      type: String(body?.type || ""),
      service: String(body?.service || ""),
      location: String(body?.location || ""),
      date: toIso(body?.date),
      inspectorId: typeof body?.inspectorId === "string" && body.inspectorId ? body.inspectorId : user.id,
      status: typeof body?.status === "string" ? body.status : undefined,
      summary: String(body?.summary || ""),
      items: parseItems(body?.items),
      createdBy: user.id,
    });
    logActivity(user.id, "controle.creation", title);
    return NextResponse.json({ fieldControls: listFieldControls(), fieldControl: getFieldControl(id) });
  }

  const id: string = body?.id;
  if (!id || !fieldControlExists(id)) return NextResponse.json({ error: "Contrôle introuvable." }, { status: 404 });

  if (op === "update") {
    updateFieldControl(id, {
      title: typeof body?.title === "string" ? body.title.trim() : undefined,
      type: typeof body?.type === "string" ? body.type : undefined,
      service: typeof body?.service === "string" ? body.service : undefined,
      location: typeof body?.location === "string" ? body.location : undefined,
      date: body?.date !== undefined ? toIso(body.date) : undefined,
      inspectorId: typeof body?.inspectorId === "string" ? body.inspectorId : undefined,
      status: typeof body?.status === "string" ? body.status : undefined,
      summary: typeof body?.summary === "string" ? body.summary : undefined,
      items: body?.items !== undefined ? parseItems(body.items) : undefined,
    }, user.id);
  } else if (op === "event") {
    const label = String(body?.label || "").trim();
    if (!label) return NextResponse.json({ error: "Action de suivi vide." }, { status: 400 });
    addFieldControlEvent(id, label, user.id);
  } else if (op === "delete") {
    if (!canDelete(user.role)) return NextResponse.json({ error: "Suppression réservée aux manager/directeur/admin." }, { status: 403 });
    deleteFieldControl(id);
    return NextResponse.json({ fieldControls: listFieldControls() });
  } else {
    return NextResponse.json({ error: "Opération inconnue." }, { status: 400 });
  }

  return NextResponse.json({ fieldControls: listFieldControls(), fieldControl: getFieldControl(id) });
}

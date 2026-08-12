/* ==================================================================
 *  /api/policies — Politiques de sécurité & suivi de diffusion (GRC).
 *  op=create / update / delete (politique)
 *  op=diffuse (crée/màj le suivi d'un service) / undiffuse (retire un service).
 *  Registre partagé : édition par tout utilisateur non lecture-seule ;
 *  suppression d'une politique réservée aux manager/directeur/admin.
 * ================================================================== */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { denyReadOnly } from "@/lib/auth/guards";
import {
  createPolicy,
  deletePolicy,
  getPolicy,
  listPolicies,
  policyExists,
  removeDiffusion,
  updatePolicy,
  upsertDiffusion,
  addPublication,
  removePublication,
  publicationPolicyId,
} from "@/lib/db/policies";
import { logActivity } from "@/lib/db/admin";
import { POLICY_STAGE_ALL } from "@/lib/domain";

const toIso = (d?: string | null) => (d ? new Date(`${d}T00:00:00`).toISOString() : null);
const canDelete = (role: string) => ["manager", "directeur", "admin"].includes(role);

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const ro = denyReadOnly(user); if (ro) return ro;

  const body = await request.json().catch(() => ({}));
  const op: string = body?.op;

  if (op === "create") {
    const title = String(body?.title || "").trim();
    if (!title) return NextResponse.json({ error: "Titre de la politique requis." }, { status: 400 });
    const id = createPolicy({
      title,
      reference: String(body?.reference || ""),
      domain: String(body?.domain || ""),
      version: String(body?.version || "1.0"),
      status: typeof body?.status === "string" ? body.status : undefined,
      summary: String(body?.summary || ""),
      url: String(body?.url || ""),
      ownerId: typeof body?.ownerId === "string" && body.ownerId ? body.ownerId : user.id,
      publishedAt: toIso(body?.publishedAt),
      reviewDate: toIso(body?.reviewDate),
      createdBy: user.id,
    });
    logActivity(user.id, "politique.creation", title);
    return NextResponse.json({ policies: listPolicies(), policy: getPolicy(id) });
  }

  const id: string = body?.id;
  if (!id || !policyExists(id)) return NextResponse.json({ error: "Politique introuvable." }, { status: 404 });

  if (op === "update") {
    updatePolicy(id, {
      title: typeof body?.title === "string" ? body.title.trim() : undefined,
      reference: typeof body?.reference === "string" ? body.reference : undefined,
      domain: typeof body?.domain === "string" ? body.domain : undefined,
      version: typeof body?.version === "string" ? body.version : undefined,
      status: typeof body?.status === "string" ? body.status : undefined,
      summary: typeof body?.summary === "string" ? body.summary : undefined,
      url: typeof body?.url === "string" ? body.url : undefined,
      ownerId: typeof body?.ownerId === "string" ? body.ownerId : undefined,
      publishedAt: body?.publishedAt !== undefined ? toIso(body.publishedAt) : undefined,
      reviewDate: body?.reviewDate !== undefined ? toIso(body.reviewDate) : undefined,
    });
  } else if (op === "diffuse") {
    const service = String(body?.service || "").trim();
    const stage = String(body?.stage || "Diffusée");
    if (!service) return NextResponse.json({ error: "Service requis." }, { status: 400 });
    if (!POLICY_STAGE_ALL.includes(stage)) return NextResponse.json({ error: "Étape invalide." }, { status: 400 });
    upsertDiffusion(id, service, stage, String(body?.note || ""));
  } else if (op === "undiffuse") {
    const service = String(body?.service || "").trim();
    if (!service) return NextResponse.json({ error: "Service requis." }, { status: 400 });
    removeDiffusion(id, service);
  } else if (op === "publish_again") {
    const at = toIso(body?.publishedAt);
    if (!at) return NextResponse.json({ error: "Date de diffusion requise." }, { status: 400 });
    addPublication({
      policyId: id,
      publishedAt: at,
      version: String(body?.version || ""),
      channel: String(body?.channel || ""),
      audience: String(body?.audience || ""),
      note: String(body?.note || ""),
      authorId: user.id,
    });
  } else if (op === "unpublish_again") {
    const pubId = String(body?.publicationId || "");
    // La rediffusion doit appartenir à la politique visée : sinon on pourrait
    // effacer l'historique d'une autre politique en forgeant la requête.
    if (!pubId || publicationPolicyId(pubId) !== id) {
      return NextResponse.json({ error: "Rediffusion introuvable." }, { status: 404 });
    }
    removePublication(pubId);
  } else if (op === "delete") {
    if (!canDelete(user.role)) return NextResponse.json({ error: "Suppression réservée aux manager/directeur/admin." }, { status: 403 });
    deletePolicy(id);
    return NextResponse.json({ policies: listPolicies() });
  } else {
    return NextResponse.json({ error: "Opération inconnue." }, { status: 400 });
  }

  return NextResponse.json({ policies: listPolicies(), policy: getPolicy(id) });
}

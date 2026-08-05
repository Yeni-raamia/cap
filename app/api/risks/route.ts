/* ==================================================================
 *  /api/risks — Registre des risques (module GRC).
 *  op=create / update / status / delete.
 *  Registre partagé de l'équipe : création & édition par tout utilisateur
 *  non lecture-seule ; suppression réservée aux manager/directeur/admin.
 * ================================================================== */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { denyReadOnly } from "@/lib/auth/guards";
import { createRisk, deleteRisk, getRisk, listRisks, riskExists, setRiskStatus, updateRisk } from "@/lib/db/risks";
import { logActivity } from "@/lib/db/admin";
import { RISK_STATUTS, type RiskLink, type RiskLinkKind } from "@/lib/domain";

const toIso = (d?: string | null) => (d ? new Date(`${d}T00:00:00`).toISOString() : null);
const canDelete = (role: string) => ["manager", "directeur", "admin"].includes(role);
const LINK_KINDS: RiskLinkKind[] = ["item", "project", "negligence", "nonconformite", "objective"];

const parseLinks = (v: unknown): RiskLink[] =>
  Array.isArray(v)
    ? v
        .map((l) => ({ kind: String(l?.kind) as RiskLinkKind, refId: String(l?.refId || "") }))
        .filter((l) => LINK_KINDS.includes(l.kind) && l.refId)
    : [];

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const ro = denyReadOnly(user); if (ro) return ro;

  const body = await request.json().catch(() => ({}));
  const op: string = body?.op;

  if (op === "create") {
    const title = String(body?.title || "").trim();
    if (!title) return NextResponse.json({ error: "Intitulé du risque requis." }, { status: 400 });
    const id = createRisk({
      title,
      description: String(body?.description || ""),
      category: String(body?.category || ""),
      probability: Number(body?.probability),
      impact: Number(body?.impact),
      treatment: typeof body?.treatment === "string" ? body.treatment : undefined,
      treatmentPlan: String(body?.treatmentPlan || ""),
      status: typeof body?.status === "string" ? body.status : undefined,
      ownerId: typeof body?.ownerId === "string" && body.ownerId ? body.ownerId : user.id,
      reviewDate: toIso(body?.reviewDate),
      links: parseLinks(body?.links),
      createdBy: user.id,
    });
    logActivity(user.id, "risque.creation", title);
    return NextResponse.json({ risks: listRisks(), risk: getRisk(id) });
  }

  const id: string = body?.id;
  if (!id || !riskExists(id)) return NextResponse.json({ error: "Risque introuvable." }, { status: 404 });

  if (op === "update") {
    updateRisk(id, {
      title: typeof body?.title === "string" ? body.title.trim() : undefined,
      description: typeof body?.description === "string" ? body.description : undefined,
      category: typeof body?.category === "string" ? body.category : undefined,
      probability: body?.probability !== undefined ? Number(body.probability) : undefined,
      impact: body?.impact !== undefined ? Number(body.impact) : undefined,
      treatment: typeof body?.treatment === "string" ? body.treatment : undefined,
      treatmentPlan: typeof body?.treatmentPlan === "string" ? body.treatmentPlan : undefined,
      status: typeof body?.status === "string" ? body.status : undefined,
      ownerId: typeof body?.ownerId === "string" ? body.ownerId : undefined,
      reviewDate: body?.reviewDate !== undefined ? toIso(body.reviewDate) : undefined,
      links: body?.links !== undefined ? parseLinks(body.links) : undefined,
    });
  } else if (op === "status") {
    if (!RISK_STATUTS.includes(body?.status)) return NextResponse.json({ error: "Statut invalide." }, { status: 400 });
    setRiskStatus(id, body.status);
  } else if (op === "delete") {
    if (!canDelete(user.role)) return NextResponse.json({ error: "Suppression réservée aux manager/directeur/admin." }, { status: 403 });
    deleteRisk(id);
    return NextResponse.json({ risks: listRisks() });
  } else {
    return NextResponse.json({ error: "Opération inconnue." }, { status: 400 });
  }

  return NextResponse.json({ risks: listRisks(), risk: getRisk(id) });
}

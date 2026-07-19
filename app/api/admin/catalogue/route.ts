import { NextResponse } from "next/server";
import { addMetier, addType, getCatalogue } from "@/lib/db/repo";
import {
  deleteMetier,
  deleteType,
  logActivity,
  metierInUse,
  typeInUse,
  updateMetier,
  updateType,
} from "@/lib/db/admin";
import { getCurrentUser } from "@/lib/auth/session";
import { PROJECT_METIER, TONES, type Tone } from "@/lib/domain";

const METIER_RE = /^[A-Z]{2,6}$/;
const TYPE_RE = /^[A-Z]{2,12}$/;
const num = (v: unknown): number | null => (v === "" || v == null ? null : Number(v));

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Réservé aux administrateurs." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const op: string = body?.op || "add"; // add | update | delete
  const kind: string = body?.kind; // metier | type
  const code: string = String(body?.code || "").trim().toUpperCase();
  const label: string = String(body?.label || "").trim();

  if (kind !== "metier" && kind !== "type") {
    return NextResponse.json({ error: "Type d'option inconnu." }, { status: 400 });
  }
  if (op !== "delete") {
    const re = kind === "metier" ? METIER_RE : TYPE_RE;
    if (!re.test(code)) return NextResponse.json({ error: "Code invalide." }, { status: 400 });
    if (!label) return NextResponse.json({ error: "Libellé requis." }, { status: 400 });
  }

  if (kind === "metier") {
    if (op === "delete") {
      if (code === PROJECT_METIER)
        return NextResponse.json({ error: "Le métier PRJ (projets) ne peut pas être supprimé." }, { status: 400 });
      if (metierInUse(code) > 0)
        return NextResponse.json({ error: "Métier utilisé par des suivis — suppression impossible." }, { status: 400 });
      deleteMetier(code);
      logActivity(user.id, "catalogue_delete", `métier ${code}`);
    } else {
      const tone: Tone = TONES.includes(body?.tone) ? body.tone : "slate";
      if (op === "update") updateMetier(code, label, tone);
      else addMetier(code, label, tone);
      logActivity(user.id, `catalogue_${op}`, `métier ${code}`);
    }
  } else {
    if (op === "delete") {
      if (typeInUse(code) > 0)
        return NextResponse.json({ error: "Type utilisé par des suivis — suppression impossible." }, { status: 400 });
      deleteType(code);
      logActivity(user.id, "catalogue_delete", `type ${code}`);
    } else {
      const slaRelance = num(body?.slaRelance);
      const slaEscalade = num(body?.slaEscalade);
      const urgent = Boolean(body?.urgent);
      if (op === "update") updateType(code, label, slaRelance, slaEscalade, urgent);
      else addType(code, label, slaRelance, slaEscalade, urgent);
      logActivity(user.id, `catalogue_${op}`, `type ${code}`);
    }
  }

  return NextResponse.json({ catalogue: getCatalogue() });
}

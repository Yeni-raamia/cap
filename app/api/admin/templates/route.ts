/* CRUD des modèles de relance (réservé aux administrateurs). */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { createTemplate, deleteTemplate, logActivity, updateTemplate } from "@/lib/db/admin";
import { listTemplates } from "@/lib/db/repo";
import { TEMPLATE_CATEGORIES, type TemplateCategory } from "@/lib/domain";

const CATS = TEMPLATE_CATEGORIES.map((c) => c.value);

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Réservé aux administrateurs." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const action: string = body?.action;

  if (action === "create" || action === "update") {
    const name = String(body?.name || "").trim();
    const subject = String(body?.subject || "").trim();
    const text = String(body?.body || "").trim();
    const category = (CATS.includes(body?.category) ? body.category : "relance") as TemplateCategory;
    if (!name || !text) {
      return NextResponse.json({ error: "Nom et corps du modèle requis." }, { status: 400 });
    }
    if (action === "create") {
      createTemplate({ name, category, subject, body: text });
      logActivity(user.id, "template_create", name);
    } else {
      const id = String(body?.id || "");
      if (!id) return NextResponse.json({ error: "Modèle introuvable." }, { status: 404 });
      updateTemplate(id, { name, category, subject, body: text });
      logActivity(user.id, "template_update", name);
    }
  } else if (action === "delete") {
    const id = String(body?.id || "");
    if (!id) return NextResponse.json({ error: "Modèle introuvable." }, { status: 404 });
    deleteTemplate(id);
    logActivity(user.id, "template_delete", id);
  } else {
    return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
  }

  return NextResponse.json({ templates: listTemplates() });
}

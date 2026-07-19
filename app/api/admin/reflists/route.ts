import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { addRefItem, deleteRefItem, getRefLists, logActivity } from "@/lib/db/admin";
import { ACTION_ICONS } from "@/lib/domain";

const LISTS = ["appreciation", "cause", "action"];
const LABELS: Record<string, string> = { appreciation: "appréciation", cause: "cause", action: "action" };

// slug pour le "kind" d'une action personnalisée
const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 20) || "autre";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Réservé aux administrateurs." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const op: string = body?.op;
  const listKey: string = body?.listKey;
  if (!LISTS.includes(listKey)) {
    return NextResponse.json({ error: "Liste inconnue." }, { status: 400 });
  }

  if (op === "add") {
    const label = String(body?.label || body?.value || "").trim();
    if (!label) return NextResponse.json({ error: "Valeur requise." }, { status: 400 });
    if (listKey === "action") {
      const icon = ACTION_ICONS.includes(body?.icon) ? body.icon : "Flag";
      addRefItem("action", slug(label), label, icon);
    } else {
      addRefItem(listKey, label, label, null);
    }
    logActivity(user.id, "reflist_add", `${LABELS[listKey]} : ${label}`);
  } else if (op === "delete") {
    const value = String(body?.value || "");
    if (!value) return NextResponse.json({ error: "Valeur manquante." }, { status: 400 });
    deleteRefItem(listKey, value);
    logActivity(user.id, "reflist_delete", `${LABELS[listKey]} : ${value}`);
  } else {
    return NextResponse.json({ error: "Opération inconnue." }, { status: 400 });
  }

  return NextResponse.json({ refLists: getRefLists() });
}

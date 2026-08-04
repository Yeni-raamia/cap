/* Annuaire de contacts partagé. Lecture : tout utilisateur authentifié.
 * Écriture (créer/éditer/supprimer) : tout utilisateur non lecture seule. */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { denyReadOnly } from "@/lib/auth/guards";
import { createContact, deleteContact, listContacts, updateContact } from "@/lib/db/contacts";
import { logActivity } from "@/lib/db/admin";
import { contactDisplayName } from "@/lib/domain";

const str = (v: unknown) => String(v ?? "").trim();

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  return NextResponse.json({ contacts: listContacts() });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const ro = denyReadOnly(user);
  if (ro) return ro;

  const body = await request.json().catch(() => ({}));
  const op: string = body?.op;

  if (op === "create") {
    const prenom = str(body?.prenom);
    const nom = str(body?.nom);
    if (!prenom && !nom) return NextResponse.json({ error: "Un prénom ou un nom est requis." }, { status: 400 });
    const c = createContact({
      prenom,
      nom,
      email: str(body?.email),
      telephone: str(body?.telephone),
      service: str(body?.service),
      fonction: str(body?.fonction),
      createdBy: user.id,
    });
    logActivity(user.id, "contact_create", contactDisplayName(c));
    return NextResponse.json({ contacts: listContacts(), contact: c });
  }

  const id = str(body?.id);
  if (!id) return NextResponse.json({ error: "Contact invalide." }, { status: 400 });

  if (op === "update") {
    updateContact(id, {
      prenom: body?.prenom !== undefined ? str(body.prenom) : undefined,
      nom: body?.nom !== undefined ? str(body.nom) : undefined,
      email: body?.email !== undefined ? str(body.email) : undefined,
      telephone: body?.telephone !== undefined ? str(body.telephone) : undefined,
      service: body?.service !== undefined ? str(body.service) : undefined,
      fonction: body?.fonction !== undefined ? str(body.fonction) : undefined,
    });
    logActivity(user.id, "contact_update", `${contactDisplayName({ prenom: str(body?.prenom), nom: str(body?.nom) })}`.trim() || id);
    return NextResponse.json({ contacts: listContacts() });
  }

  if (op === "delete") {
    deleteContact(id);
    logActivity(user.id, "contact_delete", id);
    return NextResponse.json({ contacts: listContacts() });
  }

  return NextResponse.json({ error: "Opération inconnue." }, { status: 400 });
}

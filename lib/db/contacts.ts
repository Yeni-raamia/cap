/* ==================================================================
 *  lib/db/contacts.ts — Annuaire de contacts partagé (serveur).
 *  Éditable par tout utilisateur non lecture seule. Pré-remplit les
 *  destinataires des suivis pour garantir la cohérence des données.
 * ================================================================== */
import { randomUUID } from "node:crypto";
import { getDb } from "./index";
import type { Contact } from "@/lib/domain";

interface Row {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  service: string;
  fonction: string;
}

const COLS = "id, prenom, nom, email, telephone, service, fonction";
const map = (r: Row): Contact => ({ ...r });

export function listContacts(): Contact[] {
  return (getDb().prepare(`select ${COLS} from contacts order by nom, prenom`).all() as Row[]).map(map);
}

export function createContact(input: {
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  service: string;
  fonction: string;
  createdBy: string;
}): Contact {
  const id = randomUUID();
  getDb()
    .prepare(
      "insert into contacts (id, prenom, nom, email, telephone, service, fonction, created_by) values (?,?,?,?,?,?,?,?)"
    )
    .run(id, input.prenom, input.nom, input.email, input.telephone, input.service, input.fonction, input.createdBy);
  return map(getDb().prepare(`select ${COLS} from contacts where id = ?`).get(id) as Row);
}

export function updateContact(
  id: string,
  f: Partial<{ prenom: string; nom: string; email: string; telephone: string; service: string; fonction: string }>
): void {
  const cur = getDb().prepare(`select ${COLS} from contacts where id = ?`).get(id) as Row | undefined;
  if (!cur) return;
  getDb()
    .prepare(
      "update contacts set prenom=?, nom=?, email=?, telephone=?, service=?, fonction=?, updated_at=datetime('now') where id=?"
    )
    .run(
      f.prenom ?? cur.prenom,
      f.nom ?? cur.nom,
      f.email ?? cur.email,
      f.telephone ?? cur.telephone,
      f.service ?? cur.service,
      f.fonction ?? cur.fonction,
      id
    );
}

export function deleteContact(id: string): void {
  getDb().prepare("delete from contacts where id = ?").run(id);
}

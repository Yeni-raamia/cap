/* ==================================================================
 *  lib/data/supabase.ts — Adaptateur de données Supabase (Phase 2).
 *  Implémente la même interface que l'adaptateur mock, en asynchrone.
 *  Les scores, relances et notifications restent calculés côté client
 *  via lib/domain (mêmes règles que le mode démo) à partir des objets
 *  chargés — la source de vérité en base reste les vues v_scores /
 *  v_item_reminders pour le moteur de relance (Phase 3).
 * ================================================================== */
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  EventKind,
  Item,
  ParsedSubject,
  Priorite,
  Profile,
  Role,
  Statut,
  TimelineEvent,
} from "../domain";

type Action = "relance" | "reponse" | "bloque" | "cloture";

/* ---------- Mappage base → domaine ---------- */
interface DbProfile {
  id: string;
  full_name: string;
  initials: string;
  poste: string | null;
  role: Role;
}

function mapProfile(r: DbProfile): Profile {
  return {
    id: r.id,
    nom: r.full_name,
    poste: r.poste ?? "",
    role: r.role,
    init: r.initials,
  };
}

interface DbEvent {
  kind: EventKind;
  label: string;
  author_id: string | null;
  created_at: string;
}
interface DbPerson {
  name: string;
  kind: "destinataire" | "copie" | "impliqué";
}
interface DbItem {
  id: string;
  ref: string;
  metier_code: string;
  type_code: string;
  objet: string;
  priorite: Priorite;
  statut: Statut;
  owner_id: string;
  points_cles: string[] | null;
  blocage_cause: string | null;
  relances_count: number;
  date_creation: string;
  date_maj: string;
  events?: DbEvent[];
  item_people?: DbPerson[];
}

function mapItem(r: DbItem): Item {
  const timeline: TimelineEvent[] = (r.events ?? [])
    .map((e) => ({
      date: new Date(e.created_at),
      kind: e.kind,
      label: e.label,
      author: e.author_id ?? "",
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  return {
    id: r.id,
    ref: r.ref,
    metier: r.metier_code,
    type: r.type_code,
    objet: r.objet,
    ownerId: r.owner_id,
    statut: r.statut,
    priorite: r.priorite,
    personnes: (r.item_people ?? []).map((p) => ({ name: p.name, kind: p.kind })),
    pointsCles: r.points_cles ?? [],
    blocageCause: r.blocage_cause,
    relancesCount: r.relances_count,
    dateCreation: new Date(r.date_creation),
    dateMaj: new Date(r.date_maj),
    timeline,
  };
}

/* ---------- Lectures ---------- */
export async function loadProfiles(sb: SupabaseClient): Promise<Profile[]> {
  const { data, error } = await sb.from("profiles").select("*").order("full_name");
  if (error) throw error;
  return (data as DbProfile[]).map(mapProfile);
}

export async function loadItems(sb: SupabaseClient): Promise<Item[]> {
  const { data, error } = await sb
    .from("items")
    .select("*, events(*), item_people(*)")
    .order("date_maj", { ascending: false });
  if (error) throw error;
  return (data as DbItem[]).map(mapItem);
}

export async function currentUser(sb: SupabaseClient): Promise<Profile | null> {
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  const { data, error } = await sb.from("profiles").select("*").eq("id", user.id).single();
  if (error || !data) return null;
  return mapProfile(data as DbProfile);
}

/* ---------- Écritures ---------- */
export async function persistAction(
  sb: SupabaseClient,
  item: Item,
  action: Action,
  cause: string | undefined,
  meId: string
): Promise<void> {
  const now = new Date().toISOString();

  if (action === "relance") {
    const count = item.relancesCount + 1;
    await sb.from("items").update({ statut: "Relancé", relances_count: count, date_maj: now }).eq("id", item.id);
    await sb.from("events").insert({ item_id: item.id, kind: "relance", label: `Relance ${count}`, author_id: meId });
  } else if (action === "reponse") {
    await sb.from("items").update({ statut: "En traitement", date_maj: now }).eq("id", item.id);
    await sb.from("events").insert({ item_id: item.id, kind: "reponse", label: "Réponse reçue", author_id: meId });
  } else if (action === "bloque") {
    await sb.from("items").update({ statut: "Bloqué", blocage_cause: cause ?? null, date_maj: now }).eq("id", item.id);
    await sb.from("events").insert({ item_id: item.id, kind: "statut", label: `→ Bloqué : ${cause}`, author_id: meId });
  } else if (action === "cloture") {
    await sb.from("items").update({ statut: "Clôturé", closed_at: now, date_maj: now }).eq("id", item.id);
    await sb.from("events").insert({ item_id: item.id, kind: "cloture", label: "Clôturé", author_id: meId });
  }
}

export async function persistCreate(
  sb: SupabaseClient,
  parsed: ParsedSubject,
  prio: Priorite,
  dest: string,
  pointsRaw: string,
  meId: string
): Promise<void> {
  const points = pointsRaw
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);

  const { data, error } = await sb
    .from("items")
    .insert({
      ref: parsed.ref,
      metier_code: parsed.metier,
      type_code: parsed.type,
      objet: parsed.objet,
      priorite: prio,
      statut: "Envoyé",
      owner_id: meId,
      points_cles: points.length ? points : ["—"],
    })
    .select("id")
    .single();
  if (error) throw error;
  const id = (data as { id: string }).id;

  if (dest) {
    await sb.from("item_people").insert({ item_id: id, name: dest, kind: "destinataire" });
  }
  await sb.from("events").insert([
    { item_id: id, kind: "creation", label: "Objet créé", author_id: meId },
    { item_id: id, kind: "envoi", label: "Envoyé", author_id: meId },
  ]);
}

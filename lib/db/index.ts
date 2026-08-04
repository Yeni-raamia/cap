/* ==================================================================
 *  lib/db/index.ts — Base locale SQLite (serveur uniquement).
 *  Fichier unique lu/écrit par le serveur : les données sont donc
 *  persistées et partagées par tous les utilisateurs du LAN.
 *  Aucun cloud, aucun Docker.
 * ================================================================== */
import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DEFAULT_REF_LISTS, DEFAULT_TEMPLATES, METIERS, TYPES } from "@/lib/domain";

// Emplacement du fichier de base — surchargable via DATABASE_PATH.
const DB_PATH = process.env.DATABASE_PATH || join(process.cwd(), "data", "cap.sqlite");

const SCHEMA = `
create table if not exists ref_metiers (
  code text primary key, label text not null, tone text not null default 'slate', ordre integer not null default 0
);
create table if not exists ref_types (
  code text primary key, label text not null,
  sla_relance integer, sla_escalade integer, urgent integer not null default 0, ordre integer not null default 0
);
create table if not exists profiles (
  id text primary key, email text unique not null, password_hash text not null,
  full_name text not null, initials text not null, poste text,
  role text not null default 'agent', active integer not null default 1,
  extra_pages text not null default '', denied_pages text not null default '',
  readonly integer not null default 0, approved integer not null default 0,
  must_change_password integer not null default 0, password_changed_at text,
  created_at text not null default (datetime('now'))
);
create table if not exists items (
  id text primary key, ref text not null, metier_code text not null, type_code text not null,
  objet text not null, priorite text not null default 'Moyenne', statut text not null default 'Envoyé',
  owner_id text not null, points_cles text not null default '[]', blocage_cause text,
  relances_count integer not null default 0,
  date_creation text not null default (datetime('now')), date_maj text not null default (datetime('now')),
  closed_at text, date_relance_prevue text, project_id text, appreciation text
);
create table if not exists blocage_actions (
  id text primary key, item_id text not null, kind text not null, concerne text not null default '',
  note text not null default '', author_id text, created_at text not null default (datetime('now'))
);
create index if not exists idx_blocage_item on blocage_actions(item_id);
create table if not exists projects (
  id text primary key, name text not null, description text not null default '',
  owner_id text not null, status text not null default 'En cours',
  deadline text, source_item_id text, created_at text not null default (datetime('now')),
  pending_status text, pending_by text,
  archived integer not null default 0,
  del_requested_by text, del_reason text, del_requested_at text
);
create table if not exists project_tasks (
  id text primary key, project_id text not null, title text not null,
  assignee_id text, status text not null default 'à faire', due_date text,
  ordre integer not null default 0, created_at text not null default (datetime('now'))
);
create table if not exists project_members (
  id text primary key, project_id text not null, profile_id text not null
);
create table if not exists project_notes (
  id text primary key, project_id text not null, author_id text, body text not null,
  created_at text not null default (datetime('now'))
);
create table if not exists tasks (
  id text primary key, title text not null, description text not null default '',
  assignee_id text, created_by text, project_id text,
  status text not null default 'à faire', priority text not null default 'Normale',
  start_date text, due_date text, completed_at text, created_at text not null default (datetime('now'))
);
create index if not exists idx_tasks_assignee on tasks(assignee_id);
create index if not exists idx_tasks_project2 on tasks(project_id);
create table if not exists task_subtasks (
  id text primary key, task_id text not null, title text not null,
  done integer not null default 0, ordre integer not null default 0,
  created_at text not null default (datetime('now'))
);
create index if not exists idx_subtasks_task on task_subtasks(task_id);
create table if not exists project_closure_requests (
  id text primary key, project_id text not null, requested_by text,
  summary text not null default '', deliverables text not null default '[]',
  status text not null default 'en_attente', decided_by text, decision_note text not null default '',
  created_at text not null default (datetime('now')), decided_at text
);
create index if not exists idx_closure_project on project_closure_requests(project_id);
create table if not exists objectives (
  id text primary key, title text not null, description text not null default '',
  start_date text not null, end_date text not null, owner_id text,
  color text not null default '#10b981', status text not null default 'planifie',
  downgrade_reason text not null default '', downgraded_by text, downgraded_at text,
  created_by text, created_at text not null default (datetime('now'))
);
create table if not exists objective_projects ( objective_id text not null, project_id text not null );
create table if not exists objective_tasks ( objective_id text not null, task_id text not null );
create table if not exists objective_members ( objective_id text not null, profile_id text not null );
create table if not exists objective_milestones (
  id text primary key, objective_id text not null, label text not null, date text not null, done integer not null default 0
);
create index if not exists idx_objmile on objective_milestones(objective_id);
create index if not exists idx_objproj on objective_projects(objective_id);
create index if not exists idx_objtask on objective_tasks(objective_id);
create index if not exists idx_objmem on objective_members(objective_id);
create index if not exists idx_tasks_project on project_tasks(project_id);
create index if not exists idx_pmembers_project on project_members(project_id);
create index if not exists idx_pnotes_project on project_notes(project_id);
create table if not exists item_people (
  id text primary key, item_id text not null, name text not null, kind text not null default 'destinataire',
  service text
);
create table if not exists events (
  id text primary key, item_id text not null, kind text not null, label text not null,
  author_id text, created_at text not null default (datetime('now'))
);
create table if not exists notifications (
  id text primary key, user_id text not null, item_id text, kind text not null, message text not null,
  channel text not null default 'in-app', read integer not null default 0,
  created_at text not null default (datetime('now'))
);
create table if not exists sessions (
  token text primary key, user_id text not null,
  created_at text not null default (datetime('now')), expires_at text not null
);
create table if not exists settings (
  key text primary key, value text not null
);
create table if not exists contacts (
  id text primary key, prenom text not null default '', nom text not null default '',
  email text not null default '', telephone text not null default '', service text not null default '',
  fonction text not null default '', created_by text,
  created_at text not null default (datetime('now')), updated_at text not null default (datetime('now'))
);
create table if not exists activity_log (
  id text primary key, actor_id text, action text not null, detail text not null default '',
  created_at text not null default (datetime('now'))
);
create index if not exists idx_activity_created on activity_log(created_at);
create table if not exists ref_lists (
  id text primary key, list_key text not null, value text not null,
  label text not null default '', icon text, ordre integer not null default 0
);
create index if not exists idx_reflists_key on ref_lists(list_key);
create table if not exists attachments (
  id text primary key, item_id text not null, filename text not null,
  mime text not null default '', size integer not null default 0,
  data blob not null, uploaded_by text, created_at text not null default (datetime('now'))
);
create index if not exists idx_attach_item on attachments(item_id);
create table if not exists email_templates (
  id text primary key, name text not null, category text not null default 'relance',
  subject text not null default '', body text not null default '', ordre integer not null default 0,
  created_at text not null default (datetime('now'))
);
create table if not exists negligences (
  id text primary key, item_id text,
  objet text not null default '', service text not null default '', concerne text not null default '',
  gravite text not null default 'Modérée', risque text not null default 'Moyen',
  impact text not null default '', description text not null default '',
  status text not null default 'Ouverte', created_by text, decided_by text,
  created_at text not null default (datetime('now')), updated_at text not null default (datetime('now')),
  decided_at text
);
create table if not exists negligence_decisions (
  id text primary key, negligence_id text not null, decision text not null
);
create index if not exists idx_negdec_neg on negligence_decisions(negligence_id);
create table if not exists nonconformites (
  id text primary key, item_id text,
  objet text not null default '', service text not null default '', concerne text not null default '',
  policy text not null default '',
  gravite text not null default 'Modérée', risque text not null default 'Moyen',
  impact text not null default '', description text not null default '',
  status text not null default 'Ouverte', created_by text, decided_by text,
  created_at text not null default (datetime('now')), updated_at text not null default (datetime('now')),
  decided_at text
);
create table if not exists nonconformite_decisions (
  id text primary key, nonconformite_id text not null, decision text not null
);
create index if not exists idx_ncdec_nc on nonconformite_decisions(nonconformite_id);
create table if not exists conversations (
  id text primary key, title text not null default '', kind text not null default 'group',
  ref_type text, ref_id text, created_by text, created_at text not null default (datetime('now'))
);
create table if not exists conversation_members (
  id text primary key, conversation_id text not null, profile_id text not null
);
create table if not exists messages (
  id text primary key, conversation_id text not null, author_id text, body text not null,
  reply_to text, created_at text not null default (datetime('now'))
);
create table if not exists message_reactions (
  id text primary key, message_id text not null, profile_id text not null, emoji text not null
);
create index if not exists idx_reactions_msg on message_reactions(message_id);
create table if not exists conversation_reads (
  conversation_id text not null, profile_id text not null, last_read_at text not null default (datetime('now')),
  primary key (conversation_id, profile_id)
);
create index if not exists idx_msg_conv on messages(conversation_id);
create index if not exists idx_convmem_conv on conversation_members(conversation_id);
create index if not exists idx_conv_ref on conversations(ref_type, ref_id);
create index if not exists idx_items_owner on items(owner_id);
create index if not exists idx_items_statut on items(statut);
create index if not exists idx_events_item on events(item_id);
create index if not exists idx_people_item on item_people(item_id);
`;

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  const dir = dirname(DB_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL"); // meilleures écritures concurrentes (multi-utilisateurs LAN)
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  ensureColumns(db);
  seedCatalogue(db);
  seedRefLists(db);
  seedTemplates(db);

  _db = db;
  return db;
}

/** Chemin du fichier de base (pour sauvegarde / restauration). */
export function getDbPath(): string {
  return DB_PATH;
}

/** Ferme la connexion vivante (checkpoint WAL) et force une réouverture au prochain getDb(). */
export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}

// Modèles de relance — seed initial si la table est vide. Ensuite éditables.
function seedTemplates(db: Database.Database) {
  const n = (db.prepare("select count(*) as n from email_templates").get() as { n: number }).n;
  if (n > 0) return;
  const ins = db.prepare(
    "insert into email_templates (id, name, category, subject, body, ordre) values (?,?,?,?,?,?)"
  );
  DEFAULT_TEMPLATES.forEach((t, i) => ins.run(randomUUID(), t.name, t.category, t.subject, t.body, i + 1));
}

// Listes de référence (appréciations, causes, actions) — seed depuis les valeurs
// par défaut si la liste est vide. Ensuite éditable en administration.
function seedRefLists(db: Database.Database) {
  const count = (key: string) =>
    (db.prepare("select count(*) as n from ref_lists where list_key=?").get(key) as { n: number }).n;
  const ins = db.prepare(
    "insert into ref_lists (id, list_key, value, label, icon, ordre) values (?,?,?,?,?,?)"
  );
  if (count("appreciation") === 0)
    DEFAULT_REF_LISTS.appreciations.forEach((v, i) => ins.run(randomUUID(), "appreciation", v, v, null, i + 1));
  if (count("cause") === 0)
    DEFAULT_REF_LISTS.causes.forEach((v, i) => ins.run(randomUUID(), "cause", v, v, null, i + 1));
  if (count("action") === 0)
    DEFAULT_REF_LISTS.actions.forEach((a, i) => ins.run(randomUUID(), "action", a.kind, a.label, a.icon, i + 1));
  if (count("decision") === 0)
    DEFAULT_REF_LISTS.decisions.forEach((v, i) => ins.run(randomUUID(), "decision", v, v, null, i + 1));
  if (count("service") === 0)
    DEFAULT_REF_LISTS.services.forEach((v, i) => ins.run(randomUUID(), "service", v, v, null, i + 1));
  if (count("policy") === 0)
    DEFAULT_REF_LISTS.policies.forEach((v, i) => ins.run(randomUUID(), "policy", v, v, null, i + 1));
}

// Migrations légères pour les bases déjà créées (ajout de colonnes manquantes).
function ensureColumns(db: Database.Database) {
  const cols = (db.prepare("pragma table_info(items)").all() as { name: string }[]).map(
    (c) => c.name
  );
  if (!cols.includes("date_relance_prevue")) {
    db.exec("alter table items add column date_relance_prevue text");
  }
  if (!cols.includes("project_id")) {
    db.exec("alter table items add column project_id text");
  }
  if (!cols.includes("appreciation")) {
    db.exec("alter table items add column appreciation text");
  }
  const pcols = (db.prepare("pragma table_info(profiles)").all() as { name: string }[]).map((c) => c.name);
  if (!pcols.includes("extra_pages")) {
    db.exec("alter table profiles add column extra_pages text not null default ''");
  }
  if (!pcols.includes("denied_pages")) {
    db.exec("alter table profiles add column denied_pages text not null default ''");
  }
  if (!pcols.includes("readonly")) {
    db.exec("alter table profiles add column readonly integer not null default 0");
  }
  if (!pcols.includes("approved")) {
    db.exec("alter table profiles add column approved integer not null default 0");
    // Les comptes déjà présents étaient légitimes : on les approuve pour ne verrouiller personne.
    db.exec("update profiles set approved = 1");
  }
  if (!pcols.includes("avatar")) {
    db.exec("alter table profiles add column avatar text");
  }
  if (!pcols.includes("totp_secret")) {
    db.exec("alter table profiles add column totp_secret text");
    db.exec("alter table profiles add column totp_enabled integer not null default 0");
    db.exec("alter table profiles add column totp_backup text");
  }
  if (!pcols.includes("must_change_password")) {
    db.exec("alter table profiles add column must_change_password integer not null default 0");
  }
  if (!pcols.includes("password_changed_at")) {
    db.exec("alter table profiles add column password_changed_at text");
    // Point de départ de l'âge des mots de passe existants = maintenant.
    db.exec("update profiles set password_changed_at = datetime('now') where password_changed_at is null");
  }
  const ipcols = (db.prepare("pragma table_info(item_people)").all() as { name: string }[]).map((c) => c.name);
  if (!ipcols.includes("service")) {
    db.exec("alter table item_people add column service text");
  }
  if (!ipcols.includes("email")) {
    db.exec("alter table item_people add column email text");
  }
  const ntcols = (db.prepare("pragma table_info(notifications)").all() as { name: string }[]).map((c) => c.name);
  if (!ntcols.includes("conversation_id")) {
    db.exec("alter table notifications add column conversation_id text");
  }
  const pjcols = (db.prepare("pragma table_info(projects)").all() as { name: string }[]).map((c) => c.name);
  if (!pjcols.includes("pending_status")) {
    db.exec("alter table projects add column pending_status text");
    db.exec("alter table projects add column pending_by text");
  }
  // Projets : archivage explicite + demande de suppression (approbation manager/admin).
  if (!pjcols.includes("archived")) {
    db.exec("alter table projects add column archived integer not null default 0");
  }
  if (!pjcols.includes("del_requested_by")) {
    db.exec("alter table projects add column del_requested_by text");
    db.exec("alter table projects add column del_reason text");
    db.exec("alter table projects add column del_requested_at text");
  }
  const tkcols = (db.prepare("pragma table_info(tasks)").all() as { name: string }[]).map((c) => c.name);
  if (tkcols.length > 0 && !tkcols.includes("start_date")) {
    db.exec("alter table tasks add column start_date text");
  }
  const mcols = (db.prepare("pragma table_info(messages)").all() as { name: string }[]).map((c) => c.name);
  if (mcols.length > 0 && !mcols.includes("reply_to")) {
    db.exec("alter table messages add column reply_to text");
  }
  // Suivis : durée de traitement acceptable (jours) + marqueur « en retard ».
  const itcols = (db.prepare("pragma table_info(items)").all() as { name: string }[]).map((c) => c.name);
  if (!itcols.includes("due_duration_days")) {
    db.exec("alter table items add column due_duration_days integer");
    db.exec("alter table items add column marked_late integer not null default 0");
  }
  // Non-conformités : politique / article / contrôle violé.
  const nccols = (db.prepare("pragma table_info(nonconformites)").all() as { name: string }[]).map((c) => c.name);
  if (nccols.length > 0 && !nccols.includes("policy")) {
    db.exec("alter table nonconformites add column policy text not null default ''");
  }
  // Sessions : métadonnées appareil (gestion des sessions actives).
  const scols = (db.prepare("pragma table_info(sessions)").all() as { name: string }[]).map((c) => c.name);
  if (!scols.includes("id")) {
    db.exec("alter table sessions add column id text");
    // Handle public de révocation, distinct du jeton secret.
    db.exec("update sessions set id = lower(hex(randomblob(16))) where id is null");
  }
  if (!scols.includes("last_seen_at")) {
    db.exec("alter table sessions add column last_seen_at text");
    db.exec("update sessions set last_seen_at = created_at where last_seen_at is null");
  }
  if (!scols.includes("user_agent")) {
    db.exec("alter table sessions add column user_agent text");
  }
  if (!scols.includes("ip")) {
    db.exec("alter table sessions add column ip text");
  }
  // Négligences : reconstruction si ancien schéma (item_id NOT NULL/UNIQUE, sans objet/service/concerne).
  const ncols = (db.prepare("pragma table_info(negligences)").all() as { name: string }[]).map((c) => c.name);
  if (ncols.length > 0 && !ncols.includes("objet")) {
    db.exec(`
      create table negligences_new (
        id text primary key, item_id text,
        objet text not null default '', service text not null default '', concerne text not null default '',
        gravite text not null default 'Modérée', risque text not null default 'Moyen',
        impact text not null default '', description text not null default '',
        status text not null default 'Ouverte', created_by text, decided_by text,
        created_at text not null default (datetime('now')), updated_at text not null default (datetime('now')),
        decided_at text
      );
      insert into negligences_new (id, item_id, gravite, risque, impact, description, status, created_by, decided_by, created_at, updated_at, decided_at)
        select id, item_id, gravite, risque, impact, description, status, created_by, decided_by, created_at, updated_at, decided_at from negligences;
      drop table negligences;
      alter table negligences_new rename to negligences;
    `);
  }
}

// Catalogue (9 métiers + 11 types) inséré depuis lib/domain — source unique, jamais dupliquée.
function seedCatalogue(db: Database.Database) {
  const upM = db.prepare(
    "insert into ref_metiers (code, label, tone, ordre) values (?,?,?,?) " +
      "on conflict(code) do update set label=excluded.label, tone=excluded.tone, ordre=excluded.ordre"
  );
  Object.entries(METIERS).forEach(([code, m], i) => upM.run(code, m.label, m.tone, i + 1));

  const upT = db.prepare(
    "insert into ref_types (code, label, sla_relance, sla_escalade, urgent, ordre) values (?,?,?,?,?,?) " +
      "on conflict(code) do update set label=excluded.label, sla_relance=excluded.sla_relance, " +
      "sla_escalade=excluded.sla_escalade, urgent=excluded.urgent, ordre=excluded.ordre"
  );
  Object.entries(TYPES).forEach(([code, t], i) =>
    upT.run(code, code, t.sla?.relance ?? null, t.sla?.escalade ?? null, t.urgent ? 1 : 0, i + 1)
  );
}

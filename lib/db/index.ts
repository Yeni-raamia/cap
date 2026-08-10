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
  closed_at text, date_relance_prevue text, project_id text, appreciation text,
  published integer not null default 1
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
  del_requested_by text, del_reason text, del_requested_at text,
  published integer not null default 1
);
create table if not exists project_tasks (
  id text primary key, project_id text not null, title text not null,
  assignee_id text, status text not null default 'à faire', due_date text,
  ordre integer not null default 0, created_at text not null default (datetime('now')),
  proposed_by text,
  description text not null default '', priority text not null default 'Normale', completed_at text
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
  start_date text, due_date text, completed_at text, created_at text not null default (datetime('now')),
  published integer not null default 1
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
create table if not exists project_task_proposals (
  id text primary key, project_id text not null,
  title text not null, description text not null default '', due_date text,
  proposed_by text, status text not null default 'en_attente',
  decided_by text, decision_note text not null default '', merged_task_id text,
  created_at text not null default (datetime('now')), decided_at text
);
create index if not exists idx_proposals_project on project_task_proposals(project_id);
create table if not exists objectives (
  id text primary key, title text not null, description text not null default '',
  start_date text not null, end_date text not null, owner_id text,
  color text not null default '#10b981', status text not null default 'planifie',
  downgrade_reason text not null default '', downgraded_by text, downgraded_at text,
  created_by text, created_at text not null default (datetime('now')),
  subtitle text not null default '', criticality text not null default 'Moyenne'
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
  link text,
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
create table if not exists meetings (
  id text primary key, title text not null default '', agenda text not null default '',
  date text, location text not null default '', visio_url text not null default '',
  status text not null default 'planifiée',
  notes text not null default '', decisions text not null default '[]', created_by text,
  created_at text not null default (datetime('now')), updated_at text not null default (datetime('now'))
);
create table if not exists meeting_participants (
  id text primary key, meeting_id text not null, kind text not null default 'member', ref_id text not null,
  presence text not null default 'invité'
);
create table if not exists meeting_links (
  id text primary key, meeting_id text not null, ref_type text not null, ref_id text not null
);
create table if not exists meeting_attachments (
  id text primary key, meeting_id text not null, filename text not null, mime text not null default '',
  size integer not null default 0, data blob not null, uploaded_by text,
  created_at text not null default (datetime('now'))
);
create index if not exists idx_mtg_part on meeting_participants(meeting_id);
create index if not exists idx_mtg_link on meeting_links(meeting_id);
create index if not exists idx_mtg_att on meeting_attachments(meeting_id);
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
create table if not exists project_attachments (
  id text primary key, project_id text not null, filename text not null,
  mime text not null default '', size integer not null default 0,
  data blob not null, uploaded_by text, created_at text not null default (datetime('now'))
);
create index if not exists idx_pattach_project on project_attachments(project_id);
create table if not exists audit_attachments (
  id text primary key, audit_id text not null, question_id text not null default '', filename text not null,
  mime text not null default '', size integer not null default 0,
  data blob not null, uploaded_by text, created_at text not null default (datetime('now'))
);
create index if not exists idx_aattach_audit on audit_attachments(audit_id);
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
create table if not exists risks (
  id text primary key, ref text not null,
  title text not null default '', description text not null default '', category text not null default '',
  probability integer not null default 3, impact integer not null default 3,
  residual_probability integer not null default 3, residual_impact integer not null default 3,
  asset_id text, threat text not null default '', vulnerability text not null default '',
  treatment text not null default 'Réduire', treatment_plan text not null default '',
  status text not null default 'Identifié', owner_id text, review_date text, created_by text,
  accepted_by text, accepted_at text, accept_until text, acceptance_justification text not null default '',
  created_at text not null default (datetime('now')), updated_at text not null default (datetime('now'))
);
create table if not exists risk_links (
  risk_id text not null, kind text not null, ref_id text not null
);
create index if not exists idx_risklinks_risk on risk_links(risk_id);
create table if not exists risk_controls (
  risk_id text not null, framework_id text not null, control_code text not null
);
create index if not exists idx_riskctrl_risk on risk_controls(risk_id);
create table if not exists risk_reviews (
  id text primary key, risk_id text not null, reviewed_by text, reviewed_at text not null default (datetime('now')),
  inherent_p integer not null default 3, inherent_i integer not null default 3,
  residual_p integer not null default 3, residual_i integer not null default 3,
  note text not null default ''
);
create index if not exists idx_riskrev_risk on risk_reviews(risk_id);
create table if not exists policies (
  id text primary key, ref text not null,
  title text not null default '', reference text not null default '', domain text not null default '',
  version text not null default '1.0', status text not null default 'Brouillon',
  summary text not null default '', url text not null default '',
  owner_id text, published_at text, review_date text, created_by text,
  created_at text not null default (datetime('now')), updated_at text not null default (datetime('now'))
);
create table if not exists policy_diffusions (
  id text primary key, policy_id text not null, service text not null default '',
  stage text not null default 'Diffusée', note text not null default '',
  updated_at text not null default (datetime('now'))
);
create index if not exists idx_polldiff_policy on policy_diffusions(policy_id);
create table if not exists assets (
  id text primary key, ref text not null,
  name text not null default '', type text not null default '', description text not null default '',
  owner_id text, service text not null default '',
  confidentiality integer not null default 1, integrity integer not null default 1, availability integer not null default 1,
  status text not null default 'Actif', review_date text, created_by text,
  created_at text not null default (datetime('now')), updated_at text not null default (datetime('now'))
);
create table if not exists control_assessments (
  id text primary key, framework_id text not null, control_code text not null,
  applicable integer not null default 1, justification text not null default '',
  status text not null default 'Non évalué', maturity integer not null default 0,
  responsible_id text, evidence text not null default '', note text not null default '',
  last_assessed_at text, next_review_at text,
  updated_at text not null default (datetime('now'))
);
create index if not exists idx_ctrlassess on control_assessments(framework_id, control_code);
create table if not exists field_controls (
  id text primary key, ref text not null,
  title text not null default '', type text not null default '', service text not null default '', location text not null default '',
  date text, inspector_id text, status text not null default 'Planifié', summary text not null default '', created_by text,
  created_at text not null default (datetime('now')), updated_at text not null default (datetime('now'))
);
create table if not exists field_control_items (
  id text primary key, control_id text not null, label text not null default '',
  result text not null default 'À vérifier', note text not null default '',
  framework_id text not null default '', control_code text not null default '', ordre integer not null default 0
);
create index if not exists idx_fcitems_control on field_control_items(control_id);
create table if not exists field_control_events (
  id text primary key, control_id text not null, kind text not null default 'action',
  label text not null default '', from_status text not null default '', to_status text not null default '',
  author_id text, at text not null default (datetime('now'))
);
create table if not exists capa_actions (
  id text primary key, ref text not null,
  title text not null default '', description text not null default '', type text not null default 'Corrective',
  priority text not null default 'Normale', source_type text not null default 'manuel', source_id text,
  owner_id text, due_date text, status text not null default 'Ouverte', verification text not null default '', closed_at text, created_by text,
  created_at text not null default (datetime('now')), updated_at text not null default (datetime('now'))
);
create table if not exists direction_reviews (
  id text primary key, ref text not null,
  title text not null default '', date text, period text not null default '', participant_ids text not null default '[]',
  context_changes text not null default '', risk_review text not null default '', compliance_review text not null default '',
  incidents_review text not null default '', objectives_review text not null default '', feedback text not null default '',
  decisions text not null default '', actions text not null default '', kpi_snapshot text not null default '{}',
  next_review_date text, status text not null default 'Préparée',
  created_by text, created_at text not null default (datetime('now')), updated_at text not null default (datetime('now'))
);
create table if not exists intel_items (
  id text primary key, ref text not null,
  kind text not null default 'IOC', title text not null default '', ioc_type text not null default 'Autre', value text not null default '',
  tlp text not null default 'TLP:AMBER', severity text not null default 'Modéré', source text not null default '', status text not null default 'Actif',
  description text not null default '', action text not null default '', attack_techniques text not null default '[]', expires_at text, owner_id text,
  created_by text, created_at text not null default (datetime('now')), updated_at text not null default (datetime('now'))
);
create table if not exists attack_coverage (
  technique_id text primary key, status text not null default 'Non couverte', detection_note text not null default '',
  updated_by text, updated_at text not null default (datetime('now'))
);
create table if not exists soc_procedures (
  id text primary key, ref text not null,
  title text not null default '', type text not null default 'Autre', frequency text not null default 'Ponctuel',
  objective text not null default '', content text not null default '', items text not null default '[]',
  references_ text not null default '', status text not null default 'Brouillon', owner_id text,
  created_by text, created_at text not null default (datetime('now')), updated_at text not null default (datetime('now'))
);
create table if not exists runbooks (
  id text primary key, ref text not null,
  title text not null default '', category text not null default 'Autre', severity text not null default 'Majeur',
  trigger text not null default '', objective text not null default '', attack_techniques text not null default '[]',
  steps text not null default '[]', escalation text not null default '', references_ text not null default '',
  status text not null default 'Brouillon', owner_id text,
  created_by text, created_at text not null default (datetime('now')), updated_at text not null default (datetime('now'))
);
create table if not exists audit_grids (
  id text primary key, ref text not null,
  name text not null default '', category text not null default 'Autre', source text not null default 'Interne', description text not null default '',
  questions text not null default '[]',
  created_by text, created_at text not null default (datetime('now')), updated_at text not null default (datetime('now'))
);
create table if not exists audits (
  id text primary key, ref text not null,
  title text not null default '', grid_id text not null default '', grid_name text not null default '', category text not null default 'Autre',
  questions text not null default '[]', target_asset_id text, target_label text not null default '', auditor_id text,
  date text, status text not null default 'Planifié', responses text not null default '[]', summary text not null default '',
  created_by text, created_at text not null default (datetime('now')), updated_at text not null default (datetime('now'))
);
create table if not exists auditors (
  id text primary key, ref text not null,
  profile_id text not null default '', name text not null default '', role text not null default 'Auditeur',
  competencies text not null default '[]', certifications text not null default '', independence text not null default '',
  status text not null default 'Actif', notes text not null default '',
  created_by text, created_at text not null default (datetime('now')), updated_at text not null default (datetime('now'))
);
create table if not exists audit_plan_items (
  id text primary key, ref text not null,
  title text not null default '', category text not null default 'Autre', risk_level text not null default 'Moyen',
  year integer not null, quarter text not null default 'T1', owner_id text,
  target_asset_id text, target_label text not null default '', grid_id text not null default '', audit_id text not null default '',
  planned_date text, status text not null default 'Planifié', objective text not null default '',
  created_by text, created_at text not null default (datetime('now')), updated_at text not null default (datetime('now'))
);
create table if not exists processing_activities (
  id text primary key, ref text not null,
  name text not null default '', purpose text not null default '', legal_basis text not null default '',
  data_categories text not null default '[]', sensitive_data integer not null default 0, data_subjects text not null default '',
  recipients text not null default '', retention text not null default '', transfers_outside_eu integer not null default 0, transfer_details text not null default '',
  owner_id text, service text not null default '', security_measures text not null default '', asset_ids text not null default '[]',
  pia_required integer not null default 0, pia_status text not null default 'Non requise', pia_risk text not null default 'Faible', pia_notes text not null default '',
  status text not null default 'Actif', review_date text,
  created_by text, created_at text not null default (datetime('now')), updated_at text not null default (datetime('now'))
);
create table if not exists incidents (
  id text primary key, ref text not null,
  title text not null default '', type text not null default 'Autre', severity text not null default 'Mineur', status text not null default 'Déclaré',
  data_breach integer not null default 0, detected_at text, declared_by text, owner_id text, mission_id text not null default '',
  asset_ids text not null default '[]', description text not null default '', impact text not null default '', actions_taken text not null default '',
  resolved_at text, root_cause text not null default '', lessons text not null default '',
  created_by text, created_at text not null default (datetime('now')), updated_at text not null default (datetime('now'))
);
create table if not exists continuity_plans (
  id text primary key, ref text not null,
  activity text not null default '', mission_id text not null default '', owner_id text,
  criticality text not null default 'Importante', mtpd text not null default '< 24h', rto text not null default '< 24h', rpo text not null default '< 24h',
  impacts text not null default '[]', strategy text not null default '', resources text not null default '', procedure text not null default '',
  asset_ids text not null default '[]', last_test_date text, review_date text, status text not null default 'Brouillon',
  created_by text, created_at text not null default (datetime('now')), updated_at text not null default (datetime('now'))
);
create table if not exists suppliers (
  id text primary key, ref text not null,
  name text not null default '', type text not null default 'Autre', criticality text not null default 'Standard',
  service text not null default '', data_access text not null default 'Aucune donnée', owner_id text, status text not null default 'Actif',
  contract_end text, review_date text, asset_ids text not null default '[]', notes text not null default '',
  created_by text, created_at text not null default (datetime('now')), updated_at text not null default (datetime('now'))
);
create table if not exists missions (
  id text primary key, ref text not null,
  name text not null default '', type text not null default 'Métier', value text not null default 'Importante',
  description text not null default '', owner_id text, status text not null default 'Active',
  asset_ids text not null default '[]', people_ids text not null default '[]', deps text not null default '[]',
  created_by text, created_at text not null default (datetime('now')), updated_at text not null default (datetime('now'))
);
create table if not exists training_courses (
  id text primary key, ref text not null,
  title text not null default '', description text not null default '', category text not null default '',
  icon text not null default '🎓', badge text not null default '', ordre integer not null default 0, published integer not null default 1,
  track text not null default 'grc',
  created_by text, created_at text not null default (datetime('now')), updated_at text not null default (datetime('now'))
);
create table if not exists training_lessons (
  id text primary key, course_id text not null, ordre integer not null default 0,
  type text not null default 'lesson', title text not null default '', content text not null default '',
  xp integer not null default 20, payload text not null default '{}'
);
create index if not exists idx_tlesson_course on training_lessons(course_id);
create table if not exists training_progress (
  id text primary key, user_id text not null, lesson_id text not null, score integer not null default 100,
  completed_at text not null default (datetime('now'))
);
create unique index if not exists idx_tprogress_uniq on training_progress(user_id, lesson_id);
create table if not exists directions (
  id text primary key, ref text not null,
  name text not null default '', code text not null default '', head_id text, description text not null default '',
  created_by text, created_at text not null default (datetime('now')), updated_at text not null default (datetime('now'))
);
create table if not exists org_services (
  id text primary key, direction_id text not null, name text not null default '', head_id text, ordre integer not null default 0
);
create index if not exists idx_orgsvc_dir on org_services(direction_id);
create table if not exists grc_plan_items (
  id text primary key, ref text not null,
  title text not null default '', category text not null default 'Autre', year integer not null default 0, quarter text not null default 'T1',
  owner_id text, priority text not null default 'Normale', status text not null default 'À planifier', progress integer not null default 0,
  due_date text, description text not null default '', created_by text,
  created_at text not null default (datetime('now')), updated_at text not null default (datetime('now'))
);
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
create table if not exists conversation_mutes (
  conversation_id text not null, profile_id text not null,
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
  if (!pcols.includes("grc_member")) {
    db.exec("alter table profiles add column grc_member integer not null default 0");
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
  // Cible de navigation d'une notification (ex. « /projets/<id> ») — clic = redirection.
  if (!ntcols.includes("link")) {
    db.exec("alter table notifications add column link text");
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
  if (!pjcols.includes("published")) {
    db.exec("alter table projects add column published integer not null default 1");
  }
  const tkcols = (db.prepare("pragma table_info(tasks)").all() as { name: string }[]).map((c) => c.name);
  if (tkcols.length > 0 && !tkcols.includes("start_date")) {
    db.exec("alter table tasks add column start_date text");
  }
  if (tkcols.length > 0 && !tkcols.includes("published")) {
    db.exec("alter table tasks add column published integer not null default 1");
  }
  // Tâches de projet : auteur de la proposition à l'origine (Lot 3), le cas échéant.
  const ptcols = (db.prepare("pragma table_info(project_tasks)").all() as { name: string }[]).map((c) => c.name);
  if (ptcols.length > 0 && !ptcols.includes("proposed_by")) {
    db.exec("alter table project_tasks add column proposed_by text");
  }
  // Tâches de projet : description, priorité, date d'achèvement (parité avec les tâches Productivité).
  if (ptcols.length > 0 && !ptcols.includes("description")) {
    db.exec("alter table project_tasks add column description text not null default ''");
    db.exec("alter table project_tasks add column priority text not null default 'Normale'");
    db.exec("alter table project_tasks add column completed_at text");
  }
  // Risques : passage au modèle ISO 27005 (résiduel, actif, menace/vuln, acceptation).
  const rkcols = (db.prepare("pragma table_info(risks)").all() as { name: string }[]).map((c) => c.name);
  if (rkcols.length > 0 && !rkcols.includes("residual_probability")) {
    db.exec("alter table risks add column residual_probability integer not null default 3");
    db.exec("alter table risks add column residual_impact integer not null default 3");
    // Résiduel initialisé à la valeur inhérente (aucun traitement encore appliqué).
    db.exec("update risks set residual_probability = probability, residual_impact = impact");
    db.exec("alter table risks add column asset_id text");
    db.exec("alter table risks add column threat text not null default ''");
    db.exec("alter table risks add column vulnerability text not null default ''");
    db.exec("alter table risks add column accepted_by text");
    db.exec("alter table risks add column accepted_at text");
    db.exec("alter table risks add column accept_until text");
    db.exec("alter table risks add column acceptance_justification text not null default ''");
  }
  // Objectifs annuels : sous-titre + niveau de criticité (label de couleur).
  const objcols = (db.prepare("pragma table_info(objectives)").all() as { name: string }[]).map((c) => c.name);
  if (objcols.length > 0 && !objcols.includes("subtitle")) {
    db.exec("alter table objectives add column subtitle text not null default ''");
    db.exec("alter table objectives add column criticality text not null default 'Moyenne'");
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
  // Visibilité (Lot 2 — espace privé / publication). Défaut 1 = les éléments
  // déjà existants sont considérés publiés (rétrocompatible) ; les nouveaux
  // éléments sont créés en privé explicitement par le code (createItem, etc.).
  if (!itcols.includes("published")) {
    db.exec("alter table items add column published integer not null default 1");
  }
  // Non-conformités : politique / article / contrôle violé.
  const nccols = (db.prepare("pragma table_info(nonconformites)").all() as { name: string }[]).map((c) => c.name);
  if (nccols.length > 0 && !nccols.includes("policy")) {
    db.exec("alter table nonconformites add column policy text not null default ''");
  }
  // Réunions : lien visio + présence des participants (tables créées en cours de route).
  const mtgcols = (db.prepare("pragma table_info(meetings)").all() as { name: string }[]).map((c) => c.name);
  if (mtgcols.length > 0 && !mtgcols.includes("visio_url")) {
    db.exec("alter table meetings add column visio_url text not null default ''");
  }
  const mpcols = (db.prepare("pragma table_info(meeting_participants)").all() as { name: string }[]).map((c) => c.name);
  if (mpcols.length > 0 && !mpcols.includes("presence")) {
    db.exec("alter table meeting_participants add column presence text not null default 'invité'");
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
  // Académie : filière du parcours (grc / audit) — les parcours existants restent GRC.
  const tccols = (db.prepare("pragma table_info(training_courses)").all() as { name: string }[]).map((c) => c.name);
  if (tccols.length > 0 && !tccols.includes("track")) {
    db.exec("alter table training_courses add column track text not null default 'grc'");
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

-- ==================================================================
-- 0001_init.sql — Types, catalogue, tables (cf. §5.1)
-- ==================================================================
create extension if not exists pgcrypto;

create type app_role    as enum ('agent','directeur','admin');
create type item_statut as enum ('Brouillon','Envoyé','En attente','Relancé','En traitement','Bloqué','Clôturé');
create type person_kind as enum ('destinataire','copie','impliqué');
create type event_kind  as enum ('creation','envoi','relance','reponse','statut','note','cloture','escalade');

-- Catalogue en base : éditable en admin, extensible sans refonte.
create table ref_metiers (
  code text primary key, label text not null, tone text not null default 'slate', ordre int not null default 0
);
create table ref_types (
  code text primary key, label text not null,
  sla_relance int, sla_escalade int, urgent boolean not null default false, ordre int not null default 0
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null, initials text not null, poste text,
  role app_role not null default 'agent', active boolean not null default true,
  created_at timestamptz default now()
);

create table items (
  id uuid primary key default gen_random_uuid(),
  ref text not null,
  metier_code text not null references ref_metiers(code),
  type_code   text not null references ref_types(code),
  objet text not null,
  priorite text not null default 'Moyenne',           -- Critique | Élevé | Moyenne
  statut item_statut not null default 'Envoyé',
  owner_id uuid not null references profiles(id),
  points_cles text[] not null default '{}',
  blocage_cause text,
  relances_count int not null default 0,
  date_creation timestamptz not null default now(),
  date_maj timestamptz not null default now(),
  closed_at timestamptz
);
create index on items(owner_id);
create index on items(statut);

create table item_people (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references items(id) on delete cascade,
  name text not null, kind person_kind not null default 'destinataire'
);

create table events (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references items(id) on delete cascade,
  kind event_kind not null, label text not null,
  author_id uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index on events(item_id);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  item_id uuid references items(id) on delete cascade,
  kind text not null,                                  -- relance | escalade | digest
  message text not null,
  channel text[] not null default '{in-app}',
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index on notifications(user_id, read);

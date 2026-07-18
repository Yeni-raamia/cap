-- ==================================================================
-- 0003_rls.sql — Sécurité au niveau ligne / RBAC (cf. §5.3)
-- ==================================================================
create or replace function current_app_role() returns app_role
  language sql stable security definer set search_path = public as
$$ select role from profiles where id = auth.uid() $$;

alter table profiles      enable row level security;
alter table items         enable row level security;
alter table item_people   enable row level security;
alter table events        enable row level security;
alter table notifications enable row level security;
alter table ref_metiers   enable row level security;
alter table ref_types     enable row level security;

-- Lecture du référentiel : tout utilisateur authentifié
create policy ref_read_m on ref_metiers for select to authenticated using (true);
create policy ref_read_t on ref_types   for select to authenticated using (true);
-- Écriture du référentiel : admin uniquement
create policy ref_write_m on ref_metiers for all to authenticated using (current_app_role()='admin') with check (current_app_role()='admin');
create policy ref_write_t on ref_types   for all to authenticated using (current_app_role()='admin') with check (current_app_role()='admin');

-- Profils : chacun lit tout (annuaire), édite le sien ; admin édite tout
create policy prof_read   on profiles for select to authenticated using (true);
create policy prof_self   on profiles for update to authenticated using (id = auth.uid() or current_app_role()='admin');

-- Items : lecture globale (vue d'équipe) ; écriture = propriétaire, ou directeur/admin
create policy items_read   on items for select to authenticated using (true);
create policy items_ins    on items for insert to authenticated with check (owner_id = auth.uid() or current_app_role() in ('directeur','admin'));
create policy items_upd    on items for update to authenticated using (owner_id = auth.uid() or current_app_role() in ('directeur','admin'));
create policy items_del    on items for delete to authenticated using (owner_id = auth.uid() or current_app_role() in ('directeur','admin'));

-- Tables filles : accès aligné sur l'item parent
create policy ip_all on item_people for all to authenticated
  using (exists(select 1 from items i where i.id=item_id and (i.owner_id=auth.uid() or current_app_role() in ('directeur','admin'))))
  with check (exists(select 1 from items i where i.id=item_id and (i.owner_id=auth.uid() or current_app_role() in ('directeur','admin'))));
create policy ev_read on events for select to authenticated using (true);
create policy ev_ins  on events for insert to authenticated with check (exists(select 1 from items i where i.id=item_id and (i.owner_id=auth.uid() or current_app_role() in ('directeur','admin'))));

-- Notifications : chacun voit/traite les siennes
create policy notif_own on notifications for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

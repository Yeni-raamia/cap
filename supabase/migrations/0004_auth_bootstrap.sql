-- ==================================================================
-- 0004_auth_bootstrap.sql — Création automatique du profil
-- À la première inscription, un profil est créé (rôle 'agent' par
-- défaut). Nécessaire car les RLS n'autorisent pas l'insertion directe
-- d'un profil par l'utilisateur. Le trigger s'exécute en security definer.
--
-- Pour promouvoir le premier utilisateur en directeur (cf. README) :
--   update profiles set role = 'directeur' where id = '<uuid>';
-- ==================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  v_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    split_part(new.email, '@', 1)
  );
  insert into public.profiles (id, full_name, initials, role)
  values (
    new.id,
    v_name,
    upper(left(regexp_replace(v_name, '[^A-Za-zÀ-ÿ]', '', 'g'), 2)),
    'agent'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- Carnet : base de données de l'agence (version 3 : lien d'invitation secret, limite d'écritures)
-- À coller dans Supabase → SQL Editor → New query → Run.
-- Installe une base neuve OU met à jour la version 1, sans perdre de données.
-- Peut être relancé sans risque.
-- =====================================================================

-- ---------- Espace privé pour les fonctions de sécurité ----------
-- Le schéma « prive » n'est pas exposé par l'API : ses fonctions ne sont pas appelables depuis internet.
create schema if not exists prive;
revoke all on schema prive from public, anon;
grant usage on schema prive to authenticated;

-- ---------- Comptes des agents ----------
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  nom        text not null default '',
  pole       text check (pole in ('vente', 'location')),
  role       text not null default 'agent' check (role in ('responsable', 'agent')),
  actif      boolean not null default true,
  signature  text not null default '',
  created_at timestamptz not null default now()
);
alter table public.profiles drop constraint if exists profiles_tailles;
alter table public.profiles add constraint profiles_tailles
  check (char_length(nom) <= 80 and char_length(signature) <= 600 and char_length(email) <= 254);

-- ---------- Invitations ----------
-- Seuls les emails invités par un responsable peuvent créer un compte.
-- Le compte reçoit directement le pôle et le rôle prévus : plus d'étape « en attente ».
create table if not exists public.invitations (
  email      text primary key check (email = lower(email) and char_length(email) between 3 and 254),
  pole       text not null check (pole in ('vente', 'location')),
  role       text not null default 'agent' check (role in ('responsable', 'agent')),
  invite_par uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
-- Code secret du lien d'invitation : connaître l'email invité ne suffit pas pour prendre la place de quelqu'un.
-- 64 caractères aléatoires, tirés par le serveur ; valable 7 jours, une seule fois.
alter table public.invitations add column if not exists code text not null
  default replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');

-- ---------- Limite d'écritures par agent ----------
-- Un compte piraté ne peut pas remplir la base en boucle (la base gratuite se bloque à 500 Mo).
create table if not exists prive.quota (
  uid     uuid not null,
  fenetre timestamptz not null,
  n       int not null default 0,
  primary key (uid, fenetre)
);
revoke all on prive.quota from public, anon, authenticated;

-- ---------- Toutes les fiches ----------
create table if not exists public.fiches (
  id         text primary key,
  pole       text not null check (pole in ('vente', 'location')),
  kind       text not null,
  data       jsonb not null,
  owner      uuid references public.profiles(id) on delete set null,
  deleted    boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);
create index if not exists fiches_pole_kind on public.fiches (pole, kind);
create index if not exists fiches_updated on public.fiches (updated_at);

-- Rien d'inattendu ne peut entrer : identifiant simple (pas de guillemets ni de balises),
-- type de fiche connu, contenu JSON de taille raisonnable.
alter table public.fiches drop constraint if exists fiches_id_format;
alter table public.fiches add constraint fiches_id_format check (id ~ '^[A-Za-z0-9_-]{1,64}$') not valid;
alter table public.fiches drop constraint if exists fiches_kind_connu;
alter table public.fiches add constraint fiches_kind_connu
  check (kind in ('acq', 'vend', 'bien', 'pige', 'lcand', 'lbien', 'modele', 'reglages')) not valid;
alter table public.fiches drop constraint if exists fiches_data_objet;
alter table public.fiches add constraint fiches_data_objet
  check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 32000) not valid;
do $$
begin
  alter table public.fiches validate constraint fiches_id_format;
  alter table public.fiches validate constraint fiches_kind_connu;
  alter table public.fiches validate constraint fiches_data_objet;
exception when others then
  raise notice 'Des fiches existantes ne respectent pas les nouvelles règles (elles restent lisibles) : %', sqlerrm;
end $$;

-- ---------- Historique des modifications ----------
-- Chaque version remplacée ou supprimée est gardée 60 jours : un responsable peut la restaurer
-- (erreur, fiche vidée par mégarde ou volontairement).
create table if not exists public.fiches_historique (
  id           bigint generated always as identity primary key,
  fiche_id     text not null,
  pole         text not null,
  kind         text not null,
  data         jsonb not null,
  deleted      boolean not null,
  version_du   timestamptz,
  version_de   uuid,
  remplace_par uuid,
  remplace_le  timestamptz not null default now(),
  operation    text not null
);
create index if not exists historique_fiche on public.fiches_historique (fiche_id, remplace_le desc);

-- ---------- Qui suis-je ? ----------
create or replace function prive.mon_pole() returns text
language sql stable security definer set search_path = '' as $$
  select pole from public.profiles where id = auth.uid() and actif
$$;

create or replace function prive.est_responsable() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select role = 'responsable' and actif from public.profiles where id = auth.uid()), false)
$$;

-- ---------- Inscription : uniquement sur invitation ----------
-- Il faut l'email invité ET le code secret du lien, et l'invitation doit avoir moins de 7 jours.
-- Tant qu'aucun compte n'existe (première installation), la première inscription est libre.
create or replace function prive.controle_inscription() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  inv public.invitations;
begin
  if not exists (select 1 from public.profiles) then return new; end if;
  select * into inv from public.invitations where email = lower(new.email);
  if inv.email is null
     or inv.created_at < now() - interval '7 days'
     or inv.code is distinct from (new.raw_user_meta_data ->> 'code') then
    raise exception 'inscription_refusee';
  end if;
  -- Le code ne sert qu'une fois : il n'est pas gardé dans le compte
  new.raw_user_meta_data := coalesce(new.raw_user_meta_data, '{}'::jsonb) - 'code';
  return new;
end $$;

-- Invitation : code, date et auteur fixés par le serveur
create or replace function prive.garde_invitations() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.code       := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  new.created_at := now();
  new.invite_par := auth.uid();
  return new;
end $$;

drop trigger if exists garde_invitations on public.invitations;
create trigger garde_invitations before insert on public.invitations
  for each row execute function prive.garde_invitations();

create or replace function prive.nouveau_compte() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  inv public.invitations;
begin
  select * into inv from public.invitations where email = lower(new.email);
  insert into public.profiles (id, email, nom, pole, role)
  values (new.id, new.email, left(coalesce(new.raw_user_meta_data ->> 'nom', ''), 80), inv.pole, coalesce(inv.role, 'agent'))
  on conflict (id) do nothing;
  delete from public.invitations where email = lower(new.email);
  return new;
end $$;

drop trigger if exists controle_inscription on auth.users;
create trigger controle_inscription
  before insert on auth.users
  for each row execute function prive.controle_inscription();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function prive.nouveau_compte();

-- ---------- Garde-fous sur les profils ----------
-- Un agent peut changer son nom et sa signature, pas son pôle, son rôle ni son statut.
-- (auth.uid() est vide dans le SQL Editor : l'administrateur garde la main.)
create or replace function prive.garde_profils() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null and not prive.est_responsable() then
    new.pole  := old.pole;
    new.role  := old.role;
    new.actif := old.actif;
  end if;
  new.email      := old.email;
  new.id         := old.id;
  new.created_at := old.created_at;
  return new;
end $$;

drop trigger if exists garde_profils on public.profiles;
create trigger garde_profils before update on public.profiles
  for each row execute function prive.garde_profils();

-- ---------- Garde-fous sur les fiches ----------
-- Auteur, dates, identifiant et type sont fixés par le serveur. Un agent ne peut pas
-- déplacer une fiche dans l'autre pôle, ni supprimer ou restaurer celle d'un collègue.
create or replace function prive.garde_fiches() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  nb int;
begin
  -- 600 écritures par tranche de 10 minutes et par agent : large pour un import ou un envoi groupé,
  -- mais bloque un compte piraté qui écrirait en boucle.
  if auth.uid() is not null then
    insert into prive.quota as q (uid, fenetre, n)
    values (auth.uid(), date_bin('10 minutes', now(), timestamptz '2000-01-01'), 1)
    on conflict (uid, fenetre) do update set n = q.n + 1
    returning n into nb;
    if nb > 600 then
      raise exception 'quota_depasse: trop de modifications en peu de temps';
    end if;
  end if;

  if tg_op = 'INSERT' then
    new.owner      := coalesce(auth.uid(), new.owner);
    new.updated_by := auth.uid();
    new.created_at := now();
    new.updated_at := now();
    return new;
  end if;

  new.id         := old.id;
  new.kind       := old.kind;
  new.owner      := old.owner;
  new.created_at := old.created_at;
  new.updated_at := now();
  new.updated_by := auth.uid();

  if auth.uid() is not null and not prive.est_responsable() then
    new.pole := old.pole;
    if new.deleted <> old.deleted and old.owner is distinct from auth.uid() then
      raise exception 'Seul un responsable ou l''auteur de la fiche peut la supprimer ou la restaurer';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists garde_fiches on public.fiches;
create trigger garde_fiches before insert or update on public.fiches
  for each row execute function prive.garde_fiches();

create or replace function prive.historise_fiche() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- La purge automatique (sans utilisateur) ne recopie pas ce qu'elle efface
  if auth.uid() is null and tg_op = 'DELETE' then return null; end if;
  if tg_op = 'UPDATE' and new.data is not distinct from old.data and new.deleted = old.deleted then return null; end if;
  insert into public.fiches_historique (fiche_id, pole, kind, data, deleted, version_du, version_de, remplace_par, operation)
  values (old.id, old.pole, old.kind, old.data, old.deleted, old.updated_at, old.updated_by, auth.uid(), lower(tg_op));
  return null;
end $$;

drop trigger if exists historise_fiche on public.fiches;
create trigger historise_fiche after update or delete on public.fiches
  for each row execute function prive.historise_fiche();

-- ---------- Sécurité ligne par ligne ----------
alter table public.profiles          enable row level security;
alter table public.invitations       enable row level security;
alter table public.fiches            enable row level security;
alter table public.fiches_historique enable row level security;

drop policy if exists "profils : soi-même et l'équipe" on public.profiles;
create policy "profils : soi-même et l'équipe" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or prive.mon_pole() is not null);

drop policy if exists "profils : modifier le sien, ou responsable" on public.profiles;
create policy "profils : modifier le sien, ou responsable" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or prive.est_responsable())
  with check (id = (select auth.uid()) or prive.est_responsable());

drop policy if exists "invitations : responsables" on public.invitations;
create policy "invitations : responsables" on public.invitations
  for all to authenticated
  using (prive.est_responsable())
  with check (prive.est_responsable());

drop policy if exists "fiches : lire son pôle" on public.fiches;
create policy "fiches : lire son pôle" on public.fiches
  for select to authenticated
  using (prive.est_responsable() or pole = prive.mon_pole());

drop policy if exists "fiches : créer dans son pôle" on public.fiches;
create policy "fiches : créer dans son pôle" on public.fiches
  for insert to authenticated
  with check (prive.est_responsable() or pole = prive.mon_pole());

drop policy if exists "fiches : modifier dans son pôle" on public.fiches;
create policy "fiches : modifier dans son pôle" on public.fiches
  for update to authenticated
  using (prive.est_responsable() or pole = prive.mon_pole())
  with check (prive.est_responsable() or pole = prive.mon_pole());

drop policy if exists "fiches : effacer définitivement (responsable)" on public.fiches;
create policy "fiches : effacer définitivement (responsable)" on public.fiches
  for delete to authenticated
  using (prive.est_responsable());

drop policy if exists "historique : responsables" on public.fiches_historique;
create policy "historique : responsables" on public.fiches_historique
  for select to authenticated
  using (prive.est_responsable());

-- ---------- Anciennes fonctions de la version 1 (exposées dans l'API) ----------
drop function if exists public.mon_pole();
drop function if exists public.est_responsable();
drop function if exists public.nouveau_compte();
drop function if exists public.garde_profils();
drop function if exists public.garde_fiches();

-- ---------- Droits d'accès à l'API ----------
-- Les visiteurs non connectés (anon) n'ont accès à rien. Les agents connectés n'ont que le strict nécessaire.
revoke all on public.profiles, public.invitations, public.fiches, public.fiches_historique from anon, authenticated;
grant usage on schema public to authenticated;
grant select on public.profiles to authenticated;
grant update (nom, signature, pole, role, actif) on public.profiles to authenticated;
grant select, insert, delete on public.invitations to authenticated;
grant select, insert, update, delete on public.fiches to authenticated;
grant select on public.fiches_historique to authenticated;
revoke execute on all functions in schema prive from public, anon;
grant execute on function prive.mon_pole(), prive.est_responsable() to authenticated;
-- Toute future fonction du schéma public ne sera pas appelable par défaut
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
-- Fonction ajoutée par Supabase (RLS automatique sur les nouvelles tables) : réservée à la base, pas à l'API
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end $$;

-- ---------- Temps réel ----------
do $$
begin
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'fiches') then
    alter publication supabase_realtime add table public.fiches;
  end if;
end $$;

-- ---------- Réduction de la surface d'attaque ----------
-- L'API GraphQL n'est pas utilisée par l'app : on la retire.
do $$
begin
  drop extension if exists pg_graphql;
exception when others then raise notice 'pg_graphql non retiré : %', sqlerrm;
end $$;

-- ---------- Purge automatique (RGPD) ----------
-- Chaque nuit : fiches supprimées depuis plus de 30 jours, versions de plus de 60 jours.
do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule('carnet-purge', '30 3 * * *', $purge$
    delete from public.fiches where deleted and updated_at < now() - interval '30 days';
    delete from public.fiches_historique where remplace_le < now() - interval '60 days';
    delete from public.invitations where created_at < now() - interval '30 days';
    delete from prive.quota where fenetre < now() - interval '1 day';
  $purge$);
exception when others then raise notice 'Purge automatique non installée (pg_cron indisponible) : %', sqlerrm;
end $$;

-- =====================================================================
-- Première installation uniquement : après la création du premier compte dans l'app,
-- le passer responsable :
--
--   update public.profiles set pole = 'vente', role = 'responsable'
--     where lower(email) = lower('email-du-responsable@…');
--
-- Ensuite, les responsables invitent les agents depuis l'app (Réglages → Équipe).
-- =====================================================================

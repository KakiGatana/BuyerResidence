-- =====================================================================
-- Carnet : base de données de l'agence
-- À coller dans Supabase → SQL Editor → New query → Run.
-- Peut être relancé sans risque (ne supprime aucune donnée).
-- =====================================================================

-- ---------- Comptes des agents ----------
-- Un profil est créé automatiquement à l'inscription, sans pôle :
-- tant qu'un responsable ne lui a pas donné un pôle, le compte ne voit rien.
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

-- ---------- Toutes les fiches ----------
-- Une ligne par fiche (acquéreur, vendeur, mandat, annonce de pige, candidat,
-- bien à louer, modèle de message, réglages du pôle). Le contenu est en JSON.
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

-- ---------- Qui suis-je ? ----------
-- SECURITY DEFINER : lit le profil sans repasser par ses propres règles de sécurité.
create or replace function public.mon_pole() returns text
language sql stable security definer set search_path = public as $$
  select pole from profiles where id = auth.uid() and actif
$$;

create or replace function public.est_responsable() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'responsable' and actif from profiles where id = auth.uid()), false)
$$;

-- ---------- Création automatique du profil ----------
create or replace function public.nouveau_compte() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, nom)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'nom', ''))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.nouveau_compte();

-- ---------- Garde-fous sur les profils ----------
-- Un agent peut changer son nom et sa signature, pas son pôle, son rôle ni son statut.
-- (auth.uid() est vide dans le SQL Editor : l'administrateur garde la main.)
create or replace function public.garde_profils() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not est_responsable() then
    new.pole  := old.pole;
    new.role  := old.role;
    new.actif := old.actif;
  end if;
  new.email := old.email;
  new.id    := old.id;
  return new;
end $$;

drop trigger if exists garde_profils on public.profiles;
create trigger garde_profils before update on public.profiles
  for each row execute function public.garde_profils();

-- ---------- Garde-fous sur les fiches ----------
-- L'auteur et les dates sont fixés par le serveur. Un agent ne peut pas
-- déplacer une fiche dans l'autre pôle, ni supprimer la fiche d'un collègue.
create or replace function public.garde_fiches() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.owner      := coalesce(auth.uid(), new.owner);
    new.updated_by := auth.uid();
    new.created_at := now();
    new.updated_at := now();
    return new;
  end if;

  new.owner      := old.owner;
  new.created_at := old.created_at;
  new.updated_at := now();
  new.updated_by := auth.uid();

  if auth.uid() is not null and not est_responsable() then
    new.pole := old.pole;
    if new.deleted <> old.deleted and old.owner is distinct from auth.uid() then
      raise exception 'Seul un responsable ou l''auteur de la fiche peut la supprimer ou la restaurer';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists garde_fiches on public.fiches;
create trigger garde_fiches before insert or update on public.fiches
  for each row execute function public.garde_fiches();

-- ---------- Sécurité ligne par ligne ----------
alter table public.profiles enable row level security;
alter table public.fiches   enable row level security;

drop policy if exists "profils : soi-même et l'équipe" on public.profiles;
create policy "profils : soi-même et l'équipe" on public.profiles
  for select to authenticated
  using (id = auth.uid() or mon_pole() is not null);

drop policy if exists "profils : modifier le sien, ou responsable" on public.profiles;
create policy "profils : modifier le sien, ou responsable" on public.profiles
  for update to authenticated
  using (id = auth.uid() or est_responsable())
  with check (id = auth.uid() or est_responsable());

drop policy if exists "fiches : lire son pôle" on public.fiches;
create policy "fiches : lire son pôle" on public.fiches
  for select to authenticated
  using (est_responsable() or pole = mon_pole());

drop policy if exists "fiches : créer dans son pôle" on public.fiches;
create policy "fiches : créer dans son pôle" on public.fiches
  for insert to authenticated
  with check (est_responsable() or pole = mon_pole());

drop policy if exists "fiches : modifier dans son pôle" on public.fiches;
create policy "fiches : modifier dans son pôle" on public.fiches
  for update to authenticated
  using (est_responsable() or pole = mon_pole())
  with check (est_responsable() or pole = mon_pole());

drop policy if exists "fiches : effacer définitivement (responsable)" on public.fiches;
create policy "fiches : effacer définitivement (responsable)" on public.fiches
  for delete to authenticated
  using (est_responsable());

-- ---------- Droits d'accès à l'API ----------
-- « Automatically expose new tables » est désactivé : on ouvre explicitement.
revoke all on public.profiles, public.fiches from anon;
grant usage on schema public to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.fiches to authenticated;
grant execute on function public.mon_pole(), public.est_responsable() to authenticated;

-- ---------- Temps réel ----------
-- Les modifications d'un collègue apparaissent sans recharger l'app.
do $$
begin
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'fiches') then
    alter publication supabase_realtime add table public.fiches;
  end if;
end $$;

-- =====================================================================
-- APRÈS que chacun s'est inscrit dans l'app, donner les pôles et rôles :
--
--   update public.profiles set pole = 'vente', role = 'responsable'
--     where email in ('email-du-responsable@…', 'email-de-la-responsable@…');
--
-- Ensuite, les responsables attribuent eux-mêmes les pôles depuis
-- l'app (Réglages → Équipe), plus besoin de revenir ici.
-- =====================================================================

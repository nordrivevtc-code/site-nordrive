-- ════════════════════════════════════════════════════════════════════════════
-- PHASE 1 : schéma sécurisé (tables typées, rôles, RLS avec MFA, IBAN chiffrés, audit)
--
-- Principes
--  * `anon` n'a AUCUN droit. Les formulaires publics passent par des Edge Functions (service_role).
--  * `authenticated` n'accède qu'à ce que son rôle (profiles.role) autorise, ET seulement avec une
--    session MFA (jwt.aal = 'aal2') : l'authentification forte est imposée par la base, pas par le navigateur.
--  * Les IBAN sont chiffrés (pgcrypto) avec une clé stockée dans Vault ; lecture/écriture uniquement par RPC journalisée.
--  * Le journal d'audit est en ajout seul (impossible à modifier ou supprimer).
--
-- Avant de l'exécuter (une seule fois) : créer la clé de chiffrement des IBAN
--   select vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'iban_encryption_key');
-- Les anciennes tables (drivers, payroll_weeks, fleet_settings) sont renommées legacy_* et restent verrouillées :
-- leurs données seront importées en phase 2.
-- ════════════════════════════════════════════════════════════════════════════

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;

-- 0) Mettre de côté les anciennes tables (sans les supprimer)
do $$
declare t text;
begin
  foreach t in array array['drivers', 'payroll_weeks', 'fleet_settings'] loop
    if to_regclass('public.' || t) is not null and to_regclass('public.legacy_' || t) is null then
      execute format('alter table public.%I rename to %I', t, 'legacy_' || t);
    end if;
  end loop;
end $$;

-- 1) Types
create type public.app_role as enum ('owner', 'manager', 'advisor', 'accountant');
create type public.application_status as enum ('new', 'needs_info', 'approved', 'rejected');
create type public.driver_status as enum ('prospect', 'contacted', 'docs_pending', 'docs_received', 'enrolled', 'active', 'inactive');
create type public.doc_type as enum (
  'vtc_card_front', 'vtc_card_back', 'driving_license', 'id_photo', 'rc_circulation',
  'vehicle_registration', 'insurance_memo', 'insurance_statement', 'signature'
);
create type public.message_kind as enum ('contact', 'referral', 'insurance');

-- 2) Tables
create table public.profiles (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  role       public.app_role not null,
  full_name  text not null check (char_length(full_name) between 1 and 120),
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- Candidatures reçues par le site public (écrites uniquement par l'Edge Function submit-application)
create table public.applications (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  status           public.application_status not null default 'new',
  first_name       text not null check (char_length(first_name) between 1 and 100),
  last_name        text not null check (char_length(last_name) between 1 and 100),
  phone            text not null check (char_length(phone) between 6 and 30),
  email            text check (email is null or (char_length(email) <= 254 and email like '%_@_%._%')),
  city             text not null check (char_length(city) between 1 and 100),
  vtc_card_status  text not null check (vtc_card_status in ('oui', 'encours', 'non')),
  has_vehicle      boolean not null default true,
  vehicle_model    text check (char_length(vehicle_model) <= 100),
  vehicle_plate    text check (char_length(vehicle_plate) <= 20),
  platforms        text[] not null default '{}',
  notes            text check (char_length(notes) <= 2000),
  source           text check (char_length(source) <= 60),
  source_detail    text check (char_length(source_detail) <= 120),
  consent_rgpd     boolean not null check (consent_rgpd),
  consent_at       timestamptz not null default now(),
  upload_token_hash text,                 -- empreinte du jeton qui autorise le dépôt de documents
  upload_expires_at timestamptz
);

-- Messages des autres formulaires (contact, parrainage, devis assurance)
create table public.inbound_messages (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  kind       public.message_kind not null,
  handled    boolean not null default false,
  payload    jsonb not null check (pg_column_size(payload) <= 8192)
);

create table public.drivers (
  id                uuid primary key default gen_random_uuid(),
  application_id    uuid references public.applications (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  status            public.driver_status not null default 'prospect',
  first_name        text not null check (char_length(first_name) between 1 and 100),
  last_name         text not null check (char_length(last_name) between 1 and 100),
  phone             text not null,
  email             text,
  city              text,
  vtc_card_number   text,
  vtc_card_expiry   date,
  company_name      text,
  siren             text check (siren is null or siren ~ '^[0-9 ]{9,14}$'),
  vehicle_model     text,
  vehicle_plate     text,
  platforms         text[] not null default '{}',
  fixed_weekly_fee  numeric(8, 2) not null default 50 check (fixed_weekly_fee >= 0),
  notes             text,
  source            text,
  source_detail     text
);

create table public.driver_documents (
  id             uuid primary key default gen_random_uuid(),
  driver_id      uuid references public.drivers (id) on delete cascade,
  application_id uuid references public.applications (id) on delete cascade,
  doc_type       public.doc_type not null,
  storage_path   text not null unique,
  mime_type      text not null check (mime_type in ('application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/webp')),
  size_bytes     integer not null check (size_bytes between 1 and 10485760),
  status         text not null default 'pending' check (status in ('pending', 'valid', 'rejected', 'expired')),
  expires_on     date,
  created_at     timestamptz not null default now(),
  check (driver_id is not null or application_id is not null)
);

-- IBAN : jamais en clair, jamais lisible directement (voir RPC set_driver_iban / get_driver_iban)
create table public.driver_banking (
  driver_id  uuid primary key references public.drivers (id) on delete cascade,
  iban_enc   bytea not null,
  bic        text check (bic is null or bic ~ '^[A-Z0-9]{8,11}$'),
  updated_at timestamptz not null default now()
);

create table public.platform_enrollments (
  driver_id uuid not null references public.drivers (id) on delete cascade,
  platform  text not null check (platform in ('uber', 'bolt')),
  sent_at   timestamptz not null default now(),
  link      text check (link is null or link ~ '^https://'),
  primary key (driver_id, platform)
);

create table public.activities (
  id         uuid primary key default gen_random_uuid(),
  driver_id  uuid not null references public.drivers (id) on delete cascade,
  kind       text not null check (kind in ('appel', 'email', 'whatsapp', 'note', 'statut_change', 'document_recu', 'inscription')),
  content    text not null check (char_length(content) <= 4000),
  author     uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.payroll_weeks (
  id         uuid primary key default gen_random_uuid(),
  driver_id  uuid not null references public.drivers (id) on delete cascade,
  year       smallint not null check (year between 2020 and 2100),
  week       smallint not null check (week between 1 and 53),
  gross      numeric(10, 2) not null default 0,
  fees       numeric(10, 2) not null default 0,
  net        numeric(10, 2) not null default 0,
  status     text not null default 'a_payer' check (status in ('a_payer', 'paye', 'bloque')),
  created_at timestamptz not null default now(),
  unique (driver_id, year, week)
);

create table public.fleet_settings (
  id   boolean primary key default true check (id),   -- une seule ligne
  data jsonb not null default '{}'
);
insert into public.fleet_settings (id) values (true);

create table public.audit_log (
  id         bigint generated always as identity primary key,
  at         timestamptz not null default now(),
  actor      uuid,
  actor_role text,
  action     text not null,
  table_name text,
  row_id     text,
  details    jsonb not null default '{}'
);

-- Limitation de débit des Edge Functions publiques (écrite uniquement par service_role)
create table public.rate_limits (
  key          text not null,
  window_start timestamptz not null,
  hits         integer not null default 1,
  primary key (key, window_start)
);

create index on public.applications (created_at desc);
create index on public.applications (status);
create index on public.drivers (status);
create index on public.driver_documents (driver_id);
create index on public.driver_documents (application_id);
create index on public.activities (driver_id, created_at desc);
create index on public.audit_log (at desc);

-- 3) Fonctions d'aide aux règles d'accès (schéma private : non exposé par l'API)
create or replace function private.current_app_role()
returns public.app_role language sql stable security definer set search_path = '' as $$
  select p.role from public.profiles p where p.user_id = auth.uid() and p.active
$$;

create or replace function private.is_aal2()
returns boolean language sql stable set search_path = '' as $$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
$$;

-- Vrai seulement si : session MFA (aal2) + profil actif + rôle dans la liste
create or replace function private.has_role(variadic roles public.app_role[])
returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_aal2() and coalesce(private.current_app_role() = any (roles), false)
$$;

grant usage on schema private to authenticated, service_role;
grant execute on all functions in schema private to authenticated, service_role;

-- 4) Journal d'audit : ajout seul + déclencheur générique (aucune donnée personnelle dans le détail)
create or replace function private.audit_log_immutable()
returns trigger language plpgsql as $$
begin
  raise exception 'audit_log est en ajout seul (modification et suppression interdites)';
end $$;

create trigger audit_log_no_update before update or delete on public.audit_log
  for each row execute function private.audit_log_immutable();

create or replace function private.audit_row()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_row     jsonb;
  v_old     jsonb;
  v_changed text[] := '{}';
  v_id      text;
begin
  if tg_op = 'DELETE' then v_row := to_jsonb(old); else v_row := to_jsonb(new); end if;
  v_id := coalesce(v_row ->> 'id', v_row ->> 'user_id', v_row ->> 'driver_id');
  if tg_op = 'UPDATE' then
    v_old := to_jsonb(old);
    select coalesce(array_agg(e.k order by e.k), '{}') into v_changed
      from jsonb_each(v_row) as e(k, v) where v_old -> e.k is distinct from e.v;
  end if;
  insert into public.audit_log (actor, actor_role, action, table_name, row_id, details)
  values (auth.uid(), private.current_app_role()::text, tg_op, tg_table_name, v_id,
          jsonb_build_object('changed_columns', v_changed));
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['profiles', 'applications', 'inbound_messages', 'drivers', 'driver_documents',
                           'platform_enrollments', 'payroll_weeks', 'fleet_settings'] loop
    execute format('create trigger audit_%1$s after insert or update or delete on public.%1$I
                    for each row execute function private.audit_row()', t);
  end loop;
end $$;

create or replace function private.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
create trigger drivers_touch before update on public.drivers for each row execute function private.touch_updated_at();

-- 5) Droits et règles d'accès (RLS)
alter table public.profiles            enable row level security;
alter table public.applications        enable row level security;
alter table public.inbound_messages    enable row level security;
alter table public.drivers             enable row level security;
alter table public.driver_documents    enable row level security;
alter table public.driver_banking      enable row level security;
alter table public.platform_enrollments enable row level security;
alter table public.activities          enable row level security;
alter table public.payroll_weeks       enable row level security;
alter table public.fleet_settings      enable row level security;
alter table public.audit_log           enable row level security;
alter table public.rate_limits         enable row level security;

revoke all on all tables in schema public from anon, authenticated;
grant all on all tables in schema public to service_role;
grant usage on schema public to authenticated, service_role;

grant select, insert, update, delete on public.profiles, public.applications, public.inbound_messages,
  public.drivers, public.driver_documents, public.platform_enrollments, public.activities,
  public.payroll_weeks, public.fleet_settings to authenticated;
grant select on public.audit_log to authenticated;
-- driver_banking et rate_limits : aucun droit pour authenticated (accès par RPC / service_role seulement)

-- profiles
create policy profiles_self on public.profiles for select to authenticated
  using (user_id = (select auth.uid()) and private.is_aal2());
create policy profiles_owner on public.profiles for all to authenticated
  using (private.has_role('owner')) with check (private.has_role('owner'));

-- applications et messages : propriétaire, responsable, conseiller
create policy applications_staff on public.applications for select to authenticated
  using (private.has_role('owner', 'manager', 'advisor'));
create policy applications_staff_update on public.applications for update to authenticated
  using (private.has_role('owner', 'manager', 'advisor')) with check (private.has_role('owner', 'manager', 'advisor'));
create policy applications_owner_delete on public.applications for delete to authenticated
  using (private.has_role('owner'));

create policy messages_staff on public.inbound_messages for select to authenticated
  using (private.has_role('owner', 'manager', 'advisor'));
create policy messages_staff_update on public.inbound_messages for update to authenticated
  using (private.has_role('owner', 'manager', 'advisor')) with check (private.has_role('owner', 'manager', 'advisor'));

-- chauffeurs
create policy drivers_staff on public.drivers for select to authenticated
  using (private.has_role('owner', 'manager', 'advisor'));
create policy drivers_staff_write on public.drivers for insert to authenticated
  with check (private.has_role('owner', 'manager', 'advisor'));
create policy drivers_staff_update on public.drivers for update to authenticated
  using (private.has_role('owner', 'manager', 'advisor')) with check (private.has_role('owner', 'manager', 'advisor'));
create policy drivers_owner_delete on public.drivers for delete to authenticated
  using (private.has_role('owner'));

-- documents d'identité : métadonnées visibles du personnel ; le fichier lui-même n'est servi que par l'Edge Function document-url (RPC journalisée)
create policy documents_staff on public.driver_documents for select to authenticated
  using (private.has_role('owner', 'manager', 'advisor'));
create policy documents_staff_update on public.driver_documents for update to authenticated
  using (private.has_role('owner', 'manager', 'advisor')) with check (private.has_role('owner', 'manager', 'advisor'));
create policy documents_manager_delete on public.driver_documents for delete to authenticated
  using (private.has_role('owner', 'manager'));

-- rattachements et historique
create policy enrollments_staff on public.platform_enrollments for all to authenticated
  using (private.has_role('owner', 'manager', 'advisor')) with check (private.has_role('owner', 'manager', 'advisor'));
create policy activities_staff_read on public.activities for select to authenticated
  using (private.has_role('owner', 'manager', 'advisor'));
create policy activities_staff_insert on public.activities for insert to authenticated
  with check (private.has_role('owner', 'manager', 'advisor') and author = (select auth.uid()));

-- paie : propriétaire et comptable (le responsable peut lire)
create policy payroll_read on public.payroll_weeks for select to authenticated
  using (private.has_role('owner', 'manager', 'accountant'));
create policy payroll_write on public.payroll_weeks for all to authenticated
  using (private.has_role('owner', 'accountant')) with check (private.has_role('owner', 'accountant'));

-- réglages
create policy settings_read on public.fleet_settings for select to authenticated
  using (private.has_role('owner', 'manager', 'accountant'));
create policy settings_owner on public.fleet_settings for update to authenticated
  using (private.has_role('owner')) with check (private.has_role('owner'));

-- audit : lisible par le propriétaire seulement
create policy audit_owner on public.audit_log for select to authenticated
  using (private.has_role('owner'));

-- 6) Vue minimale pour le comptable : nom des chauffeurs, rien d'autre
create view public.driver_directory with (security_invoker = false) as
  select d.id, d.first_name, d.last_name
  from public.drivers d
  where private.has_role('owner', 'manager', 'advisor', 'accountant');
revoke all on public.driver_directory from anon, authenticated;
grant select on public.driver_directory to authenticated;

-- 7) RPC (appelées par l'application d'administration)
create or replace function private.iban_key()
returns text language plpgsql security definer set search_path = '' as $$
declare k text;
begin
  select ds.decrypted_secret into k from vault.decrypted_secrets ds where ds.name = 'iban_encryption_key';
  if k is null then raise exception 'clé de chiffrement des IBAN absente (Vault : iban_encryption_key)'; end if;
  return k;
end $$;

create or replace function public.set_driver_iban(p_driver uuid, p_iban text, p_bic text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_iban text := upper(regexp_replace(coalesce(p_iban, ''), '\s', '', 'g'));
begin
  if not private.has_role('owner', 'accountant') then raise exception 'accès refusé'; end if;
  if v_iban !~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$' then raise exception 'IBAN invalide'; end if;
  insert into public.driver_banking (driver_id, iban_enc, bic)
  values (p_driver, extensions.pgp_sym_encrypt(v_iban, private.iban_key()), nullif(upper(p_bic), ''))
  on conflict (driver_id) do update
    set iban_enc = excluded.iban_enc, bic = excluded.bic, updated_at = now();
  insert into public.audit_log (actor, actor_role, action, table_name, row_id)
  values (auth.uid(), private.current_app_role()::text, 'SET_IBAN', 'driver_banking', p_driver::text);
end $$;

create or replace function public.get_driver_iban(p_driver uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare v_enc bytea;
begin
  if not private.has_role('owner', 'accountant') then raise exception 'accès refusé'; end if;
  select iban_enc into v_enc from public.driver_banking where driver_id = p_driver;
  insert into public.audit_log (actor, actor_role, action, table_name, row_id)
  values (auth.uid(), private.current_app_role()::text, 'READ_IBAN', 'driver_banking', p_driver::text);
  if v_enc is null then return null; end if;
  return extensions.pgp_sym_decrypt(v_enc, private.iban_key());
end $$;

-- Transforme une candidature en chauffeur (reprend les documents déjà déposés)
create or replace function public.promote_application(p_application uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare a public.applications%rowtype; v_driver uuid;
begin
  if not private.has_role('owner', 'manager', 'advisor') then raise exception 'accès refusé'; end if;
  select * into a from public.applications where id = p_application for update;
  if not found then raise exception 'candidature introuvable'; end if;
  if a.status = 'approved' then raise exception 'candidature déjà traitée'; end if;
  insert into public.drivers (application_id, first_name, last_name, phone, email, city, vehicle_model, vehicle_plate,
                              platforms, notes, source, source_detail, status)
  values (a.id, a.first_name, a.last_name, a.phone, a.email, a.city, a.vehicle_model, a.vehicle_plate,
          a.platforms, a.notes, a.source, a.source_detail,
          case when exists (select 1 from public.driver_documents where application_id = a.id) then 'docs_received'::public.driver_status
               else 'prospect'::public.driver_status end)
  returning id into v_driver;
  update public.driver_documents set driver_id = v_driver where application_id = a.id;
  update public.applications set status = 'approved' where id = a.id;
  insert into public.activities (driver_id, kind, content, author)
  values (v_driver, 'inscription', 'Candidature approuvée et transformée en chauffeur.', auth.uid());
  return v_driver;
end $$;

-- Accès à un document : vérifie le rôle (+MFA), journalise, renvoie le chemin ; l'Edge Function document-url signe l'URL (60 s)
create or replace function public.request_document_access(p_document uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare v_path text;
begin
  if not private.has_role('owner', 'manager', 'advisor') then raise exception 'accès refusé'; end if;
  select storage_path into v_path from public.driver_documents where id = p_document;
  if v_path is null then raise exception 'document introuvable'; end if;
  insert into public.audit_log (actor, actor_role, action, table_name, row_id)
  values (auth.uid(), private.current_app_role()::text, 'VIEW_DOCUMENT', 'driver_documents', p_document::text);
  return v_path;
end $$;

-- Profil de l'utilisateur connecté (rôle + nom) pour l'interface
create or replace function public.my_profile()
returns table (role public.app_role, full_name text) language sql stable security definer set search_path = '' as $$
  select p.role, p.full_name from public.profiles p where p.user_id = auth.uid() and p.active and private.is_aal2()
$$;

revoke all on function public.set_driver_iban(uuid, text, text), public.get_driver_iban(uuid),
  public.promote_application(uuid), public.request_document_access(uuid), public.my_profile() from public, anon;
grant execute on function public.set_driver_iban(uuid, text, text), public.get_driver_iban(uuid),
  public.promote_application(uuid), public.request_document_access(uuid), public.my_profile() to authenticated;

-- 8) Stockage privé des documents (aucune policy : seul service_role y accède, via les Edge Functions)
do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('driver-documents', 'driver-documents', false, 10485760,
            array['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/webp'])
    on conflict (id) do update set public = false;
  end if;
end $$;

-- 9) Aucun droit par défaut pour les futures tables / fonctions
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon;

-- 10) Limitation de débit des Edge Functions publiques : compteur atomique par clé et par fenêtre (service_role seulement)
create or replace function public.rate_limit_hit(p_key text, p_window_seconds integer)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_start timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits  integer;
begin
  if p_window_seconds < 1 or char_length(p_key) > 200 then raise exception 'paramètres invalides'; end if;
  insert into public.rate_limits (key, window_start, hits) values (p_key, v_start, 1)
  on conflict (key, window_start) do update set hits = public.rate_limits.hits + 1
  returning hits into v_hits;
  if random() < 0.02 then
    delete from public.rate_limits where window_start < now() - interval '2 days';
  end if;
  return v_hits;
end $$;
revoke all on function public.rate_limit_hit(text, integer) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, integer) to service_role;
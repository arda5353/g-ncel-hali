-- HayatNFC production starter schema (Supabase / PostgreSQL)
-- IMPORTANT: Review with a qualified developer before handling real health data.
-- Create a private project. Never put the service_role key in browser code.
create extension if not exists pgcrypto;

create table if not exists public.participant_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  birth_year integer,
  blood_type text not null default 'Bilinmiyor',
  allergies text,
  medications text,
  health_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Store a SHA-256 hash of each random tag token, not the raw token.
create table if not exists public.nfc_tags (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid unique references public.participant_profiles(id) on delete cascade,
  token_hash text unique not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Roles are provisioned by an administrator only. Do not allow users to self-assign a role.
create table if not exists public.staff_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('responder','admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.access_audit (
  id bigint generated always as identity primary key,
  staff_user_id uuid references auth.users(id),
  participant_id uuid references public.participant_profiles(id),
  action text not null check (action in ('view_profile','update_profile')),
  accessed_at timestamptz not null default now()
);

alter table public.participant_profiles enable row level security;
alter table public.nfc_tags enable row level security;
alter table public.staff_roles enable row level security;
alter table public.access_audit enable row level security;

-- A participant can read/update only their own profile. Responder role can read profiles.
create policy "participant reads own profile" on public.participant_profiles
  for select to authenticated using (auth.uid() = id);
create policy "participant inserts own profile" on public.participant_profiles
  for insert to authenticated with check (auth.uid() = id);
create policy "participant updates own profile" on public.participant_profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "authorized responders read profiles" on public.participant_profiles
  for select to authenticated using (
    exists (select 1 from public.staff_roles sr where sr.user_id = auth.uid() and sr.role in ('responder','admin'))
  );
-- Only owner or authorized staff may read tag records; token resolution should be done by a server-side function.
create policy "participant reads own tag" on public.nfc_tags
  for select to authenticated using (participant_id = auth.uid());
create policy "authorized staff reads tags" on public.nfc_tags
  for select to authenticated using (
    exists (select 1 from public.staff_roles sr where sr.user_id = auth.uid() and sr.role in ('responder','admin'))
  );
create policy "users can read own role" on public.staff_roles
  for select to authenticated using (user_id = auth.uid());
create policy "staff can write audit rows" on public.access_audit
  for insert to authenticated with check (
    exists (select 1 from public.staff_roles sr where sr.user_id = auth.uid() and sr.role in ('responder','admin'))
  );
create policy "staff can read audit rows" on public.access_audit
  for select to authenticated using (
    exists (select 1 from public.staff_roles sr where sr.user_id = auth.uid() and sr.role = 'admin')
  );

-- Intentionally absent: public access to health profiles, public tag lookup, self-service role assignment.
-- Production must add a carefully reviewed server-side tag-token resolution flow, account recovery,
-- guardian consent process, rate limiting, audit logging, data retention/deletion, and legal review.

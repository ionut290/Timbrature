create extension if not exists pgcrypto;

create table if not exists public.timbrature_drive_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'google',
  email text not null,
  drive_folder_id text,
  drive_folder_name text not null default 'Timbrature',
  access_token_encrypted text,
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  scope text,
  backup_enabled boolean not null default false,
  last_sync_at timestamptz,
  last_sync_status text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

create index if not exists timbrature_drive_connections_user_idx
  on public.timbrature_drive_connections(user_id);

create index if not exists timbrature_drive_connections_enabled_idx
  on public.timbrature_drive_connections(backup_enabled)
  where backup_enabled = true;

alter table public.timbrature_drive_connections enable row level security;

drop policy if exists "read own drive connection" on public.timbrature_drive_connections;
create policy "read own drive connection"
on public.timbrature_drive_connections
for select
using (auth.uid() = user_id);

drop policy if exists "insert own drive connection" on public.timbrature_drive_connections;
create policy "insert own drive connection"
on public.timbrature_drive_connections
for insert
with check (auth.uid() = user_id);

drop policy if exists "update own drive connection" on public.timbrature_drive_connections;
create policy "update own drive connection"
on public.timbrature_drive_connections
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "delete own drive connection" on public.timbrature_drive_connections;
create policy "delete own drive connection"
on public.timbrature_drive_connections
for delete
using (auth.uid() = user_id);

create table if not exists public.timbrature_drive_backups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  connection_id uuid not null references public.timbrature_drive_connections(id) on delete cascade,
  payload_type text not null default 'timbrature_export_json',
  payload jsonb not null,
  source_updated_at timestamptz,
  drive_file_id text,
  drive_file_name text,
  backup_status text not null default 'queued',
  backup_error text,
  attempt_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists timbrature_drive_backups_user_idx
  on public.timbrature_drive_backups(user_id, created_at desc);

create index if not exists timbrature_drive_backups_status_idx
  on public.timbrature_drive_backups(backup_status, created_at asc);

alter table public.timbrature_drive_backups enable row level security;

drop policy if exists "read own drive backups" on public.timbrature_drive_backups;
create policy "read own drive backups"
on public.timbrature_drive_backups
for select
using (auth.uid() = user_id);

drop policy if exists "insert own drive backups" on public.timbrature_drive_backups;
create policy "insert own drive backups"
on public.timbrature_drive_backups
for insert
with check (auth.uid() = user_id);

drop policy if exists "update own drive backups" on public.timbrature_drive_backups;
create policy "update own drive backups"
on public.timbrature_drive_backups
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "delete own drive backups" on public.timbrature_drive_backups;
create policy "delete own drive backups"
on public.timbrature_drive_backups
for delete
using (auth.uid() = user_id);

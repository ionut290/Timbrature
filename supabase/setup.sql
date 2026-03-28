
create extension if not exists pgcrypto;

create table if not exists public.timbrature_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  nome text,
  data date not null,
  entrata text,
  uscita text,
  pausa integer default 0,
  causale text,
  note text,
  ore numeric,
  ord numeric,
  stra numeric,
  stato text,
  updated_at timestamptz not null default now(),
  unique(user_id, data)
);

alter table public.timbrature_records enable row level security;

drop policy if exists "read own records" on public.timbrature_records;
create policy "read own records" on public.timbrature_records
for select using (auth.uid() = user_id);

drop policy if exists "insert own records" on public.timbrature_records;
create policy "insert own records" on public.timbrature_records
for insert with check (auth.uid() = user_id);

drop policy if exists "update own records" on public.timbrature_records;
create policy "update own records" on public.timbrature_records
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "delete own records" on public.timbrature_records;
create policy "delete own records" on public.timbrature_records
for delete using (auth.uid() = user_id);

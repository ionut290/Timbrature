create table if not exists public.timbrature_week_programs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  monday_hours numeric default 8,
  tuesday_hours numeric default 8,
  wednesday_hours numeric default 8,
  thursday_hours numeric default 8,
  friday_hours numeric default 8,
  saturday_hours numeric default 0,
  sunday_hours numeric default 0,
  saturday_ordinary boolean default false,
  night_recovery_hours numeric default 0,
  break_enabled boolean default true,
  break_minutes integer default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, week_start)
);

alter table public.timbrature_week_programs enable row level security;

drop policy if exists "read own week programs" on public.timbrature_week_programs;
create policy "read own week programs" on public.timbrature_week_programs
for select using (auth.uid() = user_id);

drop policy if exists "insert own week programs" on public.timbrature_week_programs;
create policy "insert own week programs" on public.timbrature_week_programs
for insert with check (auth.uid() = user_id);

drop policy if exists "update own week programs" on public.timbrature_week_programs;
create policy "update own week programs" on public.timbrature_week_programs
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "delete own week programs" on public.timbrature_week_programs;
create policy "delete own week programs" on public.timbrature_week_programs
for delete using (auth.uid() = user_id);

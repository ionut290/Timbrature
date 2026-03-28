# Timbrature Cloud (multi-utente)

Questa versione usa **Supabase** per avere:

- login/registrazione utenti,
- dati separati per ogni account,
- salvataggio in cloud (non più solo browser locale).

## 1) Crea progetto Supabase

1. Vai su [https://supabase.com](https://supabase.com) e crea un nuovo progetto.
2. In **Project Settings → API** copia:
   - `Project URL`
   - `anon public key`
3. Apri `index.html` e imposta i due valori:

```js
const SUPABASE_URL = window.SUPABASE_URL || 'https://xxgstjxgrhkrmeqosoak.supabase.co';
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'sb_publishable_Bjvs0ktNO_fwk9V2W3hW7w_hiln-vII';
```

> Nota: in questa repository sia `SUPABASE_URL` che `SUPABASE_ANON_KEY` sono già valorizzate in `index.html`.

## 2) Crea tabella e policy RLS

Nel SQL Editor di Supabase esegui:

```sql
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

create policy "read own records"
on public.timbrature_records
for select
using (auth.uid() = user_id);

create policy "insert own records"
on public.timbrature_records
for insert
with check (auth.uid() = user_id);

create policy "update own records"
on public.timbrature_records
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "delete own records"
on public.timbrature_records
for delete
using (auth.uid() = user_id);
```

## 3) Avvio

1. Apri `index.html` in locale o pubblica su Netlify.
2. Registrati con email e password.
3. Fai login e inserisci le timbrature.
4. Ogni utente vedrà solo i propri dati nello storico.

## Nota

La cartella `apps-script/` rimane come storico della vecchia versione Google Apps Script.

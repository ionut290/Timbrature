# Timbrature Cloud (multi-utente)

Questa versione usa **Supabase** per avere:

- login/registrazione utenti,
- dati separati per ogni account,
- salvataggio in cloud (non più solo browser locale).

## Possiamo sostituire Supabase con Firebase (o qualcosa di più semplice)?

Sì, ma con livelli di sforzo diversi:

1. **Più semplice (consigliato ora): resta su Supabase**
   - L'app è già pronta, con login, policy RLS e tabelle SQL.
   - Per cambiare progetto cloud rapidamente senza modificare codice puoi usare:
     `?supabase_url=https://TUO-PROGETTO.supabase.co&supabase_key=TUO_ANON_KEY`

2. **Firebase al posto di Supabase: fattibile ma non “plug & play”**
   - Richiede refactor della parte auth (email/password, Google OAuth),
     storage dati (Firestore/Realtime DB) e regole di sicurezza.
   - Le query SQL e le policy RLS attuali non si possono riusare direttamente.

3. **Versione super-semplice senza cloud**
   - Possiamo rimuovere auth e salvare tutto in `localStorage` nel browser.
   - È veloce da implementare, ma i dati restano su un solo dispositivo/browser.

Se vuoi, nel prossimo step possiamo fare la migrazione guidata a Firebase oppure creare una modalità locale semplificata.

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

Nel SQL Editor di Supabase esegui lo script `supabase/setup.sql` (contenuto anche qui sotto):

```sql
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
  cantiere text,
  caposquadra text,
  ore numeric,
  ord numeric,
  stra numeric,
  stato text,
  updated_at timestamptz not null default now(),
  unique(user_id, data)
);

alter table public.timbrature_records
  add column if not exists cantiere text,
  add column if not exists caposquadra text;

alter table public.timbrature_records enable row level security;

drop policy if exists "read own records" on public.timbrature_records;
create policy "read own records"
on public.timbrature_records
for select
using (auth.uid() = user_id);

drop policy if exists "insert own records" on public.timbrature_records;
create policy "insert own records"
on public.timbrature_records
for insert
with check (auth.uid() = user_id);

drop policy if exists "update own records" on public.timbrature_records;
create policy "update own records"
on public.timbrature_records
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "delete own records" on public.timbrature_records;
create policy "delete own records"
on public.timbrature_records
for delete
using (auth.uid() = user_id);

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
create policy "read own week programs"
on public.timbrature_week_programs
for select
using (auth.uid() = user_id);

drop policy if exists "insert own week programs" on public.timbrature_week_programs;
create policy "insert own week programs"
on public.timbrature_week_programs
for insert
with check (auth.uid() = user_id);

drop policy if exists "update own week programs" on public.timbrature_week_programs;
create policy "update own week programs"
on public.timbrature_week_programs
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "delete own week programs" on public.timbrature_week_programs;
create policy "delete own week programs"
on public.timbrature_week_programs
for delete
using (auth.uid() = user_id);
```

### Risoluzione errore: `Could not find the table 'public.timbrature_records' in the schema cache`

Se vedi l’errore nello storico, fai questi passi (in ordine):

1. Apri **Supabase → SQL Editor** del progetto giusto.
2. Incolla tutto `supabase/setup.sql` ed esegui.
3. Verifica che la tabella esista:

```sql
select table_schema, table_name
from information_schema.tables
where table_schema = 'public' and table_name = 'timbrature_records';
```

4. Verifica che le policy RLS esistano:

```sql
select policyname
from pg_policies
where schemaname = 'public' and tablename = 'timbrature_records'
order by policyname;
```

5. Controlla che `SUPABASE_URL` e `SUPABASE_ANON_KEY` in `index.html` siano del **medesimo progetto** dove hai creato la tabella.
6. Fai logout/login nell’app e ricarica la pagina.


## Strategia alternativa: cambiare cloud velocemente

Se il progetto Supabase è incoerente (es. tabella presente su un altro project ref), puoi spostare l'app su un altro cloud senza patchare il codice:

1. Apri l'app aggiungendo query params URL:

```text
?supabase_url=https://TUO-PROGETTO.supabase.co&supabase_key=TUO_ANON_KEY
```

2. Al primo caricamento i valori vengono salvati in `localStorage` e riutilizzati ai successivi accessi.
3. Nel nuovo progetto esegui sempre `supabase/setup.sql` nel SQL Editor.
4. Verifica di essere nel progetto corretto con:

```sql
select current_database(), current_schema();

select table_schema, table_name
from information_schema.tables
where table_schema = 'public' and table_name = 'timbrature_records';
```

> Suggerimento: se vuoi tornare alla configurazione di default, cancella le chiavi `timbrature.supabase.url` e `timbrature.supabase.key` dal browser (Local Storage).

## 3) Avvio

1. Apri `index.html` in locale o pubblica su Netlify.
2. Crea gli utenti in Supabase Auth (Dashboard > Authentication > Users).
3. Fai login e inserisci le timbrature.
4. Ogni utente vedrà solo i propri dati nello storico.

## Login con Google (opzionale)

La schermata di accesso include anche **“Accedi con Google”**. Per abilitarlo:

1. Vai su **Supabase Dashboard → Authentication → Providers → Google**.
2. Abilita il provider e configura **Client ID** / **Client Secret** di Google OAuth.
3. In **Authentication → URL Configuration** aggiungi i callback URL del tuo dominio (es. Netlify e localhost).
4. Salva e prova il pulsante “Accedi con Google” nell’app.

## Accesso da più dispositivi contemporaneamente

Per permettere allo stesso utente di restare connesso su più dispositivi nello stesso momento:

1. Vai su **Supabase Dashboard** → **Authentication** → **Settings**.
2. Nella sezione delle sessioni, disattiva l'opzione **Single session per user**.
3. Salva le impostazioni.

L'app esegue già il logout locale con `signOut({ scope: 'local' })`, quindi un logout manuale su un dispositivo non invalida le sessioni sugli altri.

## Nota

La cartella `apps-script/` rimane come storico della vecchia versione Google Apps Script.


## Modalità Progressive Web App (PWA)

Questa app ora può essere installata come PWA:

- include un `manifest.webmanifest`,
- registra un service worker (`sw.js`) per cache offline dei file statici,
- aggiunge icone installabili in `icons/`.

### Come provarla

1. pubblica su HTTPS (es. Netlify),
2. apri il sito da Chrome/Edge,
3. usa **Installa app** dal browser,
4. disattiva la rete per verificare il caricamento offline della schermata principale.

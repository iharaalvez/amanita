# Seed Data

Reference Pokemon data is stored in Supabase and refreshed with the Python seeder in `seeder`. This project no longer has a Dockerized backend service; the web app reads Supabase directly.

The seeder populates these reference tables:

- `species`
- `living_dex_entries`
- `game_dex_entries`
- `encounters`

User data lives separately in:

- `pokedex`
- `user_settings`

The seeder should only refresh reference tables. It should not touch user progress tables.

## Get The Supabase Database URL

In Supabase:

1. Open the project.
2. Go to **Project Settings -> Database**.
3. Open **Connection string**.
4. Choose **Session pooler**.
5. Copy the URI.
6. Replace `[YOUR-PASSWORD]` with the database password.
7. Add `?sslmode=require` to the end.

Example shape:

```txt
postgresql://postgres.PROJECT_REF:PASSWORD@aws-REGION.pooler.supabase.com:5432/postgres?sslmode=require
```

Do not commit this URL. It contains the database password.

## Install Seeder Dependencies

From the repository root:

```bash
py -3.13 -m venv seeder/.venv
./seeder/.venv/Scripts/python.exe -m pip install --upgrade pip setuptools wheel
./seeder/.venv/Scripts/python.exe -m pip install -r seeder/requirements.txt
```

If Python 3.13 is not installed, check available versions:

```bash
py -0p
```

Use the newest available Python version.

## Run The Seeder

```bash
export DATABASE_URL='postgresql://postgres.PROJECT_REF:PASSWORD@aws-REGION.pooler.supabase.com:5432/postgres?sslmode=require'
export POKEAPI_BASE='https://pokeapi.co/api/v2'
./seeder/.venv/Scripts/python.exe seeder/seed.py
```

If the database is already seeded and you intentionally want to refresh all reference data:

```bash
./seeder/.venv/Scripts/python.exe seeder/seed.py --force
```

`--force` truncates and reseeds:

- `species`
- `living_dex_entries`
- `game_dex_entries`
- `encounters`

It does not truncate:

- `pokedex`
- `user_settings`

## Verify Counts

Run this in the Supabase SQL Editor:

```sql
select count(*) from public.species;
select count(*) from public.living_dex_entries;
select count(*) from public.game_dex_entries;
select count(*) from public.encounters;
```

Expected rough results:

- `species`: 1025
- `living_dex_entries`: more than 1025
- `game_dex_entries`: several thousand
- `encounters`: depends on PokeAPI coverage

alter table public.pokedex
  add column if not exists date_obtained timestamptz,
  add column if not exists game text;

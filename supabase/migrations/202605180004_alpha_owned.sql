alter table public.pokedex
add column if not exists alpha_owned boolean not null default false;

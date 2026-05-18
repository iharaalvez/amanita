alter table public.pokedex
add column if not exists shiny_alpha_owned boolean not null default false;

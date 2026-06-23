-- Meadow is Vivillon's base/default form in the HOME box UI.
-- Merge any duplicate vivillon-meadow user data into the base form, then
-- remove the generated duplicate entry so future boxes only contain one Meadow.

insert into public.user_game_dex (
  user_id,
  game_id,
  species_id,
  form_name,
  owned,
  shiny,
  alpha,
  shiny_alpha,
  updated_at
)
select
  user_id,
  game_id,
  species_id,
  '',
  owned,
  shiny,
  alpha,
  shiny_alpha,
  updated_at
from public.user_game_dex
where species_id = 666
  and form_name = 'vivillon-meadow'
on conflict (user_id, game_id, species_id, form_name) do update
set owned = public.user_game_dex.owned or excluded.owned,
    shiny = public.user_game_dex.shiny or excluded.shiny,
    alpha = public.user_game_dex.alpha or excluded.alpha,
    shiny_alpha = public.user_game_dex.shiny_alpha or excluded.shiny_alpha,
    updated_at = greatest(public.user_game_dex.updated_at, excluded.updated_at);

delete from public.user_game_dex
where species_id = 666
  and form_name = 'vivillon-meadow';

insert into public.user_game_home_boxes (
  user_id,
  game_id,
  species_id,
  form_name,
  updated_at
)
select
  user_id,
  game_id,
  species_id,
  '',
  updated_at
from public.user_game_home_boxes
where species_id = 666
  and form_name = 'vivillon-meadow'
on conflict (user_id, game_id, species_id, form_name) do update
set updated_at = greatest(
  public.user_game_home_boxes.updated_at,
  excluded.updated_at
);

delete from public.user_game_home_boxes
where species_id = 666
  and form_name = 'vivillon-meadow';

do $$
begin
  if to_regclass('public.pokedex') is not null then
    insert into public.pokedex (
      user_id,
      species_id,
      form_name,
      owned,
      shiny_owned,
      in_home,
      method,
      shiny_method,
      shiny_game,
      updated_at
    )
    select
      user_id,
      species_id,
      null,
      owned,
      shiny_owned,
      in_home,
      method,
      shiny_method,
      shiny_game,
      updated_at
    from public.pokedex
    where species_id = 666
      and form_name = 'vivillon-meadow'
    on conflict on constraint pokedex_user_species_form_unique do update
    set owned = public.pokedex.owned or excluded.owned,
        shiny_owned = public.pokedex.shiny_owned or excluded.shiny_owned,
        in_home = public.pokedex.in_home or excluded.in_home,
        method = coalesce(public.pokedex.method, excluded.method),
        shiny_method = coalesce(public.pokedex.shiny_method, excluded.shiny_method),
        shiny_game = coalesce(public.pokedex.shiny_game, excluded.shiny_game),
        updated_at = greatest(public.pokedex.updated_at, excluded.updated_at);

    delete from public.pokedex
    where species_id = 666
      and form_name = 'vivillon-meadow';
  end if;
end $$;

insert into public.user_recent_catches (
  user_id,
  species_id,
  form_name,
  game_id,
  caught_at,
  is_shiny,
  is_alpha,
  created_at
)
select
  user_id,
  species_id,
  '',
  game_id,
  caught_at,
  is_shiny,
  is_alpha,
  created_at
from public.user_recent_catches
where species_id = 666
  and form_name = 'vivillon-meadow'
on conflict (user_id, species_id, form_name, game_id, caught_at) do update
set is_shiny = public.user_recent_catches.is_shiny or excluded.is_shiny,
    is_alpha = public.user_recent_catches.is_alpha or excluded.is_alpha,
    created_at = least(public.user_recent_catches.created_at, excluded.created_at);

delete from public.user_recent_catches
where species_id = 666
  and form_name = 'vivillon-meadow';

update public.user_shiny_hunts
set form_name = '',
    updated_at = now()
where species_id = 666
  and form_name = 'vivillon-meadow';

insert into public.game_dex_entries (
  game_id,
  species_id,
  form_name,
  entry_number
)
select
  game_id,
  species_id,
  '',
  entry_number
from public.game_dex_entries
where species_id = 666
  and form_name = 'vivillon-meadow'
on conflict (game_id, species_id, form_name) do update
set entry_number = coalesce(
  public.game_dex_entries.entry_number,
  excluded.entry_number
);

delete from public.game_dex_entries
where species_id = 666
  and form_name = 'vivillon-meadow';

do $$
begin
  if to_regclass('public.encounters') is not null then
    insert into public.encounters (
      species_id,
      form_name,
      game_id,
      location_name
    )
    select
      species_id,
      null,
      game_id,
      location_name
    from public.encounters
    where species_id = 666
      and form_name = 'vivillon-meadow'
    on conflict do nothing;

    delete from public.encounters
    where species_id = 666
      and form_name = 'vivillon-meadow';
  end if;
end $$;

update public.spawn_locations
set form_name = null,
    pokemon_form_identifier = 'vivillon'
where species_id = 666
  and form_name = 'vivillon-meadow';

delete from public.game_home_box_form_rules
where species_id = 666
  and form_name = 'vivillon-meadow';

delete from public.living_dex_entries
where species_id = 666
  and form_name = 'vivillon-meadow';

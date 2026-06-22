-- Move legacy PokeAPI encounter rows into the unified spawn_locations table.
--
-- The app now reads locations from public.spawn_locations only. This preserves
-- older PokeAPI encounter coverage that was previously stored in public.encounters.

insert into public.spawn_locations (
  game_id,
  version_ids,
  species_id,
  form_name,
  pokemon_form_identifier,
  location_identifier,
  location_name,
  location_area_identifier,
  location_area_name,
  region_area_identifier,
  encounter_method_identifier,
  encounter_method_name,
  levels,
  alpha_levels,
  tera_raid_star_level,
  time_labels,
  weather_labels,
  terrain_labels,
  rates,
  notes,
  source,
  source_key,
  confidence
)
select
  game_id,
  '{}'::text[],
  species_id,
  form_name,
  coalesce(form_name, species_id::text),
  'pokeapi-legacy-' || regexp_replace(lower(location_name), '[^a-z0-9]+', '-', 'g'),
  location_name,
  'pokeapi-legacy-' || regexp_replace(lower(location_name), '[^a-z0-9]+', '-', 'g'),
  location_name,
  null,
  'pokeapi-encounter',
  'PokeAPI Encounter',
  null,
  null,
  null,
  '{}'::text[],
  '{}'::text[],
  '{}'::text[],
  '{}'::jsonb,
  null,
  'pokeapi',
  'legacy-encounter:' || md5(
    game_id || '|' || species_id::text || '|' || coalesce(form_name, '') || '|' || location_name
  ),
  'medium'
from public.encounters
on conflict (source, source_key) do nothing;

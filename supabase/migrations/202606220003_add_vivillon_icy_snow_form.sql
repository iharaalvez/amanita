-- Add the missing Icy Snow Vivillon living form.
--
-- Scarlet/Violet supports Icy Snow via Pokemon GO postcards. The previous
-- cosmetic form list had Poke Ball Vivillon but not Icy Snow, which made the
-- SV HOME box audit miss one obtainable pattern and include one event-only
-- pattern.

insert into public.living_dex_entries (
  species_id,
  form_name,
  display_name,
  sprite_url,
  shiny_sprite_url,
  is_regional_form,
  region_label,
  sort_order,
  types,
  stats,
  height,
  weight
)
select
  666,
  'vivillon-icy-snow',
  'Vivillon Icy Snow',
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/666-icy-snow.png',
  'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/666-icy-snow.png',
  false,
  null,
  666007,
  '["bug", "flying"]'::jsonb,
  coalesce(
    (select stats from public.living_dex_entries where species_id = 666 and form_name is null limit 1),
    '{}'::jsonb
  ),
  12,
  170
where not exists (
  select 1
  from public.living_dex_entries
  where species_id = 666
    and form_name = 'vivillon-icy-snow'
);

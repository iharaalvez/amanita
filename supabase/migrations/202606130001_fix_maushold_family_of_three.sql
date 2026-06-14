-- The cosmetic form entry for Maushold was seeded with form_name
-- "maushold-family-of-four", which does not exist in PokéAPI (the base form
-- is just "maushold"). The correct alternate form is "maushold-family-of-three"
-- (PokéAPI ID 10257). Delete the stale row and insert the correct one.

delete from public.living_dex_entries
  where species_id = 925
    and form_name in ('maushold-family-of-four', 'maushold-family-of-three');

insert into public.living_dex_entries
  (species_id, form_name, display_name, sprite_url, shiny_sprite_url,
   is_regional_form, region_label, sort_order, types, height, weight)
values
  (925, 'maushold-family-of-three', 'Maushold Family of Three',
   'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10257.png',
   'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/10257.png',
   false, null, 925001, '["normal"]'::jsonb, 3, 23);

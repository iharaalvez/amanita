-- Backfill female form sprites that are available from PokeAPI's female sprite
-- paths and exposed by /pokemon/{id} as front_female/front_shiny_female.

update public.living_dex_entries
set
  sprite_url = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/female/592.png',
  shiny_sprite_url = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/female/592.png'
where species_id = 592
  and form_name = 'frillish-female';

update public.living_dex_entries
set
  sprite_url = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/female/593.png',
  shiny_sprite_url = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/female/593.png'
where species_id = 593
  and form_name = 'jellicent-female';

update public.living_dex_entries
set
  sprite_url = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/female/668.png',
  shiny_sprite_url = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/female/668.png'
where species_id = 668
  and form_name = 'pyroar-female';

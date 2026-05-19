-- Backfill remaining antique tea form sprites from PokeJungle.
-- The PokeJungle files use zero-padded dex numbers for these forms.

update public.living_dex_entries
set
  sprite_url = 'https://pokejungle.net/sprites/normal/0854-1.png',
  shiny_sprite_url = 'https://pokejungle.net/sprites/shiny/0854-1.png'
where species_id = 854
  and form_name = 'sinistea-antique';

update public.living_dex_entries
set
  sprite_url = 'https://pokejungle.net/sprites/normal/0855-1.png',
  shiny_sprite_url = 'https://pokejungle.net/sprites/shiny/0855-1.png'
where species_id = 855
  and form_name = 'polteageist-antique';

-- Backfill form sprites from PokeJungle for tea forms that currently do not
-- have usable PokeAPI sprite URLs.
--
-- Note: the checked PokeJungle 854-1 and 855-1 paths returned 404, so this
-- migration only fills the working Poltchageist/Sinistcha paths.

update public.living_dex_entries
set
  sprite_url = 'https://pokejungle.net/sprites/normal/1012-1.png',
  shiny_sprite_url = 'https://pokejungle.net/sprites/shiny/1012-1.png'
where species_id = 1012
  and form_name = 'poltchageist-artisan';

update public.living_dex_entries
set
  sprite_url = 'https://pokejungle.net/sprites/normal/1013-1.png',
  shiny_sprite_url = 'https://pokejungle.net/sprites/shiny/1013-1.png'
where species_id = 1013
  and form_name = 'sinistcha-masterpiece';

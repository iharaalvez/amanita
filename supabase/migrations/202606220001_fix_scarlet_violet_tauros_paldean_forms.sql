-- Fix missing Paldean Tauros forms in the Scarlet/Violet game dex.
--
-- Root cause: seed_game_dexes() in seeder/seed.py used next() to find the
-- first matching regional form per species, so only tauros-paldea-combat-breed
-- was inserted. The blaze and aqua breeds were silently skipped.
--
-- All three breeds share the same Paldea Pokedex entry number as the combat
-- breed.

insert into public.game_dex_entries (game_id, species_id, form_name, entry_number)
select 'scarlet-violet', 128, 'tauros-paldea-blaze-breed', entry_number
from public.game_dex_entries
where game_id = 'scarlet-violet'
  and species_id = 128
  and form_name = 'tauros-paldea-combat-breed'
on conflict (game_id, species_id, form_name) do nothing;

insert into public.game_dex_entries (game_id, species_id, form_name, entry_number)
select 'scarlet-violet', 128, 'tauros-paldea-aqua-breed', entry_number
from public.game_dex_entries
where game_id = 'scarlet-violet'
  and species_id = 128
  and form_name = 'tauros-paldea-combat-breed'
on conflict (game_id, species_id, form_name) do nothing;

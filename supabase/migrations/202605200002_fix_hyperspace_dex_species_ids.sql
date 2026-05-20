-- Fix wrong species IDs in the Hyperspace Pokédex.
-- The initial migration used wrong national dex numbers for 7 Pokémon;
-- confirmed against PokéAPI 2026-05-20.

delete from public.game_dex_entries
where game_id = 'legends-za-hyperspace'
  and (species_id, entry_number) in (
    (921, 14),  -- was Pawmi,    should be Capsakid
    (922, 15),  -- was Pawmo,    should be Scovillain
    (970, 20),  -- was Glimmora, should be Glimmet
    (971, 21),  -- was Greavard, should be Glimmora
    (953, 23),  -- was Rellor,   should be Greavard
    (954, 24),  -- was Rabsca,   should be Houndstone
    (980, 30)   -- was Clodsire, should be Dondozo
  );

insert into public.game_dex_entries (game_id, species_id, form_name, entry_number)
values
  ('legends-za-hyperspace', 951, '', 14),  -- Capsakid
  ('legends-za-hyperspace', 952, '', 15),  -- Scovillain
  ('legends-za-hyperspace', 969, '', 20),  -- Glimmet
  ('legends-za-hyperspace', 970, '', 21),  -- Glimmora
  ('legends-za-hyperspace', 971, '', 23),  -- Greavard
  ('legends-za-hyperspace', 972, '', 24),  -- Houndstone
  ('legends-za-hyperspace', 977, '', 30)   -- Dondozo
on conflict (game_id, species_id, form_name)
do update set entry_number = excluded.entry_number;

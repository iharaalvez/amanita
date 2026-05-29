-- Correct Legends: Z-A Hyperspace Pokedex species IDs.
-- Original rows used nearby Gen IX National Dex IDs for several entries.

delete from public.game_dex_entries
where game_id = 'legends-za-hyperspace'
  and species_id in (921, 922, 953, 954, 969, 970, 971, 972, 977, 980);

insert into public.game_dex_entries (game_id, species_id, form_name, entry_number)
values
  ('legends-za-hyperspace', 951, '', 14), -- Capsakid
  ('legends-za-hyperspace', 952, '', 15), -- Scovillain
  ('legends-za-hyperspace', 969, '', 20), -- Glimmet
  ('legends-za-hyperspace', 970, '', 21), -- Glimmora
  ('legends-za-hyperspace', 971, '', 23), -- Greavard
  ('legends-za-hyperspace', 972, '', 24), -- Houndstone
  ('legends-za-hyperspace', 977, '', 30)  -- Dondozo
on conflict (game_id, species_id, form_name)
do update set entry_number = excluded.entry_number;

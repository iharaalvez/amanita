-- Add Meloetta to the Indigo Disk Specials sub-dex: a real catchable overworld
-- puzzle encounter in the Coastal Biome (Indigo Disk DLC), not a Mystery Gift
-- or trade, and like the Snacksworth legendaries it has no official Blueberry
-- Pokédex number. Source: game8.co Scarlet/Violet Meloetta guide, verified
-- 2026-07-07. Renumbers the whole sub-dex by National Dex order to slot it in.

insert into public.game_dex_entries (game_id, species_id, form_name, entry_number)
values
  ('scarlet-violet-snacksworth', 144, '', 1),  -- Articuno
  ('scarlet-violet-snacksworth', 145, '', 2),  -- Zapdos
  ('scarlet-violet-snacksworth', 146, '', 3),  -- Moltres
  ('scarlet-violet-snacksworth', 243, '', 4),  -- Raikou
  ('scarlet-violet-snacksworth', 244, '', 5),  -- Entei
  ('scarlet-violet-snacksworth', 245, '', 6),  -- Suicune
  ('scarlet-violet-snacksworth', 249, '', 7),  -- Lugia
  ('scarlet-violet-snacksworth', 250, '', 8),  -- Ho-Oh
  ('scarlet-violet-snacksworth', 380, '', 9),  -- Latias
  ('scarlet-violet-snacksworth', 381, '', 10), -- Latios
  ('scarlet-violet-snacksworth', 382, '', 11), -- Kyogre
  ('scarlet-violet-snacksworth', 383, '', 12), -- Groudon
  ('scarlet-violet-snacksworth', 384, '', 13), -- Rayquaza
  ('scarlet-violet-snacksworth', 638, '', 14), -- Cobalion
  ('scarlet-violet-snacksworth', 639, '', 15), -- Terrakion
  ('scarlet-violet-snacksworth', 640, '', 16), -- Virizion
  ('scarlet-violet-snacksworth', 643, '', 17), -- Reshiram
  ('scarlet-violet-snacksworth', 644, '', 18), -- Zekrom
  ('scarlet-violet-snacksworth', 646, '', 19), -- Kyurem
  ('scarlet-violet-snacksworth', 648, '', 20), -- Meloetta
  ('scarlet-violet-snacksworth', 791, '', 21), -- Solgaleo
  ('scarlet-violet-snacksworth', 792, '', 22), -- Lunala
  ('scarlet-violet-snacksworth', 800, '', 23), -- Necrozma
  ('scarlet-violet-snacksworth', 891, '', 24), -- Kubfu
  ('scarlet-violet-snacksworth', 896, '', 25), -- Glastrier
  ('scarlet-violet-snacksworth', 897, '', 26)  -- Spectrier
on conflict (game_id, species_id, form_name)
do update set entry_number = excluded.entry_number;

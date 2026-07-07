-- Snacksworth Legendary Clash for Scarlet / Violet: The Indigo Disk DLC.
-- Source: Serebii.net /scarletviolet/snacksworthlegendary.shtml, verified 2026-07-07.
-- These legendaries are personally caught (quest reward gives a location hint,
-- then you catch it yourself in the Terarium) but have no official Blueberry
-- Pokédex number, so they're tracked as their own sub-dex rather than appended
-- to the numbered scarlet-violet-indigo-disk dex.

insert into public.game_dex_entries (game_id, species_id, form_name, entry_number)
values
  -- Scarlet-exclusive
  ('scarlet-violet-snacksworth', 243, '', 1),  -- Raikou
  ('scarlet-violet-snacksworth', 244, '', 2),  -- Entei
  ('scarlet-violet-snacksworth', 245, '', 3),  -- Suicune
  ('scarlet-violet-snacksworth', 250, '', 4),  -- Ho-Oh
  ('scarlet-violet-snacksworth', 381, '', 5),  -- Latios
  ('scarlet-violet-snacksworth', 383, '', 6),  -- Groudon
  ('scarlet-violet-snacksworth', 643, '', 7),  -- Reshiram
  ('scarlet-violet-snacksworth', 791, '', 8),  -- Solgaleo
  ('scarlet-violet-snacksworth', 896, '', 9),  -- Glastrier
  -- Violet-exclusive
  ('scarlet-violet-snacksworth', 249, '', 10), -- Lugia
  ('scarlet-violet-snacksworth', 380, '', 11), -- Latias
  ('scarlet-violet-snacksworth', 382, '', 12), -- Kyogre
  ('scarlet-violet-snacksworth', 638, '', 13), -- Cobalion
  ('scarlet-violet-snacksworth', 639, '', 14), -- Terrakion
  ('scarlet-violet-snacksworth', 640, '', 15), -- Virizion
  ('scarlet-violet-snacksworth', 644, '', 16), -- Zekrom
  ('scarlet-violet-snacksworth', 792, '', 17), -- Lunala
  ('scarlet-violet-snacksworth', 897, '', 18), -- Spectrier
  -- Shared (both versions)
  ('scarlet-violet-snacksworth', 144, '', 19), -- Articuno
  ('scarlet-violet-snacksworth', 145, '', 20), -- Zapdos
  ('scarlet-violet-snacksworth', 146, '', 21), -- Moltres
  ('scarlet-violet-snacksworth', 891, '', 22), -- Kubfu
  -- Group Quest exclusives
  ('scarlet-violet-snacksworth', 384, '', 23), -- Rayquaza
  ('scarlet-violet-snacksworth', 646, '', 24), -- Kyurem
  ('scarlet-violet-snacksworth', 800, '', 25)  -- Necrozma
on conflict (game_id, species_id, form_name)
do update set entry_number = excluded.entry_number;

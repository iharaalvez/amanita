-- Correct Legends: Z-A dex tail entries.
-- Source: PokemonDB Legends: Z-A Pokedex, verified 2026-05-18.

delete from public.game_dex_entries
where game_id = 'legends-za'
  and (
    entry_number between 228 and 232
    or species_id in (150, 377, 378, 379, 716, 717, 718, 719)
  );

insert into public.game_dex_entries (game_id, species_id, form_name, entry_number)
values
  ('legends-za', 716, '', 228), -- Xerneas
  ('legends-za', 717, '', 229), -- Yveltal
  ('legends-za', 718, '', 230), -- Zygarde
  ('legends-za', 719, '', 231), -- Diancie
  ('legends-za', 150, '', 232)  -- Mewtwo
on conflict (game_id, species_id, form_name)
do update set entry_number = excluded.entry_number;

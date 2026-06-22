-- Fix PLA game-dex form rows exposed by the Sylvanoth checklist audit.
--
-- 1. Basculin: the Hisui dex row is White Stripe, not Red/Blue Stripe.
-- 2. Sneasel: both Johtonian and Hisuian Sneasel are obtainable in PLA.
-- 3. Vulpix/Ninetales: the numbered Hisui dex rows are the Alolan request
--    forms, not Kantonian base forms.

-- Basculin: Red Stripe/base -> White Stripe.
insert into public.game_dex_entries (game_id, species_id, form_name, entry_number)
select 'pla', 550, 'basculin-white-striped', entry_number
from public.game_dex_entries
where game_id = 'pla'
  and species_id = 550
  and form_name in ('', 'basculin-white-striped')
order by case when form_name = 'basculin-white-striped' then 0 else 1 end
limit 1
on conflict (game_id, species_id, form_name)
do update set entry_number = excluded.entry_number;

delete from public.game_dex_entries
where game_id = 'pla'
  and species_id = 550
  and form_name = '';

-- Johtonian Sneasel: add base form alongside the existing Hisuian form.
insert into public.game_dex_entries (game_id, species_id, form_name, entry_number)
select 'pla', 215, '', entry_number
from public.game_dex_entries
where game_id = 'pla'
  and species_id = 215
  and form_name = 'sneasel-hisui'
on conflict (game_id, species_id, form_name) do nothing;

-- Vulpix/Ninetales: base rows -> Alolan forms.
insert into public.game_dex_entries (game_id, species_id, form_name, entry_number)
select 'pla', 37, 'vulpix-alola', entry_number
from public.game_dex_entries
where game_id = 'pla'
  and species_id = 37
  and form_name in ('', 'vulpix-alola')
order by case when form_name = 'vulpix-alola' then 0 else 1 end
limit 1
on conflict (game_id, species_id, form_name)
do update set entry_number = excluded.entry_number;

delete from public.game_dex_entries
where game_id = 'pla'
  and species_id = 37
  and form_name = '';

insert into public.game_dex_entries (game_id, species_id, form_name, entry_number)
select 'pla', 38, 'ninetales-alola', entry_number
from public.game_dex_entries
where game_id = 'pla'
  and species_id = 38
  and form_name in ('', 'ninetales-alola')
order by case when form_name = 'ninetales-alola' then 0 else 1 end
limit 1
on conflict (game_id, species_id, form_name)
do update set entry_number = excluded.entry_number;

delete from public.game_dex_entries
where game_id = 'pla'
  and species_id = 38
  and form_name = '';

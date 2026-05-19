-- Remove Mega forms for now. They are battle-only/non-stored forms and are
-- currently not used by the app's HOME box workflows.
--
-- Use a hyphen-aware regex so names like "meganium-female" are not matched.

delete from public.game_home_box_form_rules
where form_name ~ '(^|-)mega($|-)';

delete from public.pokedex
where form_name ~ '(^|-)mega($|-)';

delete from public.living_dex_entries
where form_name ~ '(^|-)mega($|-)';

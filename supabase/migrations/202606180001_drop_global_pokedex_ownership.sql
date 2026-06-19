-- HOME progress is now scoped to saved HOME layouts in user_game_dex.
-- The old global pokedex ownership table is no longer used.
drop table if exists public.pokedex cascade;

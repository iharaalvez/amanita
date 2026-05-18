alter table public.user_settings
add column if not exists pinned_game_id text;

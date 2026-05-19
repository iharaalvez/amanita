-- Per-game HOME transfer box tracking. This is intentionally separate from
-- game_dex, because a Pokemon can be registered in a game's dex without being
-- present in the HOME boxes transferred from that game.
alter table public.user_settings
add column if not exists game_home_boxes jsonb not null default '{}';

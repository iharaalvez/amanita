-- Drop legacy progress blobs after normalized user progress has been backfilled.
-- user_settings remains for small profile-level settings such as pinned_game_id.

alter table public.user_settings
  drop column if exists available_games,
  drop column if exists game_dex,
  drop column if exists game_home_boxes,
  drop column if exists game_dex_progress,
  drop column if exists shiny_game_dex_progress,
  drop column if exists shiny_hunts,
  drop column if exists recent_catches;

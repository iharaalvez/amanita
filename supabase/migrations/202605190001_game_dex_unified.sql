-- Unified game dex column replacing the separate game_dex_progress and
-- shiny_game_dex_progress arrays. Stores per-game, per-species flags:
-- { owned, shiny, alpha?, shiny_alpha? }
-- The legacy columns are kept for one-time migration reads and can be
-- dropped in a future migration once all clients have upgraded.
alter table public.user_settings
add column if not exists game_dex jsonb not null default '{}';

-- Add shiny_hunts and recent_catches to user_settings so they sync across devices.
alter table public.user_settings
  add column if not exists shiny_hunts jsonb not null default '[]'::jsonb,
  add column if not exists recent_catches jsonb not null default '[]'::jsonb;

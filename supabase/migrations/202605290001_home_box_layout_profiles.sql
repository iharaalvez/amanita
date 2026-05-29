alter table public.user_settings
  add column if not exists home_box_layouts jsonb not null default '[]'::jsonb,
  add column if not exists active_home_box_layout_id text;

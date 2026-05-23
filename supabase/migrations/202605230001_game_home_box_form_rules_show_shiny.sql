-- Add show_shiny flag to game_home_box_form_rules.
-- Controls whether a form's shiny sprite is tracked in HOME boxes.
-- Defaults to true; set false for forms whose shiny is not a separate target
-- (e.g. event forms, locked cosmetic variants).

alter table public.game_home_box_form_rules
  add column if not exists show_shiny boolean not null default true;

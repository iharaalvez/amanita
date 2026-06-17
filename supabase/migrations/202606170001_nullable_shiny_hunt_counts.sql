-- Allow shiny hunts to be tracked without an exact encounter/reset count.
alter table public.user_shiny_hunts
  alter column count drop not null;

alter table public.user_shiny_hunts
  drop constraint if exists user_shiny_hunts_count_check;

alter table public.user_shiny_hunts
  add constraint user_shiny_hunts_count_check
  check (count is null or count >= 0);

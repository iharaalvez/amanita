-- Add seed_seconds as a stored generated column for macro time filtering.
-- seed_seconds = the seconds component of seed_datetime (0–59).
-- A macro that takes N seconds needs seeds with seed_seconds >= N.

alter table public.item_printer_seeds
  add column seed_seconds smallint generated always as (
    extract(seconds from seed_datetime)::smallint
  ) stored;

create index ix_item_printer_seeds_seconds
  on public.item_printer_seeds (seed_seconds);

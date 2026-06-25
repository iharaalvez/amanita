-- Add source column to track data origin (lusamine gists vs game8 guide).
-- Deduplicate existing rows before adding unique constraint on (seed, mode).

alter table public.item_printer_seeds
  add column source text not null default 'lusamine';

comment on column public.item_printer_seeds.source is
  'lusamine | game8 — identifies the data origin';

-- Keep only the lowest id per (seed, mode) pair to eliminate duplicates.
delete from public.item_printer_seeds
where id not in (
  select min(id)
  from public.item_printer_seeds
  group by seed, mode
);

alter table public.item_printer_seeds
  add constraint item_printer_seeds_seed_mode_key unique (seed, mode);

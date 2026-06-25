-- Static reference table for SV Item Printer RNG seeds.
-- Data is populated by scripts/seed-item-printer.ts and never changes.
-- No user_id — this is public read-only reference data.

create table public.item_printer_seeds (
  id bigint primary key generated always as identity,
  seed bigint not null,
  seed_datetime timestamp not null,
  category text not null,
  mode text not null,
  print_count smallint not null,
  summary text,
  primary_item text not null,
  primary_item_count integer not null default 0,
  prints jsonb not null,
  trigger_print jsonb,
  bonus_print jsonb,
  note text,
  source_gist text not null
);

comment on column public.item_printer_seeds.category is
  'tera-shard | ability-patch | exp-candy | gold-bottle-cap | pp-max | evolution-item | alcremie-sweet | rare-ball';
comment on column public.item_printer_seeds.mode is
  'regular | item-bonus | ball-lotto | combo';
comment on column public.item_printer_seeds.print_count is
  'Number of print jobs in this seed (5 or 10)';
comment on column public.item_printer_seeds.primary_item is
  'Item with highest total yield — used for filtering and sorting';
comment on column public.item_printer_seeds.primary_item_count is
  'Total quantity of primary_item across all print jobs';
comment on column public.item_printer_seeds.prints is
  'Array of {item: string, count: number} for each print job';
comment on column public.item_printer_seeds.trigger_print is
  'Combo mode only: the 1-print trigger job {item, count}';
comment on column public.item_printer_seeds.bonus_print is
  'Ball-lotto assorted: the extra 1-print bonus you can do immediately after the main job';
comment on column public.item_printer_seeds.note is
  'Trailing note from the gist (e.g. "triggers ball bonus")';

create index ix_item_printer_seeds_category_mode
  on public.item_printer_seeds (category, mode);

create index ix_item_printer_seeds_primary_item
  on public.item_printer_seeds (primary_item, primary_item_count desc);

create index ix_item_printer_seeds_mode_count
  on public.item_printer_seeds (mode, primary_item_count desc);

alter table public.item_printer_seeds enable row level security;

create policy "public read"
  on public.item_printer_seeds
  for select
  using (true);

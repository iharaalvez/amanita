-- Normalize high-churn user progress out of user_settings JSONB blobs.
-- The legacy JSONB columns are intentionally kept for older clients and
-- one-time fallback reads; new clients use the row-based tables below.

create table if not exists public.user_games (
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id text not null,
  available boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (user_id, game_id)
);

create table if not exists public.user_game_dex (
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id text not null,
  species_id integer not null references public.species(id) on delete cascade,
  form_name text not null default '',
  owned boolean not null default false,
  shiny boolean not null default false,
  alpha boolean not null default false,
  shiny_alpha boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, game_id, species_id, form_name)
);

create index if not exists ix_user_game_dex_user_game
  on public.user_game_dex (user_id, game_id);

create table if not exists public.user_game_home_boxes (
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id text not null,
  species_id integer not null references public.species(id) on delete cascade,
  form_name text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, game_id, species_id, form_name)
);

create index if not exists ix_user_game_home_boxes_user_game
  on public.user_game_home_boxes (user_id, game_id);

create table if not exists public.user_shiny_hunts (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  species_id integer not null references public.species(id) on delete cascade,
  form_name text not null default '',
  game_id text not null,
  method text not null,
  counter_mode text not null,
  count integer not null default 0 check (count >= 0),
  started_at timestamptz not null,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists ix_user_shiny_hunts_user_id
  on public.user_shiny_hunts (user_id);

create table if not exists public.user_recent_catches (
  user_id uuid not null references auth.users(id) on delete cascade,
  species_id integer not null references public.species(id) on delete cascade,
  form_name text not null default '',
  game_id text not null,
  caught_at timestamptz not null,
  is_shiny boolean not null default false,
  is_alpha boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (
    user_id,
    species_id,
    form_name,
    game_id,
    caught_at
  )
);

create index if not exists ix_user_recent_catches_user_caught_at
  on public.user_recent_catches (user_id, caught_at desc);

drop trigger if exists set_user_games_updated_at on public.user_games;
create trigger set_user_games_updated_at
before update on public.user_games
for each row execute function public.set_updated_at();

drop trigger if exists set_user_game_dex_updated_at on public.user_game_dex;
create trigger set_user_game_dex_updated_at
before update on public.user_game_dex
for each row execute function public.set_updated_at();

drop trigger if exists set_user_game_home_boxes_updated_at
  on public.user_game_home_boxes;
create trigger set_user_game_home_boxes_updated_at
before update on public.user_game_home_boxes
for each row execute function public.set_updated_at();

drop trigger if exists set_user_shiny_hunts_updated_at
  on public.user_shiny_hunts;
create trigger set_user_shiny_hunts_updated_at
before update on public.user_shiny_hunts
for each row execute function public.set_updated_at();

alter table public.user_games enable row level security;
alter table public.user_game_dex enable row level security;
alter table public.user_game_home_boxes enable row level security;
alter table public.user_shiny_hunts enable row level security;
alter table public.user_recent_catches enable row level security;

drop policy if exists "Users can read their games" on public.user_games;
create policy "Users can read their games"
on public.user_games for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their games" on public.user_games;
create policy "Users can insert their games"
on public.user_games for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their games" on public.user_games;
create policy "Users can update their games"
on public.user_games for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their games" on public.user_games;
create policy "Users can delete their games"
on public.user_games for delete
using (auth.uid() = user_id);

drop policy if exists "Users can read their game dex" on public.user_game_dex;
create policy "Users can read their game dex"
on public.user_game_dex for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their game dex" on public.user_game_dex;
create policy "Users can insert their game dex"
on public.user_game_dex for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their game dex" on public.user_game_dex;
create policy "Users can update their game dex"
on public.user_game_dex for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their game dex" on public.user_game_dex;
create policy "Users can delete their game dex"
on public.user_game_dex for delete
using (auth.uid() = user_id);

drop policy if exists "Users can read their game home boxes"
  on public.user_game_home_boxes;
create policy "Users can read their game home boxes"
on public.user_game_home_boxes for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their game home boxes"
  on public.user_game_home_boxes;
create policy "Users can insert their game home boxes"
on public.user_game_home_boxes for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their game home boxes"
  on public.user_game_home_boxes;
create policy "Users can update their game home boxes"
on public.user_game_home_boxes for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their game home boxes"
  on public.user_game_home_boxes;
create policy "Users can delete their game home boxes"
on public.user_game_home_boxes for delete
using (auth.uid() = user_id);

drop policy if exists "Users can read their shiny hunts"
  on public.user_shiny_hunts;
create policy "Users can read their shiny hunts"
on public.user_shiny_hunts for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their shiny hunts"
  on public.user_shiny_hunts;
create policy "Users can insert their shiny hunts"
on public.user_shiny_hunts for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their shiny hunts"
  on public.user_shiny_hunts;
create policy "Users can update their shiny hunts"
on public.user_shiny_hunts for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their shiny hunts"
  on public.user_shiny_hunts;
create policy "Users can delete their shiny hunts"
on public.user_shiny_hunts for delete
using (auth.uid() = user_id);

drop policy if exists "Users can read their recent catches"
  on public.user_recent_catches;
create policy "Users can read their recent catches"
on public.user_recent_catches for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their recent catches"
  on public.user_recent_catches;
create policy "Users can insert their recent catches"
on public.user_recent_catches for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their recent catches"
  on public.user_recent_catches;
create policy "Users can update their recent catches"
on public.user_recent_catches for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their recent catches"
  on public.user_recent_catches;
create policy "Users can delete their recent catches"
on public.user_recent_catches for delete
using (auth.uid() = user_id);

insert into public.user_games (user_id, game_id, available, updated_at)
select settings.user_id, game_entry.key, (game_entry.value #>> '{}')::boolean,
  settings.updated_at
from public.user_settings settings
cross join lateral jsonb_each(settings.available_games) as game_entry
where jsonb_typeof(game_entry.value) = 'boolean'
on conflict (user_id, game_id) do update
set available = excluded.available,
    updated_at = excluded.updated_at;

insert into public.user_game_dex (
  user_id,
  game_id,
  species_id,
  form_name,
  owned,
  shiny,
  alpha,
  shiny_alpha,
  updated_at
)
select
  settings.user_id,
  game_entry.key,
  (substring(dex_entry.key from '^([0-9]+)-'))::integer,
  coalesce(nullif(substring(dex_entry.key from '^[0-9]+-(.*)$'), 'base'), ''),
  coalesce((dex_entry.value ->> 'owned')::boolean, false),
  coalesce((dex_entry.value ->> 'shiny')::boolean, false),
  coalesce((dex_entry.value ->> 'alpha')::boolean, false),
  coalesce((dex_entry.value ->> 'shiny_alpha')::boolean, false),
  settings.updated_at
from public.user_settings settings
cross join lateral jsonb_each(settings.game_dex) as game_entry
cross join lateral jsonb_each(
  case
    when jsonb_typeof(game_entry.value) = 'object' then game_entry.value
    else '{}'::jsonb
  end
) as dex_entry
where jsonb_typeof(game_entry.value) = 'object'
  and jsonb_typeof(dex_entry.value) = 'object'
  and dex_entry.key ~ '^[0-9]+-.+$'
  and (
    coalesce((dex_entry.value ->> 'owned')::boolean, false)
    or coalesce((dex_entry.value ->> 'shiny')::boolean, false)
    or coalesce((dex_entry.value ->> 'alpha')::boolean, false)
    or coalesce((dex_entry.value ->> 'shiny_alpha')::boolean, false)
  )
on conflict (user_id, game_id, species_id, form_name) do update
set owned = excluded.owned,
    shiny = excluded.shiny,
    alpha = excluded.alpha,
    shiny_alpha = excluded.shiny_alpha,
    updated_at = excluded.updated_at;

insert into public.user_game_dex (
  user_id,
  game_id,
  species_id,
  form_name,
  owned,
  shiny,
  updated_at
)
select
  settings.user_id,
  game_entry.key,
  species_entry.value::integer,
  '',
  true,
  false,
  settings.updated_at
from public.user_settings settings
cross join lateral jsonb_each(settings.game_dex_progress) as game_entry
cross join lateral jsonb_array_elements_text(
  case
    when jsonb_typeof(game_entry.value) = 'array' then game_entry.value
    else '[]'::jsonb
  end
) as species_entry
where jsonb_typeof(game_entry.value) = 'array'
on conflict (user_id, game_id, species_id, form_name) do update
set owned = public.user_game_dex.owned or excluded.owned,
    updated_at = greatest(public.user_game_dex.updated_at, excluded.updated_at);

insert into public.user_game_dex (
  user_id,
  game_id,
  species_id,
  form_name,
  owned,
  shiny,
  updated_at
)
select
  settings.user_id,
  game_entry.key,
  species_entry.value::integer,
  '',
  true,
  true,
  settings.updated_at
from public.user_settings settings
cross join lateral jsonb_each(settings.shiny_game_dex_progress) as game_entry
cross join lateral jsonb_array_elements_text(
  case
    when jsonb_typeof(game_entry.value) = 'array' then game_entry.value
    else '[]'::jsonb
  end
) as species_entry
where jsonb_typeof(game_entry.value) = 'array'
on conflict (user_id, game_id, species_id, form_name) do update
set owned = public.user_game_dex.owned or excluded.owned,
    shiny = public.user_game_dex.shiny or excluded.shiny,
    updated_at = greatest(public.user_game_dex.updated_at, excluded.updated_at);

insert into public.user_game_home_boxes (
  user_id,
  game_id,
  species_id,
  form_name,
  updated_at
)
select
  settings.user_id,
  game_entry.key,
  (substring(box_entry.key from '^([0-9]+)-'))::integer,
  coalesce(nullif(substring(box_entry.key from '^[0-9]+-(.*)$'), 'base'), ''),
  settings.updated_at
from public.user_settings settings
cross join lateral jsonb_each(settings.game_home_boxes) as game_entry
cross join lateral jsonb_each(
  case
    when jsonb_typeof(game_entry.value) = 'object' then game_entry.value
    else '{}'::jsonb
  end
) as box_entry
where jsonb_typeof(game_entry.value) = 'object'
  and jsonb_typeof(box_entry.value) = 'boolean'
  and (box_entry.value #>> '{}')::boolean
  and box_entry.key ~ '^[0-9]+-.+$'
on conflict (user_id, game_id, species_id, form_name) do update
set updated_at = excluded.updated_at;

insert into public.user_shiny_hunts (
  id,
  user_id,
  species_id,
  form_name,
  game_id,
  method,
  counter_mode,
  count,
  started_at,
  completed_at,
  updated_at
)
select
  hunt.value ->> 'id',
  settings.user_id,
  (hunt.value ->> 'speciesId')::integer,
  coalesce(hunt.value ->> 'formName', ''),
  hunt.value ->> 'gameId',
  hunt.value ->> 'method',
  hunt.value ->> 'counterMode',
  (hunt.value ->> 'count')::integer,
  (hunt.value ->> 'startedAt')::timestamptz,
  nullif(hunt.value ->> 'completedAt', '')::timestamptz,
  settings.updated_at
from public.user_settings settings
cross join lateral jsonb_array_elements(settings.shiny_hunts) as hunt
where jsonb_typeof(settings.shiny_hunts) = 'array'
  and jsonb_typeof(hunt.value) = 'object'
  and hunt.value ? 'id'
  and hunt.value ? 'speciesId'
  and hunt.value ? 'gameId'
  and hunt.value ? 'method'
  and hunt.value ? 'counterMode'
  and hunt.value ? 'count'
  and hunt.value ? 'startedAt'
on conflict (id) do update
set user_id = excluded.user_id,
    species_id = excluded.species_id,
    form_name = excluded.form_name,
    game_id = excluded.game_id,
    method = excluded.method,
    counter_mode = excluded.counter_mode,
    count = excluded.count,
    started_at = excluded.started_at,
    completed_at = excluded.completed_at,
    updated_at = excluded.updated_at;

insert into public.user_recent_catches (
  user_id,
  species_id,
  form_name,
  game_id,
  caught_at,
  is_shiny,
  is_alpha,
  created_at
)
select
  settings.user_id,
  (catch_entry.value ->> 'speciesId')::integer,
  coalesce(catch_entry.value ->> 'formName', ''),
  catch_entry.value ->> 'gameId',
  (catch_entry.value ->> 'date')::timestamptz,
  coalesce((catch_entry.value ->> 'isShiny')::boolean, false),
  coalesce((catch_entry.value ->> 'isAlpha')::boolean, false),
  settings.updated_at
from public.user_settings settings
cross join lateral jsonb_array_elements(settings.recent_catches) as catch_entry
where jsonb_typeof(settings.recent_catches) = 'array'
  and jsonb_typeof(catch_entry.value) = 'object'
  and catch_entry.value ? 'speciesId'
  and catch_entry.value ? 'gameId'
  and catch_entry.value ? 'date'
on conflict (
  user_id,
  species_id,
  form_name,
  game_id,
  caught_at
) do update
set is_shiny = excluded.is_shiny,
    is_alpha = excluded.is_alpha;

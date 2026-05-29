create table if not exists public.user_home_box_layouts (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  name text not null,
  mode text not null default 'normal' check (mode in ('normal', 'shiny', 'paired')),
  show_cosmetic_forms boolean not null default false,
  show_gender_forms boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

drop trigger if exists set_user_home_box_layouts_updated_at
  on public.user_home_box_layouts;
create trigger set_user_home_box_layouts_updated_at
before update on public.user_home_box_layouts
for each row execute function public.set_updated_at();

alter table public.user_home_box_layouts enable row level security;

drop policy if exists "Users can read their HOME box layouts"
  on public.user_home_box_layouts;
create policy "Users can read their HOME box layouts"
on public.user_home_box_layouts for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their HOME box layouts"
  on public.user_home_box_layouts;
create policy "Users can insert their HOME box layouts"
on public.user_home_box_layouts for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their HOME box layouts"
  on public.user_home_box_layouts;
create policy "Users can update their HOME box layouts"
on public.user_home_box_layouts for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their HOME box layouts"
  on public.user_home_box_layouts;
create policy "Users can delete their HOME box layouts"
on public.user_home_box_layouts for delete
using (auth.uid() = user_id);

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_settings'
      and column_name = 'home_box_layouts'
  ) then
    execute $backfill$
      insert into public.user_home_box_layouts (
        user_id,
        id,
        name,
        mode,
        show_cosmetic_forms,
        show_gender_forms,
        updated_at
      )
      select
        settings.user_id,
        layout.value ->> 'id',
        left(layout.value ->> 'name', 40),
        case layout.value ->> 'mode'
          when 'normal' then 'normal'
          when 'shiny' then 'shiny'
          when 'paired' then 'paired'
          else 'normal'
        end,
        coalesce((layout.value ->> 'showCosmeticForms')::boolean, false),
        coalesce((layout.value ->> 'showGenderForms')::boolean, false),
        coalesce(settings.updated_at, now())
      from public.user_settings settings
      cross join lateral jsonb_array_elements(settings.home_box_layouts) as layout(value)
      where jsonb_typeof(settings.home_box_layouts) = 'array'
        and jsonb_typeof(layout.value) = 'object'
        and nullif(layout.value ->> 'id', '') is not null
        and nullif(layout.value ->> 'name', '') is not null
      on conflict (user_id, id) do update
      set name = excluded.name,
          mode = excluded.mode,
          show_cosmetic_forms = excluded.show_cosmetic_forms,
          show_gender_forms = excluded.show_gender_forms,
          updated_at = excluded.updated_at;
    $backfill$;
  end if;
end $$;

alter table public.user_settings
  drop column if exists home_box_layouts;

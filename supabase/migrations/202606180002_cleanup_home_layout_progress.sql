delete from public.user_game_dex d
where d.game_id like 'home-layout-%'
  and not exists (
    select 1
    from public.user_home_box_layouts l
    where l.user_id = d.user_id
      and l.id = d.game_id
  );

create or replace function public.delete_home_layout_progress()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.user_game_dex
  where user_id = old.user_id
    and game_id = old.id;
  return old;
end;
$$;

drop trigger if exists delete_home_layout_progress on public.user_home_box_layouts;
create trigger delete_home_layout_progress
after delete on public.user_home_box_layouts
for each row execute function public.delete_home_layout_progress();

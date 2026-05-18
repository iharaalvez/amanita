-- Preserve user progress from the earlier incorrect Legends: Z-A dex tail.
-- Old entries #228-230 were Regirock/Regice/Registeel (377/378/379).
-- Correct entries #228-230 are Xerneas/Yveltal/Zygarde (716/717/718).

create or replace function public.remap_legacy_legends_za_progress(progress jsonb)
returns jsonb
language sql
immutable
as $$
  select case
    when progress is null or not (progress ? 'legends-za') then progress
    else jsonb_set(
      progress,
      '{legends-za}',
      coalesce(
        (
          select jsonb_agg(to_jsonb(mapped_id) order by mapped_id)
          from (
            select distinct case (value::int)
              when 377 then 716
              when 378 then 717
              when 379 then 718
              else value::int
            end as mapped_id
            from jsonb_array_elements_text(progress -> 'legends-za') as values(value)
          ) mapped
        ),
        '[]'::jsonb
      )
    )
  end;
$$;

update public.user_settings
set
  game_dex_progress = public.remap_legacy_legends_za_progress(game_dex_progress),
  shiny_game_dex_progress = public.remap_legacy_legends_za_progress(shiny_game_dex_progress)
where
  game_dex_progress ? 'legends-za'
  or shiny_game_dex_progress ? 'legends-za';

drop function public.remap_legacy_legends_za_progress(jsonb);

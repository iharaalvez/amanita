update public.living_dex_entries
set sort_order = case
  when form_name = 'pikachu-partner-cap' then 25010
  when form_name = 'pikachu-world-cap'   then 25009
end
where species_id = 25
  and form_name in ('pikachu-partner-cap', 'pikachu-world-cap');

create or replace function public.amanita_canonicalize_location_name(raw_name text)
returns text
language sql
immutable
as $$
  select replace(
    trim(trailing from regexp_replace(
      regexp_replace(
        regexp_replace(raw_name, '\s+', ' ', 'g'),
        '^Area (One|Two|Three|Four|Five|Six) \((North|South|East|West) Province\)(.*)$',
        '\2 Province (Area \1)\3',
        'i'
      ),
      '^((North|South|East|West) Province) Area (One|Two|Three|Four|Five|Six)(.*)$',
      '\1 (Area \3)\4',
      'i'
    )),
    '24H',
    '24h'
  );
$$;

update public.spawn_locations
set
  location_name = public.amanita_canonicalize_location_name(location_name),
  location_area_name = public.amanita_canonicalize_location_name(location_area_name)
where
  location_name ~* '^(Area (One|Two|Three|Four|Five|Six) \((North|South|East|West) Province\)|((North|South|East|West) Province) Area (One|Two|Three|Four|Five|Six))'
  or location_area_name ~* '^(Area (One|Two|Three|Four|Five|Six) \((North|South|East|West) Province\)|((North|South|East|West) Province) Area (One|Two|Three|Four|Five|Six))'
  or location_name like '%24H%'
  or location_area_name like '%24H%';

update public.map_location_outlines
set location_name = public.amanita_canonicalize_location_name(location_name)
where
  location_name ~* '^(Area (One|Two|Three|Four|Five|Six) \((North|South|East|West) Province\)|((North|South|East|West) Province) Area (One|Two|Three|Four|Five|Six))'
  or location_name like '%24H%';

drop function public.amanita_canonicalize_location_name(text);

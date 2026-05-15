# PokeDB Data Analysis

PokeDB export files are stored locally in `data/pokedb/`. They are ignored by
Git because the full dump is large and should be treated as local import input.

## Export Summary

- JSON files: 88
- Total size: about 216 MB
- Largest files:
  - `pokemon_moves.json`: about 100 MB
  - `encounters.json`: about 69 MB
  - `region_areas.json`: about 11 MB

## Import-Critical Tables

| File                                |   Rows | Use                                             |
| ----------------------------------- | -----: | ----------------------------------------------- |
| `encounters.json`                   | 37,724 | Main spawn/encounter facts                      |
| `location_areas.json`               |  2,672 | Encounter area names and parent locations       |
| `locations.json`                    |    839 | Location names, types, region area identifiers  |
| `location_leaflet_coordinates.json` |    749 | Map outline coordinates per location            |
| `pokemon_forms.json`                |  1,476 | Map PokeDB form identifiers to National Dex IDs |
| `versions.json`                     |     82 | Version identifiers and labels                  |
| `encounter_methods.json`            |     73 | Human-readable method labels                    |
| `pokemon_forms_pokedex.json`        |  7,900 | Regional dex membership and numbers             |

## Modern Game Coverage

### Scarlet / Violet

- Encounter rows: 4,296
- Unique species: 625
- Location areas: 372
- Locations: 70
- Locations with coordinates: 64
- Region split:
  - `paldea`: 2,763 rows
  - `blueberry-academy`: 826 rows
  - `kitakami`: 707 rows

Top methods:

- `symbol-encounter`: 3,412
- `tera-raid-battle`: 690
- `fixed-encounter`: 66
- `special-encounter`: 57
- `static-encounter`: 41
- `fixed-tera-encounter`: 17

### Legends: Arceus

- Encounter rows: 1,756
- Unique species: 235
- Location areas: 88
- Locations: 88
- Locations with coordinates: 86

Top methods:

- `symbol-encounter`: 740
- `contact-space-time-distortion`: 373
- `swarm`: 224
- `shaking-trees`: 128
- `flying`: 122
- `shaking-ore-deposits`: 105

### Legends: Z-A

PokeDB includes a `legends-za` version row, but there are currently no encounter
rows for it in this export.

## Coordinate Data

Coordinates are stored by `location_identifier`, not individual encounter row.
Current coordinate rows use:

- `type`: `outline`
- `points`: polygon coordinate arrays
- `map_part_image`: mostly `null`

Coverage is strong enough for map prototypes:

- Scarlet/Violet: 64 of 70 encounter locations have coordinates.
- PLA: 86 of 88 encounter locations have coordinates.

These coordinates should be treated as location outlines, not precise spawn
markers. For an MVP map, they are better for highlighting areas/zones than
placing exact Pokemon markers.

## Join Path

Recommended join path for importer:

1. `encounters.pokemon_form_identifier`
2. `pokemon_forms.identifier`
3. `pokemon_forms.ndex_id`
4. `encounters.location_area_identifier`
5. `location_areas.identifier`
6. `location_areas.location_identifier`
7. `locations.identifier`
8. `location_leaflet_coordinates.location_identifier`
9. `encounters.encounter_method_identifier`
10. `encounter_methods.identifier`

## Form Mapping Notes

PokeDB form identifiers are close to our local form names, but not identical.
Examples:

- PokeDB `diglett-alolan` maps to local `diglett-alola`
- PokeDB `basculin-blue-stripe` maps to local `basculin-blue-striped`
- PokeDB `gastrodon-east-sea` maps to local `gastrodon-east`
- PokeDB `dudunsparce-two` likely maps to base Dudunsparce, while local only has
  `dudunsparce-three-segment` as the extra tracked form

Importer should not assume string equality for forms. Use `ndex_id` as the
primary key and a curated form alias map for non-default forms.

## Recommended Data Model

Keep PokeDB data source-aware instead of merging it into the legacy `encounters`
table.

Suggested tables:

- `spawn_locations`
- `spawn_location_sources`
- `map_locations` or `map_zones`

Suggested row shape:

```ts
type SpawnLocation = {
  gameId: string;
  versionIds: string[];
  speciesId: number;
  formName: string | null;
  locationName: string;
  locationAreaName: string;
  method: string;
  levels: string | null;
  time: string[];
  weather: string[];
  terrain: string[];
  source: "pokedb";
  confidence: "medium";
};
```

## Import Plan

1. Add schema for source-aware spawn locations.
2. Build a dry-run importer for `scarlet-violet`.
3. Generate a report:
   - rows read
   - rows transformed
   - unknown forms
   - duplicate rows
   - rows without coordinate coverage
4. Add a small form alias map for mismatches.
5. Write to Supabase only after dry-run output looks correct.
6. Update the Locations tab to prefer `spawn_locations`, falling back to legacy
   PokéAPI `encounters`.
7. Use `location_leaflet_coordinates` later for map area highlighting.

## Dry-Run Importer

Run the importer in analysis mode:

```bash
npm run import:pokedb -- --game scarlet-violet --dry-run
```

Supported game IDs:

- `scarlet-violet`
- `pla`
- `swsh`
- `bdsp`
- `lgpe`

The importer supports a guarded write path for reviewed games. At the moment,
`--write` is enabled for `scarlet-violet`, `pla`, `swsh`, `bdsp`, and `lgpe`.

```bash
npm run import:pokedb -- --game scarlet-violet --write
npm run import:pokedb -- --game pla --write
npm run import:pokedb -- --game swsh --write
npm run import:pokedb -- --game bdsp --write
npm run import:pokedb -- --game lgpe --write
```

The write path validates joins, form aliases, and local `living_dex_entries`
matches before writing. It upserts by `source, source_key`, so rerunning the
same import updates existing PokeDB rows rather than duplicating them.

### Scarlet/Violet Dry Run

Latest dry-run result:

- Raw encounters read: 37,724
- Game encounter rows: 4,296
- Transformed spawn rows: 4,293
- Duplicate source keys deduped: 3
- Unique species: 625
- Locations: 70
- Map outline rows: 64
- Locations with outlines: 64/70
- Missing forms: 0
- Missing areas: 0
- Missing locations: 0
- Missing methods: 0
- Unaliased non-default forms: 0
- Local form validation issues: 0

Latest write result:

- `spawn_locations`: 4,293 rows
- `map_location_outlines`: 64 rows

Verify in Supabase:

```sql
select game_id, source, count(*)
from public.spawn_locations
group by game_id, source;

select game_id, source, count(*)
from public.map_location_outlines
group by game_id, source;
```

Locations without outline rows:

- `area-zero`
- `area-zero-underdepths`
- `random-around-kitakami`
- `random-around-paldea`
- `random-around-terrarium`
- `zero-lab`

### PLA Dry Run

- Raw encounters read: 37,724
- Game encounter rows: 1,756
- Transformed spawn rows: 1,750
- Duplicate source keys deduped: 6
- Unique species: 235
- Locations: 88
- Map outline rows: 86
- Locations with outlines: 86/88
- Missing joins: 0
- Unaliased non-default forms: 0
- Local form validation issues: 0

Locations without outline rows:

- `hall-of-origin`
- `wayward-cave`

### BDSP Dry Run

- Raw encounters read: 37,724
- Game encounter rows: 2,181
- Transformed spawn rows: 2,161
- Duplicate source keys deduped: 12
- Unique species: 319
- Locations: 92
- Map outline rows: 64
- Locations with outlines: 62/92
- Missing joins: 0
- Unaliased non-default forms: 0
- Local form validation issues: 0

BDSP spawn data is import-ready, but map outline coverage is weaker because many
Grand Underground and special locations do not have coordinate rows in the
current PokeDB export.

### SWSH Dry Run

- Raw encounters read: 37,724
- Game encounter rows: 11,638
- Transformed spawn rows: 11,377
- Duplicate source keys deduped: 145
- Unique species: 627
- Locations: 83
- Map outline rows: 86
- Locations with outlines: 83/83
- Missing joins: 0
- Unaliased non-default forms: 0
- Local form validation issues: 0

Sword/Shield is import-ready. Most rows are Max Raid Battle encounters, so the
Locations tab can be noisy until we add method/source filters.

Latest write result:

- `spawn_locations`: 11,377 rows
- `map_location_outlines`: 86 rows

### LGPE Dry Run

- Raw encounters read: 37,724
- Game encounter rows: 745
- Transformed spawn rows: 743
- Duplicate source keys deduped: 2
- Unique species: 130
- Locations: 47
- Map outline rows: 49
- Locations with outlines: 46/47
- Missing joins: 0
- Unaliased non-default forms: 0
- Local form validation issues: 0

Partner Pikachu and Partner Eevee are collapsed to base species for Living Dex
tracking. Alolan Rattata and Alolan Meowth use local `-alola` form aliases.

Locations without outline rows:

- `fighting-dojo`

Latest write result:

- `spawn_locations`: 743 rows
- `map_location_outlines`: 49 rows
- `game_dex_entries`: 153 rows

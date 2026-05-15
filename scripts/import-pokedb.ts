import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";
import { config as loadDotenv } from "dotenv";
import { POKEDB_FORM_ALIASES } from "../src/config/pokedb-form-aliases";

loadDotenv({ path: ".env.local" });

type GameImportConfig = {
  gameId: string;
  versionIds: string[];
};

const GAME_IMPORT_CONFIG: Record<string, GameImportConfig> = {
  "scarlet-violet": {
    gameId: "scarlet-violet",
    versionIds: ["scarlet", "violet"],
  },
  pla: {
    gameId: "pla",
    versionIds: ["legends-arceus"],
  },
  swsh: {
    gameId: "swsh",
    versionIds: ["sword", "shield"],
  },
  bdsp: {
    gameId: "bdsp",
    versionIds: ["brilliant-diamond", "shining-pearl"],
  },
  lgpe: {
    gameId: "lgpe",
    versionIds: ["lets-go-pikachu", "lets-go-eevee"],
  },
};

const WRITE_ENABLED_GAMES = new Set([
  "scarlet-violet",
  "pla",
  "swsh",
  "bdsp",
  "lgpe",
]);
const WRITE_BATCH_SIZE = 500;

type PokeDbEncounter = {
  pokemon_form_identifier: string;
  version_identifiers: string[];
  location_area_identifier: string;
  encounter_method_identifier: string;
  levels: string | null;
  alpha_levels: string | null;
  tera_raid_star_level: string | null;
  note_markup: string | null;
  during_any_time: boolean | null;
  during_morning: boolean | null;
  during_day: boolean | null;
  during_evening: boolean | null;
  during_night: boolean | null;
  while_weather_overall: boolean | null;
  while_clear: boolean | null;
  while_harsh_sunlight: boolean | null;
  while_cloudy: boolean | null;
  while_blizzard: boolean | null;
  weather_clear_rate: number | null;
  weather_cloudy_rate: number | null;
  weather_rain_rate: number | null;
  weather_thunderstorm_rate: number | null;
  weather_snow_rate: number | null;
  weather_blizzard_rate: number | null;
  weather_harshsunlight_rate: number | null;
  weather_sandstorm_rate: number | null;
  weather_fog_rate: number | null;
  on_terrain_land: boolean | null;
  on_terrain_watersurface: boolean | null;
  on_terrain_underwater: boolean | null;
  on_terrain_overland: boolean | null;
  on_terrain_sky: boolean | null;
  rate_overall: string | number | null;
  rate_morning: string | number | null;
  rate_day: string | number | null;
  rate_night: string | number | null;
  rate_spring: string | number | null;
  rate_summer: string | number | null;
  rate_autumn: string | number | null;
  rate_winter: string | number | null;
  probability_overall: string | number | null;
  probability_morning: string | number | null;
  probability_day: string | number | null;
  probability_evening: string | number | null;
  probability_night: string | number | null;
  group_rate: string | number | null;
  group_pokemon: string | null;
  hidden_ability_possible: boolean | null;
  max_raid_rate_1_star: string | number | null;
  max_raid_rate_2_star: string | number | null;
  max_raid_rate_3_star: string | number | null;
  max_raid_rate_4_star: string | number | null;
  max_raid_rate_5_star: string | number | null;
};

type PokeDbPokemonForm = {
  identifier: string;
  ndex_id: number;
  is_default_form: boolean;
  form_name: string;
};

type PokeDbLocationArea = {
  identifier: string;
  location_identifier: string;
  name: string;
};

type PokeDbLocation = {
  identifier: string;
  name: string;
  type: string;
  region_area_identifier: string | null;
};

type PokeDbEncounterMethod = {
  identifier: string;
  name: string;
};

type PokeDbCoordinate = {
  location_identifier: string;
  layer: number | null;
  points: number[][];
  type: string;
  map_part_image: string | null;
};

type SpawnLocationImportRow = {
  game_id: string;
  version_ids: string[];
  species_id: number;
  form_name: string | null;
  pokemon_form_identifier: string;
  location_identifier: string;
  location_name: string;
  location_area_identifier: string;
  location_area_name: string;
  region_area_identifier: string | null;
  encounter_method_identifier: string;
  encounter_method_name: string;
  levels: string | null;
  alpha_levels: string | null;
  tera_raid_star_level: string | null;
  time_labels: string[];
  weather_labels: string[];
  terrain_labels: string[];
  rates: Record<string, number | string | boolean>;
  notes: string | null;
  source: "pokedb";
  source_key: string;
  confidence: "medium";
};

type MapLocationOutlineImportRow = {
  game_id: string;
  location_identifier: string;
  location_name: string;
  region_area_identifier: string | null;
  layer: number | null;
  outline_type: string;
  points: number[][];
  map_part_image: string | null;
  source: "pokedb";
  source_key: string;
  confidence: "medium";
};

type CliOptions = {
  dataDir: string;
  gameId: string;
  write: boolean;
  validateLocalForms: boolean;
};

type LocalForm = {
  species_id: number;
  form_name: string | null;
  display_name: string;
};

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  let dataDir = "data/pokedb";
  let gameId = "scarlet-violet";
  let write = false;
  let validateLocalForms = true;

  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === "--game") {
      gameId = args[++index] ?? gameId;
    } else if (arg === "--data-dir") {
      dataDir = args[++index] ?? dataDir;
    } else if (arg === "--write") {
      write = true;
    } else if (arg === "--dry-run") {
      write = false;
    } else if (arg === "--skip-local-validation") {
      validateLocalForms = false;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return { dataDir, gameId, write, validateLocalForms };
}

function printHelp() {
  console.log(`Usage:
  npm run import:pokedb -- --game scarlet-violet --dry-run

Options:
  --game <id>                 One of: ${Object.keys(GAME_IMPORT_CONFIG).join(", ")}
  --data-dir <path>           PokeDB JSON export directory. Default: data/pokedb
  --dry-run                   Analyze only. Default behavior.
  --write                     Write reviewed rows. Currently guarded to reviewed games.
  --skip-local-validation     Do not read Supabase living_dex_entries for form checks.
`);
}

function readJsonArray<T>(dataDir: string, filename: string): T[] {
  const fullPath = path.join(dataDir, filename);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Missing required PokeDB export file: ${fullPath}`);
  }

  const parsed = JSON.parse(fs.readFileSync(fullPath, "utf8")) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error(`${filename} is not a JSON array`);
  }

  return parsed as T[];
}

function compactRecord(
  value: Record<string, string | number | boolean | null | undefined>,
): Record<string, string | number | boolean> {
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string | number | boolean] =>
        entry[1] !== null && entry[1] !== undefined && entry[1] !== "",
    ),
  );
}

function stableHash(value: unknown): string {
  return crypto
    .createHash("sha1")
    .update(JSON.stringify(value))
    .digest("hex")
    .slice(0, 20);
}

function getTimeLabels(row: PokeDbEncounter): string[] {
  if (row.during_any_time) return ["any"];

  return [
    row.during_morning ? "morning" : null,
    row.during_day ? "day" : null,
    row.during_evening ? "evening" : null,
    row.during_night ? "night" : null,
  ].filter((label): label is string => label !== null);
}

function getWeatherLabels(row: PokeDbEncounter): string[] {
  if (row.while_weather_overall) return ["any"];

  return [
    row.while_clear ? "clear" : null,
    row.while_harsh_sunlight ? "harsh-sunlight" : null,
    row.while_cloudy ? "cloudy" : null,
    row.while_blizzard ? "blizzard" : null,
  ].filter((label): label is string => label !== null);
}

function getTerrainLabels(row: PokeDbEncounter): string[] {
  return [
    row.on_terrain_land ? "land" : null,
    row.on_terrain_watersurface ? "water-surface" : null,
    row.on_terrain_underwater ? "underwater" : null,
    row.on_terrain_overland ? "overland" : null,
    row.on_terrain_sky ? "sky" : null,
  ].filter((label): label is string => label !== null);
}

function mapPokeDbFormName(form: PokeDbPokemonForm): string | null {
  if (form.is_default_form || form.identifier.endsWith("-default")) return null;
  if (Object.hasOwn(POKEDB_FORM_ALIASES, form.identifier)) {
    return POKEDB_FORM_ALIASES[form.identifier] ?? null;
  }
  return form.identifier;
}

async function loadLocalForms(): Promise<LocalForm[] | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const rows: LocalForm[] = [];

  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("living_dex_entries")
      .select("species_id,form_name,display_name")
      .order("species_id", { ascending: true })
      .range(from, from + 999);

    if (error) throw error;
    rows.push(...((data ?? []) as LocalForm[]));
    if ((data ?? []).length < 1000) break;
  }

  return rows;
}

function formatCountMap(map: Map<string, number>, limit = 12): string {
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([key, count]) => `  ${key}: ${count}`)
    .join("\n");
}

async function upsertInBatches<T extends Record<string, unknown>>(
  table: string,
  rows: T[],
  onConflict: string,
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error(
      "Writing requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY in .env.local.",
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  for (let index = 0; index < rows.length; index += WRITE_BATCH_SIZE) {
    const batch = rows.slice(index, index + WRITE_BATCH_SIZE);
    const { error } = await supabase.from(table).upsert(batch, { onConflict });

    if (error) {
      throw new Error(`Failed to upsert ${table}: ${error.message}`);
    }
  }
}

function assertWriteSafe({
  gameId,
  missingForms,
  missingAreas,
  missingLocations,
  missingMethods,
  unaliasedNonDefaultForms,
  localValidationIssues,
}: {
  gameId: string;
  missingForms: Map<string, number>;
  missingAreas: Map<string, number>;
  missingLocations: Map<string, number>;
  missingMethods: Map<string, number>;
  unaliasedNonDefaultForms: Map<string, number>;
  localValidationIssues: string[];
}) {
  const failures: string[] = [];
  if (!WRITE_ENABLED_GAMES.has(gameId)) {
    failures.push(
      `--write is currently enabled only for: ${Array.from(
        WRITE_ENABLED_GAMES,
      ).join(", ")}`,
    );
  }
  if (missingForms.size > 0) failures.push("missing PokeDB form joins");
  if (missingAreas.size > 0)
    failures.push("missing PokeDB location-area joins");
  if (missingLocations.size > 0) failures.push("missing PokeDB location joins");
  if (missingMethods.size > 0) failures.push("missing PokeDB method joins");
  if (unaliasedNonDefaultForms.size > 0) {
    failures.push("unaliased non-default PokeDB forms");
  }
  if (localValidationIssues.length > 0) {
    failures.push("local living_dex_entries form validation issues");
  }

  if (failures.length > 0) {
    throw new Error(
      `Refusing to write. Resolve these issues first:\n${failures
        .map((failure) => `- ${failure}`)
        .join("\n")}`,
    );
  }
}

function summarizeOutline(row: MapLocationOutlineImportRow) {
  const xs = row.points.map(([x]) => x);
  const ys = row.points.map(([, y]) => y);

  return {
    game_id: row.game_id,
    location_identifier: row.location_identifier,
    location_name: row.location_name,
    region_area_identifier: row.region_area_identifier,
    layer: row.layer,
    outline_type: row.outline_type,
    point_count: row.points.length,
    bounds: {
      min_x: Math.min(...xs),
      max_x: Math.max(...xs),
      min_y: Math.min(...ys),
      max_y: Math.max(...ys),
    },
    source: row.source,
    source_key: row.source_key,
    confidence: row.confidence,
  };
}

async function main() {
  const options = parseArgs();
  const config = GAME_IMPORT_CONFIG[options.gameId];
  if (!config) {
    throw new Error(
      `Unsupported game "${options.gameId}". Supported: ${Object.keys(
        GAME_IMPORT_CONFIG,
      ).join(", ")}`,
    );
  }
  const encounters = readJsonArray<PokeDbEncounter>(
    options.dataDir,
    "encounters.json",
  );
  const forms = readJsonArray<PokeDbPokemonForm>(
    options.dataDir,
    "pokemon_forms.json",
  );
  const areas = readJsonArray<PokeDbLocationArea>(
    options.dataDir,
    "location_areas.json",
  );
  const locations = readJsonArray<PokeDbLocation>(
    options.dataDir,
    "locations.json",
  );
  const methods = readJsonArray<PokeDbEncounterMethod>(
    options.dataDir,
    "encounter_methods.json",
  );
  const coordinates = readJsonArray<PokeDbCoordinate>(
    options.dataDir,
    "location_leaflet_coordinates.json",
  );

  const formByIdentifier = new Map(
    forms.map((form) => [form.identifier, form]),
  );
  const areaByIdentifier = new Map(
    areas.map((area) => [area.identifier, area]),
  );
  const locationByIdentifier = new Map(
    locations.map((location) => [location.identifier, location]),
  );
  const methodByIdentifier = new Map(
    methods.map((method) => [method.identifier, method]),
  );
  const coordinatesByLocation = new Map<string, PokeDbCoordinate[]>();

  for (const coordinate of coordinates) {
    const rows =
      coordinatesByLocation.get(coordinate.location_identifier) ?? [];
    rows.push(coordinate);
    coordinatesByLocation.set(coordinate.location_identifier, rows);
  }

  const versionSet = new Set(config.versionIds);
  const gameEncounters = encounters.filter((encounter) =>
    encounter.version_identifiers.some((version) => versionSet.has(version)),
  );

  const spawnRowsByKey = new Map<string, SpawnLocationImportRow>();
  const outlineRowsByKey = new Map<string, MapLocationOutlineImportRow>();
  const missingForms = new Map<string, number>();
  const missingAreas = new Map<string, number>();
  const missingLocations = new Map<string, number>();
  const missingMethods = new Map<string, number>();
  const unaliasedNonDefaultForms = new Map<string, number>();
  const sourceKeyCounts = new Map<string, number>();

  for (const encounter of gameEncounters) {
    const form = formByIdentifier.get(encounter.pokemon_form_identifier);
    const area = areaByIdentifier.get(encounter.location_area_identifier);
    const location = area
      ? locationByIdentifier.get(area.location_identifier)
      : undefined;
    const method = methodByIdentifier.get(
      encounter.encounter_method_identifier,
    );

    if (!form) {
      missingForms.set(
        encounter.pokemon_form_identifier,
        (missingForms.get(encounter.pokemon_form_identifier) ?? 0) + 1,
      );
      continue;
    }
    if (!area) {
      missingAreas.set(
        encounter.location_area_identifier,
        (missingAreas.get(encounter.location_area_identifier) ?? 0) + 1,
      );
      continue;
    }
    if (!location) {
      missingLocations.set(
        area.location_identifier,
        (missingLocations.get(area.location_identifier) ?? 0) + 1,
      );
      continue;
    }
    if (!method) {
      missingMethods.set(
        encounter.encounter_method_identifier,
        (missingMethods.get(encounter.encounter_method_identifier) ?? 0) + 1,
      );
      continue;
    }

    if (
      !form.is_default_form &&
      !form.identifier.endsWith("-default") &&
      !Object.hasOwn(POKEDB_FORM_ALIASES, form.identifier)
    ) {
      unaliasedNonDefaultForms.set(
        form.identifier,
        (unaliasedNonDefaultForms.get(form.identifier) ?? 0) + 1,
      );
    }

    const versionIds = encounter.version_identifiers.filter((version) =>
      versionSet.has(version),
    );
    const timeLabels = getTimeLabels(encounter);
    const weatherLabels = getWeatherLabels(encounter);
    const terrainLabels = getTerrainLabels(encounter);
    const rates = compactRecord({
      rate_overall: encounter.rate_overall,
      rate_morning: encounter.rate_morning,
      rate_day: encounter.rate_day,
      rate_night: encounter.rate_night,
      rate_spring: encounter.rate_spring,
      rate_summer: encounter.rate_summer,
      rate_autumn: encounter.rate_autumn,
      rate_winter: encounter.rate_winter,
      probability_overall: encounter.probability_overall,
      probability_morning: encounter.probability_morning,
      probability_day: encounter.probability_day,
      probability_evening: encounter.probability_evening,
      probability_night: encounter.probability_night,
      group_rate: encounter.group_rate,
      group_pokemon: encounter.group_pokemon,
      hidden_ability_possible: encounter.hidden_ability_possible,
      max_raid_rate_1_star: encounter.max_raid_rate_1_star,
      max_raid_rate_2_star: encounter.max_raid_rate_2_star,
      max_raid_rate_3_star: encounter.max_raid_rate_3_star,
      max_raid_rate_4_star: encounter.max_raid_rate_4_star,
      max_raid_rate_5_star: encounter.max_raid_rate_5_star,
      weather_clear_rate: encounter.weather_clear_rate,
      weather_cloudy_rate: encounter.weather_cloudy_rate,
      weather_rain_rate: encounter.weather_rain_rate,
      weather_thunderstorm_rate: encounter.weather_thunderstorm_rate,
      weather_snow_rate: encounter.weather_snow_rate,
      weather_blizzard_rate: encounter.weather_blizzard_rate,
      weather_harshsunlight_rate: encounter.weather_harshsunlight_rate,
      weather_sandstorm_rate: encounter.weather_sandstorm_rate,
      weather_fog_rate: encounter.weather_fog_rate,
    });
    const sourceKeyPayload = {
      gameId: config.gameId,
      versionIds,
      pokemonFormIdentifier: encounter.pokemon_form_identifier,
      locationAreaIdentifier: encounter.location_area_identifier,
      encounterMethodIdentifier: encounter.encounter_method_identifier,
      levels: encounter.levels,
      alphaLevels: encounter.alpha_levels,
      teraRaidStarLevel: encounter.tera_raid_star_level,
      timeLabels,
      weatherLabels,
      terrainLabels,
      rates,
      noteMarkup: encounter.note_markup,
    };
    const sourceKey = `${config.gameId}:${stableHash(sourceKeyPayload)}`;
    sourceKeyCounts.set(sourceKey, (sourceKeyCounts.get(sourceKey) ?? 0) + 1);

    const spawnRow: SpawnLocationImportRow = {
      game_id: config.gameId,
      version_ids: versionIds,
      species_id: form.ndex_id,
      form_name: mapPokeDbFormName(form),
      pokemon_form_identifier: encounter.pokemon_form_identifier,
      location_identifier: location.identifier,
      location_name: location.name,
      location_area_identifier: area.identifier,
      location_area_name: area.name,
      region_area_identifier: location.region_area_identifier,
      encounter_method_identifier: method.identifier,
      encounter_method_name: method.name,
      levels: encounter.levels,
      alpha_levels: encounter.alpha_levels,
      tera_raid_star_level: encounter.tera_raid_star_level,
      time_labels: timeLabels,
      weather_labels: weatherLabels,
      terrain_labels: terrainLabels,
      rates,
      notes: encounter.note_markup,
      source: "pokedb",
      source_key: sourceKey,
      confidence: "medium",
    };

    if (!spawnRowsByKey.has(sourceKey)) {
      spawnRowsByKey.set(sourceKey, spawnRow);
    }

    for (const coordinate of coordinatesByLocation.get(location.identifier) ??
      []) {
      const outlineKeyPayload = {
        gameId: config.gameId,
        locationIdentifier: location.identifier,
        layer: coordinate.layer,
        type: coordinate.type,
        points: coordinate.points,
      };
      const outlineSourceKey = `${config.gameId}:${stableHash(
        outlineKeyPayload,
      )}`;
      outlineRowsByKey.set(outlineSourceKey, {
        game_id: config.gameId,
        location_identifier: location.identifier,
        location_name: location.name,
        region_area_identifier: location.region_area_identifier,
        layer: coordinate.layer,
        outline_type: coordinate.type,
        points: coordinate.points,
        map_part_image: coordinate.map_part_image,
        source: "pokedb",
        source_key: outlineSourceKey,
        confidence: "medium",
      });
    }
  }

  const localValidationIssues: string[] = [];
  const spawnRows = Array.from(spawnRowsByKey.values());
  if (options.validateLocalForms) {
    const localForms = await loadLocalForms();
    if (localForms) {
      const localFormKeys = new Set(
        localForms.map(
          (form) => `${form.species_id}:${form.form_name ?? "base"}`,
        ),
      );
      const seenIssues = new Set<string>();
      for (const row of spawnRows) {
        const key = `${row.species_id}:${row.form_name ?? "base"}`;
        if (!localFormKeys.has(key)) {
          const issue = `${row.pokemon_form_identifier} -> species ${row.species_id}, form ${row.form_name ?? "base"}`;
          if (!seenIssues.has(issue)) {
            seenIssues.add(issue);
            localValidationIssues.push(issue);
          }
        }
      }
    } else {
      localValidationIssues.push(
        "Skipped: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY not set.",
      );
    }
  }

  const locationsWithSpawns = new Set(
    spawnRows.map((row) => row.location_identifier),
  );
  const locationsWithOutlines = new Set(
    Array.from(outlineRowsByKey.values()).map((row) => row.location_identifier),
  );
  const locationsWithoutOutlines = Array.from(locationsWithSpawns)
    .filter(
      (locationIdentifier) => !locationsWithOutlines.has(locationIdentifier),
    )
    .sort();
  const methodCounts = new Map<string, number>();
  const regionCounts = new Map<string, number>();
  const speciesIds = new Set<number>();

  for (const row of spawnRows) {
    methodCounts.set(
      row.encounter_method_identifier,
      (methodCounts.get(row.encounter_method_identifier) ?? 0) + 1,
    );
    regionCounts.set(
      row.region_area_identifier ?? "unknown",
      (regionCounts.get(row.region_area_identifier ?? "unknown") ?? 0) + 1,
    );
    speciesIds.add(row.species_id);
  }

  const duplicateSourceKeys = Array.from(sourceKeyCounts.entries()).filter(
    ([, count]) => count > 1,
  );

  console.log(`PokeDB import dry-run: ${config.gameId}`);
  console.log(`Data directory: ${options.dataDir}`);
  console.log(`Raw encounters read: ${encounters.length}`);
  console.log(`Game encounter rows: ${gameEncounters.length}`);
  console.log(`Transformed spawn rows: ${spawnRows.length}`);
  console.log(`Unique species: ${speciesIds.size}`);
  console.log(`Locations: ${locationsWithSpawns.size}`);
  console.log(`Map outline rows: ${outlineRowsByKey.size}`);
  console.log(
    `Locations with outlines: ${locationsWithOutlines.size}/${locationsWithSpawns.size}`,
  );
  console.log(`Duplicate source keys: ${duplicateSourceKeys.length}`);

  console.log("\nRows by region:");
  console.log(formatCountMap(regionCounts));
  console.log("\nRows by method:");
  console.log(formatCountMap(methodCounts));

  console.log("\nJoin issues:");
  console.log(`  missing forms: ${missingForms.size}`);
  if (missingForms.size > 0) console.log(formatCountMap(missingForms, 8));
  console.log(`  missing areas: ${missingAreas.size}`);
  if (missingAreas.size > 0) console.log(formatCountMap(missingAreas, 8));
  console.log(`  missing locations: ${missingLocations.size}`);
  if (missingLocations.size > 0)
    console.log(formatCountMap(missingLocations, 8));
  console.log(`  missing methods: ${missingMethods.size}`);
  if (missingMethods.size > 0) console.log(formatCountMap(missingMethods, 8));

  console.log(
    `\nUnaliased non-default PokeDB forms: ${unaliasedNonDefaultForms.size}`,
  );
  if (unaliasedNonDefaultForms.size > 0) {
    console.log(formatCountMap(unaliasedNonDefaultForms, 30));
  }

  console.log(
    `\nLocal form validation issues: ${localValidationIssues.length}`,
  );
  if (localValidationIssues.length > 0) {
    console.log(
      localValidationIssues
        .slice(0, 30)
        .map((issue) => `  ${issue}`)
        .join("\n"),
    );
  }

  console.log(
    `\nLocations without outline rows: ${locationsWithoutOutlines.length}`,
  );
  if (locationsWithoutOutlines.length > 0) {
    console.log(
      locationsWithoutOutlines
        .slice(0, 30)
        .map((issue) => `  ${issue}`)
        .join("\n"),
    );
  }

  console.log("\nSample spawn rows:");
  console.log(JSON.stringify(spawnRows.slice(0, 5), null, 2));
  console.log("\nSample outline rows:");
  console.log(
    JSON.stringify(
      Array.from(outlineRowsByKey.values()).slice(0, 3).map(summarizeOutline),
      null,
      2,
    ),
  );

  if (!options.write) {
    console.log("\nDry run only. No Supabase rows were written.");
    return;
  }

  assertWriteSafe({
    gameId: config.gameId,
    missingForms,
    missingAreas,
    missingLocations,
    missingMethods,
    unaliasedNonDefaultForms,
    localValidationIssues,
  });

  console.log("\nWriting reviewed PokeDB rows to Supabase...");
  await upsertInBatches(
    "spawn_locations",
    spawnRows as unknown as Record<string, unknown>[],
    "source,source_key",
  );
  await upsertInBatches(
    "map_location_outlines",
    Array.from(outlineRowsByKey.values()) as unknown as Record<
      string,
      unknown
    >[],
    "source,source_key",
  );
  console.log(
    `Wrote ${spawnRows.length} spawn rows and ${outlineRowsByKey.size} outline rows.`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

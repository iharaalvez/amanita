import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";
import { config as loadDotenv } from "dotenv";
import { canonicalizeLocationName } from "../src/lib/locationNames";

loadDotenv({ path: ".env.local" });

const WRITE_BATCH_SIZE = 500;

type SheetKey = "paldea" | "teal-mask" | "indigo-disk" | "transfer";

type SheetConfig = {
  key: SheetKey;
  label: string;
  csvPath: string;
  dexColumn: string;
  defaultGameId: string;
  sourcePrefix: string;
  gameIdForVersion?: (versionLabel: string) => string;
};

type CliOptions = {
  sheet: SheetKey | "all";
  csvPath: string | null;
  write: boolean;
};

type CsvRow = Record<string, string>;

type LocalForm = {
  species_id: number;
  form_name: string | null;
  display_name: string;
};

type ResolvedPokemon = {
  speciesId: number;
  formName: string | null;
  displayName: string;
};

type ParsedPokemonName = {
  baseName: string;
  detail: string | null;
  gender: "female" | "male" | null;
};

type ChecklistLocation = {
  locationName: string;
  areaName: string;
  methodIdentifier: string;
  methodName: string;
  versionIds: string[];
  teraRaidStarLevel: string | null;
  notes: string | null;
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
  rates: Record<string, never>;
  notes: string | null;
  source: "manual";
  source_key: string;
  confidence: "medium";
};

type SheetImportSummary = {
  config: SheetConfig;
  parsedRows: number;
  importRows: SpawnLocationImportRow[];
  unresolved: string[];
  noLocations: string[];
};

const BASE_DIR = "C:/Users/ihara/Downloads/Amanita";

const SHEET_CONFIGS: Record<SheetKey, SheetConfig> = {
  paldea: {
    key: "paldea",
    label: "Paldea Dex",
    csvPath: `${BASE_DIR}/Pokemon SV Master Checklist by sylvanoth - Paldea Dex.csv`,
    dexColumn: "Dex #",
    defaultGameId: "scarlet-violet",
    sourcePrefix: "sylvanoth-sv",
  },
  "teal-mask": {
    key: "teal-mask",
    label: "Kitakami Dex",
    csvPath: `${BASE_DIR}/Pokemon SV Master Checklist by sylvanoth - Teal Mask.csv`,
    dexColumn: "Dex #",
    defaultGameId: "scarlet-violet-teal-mask",
    sourcePrefix: "sylvanoth-sv-teal-mask",
  },
  "indigo-disk": {
    key: "indigo-disk",
    label: "Blueberry Dex",
    csvPath: `${BASE_DIR}/Pokemon SV Master Checklist by sylvanoth - Indigo Disk.csv`,
    dexColumn: "Dex #",
    defaultGameId: "scarlet-violet-indigo-disk",
    sourcePrefix: "sylvanoth-sv-indigo-disk",
  },
  transfer: {
    key: "transfer",
    label: "Transfer",
    csvPath: `${BASE_DIR}/Pokemon SV Master Checklist by sylvanoth - Transfer.csv`,
    dexColumn: "Nat\nDex #",
    defaultGameId: "scarlet-violet",
    sourcePrefix: "sylvanoth-sv-transfer",
    gameIdForVersion: (versionLabel) => {
      const normalized = normalizeKey(versionLabel);
      if (normalized.includes("tm")) return "scarlet-violet-teal-mask";
      if (normalized.includes("id")) return "scarlet-violet-indigo-disk";
      return "scarlet-violet";
    },
  },
};

const FORM_DETAIL_DISPLAY_ALIASES: Record<string, string | null> = {
  "vivillon|fancy": "Vivillon Fancy",
  "vivillon|meadow": "Vivillon Meadow",
  "vivillon|icy snow": "Vivillon Icy Snow",
  "vivillon|polar": "Vivillon Polar",
  "vivillon|tundra": "Vivillon Tundra",
  "vivillon|continental": "Vivillon Continental",
  "vivillon|garden": "Vivillon Garden",
  "vivillon|elegant": "Vivillon Elegant",
  "vivillon|modern": "Vivillon Modern",
  "vivillon|marine": "Vivillon Marine",
  "vivillon|archipelago": "Vivillon Archipelago",
  "vivillon|high plains": "Vivillon High Plains",
  "vivillon|sandstorm": "Vivillon Sandstorm",
  "vivillon|river": "Vivillon River",
  "vivillon|monsoon": "Vivillon Monsoon",
  "vivillon|savanna": "Vivillon Savanna",
  "vivillon|sun": "Vivillon Sun",
  "vivillon|ocean": "Vivillon Ocean",
  "vivillon|jungle": "Vivillon Jungle",
  "pikachu|original cap": "Pikachu Original Cap",
  "pikachu|hoenn cap": "Pikachu Hoenn Cap",
  "pikachu|sinnoh cap": "Pikachu Sinnoh Cap",
  "pikachu|unova cap": "Pikachu Unova Cap",
  "pikachu|kalos cap": "Pikachu Kalos Cap",
  "pikachu|alola cap": "Pikachu Alola Cap",
  "pikachu|partner cap": "Pikachu Partner Cap",
  "pikachu|world cap": "Pikachu World Cap",
  "raichu|alolan": "Raichu Alolan",
  "vulpix|alolan": "Vulpix Alolan",
  "ninetales|alolan": "Ninetales Alolan",
  "meowth|alolan": "Meowth Alolan",
  "meowth|galarian": "Meowth Galarian",
  "persian|alolan": "Persian Alolan",
  "growlithe|hisuian": "Growlithe Hisuian",
  "arcanine|hisuian": "Arcanine Hisuian",
  "voltorb|hisuian": "Voltorb Hisuian",
  "electrode|hisuian": "Electrode Hisuian",
  "exeggutor|alolan": "Exeggutor Alolan",
  "articuno|galarian": "Articuno Galarian",
  "zapdos|galarian": "Zapdos Galarian",
  "moltres|galarian": "Moltres Galarian",
  "slowpoke|galarian": "Slowpoke Galarian",
  "slowbro|galarian": "Slowbro Galarian",
  "slowking|galarian": "Slowking Galarian",
  "weezing|galarian": "Weezing Galarian",
  "qwilfish|hisuian": "Qwilfish Hisuian",
  "sneasel|hisuian": "Sneasel Hisuian",
  "typhlosion|hisuian": "Typhlosion Hisuian",
  "lilligant|hisuian": "Lilligant Hisuian",
  "zorua|hisuian": "Zorua Hisuian",
  "zoroark|hisuian": "Zoroark Hisuian",
  "braviary|hisuian": "Braviary Hisuian",
  "sliggoo|hisuian": "Sliggoo Hisuian",
  "goodra|hisuian": "Goodra Hisuian",
  "avalugg|hisuian": "Avalugg Hisuian",
  "decidueye|hisuian": "Decidueye Hisuian",
  "samurott|hisuian": "Samurott Hisuian",
  "wooper|paldean": "Wooper Paldean",
  "maushold|family of three": "Maushold Family of Three",
  "maushold|family of four": null,
  "lycanroc|midday": null,
  "lycanroc|midnight": "Lycanroc Midnight",
  "lycanroc|dusk": "Lycanroc Dusk",
  "oricorio|baile": null,
  "oricorio|pom-pom": "Oricorio Pom-Pom Style",
  "oricorio|pa'u": "Oricorio Pa'u Style",
  "oricorio|sensu": "Oricorio Sensu Style",
  "squawkabilly|green plumage": null,
  "squawkabilly|blue plumage": "Squawkabilly Blue",
  "squawkabilly|yellow plumage": "Squawkabilly Yellow",
  "squawkabilly|white plumage": "Squawkabilly White",
  "basculin|red stripe": null,
  "basculin|blue stripe": "Basculin Blue Stripe",
  "basculin|white stripe": "Basculin White Stripe",
  "flabebe|red flower": null,
  "flabebe|yellow flower": "Flabebe Yellow Flower",
  "flabebe|orange flower": "Flabebe Orange Flower",
  "flabebe|blue flower": "Flabebe Blue Flower",
  "flabebe|white flower": "Flabebe White Flower",
  "floette|red flower": null,
  "floette|yellow flower": "Floette Yellow Flower",
  "floette|orange flower": "Floette Orange Flower",
  "floette|blue flower": "Floette Blue Flower",
  "floette|white flower": "Floette White Flower",
  "florges|red flower": null,
  "florges|yellow flower": "Florges Yellow Flower",
  "florges|orange flower": "Florges Orange Flower",
  "florges|blue flower": "Florges Blue Flower",
  "florges|white flower": "Florges White Flower",
  "dudunsparce|two-segment": null,
  "dudunsparce|three-segment": "Dudunsparce 3 Segment",
  "deerling|spring": null,
  "deerling|summer": "Deerling Summer",
  "deerling|autumn": "Deerling Fall",
  "deerling|winter": "Deerling Winter",
  "sawsbuck|spring": null,
  "sawsbuck|summer": "Sawsbuck Summer",
  "sawsbuck|autumn": "Sawsbuck Fall",
  "sawsbuck|winter": "Sawsbuck Winter",
  "toxtricity|amped": null,
  "toxtricity|low key": "Toxtricity Low Key",
  "sinistea|phony": null,
  "sinistea|antique": "Sinistea Antique Form",
  "polteageist|phony": null,
  "polteageist|antique": "Polteageist Antique Form",
  "poltchageist|counterfeit": null,
  "poltchageist|artisan": "Poltchageist Artisan",
  "sinistcha|unremarkable": null,
  "sinistcha|masterpiece": "Sinistcha Masterpiece",
  "shellos|west": null,
  "shellos|east": "Shellos East Sea",
  "gastrodon|west": null,
  "gastrodon|east": "Gastrodon East Sea",
  "tatsugiri|curly": null,
  "tatsugiri|droopy": "Tatsugiri Droopy",
  "tatsugiri|stretchy": "Tatsugiri Stretchy",
  "tauros|paldean": "Tauros Paldean Combat Breed",
  "tauros|blaze": "Tauros Paldean Blaze Breed",
  "tauros|aqua": "Tauros Paldean Aqua Breed",
  "ogerpon|teal mask": null,
  "ogerpon|wellspring mask": "Ogerpon Wellspring Mask",
  "ogerpon|hearthflame mask": "Ogerpon Hearthflame Mask",
  "ogerpon|cornerstone mask": "Ogerpon Cornerstone Mask",
  "ursaluna|bloodmoon": "Ursaluna Bloodmoon",
  "tornadus|incarnate": null,
  "tornadus|therian": "Tornadus Therian",
  "thundurus|incarnate": null,
  "thundurus|therian": "Thundurus Therian",
  "landorus|incarnate": null,
  "landorus|therian": "Landorus Therian",
  "enamorus|incarnate": null,
  "enamorus|therian": "Enamorus Therian",
  "meloetta|aria": null,
  "meloetta|pirouette": "Meloetta Pirouette",
  "hoopa|confined": null,
  "hoopa|unbound": "Hoopa Unbound",
  "zarude|dada": "Zarude Dada",
  "minior|red core": null,
  "minior|orange core": "Minior Orange Core",
  "minior|yellow core": "Minior Yellow Core",
  "minior|green core": "Minior Green Core",
  "minior|blue core": "Minior Blue Core",
  "minior|indigo core": "Minior Indigo Core",
  "minior|violet core": "Minior Violet Core",
  "koraidon|apex build": null,
  "miraidon|ultimate mode": null,
};

const BASE_FORM_DETAILS = new Set([
  "10 percent",
  "amped",
  "altered",
  "average size",
  "baile",
  "chest",
  "confined",
  "counterfeit",
  "curly",
  "family of four",
  "green plumage",
  "incarnate",
  "kalosian",
  "kantonian",
  "land",
  "midday",
  "phony",
  "red core",
  "red flower",
  "red stripe",
  "spring",
  "standard mode",
  "unovan",
  "west",
]);

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  let sheet: SheetKey | "all" = "all";
  let csvPath: string | null = null;
  let write = false;

  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === "--csv") {
      csvPath = args[++index] ?? csvPath;
    } else if (arg === "--sheet") {
      const value = args[++index];
      if (!value || (value !== "all" && !Object.hasOwn(SHEET_CONFIGS, value))) {
        throw new Error(`Unknown sheet: ${value ?? ""}`);
      }
      sheet = value as SheetKey | "all";
    } else if (arg === "--write") {
      write = true;
    } else if (arg === "--dry-run") {
      write = false;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (csvPath && sheet === "all") {
    throw new Error("--csv can only be used with a single --sheet value.");
  }

  return { sheet, csvPath, write };
}

function printHelp() {
  console.log(`Usage:
  npm run import:sylvanoth-sv -- --dry-run
  npm run import:sylvanoth-sv -- --write
  npm run import:sylvanoth-sv -- --sheet teal-mask --dry-run

Options:
  --sheet <name>  One of: all, paldea, teal-mask, indigo-disk, transfer.
  --csv <path>    Override CSV path for one selected sheet.
  --dry-run       Parse and summarize only. Default behavior.
  --write         Replace this importer's manual rows in public.spawn_locations.
`);
}

function parseCsv(content: string): CsvRow[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < content.length; index++) {
    const char = content[index];
    const next = content[index + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        value += '"';
        index++;
      } else if (char === '"') {
        quoted = false;
      } else {
        value += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(value);
      value = "";
    } else if (char === "\n") {
      row.push(value.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }

  if (value.length > 0 || row.length > 0) {
    row.push(value.replace(/\r$/, ""));
    rows.push(row);
  }

  const [headers, ...dataRows] = rows;
  if (!headers) return [];

  return dataRows
    .filter((dataRow) => dataRow.some((cell) => cell.trim().length > 0))
    .map((dataRow) =>
      Object.fromEntries(
        headers.map((header, index) => [header, dataRow[index] ?? ""]),
      ),
    );
}

function normalizeKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "")
    .replace(/♀/g, "female")
    .replace(/♂/g, "male")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function slug(value: string): string {
  return normalizeKey(value).replaceAll(" ", "-") || "unknown";
}

function hash(value: string): string {
  return crypto.createHash("sha1").update(value).digest("hex").slice(0, 12);
}

function parsePokemonName(rawPokemon: string): ParsedPokemonName {
  const lines = rawPokemon
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const baseName = lines[0]?.trim() ?? "";
  const rest = lines.slice(1).join(" ");
  const gender = rest.includes("♀") ? "female" : rest.includes("♂") ? "male" : null;
  const detailMatch = rest.match(/\(([^)]+)\)/);
  const detail = detailMatch?.[1]?.trim() ?? null;
  return { baseName, detail, gender };
}

async function loadLocalForms(): Promise<LocalForm[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

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

function buildFormLookups(forms: LocalForm[]) {
  const byDisplayName = new Map<string, LocalForm>();
  const baseByName = new Map<string, LocalForm>();
  const femaleBySpecies = new Map<number, LocalForm>();

  for (const form of forms) {
    byDisplayName.set(normalizeKey(form.display_name), form);
    if (!form.form_name) baseByName.set(normalizeKey(form.display_name), form);
    if (form.form_name?.endsWith("-female")) {
      femaleBySpecies.set(form.species_id, form);
    }
  }

  return { byDisplayName, baseByName, femaleBySpecies };
}

function resolvePokemon(
  parsed: ParsedPokemonName,
  lookups: ReturnType<typeof buildFormLookups>,
): ResolvedPokemon | null {
  const base = lookups.baseByName.get(normalizeKey(parsed.baseName));
  if (!base) return null;

  if (parsed.gender === "female") {
    const female = lookups.femaleBySpecies.get(base.species_id);
    if (female) {
      return {
        speciesId: female.species_id,
        formName: female.form_name,
        displayName: female.display_name,
      };
    }
  }

  const normalizedDetail = parsed.detail ? normalizeKey(parsed.detail) : null;
  if (!normalizedDetail || BASE_FORM_DETAILS.has(normalizedDetail)) {
    return {
      speciesId: base.species_id,
      formName: base.form_name,
      displayName: base.display_name,
    };
  }

  const aliasKey = `${normalizeKey(parsed.baseName)}|${normalizedDetail}`;
  if (Object.hasOwn(FORM_DETAIL_DISPLAY_ALIASES, aliasKey)) {
    const displayName = FORM_DETAIL_DISPLAY_ALIASES[aliasKey];
    if (!displayName) {
      return {
        speciesId: base.species_id,
        formName: base.form_name,
        displayName: base.display_name,
      };
    }
    const form = lookups.byDisplayName.get(normalizeKey(displayName));
    if (!form) return null;
    return {
      speciesId: form.species_id,
      formName: form.form_name,
      displayName: form.display_name,
    };
  }

  const generated = lookups.byDisplayName.get(
    normalizeKey(`${parsed.baseName} ${parsed.detail}`),
  );
  if (generated) {
    return {
      speciesId: generated.species_id,
      formName: generated.form_name,
      displayName: generated.display_name,
    };
  }

  return {
    speciesId: base.species_id,
    formName: base.form_name,
    displayName: base.display_name,
  };
}

function versionIdsFor(ver: string): string[] {
  const normalized = ver.trim().toUpperCase();
  if (/^S(?!V)/.test(normalized)) return ["scarlet"];
  if (/^V/.test(normalized)) return ["violet"];
  return ["scarlet", "violet"];
}

function canonicalLocationName(raw: string): string {
  let value = raw
    .replace(/\s+/g, " ")
    .replace(/\.$/, "")
    .replace(/\s+\((Best Found Here|Fixed Wild Tera Type)\)/i, "")
    .trim();

  value = canonicalizeLocationName(value);

  if (/^Area Zero$/i.test(value)) return "The Great Crater of Paldea";
  if (/^Pokemon League$/i.test(value)) return "The Pokemon League";
  if (/^[1-7](?:\*| Star) Tera Raid(?: Battles?)?$/i.test(value)) {
    return "Tera Raid Battles";
  }
  if (/^[1-7] Star Raid Battles?$/i.test(value)) return "Tera Raid Battles";
  if (/^Transfer from HOME$/i.test(value)) return "Pokemon HOME";
  return value;
}

function splitPotentialLocations(text: string): string[] {
  return text
    .replace(/\r/g, "")
    .split(/\n+/)
    .flatMap((line) =>
      line.includes(";") || /postcard form|snacksworth|global:/i.test(line)
        ? [line]
        : line.split(","),
    )
    .map((part) => part.trim())
    .filter(Boolean);
}

function classifyChecklistPart(part: string, versionIds: string[]): ChecklistLocation | null {
  const normalized = part.replace(/\s+/g, " ").trim();
  if (!normalized || /^global:/i.test(normalized)) return null;

  const raidMatch = normalized.match(/^([1-7])(?:\*| Star) (?:Tera )?Raid(?: Battles?)?/i);
  if (raidMatch) {
    return {
      locationName: /event/i.test(normalized) ? "Event Tera Raid Battles" : "Tera Raid Battles",
      areaName: `${raidMatch[1]} Star Tera Raid Battles`,
      methodIdentifier: "tera-raid",
      methodName: "Tera Raid",
      versionIds,
      teraRaidStarLevel: raidMatch[1] ?? null,
      notes: normalized,
    };
  }

  if (/^evolve\b/i.test(normalized) || /^form change\b/i.test(normalized)) {
    return {
      locationName: "Evolution / Form Change",
      areaName: "Evolution / Form Change",
      methodIdentifier: "evolution",
      methodName: /^form change\b/i.test(normalized)
        ? "Form Change"
        : "Evolution",
      versionIds,
      teraRaidStarLevel: null,
      notes: normalized,
    };
  }

  if (/starter pokemon|received as a starter/i.test(normalized)) {
    return {
      locationName: normalized.includes("Cabo Poco") ? "Cabo Poco" : "Starter Pokemon",
      areaName: "Starter Pokemon",
      methodIdentifier: "starter",
      methodName: "Starter",
      versionIds,
      teraRaidStarLevel: null,
      notes: normalized,
    };
  }

  if (/can be bred|breed/i.test(normalized)) {
    return {
      locationName: "Breeding",
      areaName: "Breeding",
      methodIdentifier: "breeding",
      methodName: "Breeding",
      versionIds,
      teraRaidStarLevel: null,
      notes: normalized,
    };
  }

  if (/transfer from home/i.test(normalized)) {
    return {
      locationName: "Pokemon HOME",
      areaName: "Pokemon HOME",
      methodIdentifier: "transfer",
      methodName: "Transfer",
      versionIds,
      teraRaidStarLevel: null,
      notes: normalized,
    };
  }

  if (/snacksworth|static encounter|perrin quest|salvatore|mystery gift|gift pokemon|trade|interactions with|collect all|shrine|event|available temporarily/i.test(normalized)) {
    return {
      locationName: /raid event/i.test(normalized) ? "Event Raid" : "Gift / Trade / Special",
      areaName: "Gift / Trade / Special",
      methodIdentifier: "gift-trade-special",
      methodName: "Gift/Trade",
      versionIds,
      teraRaidStarLevel: null,
      notes: normalized,
    };
  }

  if (/not known to be found in the wild/i.test(normalized)) return null;
  if (/postcard form/i.test(normalized)) {
    return {
      locationName: "Pokemon GO Postcard",
      areaName: "Pokemon GO Postcard",
      methodIdentifier: "postcard",
      methodName: "Postcard",
      versionIds,
      teraRaidStarLevel: null,
      notes: normalized,
    };
  }

  const fixedTera = /\(Fixed Wild Tera Type\)/i.test(normalized);
  const locationName = canonicalLocationName(normalized);
  if (!locationName) return null;

  return {
    locationName,
    areaName: locationName,
    methodIdentifier: fixedTera ? "fixed-wild-tera" : "wild",
    methodName: fixedTera ? "Fixed Wild Tera" : "Wild",
    versionIds,
    teraRaidStarLevel: null,
    notes: fixedTera ? normalized : null,
  };
}

function transferLocation(versionIds: string[], notes: string): ChecklistLocation {
  return {
    locationName: "Pokemon HOME",
    areaName: "Pokemon HOME",
    methodIdentifier: "transfer",
    methodName: "Transfer",
    versionIds,
    teraRaidStarLevel: null,
    notes,
  };
}

function specialLocation(
  locationName: string,
  areaName: string,
  methodIdentifier: string,
  methodName: string,
  versionIds: string[],
  notes: string,
): ChecklistLocation {
  return {
    locationName,
    areaName,
    methodIdentifier,
    methodName,
    versionIds,
    teraRaidStarLevel: null,
    notes,
  };
}

function parseSpecialLocationBlock(
  locationText: string,
  notesText: string,
  versionIds: string[],
): ChecklistLocation[] | null {
  const normalized = locationText.replace(/\r/g, "").trim();
  if (!normalized) return null;

  const combinedNotes = [normalized, notesText.trim()].filter(Boolean).join("\n");
  const includesHomeTransfer = /transfer from home/i.test(normalized);
  const locations: ChecklistLocation[] = [];

  if (/snacksworth/i.test(normalized)) {
    const areaMatch = normalized.match(/\(([^)]+)\)/);
    locations.push(
      specialLocation(
        "Snacksworth Static Encounter",
        areaMatch?.[1]?.trim() || "Snacksworth Static Encounter",
        "static-encounter",
        "Static Encounter",
        versionIds,
        combinedNotes,
      ),
    );
  } else if (/perrin/i.test(normalized)) {
    locations.push(
      specialLocation(
        "Perrin Quest",
        "Perrin Quest",
        "gift-trade-special",
        "Gift/Trade",
        versionIds,
        combinedNotes,
      ),
    );
  } else if (/salvatore/i.test(normalized)) {
    locations.push(
      specialLocation(
        "Salvatore Gift/Trade",
        "Salvatore Gift/Trade",
        "gift-trade-special",
        "Gift/Trade",
        versionIds,
        combinedNotes,
      ),
    );
  } else if (/mystery gift/i.test(normalized)) {
    locations.push(
      specialLocation(
        "Mystery Gift",
        "Mystery Gift",
        "gift-trade-special",
        "Gift/Trade",
        versionIds,
        combinedNotes,
      ),
    );
  }

  if (includesHomeTransfer) {
    locations.push(transferLocation(versionIds, "Transfer from HOME"));
  }

  return locations.length > 0 ? locations : null;
}

function parseLocations(locationText: string, notesText: string, versionIds: string[]) {
  const specialLocations = parseSpecialLocationBlock(locationText, notesText, versionIds);
  if (specialLocations) return specialLocations;

  const combinedNotes = notesText.trim();
  return splitPotentialLocations(locationText)
    .map((part) => classifyChecklistPart(part, versionIds))
    .filter((location): location is ChecklistLocation => !!location)
    .map((location) => ({
      ...location,
      notes: [location.notes, combinedNotes].filter(Boolean).join("\n") || null,
    }));
}

function toImportRow(
  config: SheetConfig,
  pokemon: ResolvedPokemon,
  dexNumber: string,
  rowIndex: number,
  rawVersion: string,
  location: ChecklistLocation,
): SpawnLocationImportRow {
  const gameId = config.gameIdForVersion?.(rawVersion) ?? config.defaultGameId;
  const sourceKeySeed = [
    config.sourcePrefix,
    dexNumber,
    pokemon.speciesId,
    pokemon.formName ?? "base",
    gameId,
    location.locationName,
    location.areaName,
    location.methodIdentifier,
    location.teraRaidStarLevel ?? "",
    location.versionIds.join("-"),
    rowIndex,
  ].join("|");
  const sourceKey = `${config.sourcePrefix}:${hash(sourceKeySeed)}`;
  const locationPrefix = `${slug(config.key)}-checklist`;

  return {
    game_id: gameId,
    version_ids: location.versionIds,
    species_id: pokemon.speciesId,
    form_name: pokemon.formName,
    pokemon_form_identifier: pokemon.formName ?? slug(pokemon.displayName),
    location_identifier: `${locationPrefix}-${slug(location.locationName)}`,
    location_name: location.locationName,
    location_area_identifier: `${locationPrefix}-${slug(location.areaName)}`,
    location_area_name: location.areaName,
    region_area_identifier: null,
    encounter_method_identifier: location.methodIdentifier,
    encounter_method_name: location.methodName,
    levels: null,
    alpha_levels: null,
    tera_raid_star_level: location.teraRaidStarLevel,
    time_labels: [],
    weather_labels: [],
    terrain_labels: [],
    rates: {},
    notes: location.notes,
    source: "manual",
    source_key: sourceKey,
    confidence: "medium",
  };
}

async function deleteExistingSylvanothRows(configs: SheetConfig[]) {
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

  for (const config of configs) {
    const { error } = await supabase
      .from("spawn_locations")
      .delete()
      .eq("source", "manual")
      .like("source_key", `${config.sourcePrefix}:%`);

    if (error) throw error;
  }
}

async function upsertRows(rows: SpawnLocationImportRow[]) {
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
    const { error } = await supabase
      .from("spawn_locations")
      .upsert(batch, { onConflict: "source,source_key" });
    if (error) throw error;
  }
}

function summarizeBy<T>(items: T[], getKey: (item: T) => string) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = getKey(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
}

function selectedConfigs(options: CliOptions): SheetConfig[] {
  const configs =
    options.sheet === "all"
      ? Object.values(SHEET_CONFIGS)
      : [SHEET_CONFIGS[options.sheet]];

  if (!options.csvPath) return configs;

  return configs.map((config) => ({
    ...config,
    csvPath: options.csvPath ?? config.csvPath,
  }));
}

function importSheet(
  config: SheetConfig,
  lookups: ReturnType<typeof buildFormLookups>,
): SheetImportSummary {
  const csvPath = path.resolve(config.csvPath);
  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV not found: ${csvPath}`);
  }

  const rows = parseCsv(fs.readFileSync(csvPath, "utf8"));
  const importRows: SpawnLocationImportRow[] = [];
  const unresolved: string[] = [];
  const noLocations: string[] = [];

  rows.forEach((row, rowIndex) => {
    const dexNumber = (row[config.dexColumn] ?? "").trim();
    if (!/^\d+$/.test(dexNumber)) return;

    const rawPokemon = row.Pokemon ?? "";
    const parsed = parsePokemonName(rawPokemon);
    const pokemon = resolvePokemon(parsed, lookups);
    if (!pokemon) {
      unresolved.push(`${dexNumber}: ${rawPokemon}`);
      return;
    }

    const rawVersion = row.Ver ?? "SV";
    const locations = parseLocations(
      row.Location ?? "",
      row.Notes ?? "",
      versionIdsFor(rawVersion),
    );
    if (locations.length === 0) {
      noLocations.push(`${dexNumber}: ${rawPokemon}`);
      return;
    }

    importRows.push(
      ...locations.map((location) =>
        toImportRow(config, pokemon, dexNumber, rowIndex, rawVersion, location),
      ),
    );
  });

  return {
    config,
    parsedRows: rows.length,
    importRows,
    unresolved,
    noLocations,
  };
}

function printSummary(summary: SheetImportSummary) {
  console.log(`\n${summary.config.label}`);
  console.log(`  Parsed CSV rows: ${summary.parsedRows}`);
  console.log(`  Generated spawn rows: ${summary.importRows.length}`);
  console.log(`  Unresolved Pokemon rows: ${summary.unresolved.length}`);
  console.log(`  Rows without importable locations: ${summary.noLocations.length}`);

  const topMethods = summarizeBy(summary.importRows, (row) => row.encounter_method_name)
    .slice(0, 8)
    .map(([key, count]) => `    ${key}: ${count}`)
    .join("\n");
  if (topMethods) {
    console.log("  Top methods:");
    console.log(topMethods);
  }

  const topLocations = summarizeBy(summary.importRows, (row) => row.location_name)
    .slice(0, 8)
    .map(([key, count]) => `    ${key}: ${count}`)
    .join("\n");
  if (topLocations) {
    console.log("  Top locations:");
    console.log(topLocations);
  }

  if (summary.unresolved.length > 0) {
    console.log("  Unresolved Pokemon samples:");
    console.log(summary.unresolved.slice(0, 20).map((item) => `    ${item}`).join("\n"));
  }

  if (summary.noLocations.length > 0) {
    console.log("  No-location samples:");
    console.log(summary.noLocations.slice(0, 10).map((item) => `    ${item}`).join("\n"));
  }
}

async function main() {
  const options = parseArgs();
  const configs = selectedConfigs(options);
  const forms = await loadLocalForms();
  const lookups = buildFormLookups(forms);
  const summaries = configs.map((config) => importSheet(config, lookups));
  const importRows = summaries.flatMap((summary) => summary.importRows);
  const unresolved = summaries.flatMap((summary) => summary.unresolved);

  for (const summary of summaries) {
    printSummary(summary);
  }

  console.log("\nCombined");
  console.log(`  Generated spawn rows: ${importRows.length}`);
  console.log(`  Unresolved Pokemon rows: ${unresolved.length}`);
  console.log("  Rows by game:");
  console.log(
    summarizeBy(importRows, (row) => row.game_id)
      .map(([key, count]) => `    ${key}: ${count}`)
      .join("\n"),
  );
  console.log("  Rows by source:");
  console.log(
    summarizeBy(importRows, (row) => row.source_key.split(":")[0] ?? "unknown")
      .map(([key, count]) => `    ${key}: ${count}`)
      .join("\n"),
  );

  console.log("\nSample rows:");
  console.log(JSON.stringify(importRows.slice(0, 8), null, 2));

  if (unresolved.length > 0) {
    throw new Error("Import has unresolved Pokemon rows. Fix aliases before writing.");
  }

  if (!options.write) {
    console.log("\nDry run only. No Supabase rows were written.");
    return;
  }

  await deleteExistingSylvanothRows(configs);
  await upsertRows(importRows);
  console.log(`\nWrote ${importRows.length} Sylvanoth SV spawn rows.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

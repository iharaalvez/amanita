import type {
  ApiHealth,
  GameDexEntry,
  GameHomeBoxFormRule,
  GameHomeBoxEntry,
  GameLocationGroup,
  GameLocationPokemon,
  LivingDexEntry,
  MapLocationOutline,
  UserProfile,
} from "@/types/pokemon";
import { GENDER_DIFFERENCE_FORM_KEYS } from "@/config/cosmetic-forms";
import { BATTLE_ONLY_FORM_NAMES } from "@/config/battle-forms";
import { isAllowedGameHomeBoxForm } from "@/config/game-home-box-forms";
import { GAME_LIST } from "@/config/games";
import type { GameEntry } from "@/config/games";
import { supabase } from "./supabase";

const LIVING_DEX_PAGE_SIZE = 1000;
let rawLivingDexEntriesPromise: Promise<RawLivingDexEntry[]> | null = null;

const MYTHICAL_IDS = new Set([
  151, 251, 385, 386, 489, 490, 491, 492, 493, 494, 647, 648, 649, 719, 720,
  721, 801, 802, 807, 808, 809, 893, 1025,
]);

const SHINY_CHARM_GAME_IDS = new Set(
  GAME_LIST.filter((game) => game.hasShinyCharm).map((game) => game.id),
);
const MEGA_FORM_PATTERN = /(^|-)mega($|-)/;

type RawLivingDexEntry = {
  id: number;
  species_id: number;
  form_name: string | null;
  display_name: string;
  sprite_url: string;
  shiny_sprite_url: string;
  is_regional_form: boolean;
  region_label: string | null;
  sort_order: number;
  types?: string[];
  stats?: Record<string, number>;
  height?: number | null;
  weight?: number | null;
};

type RawGameDexEntry = {
  game_id: string;
  species_id: number;
  form_name: string;
  entry_number: number | null;
};

type RawEncounter = {
  species_id: number;
  form_name: string | null;
  game_id: string;
  location_name: string;
};

type RawSpawnLocation = {
  game_id: string;
  version_ids: string[];
  species_id: number;
  form_name: string | null;
  location_identifier: string;
  location_name: string;
  location_area_identifier: string;
  location_area_name: string;
  encounter_method_name: string;
  levels: string | null;
  source: "pokeapi" | "pokedb" | "manual";
  confidence: "high" | "medium" | "low";
};

type RawUserProfile = {
  user_id: string;
  role: "user" | "admin";
  display_name: string | null;
};

type RawGameHomeBoxFormRule = {
  id: number;
  game_id: string;
  species_id: number;
  form_name: string | null;
  allowed: boolean;
  notes: string | null;
  updated_by: string | null;
  updated_at: string | null;
};

function getGenerationFromSpeciesId(speciesId: number): number {
  if (speciesId <= 151) return 1;
  if (speciesId <= 251) return 2;
  if (speciesId <= 386) return 3;
  if (speciesId <= 493) return 4;
  if (speciesId <= 649) return 5;
  if (speciesId <= 721) return 6;
  if (speciesId <= 809) return 7;
  if (speciesId <= 905) return 8;
  return 9;
}

// Regional forms were introduced in the generation of their region, not their base species.
const REGION_GENERATION: Record<string, number> = {
  Alolan: 7,
  Galarian: 8,
  Hisuian: 8,
  Paldean: 9,
};

function titleCase(name: string): string {
  return name
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function mapLivingDexEntry(entry: RawLivingDexEntry): LivingDexEntry {
  return {
    id: entry.id,
    speciesId: entry.species_id,
    name:
      entry.form_name ?? entry.display_name.toLowerCase().replaceAll(" ", "-"),
    formName: entry.form_name,
    displayName: entry.display_name,
    generation:
      entry.is_regional_form &&
      entry.region_label &&
      REGION_GENERATION[entry.region_label]
        ? REGION_GENERATION[entry.region_label]
        : getGenerationFromSpeciesId(entry.species_id),
    spriteUrl: entry.sprite_url,
    shinySpriteUrl: entry.shiny_sprite_url,
    isRegionalForm: entry.is_regional_form,
    regionLabel: entry.region_label,
    sortOrder: entry.sort_order,
    types: entry.types as LivingDexEntry["types"],
    stats: entry.stats as LivingDexEntry["stats"],
    height: entry.height,
    weight: entry.weight,
  };
}

function livingEntryKey(speciesId: number, formName: string | null): string {
  return `${speciesId}:${formName ?? ""}`;
}

async function getRawLivingDexEntries(): Promise<RawLivingDexEntry[]> {
  if (rawLivingDexEntriesPromise) return rawLivingDexEntriesPromise;

  rawLivingDexEntriesPromise = fetchRawLivingDexEntries().catch((error) => {
    rawLivingDexEntriesPromise = null;
    throw error;
  });

  return rawLivingDexEntriesPromise;
}

async function fetchRawLivingDexEntries(): Promise<RawLivingDexEntry[]> {
  const rows: RawLivingDexEntry[] = [];
  let from = 0;

  while (true) {
    const to = from + LIVING_DEX_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("living_dex_entries")
      .select(
        "id,species_id,form_name,display_name,sprite_url,shiny_sprite_url,is_regional_form,region_label,sort_order,types,stats,height,weight",
      )
      .order("sort_order", { ascending: true })
      .range(from, to);

    if (error) throw error;

    const page = (data ?? []) as RawLivingDexEntry[];
    rows.push(...page);
    if (page.length < LIVING_DEX_PAGE_SIZE) break;
    from += LIVING_DEX_PAGE_SIZE;
  }

  return rows;
}

async function getRawGameDexEntries(
  gameId: string,
): Promise<RawGameDexEntry[]> {
  const { data, error } = await supabase
    .from("game_dex_entries")
    .select("game_id,species_id,form_name,entry_number")
    .eq("game_id", gameId)
    .order("entry_number", { ascending: true })
    .order("species_id", { ascending: true })
    .order("form_name", { ascending: false });

  if (error) throw error;
  return (data ?? []) as RawGameDexEntry[];
}

function isOptionalInGameDex(gameId: string, speciesId: number): boolean {
  return SHINY_CHARM_GAME_IDS.has(gameId) && MYTHICAL_IDS.has(speciesId);
}

function mapGameDexEntry(
  entry: LivingDexEntry,
  entryNumber: number,
  optional: boolean,
): GameDexEntry {
  return {
    speciesId: entry.speciesId,
    entryNumber,
    formName: entry.formName,
    displayName: entry.displayName,
    spriteUrl: entry.spriteUrl,
    optional,
  };
}

function mapGameHomeBoxEntry(
  entry: LivingDexEntry,
  entryNumber: number,
  optional: boolean,
): GameHomeBoxEntry {
  return {
    ...entry,
    entryNumber,
    optional,
  };
}

function mapGameHomeBoxFormRule(
  row: RawGameHomeBoxFormRule,
): GameHomeBoxFormRule {
  return {
    id: row.id,
    gameId: row.game_id,
    speciesId: row.species_id,
    formName: row.form_name,
    allowed: row.allowed,
    notes: row.notes,
    updatedBy: row.updated_by,
    updatedAt: row.updated_at,
  };
}

function mapUserProfile(row: RawUserProfile): UserProfile {
  return {
    userId: row.user_id,
    role: row.role,
    displayName: row.display_name,
  };
}

function buildGameHomeBoxRuleLookup(
  rules: readonly GameHomeBoxFormRule[],
): Map<number, GameHomeBoxFormRule[]> {
  const lookup = new Map<number, GameHomeBoxFormRule[]>();
  for (const rule of rules) {
    const existing = lookup.get(rule.speciesId) ?? [];
    existing.push(rule);
    lookup.set(rule.speciesId, existing);
  }
  return lookup;
}

function isAllowedGameHomeBoxFormWithRules(
  rulesBySpecies: Map<number, GameHomeBoxFormRule[]>,
  gameId: string,
  speciesId: number,
  formName: string | null,
): boolean {
  const speciesRules = rulesBySpecies.get(speciesId);
  if (!speciesRules?.length) {
    return isAllowedGameHomeBoxForm(gameId, speciesId, formName);
  }
  return speciesRules.some(
    (rule) => rule.formName === formName && rule.allowed,
  );
}

function isGenderDifferenceEntry(entry: LivingDexEntry): boolean {
  return (
    !!entry.formName &&
    GENDER_DIFFERENCE_FORM_KEYS.has(`${entry.speciesId}-${entry.formName}`)
  );
}

function isExcludedHomeBoxForm(formName: string | null): boolean {
  return (
    !!formName &&
    (BATTLE_ONLY_FORM_NAMES.has(formName) || MEGA_FORM_PATTERN.test(formName))
  );
}

function isGenderDifferenceForGameForm(
  entry: LivingDexEntry,
  baseEntry: LivingDexEntry | undefined,
  formName: string | null,
): boolean {
  if (!isGenderDifferenceEntry(entry) || !entry.formName) return false;
  if (formName) return entry.formName === `${formName}-female`;
  return !!baseEntry && entry.formName === `${baseEntry.name}-female`;
}

function shouldExpandLivingFormForGameRow(
  rulesBySpecies: Map<number, GameHomeBoxFormRule[]>,
  gameId: string,
  entry: LivingDexEntry,
  baseEntry: LivingDexEntry | undefined,
  formName: string | null,
): boolean {
  if (
    !isAllowedGameHomeBoxFormWithRules(
      rulesBySpecies,
      gameId,
      entry.speciesId,
      entry.formName,
    )
  ) {
    return false;
  }
  if (!entry.formName) return false;
  if (isExcludedHomeBoxForm(entry.formName)) return false;
  if (isGenderDifferenceForGameForm(entry, baseEntry, formName)) return true;
  if (isGenderDifferenceEntry(entry)) return false;
  if (formName) return entry.formName === formName;
  return true;
}

export const api = {
  async getLivingDexEntries(): Promise<LivingDexEntry[]> {
    const rows = await getRawLivingDexEntries();
    return rows.map(mapLivingDexEntry);
  },

  async getGameDex(gameId: string): Promise<GameDexEntry[]> {
    const livingEntries = (await getRawLivingDexEntries()).map(
      mapLivingDexEntry,
    );
    const gameRows = await getRawGameDexEntries(gameId);
    const livingEntryByKey = new Map(
      livingEntries.map((entry) => [
        livingEntryKey(entry.speciesId, entry.formName),
        entry,
      ]),
    );
    const bySpecies = new Map<number, GameDexEntry>();

    for (const row of gameRows) {
      const formName = row.form_name === "" ? null : row.form_name;
      const livingEntry = livingEntryByKey.get(
        livingEntryKey(row.species_id, formName),
      );
      if (!livingEntry) continue;

      const optional = isOptionalInGameDex(gameId, row.species_id);
      const current = bySpecies.get(row.species_id);
      if (!current || formName) {
        bySpecies.set(
          row.species_id,
          mapGameDexEntry(
            livingEntry,
            row.entry_number ?? row.species_id,
            optional,
          ),
        );
      }
    }

    return Array.from(bySpecies.values()).sort((a, b) =>
      a.entryNumber === b.entryNumber
        ? a.speciesId - b.speciesId
        : a.entryNumber - b.entryNumber,
    );
  },

  async getGameHomeBoxDex(gameId: string): Promise<GameHomeBoxEntry[]> {
    const [livingRows, gameRows, formRules] = await Promise.all([
      getRawLivingDexEntries(),
      getRawGameDexEntries(gameId),
      this.getGameHomeBoxFormRules(gameId).catch(() => []),
    ]);
    const livingEntries = livingRows.map(mapLivingDexEntry);
    const rulesBySpecies = buildGameHomeBoxRuleLookup(formRules);
    const livingEntryByKey = new Map(
      livingEntries.map((entry) => [
        livingEntryKey(entry.speciesId, entry.formName),
        entry,
      ]),
    );
    const entriesByKey = new Map<string, GameHomeBoxEntry>();

    const addEntry = (
      entry: LivingDexEntry,
      entryNumber: number,
      optional: boolean,
    ) => {
      entriesByKey.set(
        livingEntryKey(entry.speciesId, entry.formName),
        mapGameHomeBoxEntry(entry, entryNumber, optional),
      );
    };

    for (const row of gameRows) {
      const formName = row.form_name === "" ? null : row.form_name;
      const entryNumber = row.entry_number ?? row.species_id;
      const optional = isOptionalInGameDex(gameId, row.species_id);
      const livingEntry = livingEntryByKey.get(
        livingEntryKey(row.species_id, formName),
      );
      if (!livingEntry) continue;

      if (
        !isExcludedHomeBoxForm(formName) &&
        isAllowedGameHomeBoxFormWithRules(
          rulesBySpecies,
          gameId,
          livingEntry.speciesId,
          formName,
        )
      ) {
        addEntry(livingEntry, entryNumber, optional);
      }

      const baseEntry = livingEntryByKey.get(
        livingEntryKey(row.species_id, null),
      );
      for (const possibleGenderEntry of livingEntries) {
        if (possibleGenderEntry.speciesId !== row.species_id) continue;
        if (
          shouldExpandLivingFormForGameRow(
            rulesBySpecies,
            gameId,
            possibleGenderEntry,
            baseEntry,
            formName,
          )
        ) {
          addEntry(possibleGenderEntry, entryNumber, optional);
        }
      }
    }

    return Array.from(entriesByKey.values()).sort((a, b) =>
      a.entryNumber === b.entryNumber
        ? a.speciesId === b.speciesId
          ? (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
            a.displayName.localeCompare(b.displayName)
          : a.speciesId - b.speciesId
        : a.entryNumber - b.entryNumber,
    );
  },

  async getCurrentUserProfile(): Promise<UserProfile | null> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("user_profiles")
      .select("user_id,role,display_name")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw error;
    return data ? mapUserProfile(data as RawUserProfile) : null;
  },

  async getGameHomeBoxFormRules(
    gameId?: string,
  ): Promise<GameHomeBoxFormRule[]> {
    let query = supabase
      .from("game_home_box_form_rules")
      .select(
        "id,game_id,species_id,form_name,allowed,notes,updated_by,updated_at",
      )
      .order("game_id", { ascending: true })
      .order("species_id", { ascending: true })
      .order("form_name", { ascending: true, nullsFirst: true });

    if (gameId) query = query.eq("game_id", gameId);

    const { data, error } = await query;
    if (error) throw error;
    return ((data ?? []) as RawGameHomeBoxFormRule[]).map(
      mapGameHomeBoxFormRule,
    );
  },

  async upsertGameHomeBoxFormRule(
    rule: Omit<GameHomeBoxFormRule, "id" | "updatedBy" | "updatedAt">,
  ): Promise<void> {
    const { error } = await supabase.from("game_home_box_form_rules").upsert(
      {
        game_id: rule.gameId,
        species_id: rule.speciesId,
        form_name: rule.formName,
        allowed: rule.allowed,
        notes: rule.notes,
      },
      { onConflict: "game_id,species_id,form_name" },
    );

    if (error) throw error;
  },

  async deleteGameHomeBoxFormRules(
    gameId: string,
    speciesId: number,
  ): Promise<void> {
    const { error } = await supabase
      .from("game_home_box_form_rules")
      .delete()
      .eq("game_id", gameId)
      .eq("species_id", speciesId);

    if (error) throw error;
  },

  async getEncounters(speciesId: number): Promise<Record<string, string[]>> {
    const { data, error } = await supabase
      .from("encounters")
      .select("species_id,form_name,game_id,location_name")
      .eq("species_id", speciesId)
      .order("game_id", { ascending: true })
      .order("location_name", { ascending: true });

    if (error) throw error;

    const encountersByGame: Record<string, string[]> = {};
    for (const row of (data ?? []) as RawEncounter[]) {
      encountersByGame[row.game_id] ??= [];
      if (!encountersByGame[row.game_id].includes(row.location_name)) {
        encountersByGame[row.game_id].push(row.location_name);
      }
    }

    return encountersByGame;
  },

  async getGameLocations(gameId: string): Promise<GameLocationGroup[]> {
    const [livingRows, spawnResult] = await Promise.all([
      getRawLivingDexEntries(),
      supabase
        .from("spawn_locations")
        .select(
          "game_id,version_ids,species_id,form_name,location_identifier,location_name,location_area_identifier,location_area_name,encounter_method_name,levels,source,confidence",
        )
        .eq("game_id", gameId)
        .order("location_name", { ascending: true })
        .order("location_area_name", { ascending: true })
        .order("species_id", { ascending: true }),
    ]);

    const livingEntries = livingRows.map(mapLivingDexEntry);
    const livingEntryByKey = new Map(
      livingEntries.map((entry) => [
        livingEntryKey(entry.speciesId, entry.formName),
        entry,
      ]),
    );
    if (spawnResult.error) throw spawnResult.error;

    const spawnRows = (spawnResult.data ?? []) as RawSpawnLocation[];
    if (spawnRows.length > 0) {
      const locations = new Map<
        string,
        {
          source: "pokeapi" | "pokedb" | "manual";
          confidence: "high" | "medium" | "low";
          areas: Set<string>;
          pokemon: Map<
            string,
            GameLocationPokemon & {
              methodSet: Set<string>;
              levelSet: Set<string>;
              versionSet: Set<string>;
            }
          >;
        }
      >();

      for (const row of spawnRows) {
        const livingEntry =
          livingEntryByKey.get(livingEntryKey(row.species_id, row.form_name)) ??
          livingEntryByKey.get(livingEntryKey(row.species_id, null));
        if (!livingEntry) continue;

        const locationGroup = locations.get(row.location_name) ?? {
          source: row.source,
          confidence: row.confidence,
          areas: new Set<string>(),
          pokemon: new Map(),
        };
        locationGroup.areas.add(row.location_area_name);

        const pokemonKey = livingEntryKey(
          livingEntry.speciesId,
          livingEntry.formName,
        );
        const pokemon = locationGroup.pokemon.get(pokemonKey) ?? {
          speciesId: livingEntry.speciesId,
          formName: livingEntry.formName,
          displayName: livingEntry.displayName,
          spriteUrl: livingEntry.spriteUrl,
          optional: isOptionalInGameDex(gameId, livingEntry.speciesId),
          source: row.source,
          confidence: row.confidence,
          methodSet: new Set<string>(),
          levelSet: new Set<string>(),
          versionSet: new Set<string>(),
        };
        pokemon.methodSet.add(row.encounter_method_name);
        if (row.levels) pokemon.levelSet.add(row.levels);
        for (const version of row.version_ids) pokemon.versionSet.add(version);
        locationGroup.pokemon.set(pokemonKey, pokemon);
        locations.set(row.location_name, locationGroup);
      }

      return Array.from(locations.entries())
        .map(([location, group]) => ({
          location,
          source: group.source,
          confidence: group.confidence,
          areaCount: group.areas.size,
          pokemon: Array.from(group.pokemon.values())
            .map((pokemon) => {
              const { methodSet, levelSet, versionSet, ...rest } = pokemon;
              return {
                ...rest,
                methods: Array.from(methodSet).sort((a, b) =>
                  a.localeCompare(b),
                ),
                levels: Array.from(levelSet).sort((a, b) => a.localeCompare(b)),
                versions: Array.from(versionSet).sort((a, b) =>
                  a.localeCompare(b),
                ),
              };
            })
            .sort((a, b) =>
              a.speciesId === b.speciesId
                ? a.displayName.localeCompare(b.displayName)
                : a.speciesId - b.speciesId,
            ),
        }))
        .sort((a, b) => a.location.localeCompare(b.location));
    }

    const encounterResult = await supabase
      .from("encounters")
      .select("species_id,form_name,game_id,location_name")
      .eq("game_id", gameId)
      .order("location_name", { ascending: true })
      .order("species_id", { ascending: true });

    if (encounterResult.error) throw encounterResult.error;

    const locations = new Map<string, Map<string, GameLocationPokemon>>();
    for (const row of (encounterResult.data ?? []) as RawEncounter[]) {
      const formName = row.form_name ?? null;
      const livingEntry =
        livingEntryByKey.get(livingEntryKey(row.species_id, formName)) ??
        livingEntryByKey.get(livingEntryKey(row.species_id, null));
      if (!livingEntry) continue;

      const locationPokemon = locations.get(row.location_name) ?? new Map();
      locationPokemon.set(livingEntryKey(livingEntry.speciesId, formName), {
        speciesId: livingEntry.speciesId,
        formName: livingEntry.formName,
        displayName: livingEntry.displayName,
        spriteUrl: livingEntry.spriteUrl,
        optional: isOptionalInGameDex(gameId, livingEntry.speciesId),
        source: "pokeapi",
        confidence: "medium",
      });
      locations.set(row.location_name, locationPokemon);
    }

    return Array.from(locations.entries()).map(([location, pokemonByKey]) => ({
      location,
      source: "pokeapi",
      confidence: "medium",
      pokemon: Array.from(pokemonByKey.values()).sort((a, b) =>
        a.speciesId === b.speciesId
          ? a.displayName.localeCompare(b.displayName)
          : a.speciesId - b.speciesId,
      ),
    }));
  },

  async getMapOutlines(gameId: string): Promise<MapLocationOutline[]> {
    const { data, error } = await supabase
      .from("map_location_outlines")
      .select(
        "location_identifier,location_name,region_area_identifier,layer,outline_type,points,source,confidence",
      )
      .eq("game_id", gameId)
      .order("location_name", { ascending: true });

    if (error) throw error;

    return (data ?? []).map(
      (row: {
        location_identifier: string;
        location_name: string;
        region_area_identifier: string | null;
        layer: number | null;
        outline_type: string;
        points: [number, number][];
        source: "pokedb" | "manual";
        confidence: "high" | "medium" | "low";
      }) => ({
        locationIdentifier: row.location_identifier,
        locationName: row.location_name,
        regionAreaIdentifier: row.region_area_identifier,
        layer: row.layer,
        outlineType: row.outline_type,
        points: row.points,
        source: row.source,
        confidence: row.confidence,
      }),
    );
  },

  getGames(): Promise<GameEntry[]> {
    return Promise.resolve([...GAME_LIST]);
  },

  async getSpeciesForms(speciesId: number): Promise<LivingDexEntry[]> {
    const rows = await getRawLivingDexEntries();
    return rows
      .filter((entry) => entry.species_id === speciesId)
      .map(mapLivingDexEntry);
  },

  async health(): Promise<ApiHealth> {
    const { count, error } = await supabase
      .from("living_dex_entries")
      .select("id", { count: "exact", head: true });

    if (error) throw error;
    return { status: "ok", seeded: (count ?? 0) > 0 };
  },
};

export function toPokemonListItem(entry: LivingDexEntry) {
  return {
    name: entry.name || titleCase(entry.displayName),
    url: `supabase://living_dex_entries/${entry.speciesId}`,
  };
}

import type { ApiHealth, GameDexEntry, LivingDexEntry } from "@/types/pokemon";
import { GAME_LIST } from "@/config/games";
import type { GameEntry } from "@/config/games";
import { supabase } from "./supabase";

const LIVING_DEX_PAGE_SIZE = 1000;
let rawLivingDexEntriesPromise: Promise<RawLivingDexEntry[]> | null = null;

const MYTHICAL_IDS = new Set([
  151, 251, 385, 386, 489, 490, 491, 492, 493, 494, 647, 648, 649, 719, 720,
  721, 801, 802, 807, 808, 809, 893, 1025,
]);

const NATIONAL_DEX_MAX_BY_GAME: Record<string, number> = {
  "red-blue": 151,
  yellow: 151,
  "gold-silver": 251,
  crystal: 251,
  "ruby-sapphire": 386,
  emerald: 386,
  "firered-leafgreen": 386,
  "diamond-pearl": 493,
  platinum: 493,
  "heartgold-soulsilver": 493,
  "black-white": 649,
  "black2-white2": 649,
  "x-y": 721,
  oras: 721,
  bdsp: 493,
};

const SHINY_CHARM_GAME_IDS = new Set(
  GAME_LIST.filter((game) => game.hasShinyCharm).map((game) => game.id),
);

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

function isExcludedFromGameDex(gameId: string, speciesId: number): boolean {
  return SHINY_CHARM_GAME_IDS.has(gameId) && MYTHICAL_IDS.has(speciesId);
}

function mapGameDexEntry(
  entry: LivingDexEntry,
  entryNumber: number,
): GameDexEntry {
  return {
    speciesId: entry.speciesId,
    entryNumber,
    formName: entry.formName,
    displayName: entry.displayName,
    spriteUrl: entry.spriteUrl,
  };
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
    const maxSpeciesId = NATIONAL_DEX_MAX_BY_GAME[gameId];

    if (maxSpeciesId) {
      return livingEntries
        .filter((entry) => entry.formName === null)
        .filter((entry) => entry.speciesId <= maxSpeciesId)
        .filter((entry) => !isExcludedFromGameDex(gameId, entry.speciesId))
        .map((entry) => mapGameDexEntry(entry, entry.speciesId));
    }

    const gameRows = await getRawGameDexEntries(gameId);
    const livingEntryByKey = new Map(
      livingEntries.map((entry) => [
        livingEntryKey(entry.speciesId, entry.formName),
        entry,
      ]),
    );
    const bySpecies = new Map<number, GameDexEntry>();

    for (const row of gameRows) {
      if (isExcludedFromGameDex(gameId, row.species_id)) continue;

      const formName = row.form_name === "" ? null : row.form_name;
      const livingEntry = livingEntryByKey.get(
        livingEntryKey(row.species_id, formName),
      );
      if (!livingEntry) continue;

      const current = bySpecies.get(row.species_id);
      if (!current || formName) {
        bySpecies.set(
          row.species_id,
          mapGameDexEntry(livingEntry, row.entry_number ?? row.species_id),
        );
      }
    }

    return Array.from(bySpecies.values()).sort((a, b) =>
      a.entryNumber === b.entryNumber
        ? a.speciesId - b.speciesId
        : a.entryNumber - b.entryNumber,
    );
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

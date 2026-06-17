export type OwnershipMethod =
  | "caught"
  | "bred"
  | "hatched"
  | "transferred"
  | "event";

export type ShinyHuntMethod =
  | "random"
  | "overworld"
  | "masuda"
  | "breeding"
  | "soft-reset"
  | "poke-radar"
  | "chain-fishing"
  | "friend-safari"
  | "horde"
  | "dex-nav"
  | "sos-chain"
  | "ultra-wormhole"
  | "lets-go-catch-combo"
  | "outbreak"
  | "massive-mass-outbreak"
  | "sandwich"
  | "isolated-encounter"
  | "dynamax-adventures"
  | "max-raid"
  | "tera-raid"
  | "alpha-reset"
  | "wild-zone-reset"
  | "charm-boosted";

export type HuntCounterMode =
  | "encounters"
  | "soft-resets"
  | "eggs"
  | "raids"
  | "outbreaks"
  | "sandwiches"
  | "checks";

export type ShinyHunt = {
  id: string;
  speciesId: number;
  formName: string | null;
  gameId: string;
  method: ShinyHuntMethod;
  counterMode: HuntCounterMode;
  count: number | null;
  startedAt: string; // ISO timestamp
  completedAt?: string; // ISO timestamp
};

export type OwnedRecord = {
  pokedex_number: number; // species ID (1-1025)
  form_name: string | null; // null = base form, e.g. 'vulpix-alola' for regional
  owned: boolean; // has this species in the Living Dex (HOME)
  shiny_owned: boolean; // has this species in the Shiny Living Dex (HOME)
  updated_at?: string; // last ownership edit, used to resolve cross-device sync
  method?: OwnershipMethod;
  notes?: string;
  date_obtained?: string;
  game?: string; // game where this was caught for the Living Dex
  shiny_method?: ShinyHuntMethod;
  shiny_game?: string;
};

// Per-game, per-species registration flags. Alpha fields only apply to games
// in ALPHA_GAMES (PLA and Legends: Z-A). Future: home_alpha when HOME tracks it.
export type GameDexFlags = {
  owned: boolean;
  shiny: boolean;
  alpha?: boolean;
  shiny_alpha?: boolean;
};

export type PokemonStatName =
  | "hp"
  | "attack"
  | "defense"
  | "special-attack"
  | "special-defense"
  | "speed";

export type PokemonVariety = {
  is_default: boolean;
  pokemon: { name: string; url: string };
};

export type PokemonSpecies = {
  id: number;
  name: string;
  varieties: PokemonVariety[];
  evolution_chain: { url: string };
};

export type LivingDexEntry = {
  id: number; // Local living_dex_entries ID
  speciesId: number; // National Dex species ID (1-1025)
  name: string; // API name, e.g. 'vulpix-alola'
  formName: string | null; // null = base form
  displayName: string; // 'Alolan Vulpix'
  generation: number; // 1-9, based on base species
  spriteUrl: string;
  shinySpriteUrl?: string;
  isRegionalForm?: boolean;
  regionLabel?: string | null;
  sortOrder?: number;
  types?: PokemonType[];
  stats?: Partial<Record<PokemonStatName, number>>;
  height?: number | null;
  weight?: number | null;
};

export type EncounterLocation = {
  location: string;
  games: string[];
};

export type GameDexEntry = {
  speciesId: number;
  entryNumber: number;
  formName: string | null;
  displayName: string;
  spriteUrl: string;
  optional: boolean;
};

export type GameHomeBoxEntry = LivingDexEntry & {
  entryNumber: number;
  optional: boolean;
};

export type UserProfile = {
  userId: string;
  role: "user" | "admin";
  displayName: string | null;
};

export type GameHomeBoxFormRule = {
  id?: number;
  gameId: string;
  speciesId: number;
  formName: string | null;
  allowed: boolean;
  showShiny: boolean;
  notes: string | null;
  updatedBy?: string | null;
  updatedAt?: string | null;
};

export type GameLocationPokemon = {
  speciesId: number;
  formName: string | null;
  displayName: string;
  spriteUrl: string;
  optional: boolean;
  methods?: string[];
  levels?: string[];
  versions?: string[];
  source?: "pokeapi" | "pokedb" | "manual";
  confidence?: "high" | "medium" | "low";
};

export type GameLocationGroup = {
  location: string;
  source?: "pokeapi" | "pokedb" | "manual";
  confidence?: "high" | "medium" | "low";
  areaCount?: number;
  pokemon: GameLocationPokemon[];
};

export type MapLocationOutline = {
  locationIdentifier: string;
  locationName: string;
  regionAreaIdentifier: string | null;
  layer: number | null;
  outlineType: string;
  points: [number, number][];
  source: "pokedb" | "manual";
  confidence: "high" | "medium" | "low";
};

export type ApiHealth = {
  status: string;
  seeded: boolean;
};

export type ProgressSnapshot = {
  owned: Record<string, OwnedRecord>;
  // gameDex[gameId][speciesKey] = flags. Replaces the old separate
  // gameDexProgress/shinyGameDexProgress number[] arrays.
  gameDex: Record<string, Record<string, GameDexFlags>>;
  // gameHomeBoxes[gameId][speciesKey] = true when that game-origin Pokemon is
  // placed in the game's HOME transfer boxes. Independent from gameDex.
  gameHomeBoxes?: Record<string, Record<string, boolean>>;
  availableGames: Record<string, boolean>;
  pinnedGameId?: string | null;
  shinyHunts?: ShinyHunt[];
  recentCatches?: CatchEvent[];
  homeBoxLayouts?: HomeBoxLayoutProfile[];
  activeHomeBoxLayoutId?: string | null;
};

export type HomeBoxMode = "normal" | "shiny" | "paired";

export type HomeBoxLayoutProfile = {
  id: string;
  name: string;
  mode: HomeBoxMode;
  showCosmeticForms: boolean;
  showGenderForms: boolean;
};

// Imported here to avoid a circular dependency with pokedexStore.
export type CatchEvent = {
  speciesId: number;
  formName: string | null;
  gameId: string;
  date: string;
  isShiny: boolean;
  isAlpha: boolean;
};

export type EvolutionStage = {
  name: string;
  id: number;
  evolvesFromId: number | null;
  conditions: string[];
};

export type GameDex = {
  gameId: string;
  gameName: string;
  generation: number;
  totalPokemon: number;
  owned: number[];
};

export type PokemonListItem = {
  name: string;
  url: string;
};

export type PokemonType =
  | "normal"
  | "fire"
  | "water"
  | "electric"
  | "grass"
  | "ice"
  | "fighting"
  | "poison"
  | "ground"
  | "flying"
  | "psychic"
  | "bug"
  | "rock"
  | "ghost"
  | "dragon"
  | "dark"
  | "steel"
  | "fairy";

export type PokemonSprites = {
  front_default: string | null;
  front_shiny: string | null;
};

export type Pokemon = {
  id: number;
  name: string;
  sprites: PokemonSprites;
  types: Array<{
    slot: number;
    type: { name: PokemonType; url: string };
  }>;
};

export const GEN_FILTER_VALUES = ["all", 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
export type GenerationFilter = (typeof GEN_FILTER_VALUES)[number];

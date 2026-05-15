export type OwnershipMethod =
  | "caught"
  | "bred"
  | "hatched"
  | "transferred"
  | "event";

export type ShinyHuntMethod =
  | "masuda"
  | "sos-chain"
  | "poke-radar"
  | "dex-nav"
  | "soft-reset"
  | "outbreak"
  | "random";

export type OwnedRecord = {
  pokedex_number: number; // species ID (1-1025)
  form_name: string | null; // null = base form, e.g. 'vulpix-alola' for regional
  owned: boolean;
  shiny_owned: boolean;
  method?: OwnershipMethod;
  notes?: string;
  date_obtained?: string;
  shiny_method?: ShinyHuntMethod;
  shiny_game?: string;
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
  gameDexProgress: Record<string, number[]>;
  shinyGameDexProgress: Record<string, number[]>;
  availableGames: Record<string, boolean>;
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

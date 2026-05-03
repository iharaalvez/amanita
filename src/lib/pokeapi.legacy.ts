// Fallback only - local API is preferred.

import { get, set } from 'idb-keyval';
import { isLivingDexForm, getFormLabel } from '@/lib/forms';
import type { Pokemon, PokemonListItem, EncounterLocation, PokemonSpecies, LivingDexEntry } from '@/types/pokemon';

const BASE_URL = 'https://pokeapi.co/api/v2';

const VERSION_DISPLAY: Record<string, string> = {
  red: 'Red', blue: 'Blue', yellow: 'Yellow',
  gold: 'Gold', silver: 'Silver', crystal: 'Crystal',
  ruby: 'Ruby', sapphire: 'Sapphire', emerald: 'Emerald',
  firered: 'FireRed', leafgreen: 'LeafGreen',
  diamond: 'Diamond', pearl: 'Pearl', platinum: 'Platinum',
  heartgold: 'HeartGold', soulsilver: 'SoulSilver',
  black: 'Black', white: 'White', 'black-2': 'Black 2', 'white-2': 'White 2',
  x: 'X', y: 'Y',
  'omega-ruby': 'Omega Ruby', 'alpha-sapphire': 'Alpha Sapphire',
  sun: 'Sun', moon: 'Moon',
  'ultra-sun': 'Ultra Sun', 'ultra-moon': 'Ultra Moon',
  'lets-go-pikachu': "Let's Go Pikachu", 'lets-go-eevee': "Let's Go Eevee",
  sword: 'Sword', shield: 'Shield',
  'brilliant-diamond': 'Brilliant Diamond', 'shining-pearl': 'Shining Pearl',
  'legends-arceus': 'Legends: Arceus',
  scarlet: 'Scarlet', violet: 'Violet',
};

function formatLocationName(name: string): string {
  return name.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function titleCase(name: string): string {
  return name.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export async function fetchPokemonList(limit = 1025, offset = 0): Promise<PokemonListItem[]> {
  const res = await fetch(`${BASE_URL}/pokemon?limit=${limit}&offset=${offset}`);
  if (!res.ok) throw new Error(`PokéAPI error: ${res.status}`);
  const data = (await res.json()) as { results: PokemonListItem[] };
  return data.results;
}

export async function fetchPokemon(idOrName: number | string): Promise<Pokemon> {
  const res = await fetch(`${BASE_URL}/pokemon/${idOrName}`);
  if (!res.ok) throw new Error(`PokéAPI error: ${res.status}`);
  return res.json() as Promise<Pokemon>;
}

export function getPokemonIdFromUrl(url: string): number {
  const match = url.match(/\/pokemon\/(\d+)\//);
  if (!match?.[1]) throw new Error(`Cannot extract ID from URL: ${url}`);
  return parseInt(match[1], 10);
}

function getIdFromAnyUrl(url: string): number {
  const match = url.match(/\/(\d+)\/?$/);
  if (!match?.[1]) throw new Error(`Cannot extract ID from URL: ${url}`);
  return parseInt(match[1], 10);
}

type RawEncounterEntry = {
  location_area: { name: string; url: string };
  version_details: Array<{
    version: { name: string; url: string };
    encounter_details: unknown[];
    max_chance: number;
  }>;
};

export async function fetchEncounters(pokemonId: number): Promise<EncounterLocation[]> {
  const res = await fetch(`${BASE_URL}/pokemon/${pokemonId}/encounters`);
  if (!res.ok) throw new Error(`PokéAPI error: ${res.status}`);
  const raw = (await res.json()) as RawEncounterEntry[];

  const byLocation = new Map<string, Set<string>>();
  for (const entry of raw) {
    const loc = formatLocationName(entry.location_area.name);
    if (!byLocation.has(loc)) byLocation.set(loc, new Set());
    for (const vd of entry.version_details) {
      const gameName = VERSION_DISPLAY[vd.version.name] ?? vd.version.name;
      byLocation.get(loc)!.add(gameName);
    }
  }

  return Array.from(byLocation.entries()).map(([location, games]) => ({
    location,
    games: Array.from(games),
  }));
}

type PokedexApiResponse = {
  pokemon_entries: Array<{
    entry_number: number;
    pokemon_species: { name: string; url: string };
  }>;
};

export async function fetchGamePokedex(pokedexId: string): Promise<number[]> {
  const res = await fetch(`${BASE_URL}/pokedex/${pokedexId}`);
  if (!res.ok) throw new Error(`PokéAPI error: ${res.status}`);
  const data = (await res.json()) as PokedexApiResponse;
  return data.pokemon_entries.map((e) => {
    const match = e.pokemon_species.url.match(/\/pokemon-species\/(\d+)\//);
    if (!match?.[1]) throw new Error(`Cannot extract ID from: ${e.pokemon_species.url}`);
    return parseInt(match[1], 10);
  });
}

export async function fetchPokemonSpecies(id: number | string): Promise<PokemonSpecies> {
  const res = await fetch(`${BASE_URL}/pokemon-species/${id}`);
  if (!res.ok) throw new Error(`PokéAPI error: ${res.status}`);
  return res.json() as Promise<PokemonSpecies>;
}

export async function fetchGeneration(id: number | string): Promise<unknown> {
  const res = await fetch(`${BASE_URL}/generation/${id}`);
  if (!res.ok) throw new Error(`PokéAPI error: ${res.status}`);
  return res.json();
}

function getGenerationFromSpeciesId(id: number): number {
  if (id <= 151) return 1;
  if (id <= 251) return 2;
  if (id <= 386) return 3;
  if (id <= 493) return 4;
  if (id <= 649) return 5;
  if (id <= 721) return 6;
  if (id <= 809) return 7;
  if (id <= 905) return 8;
  return 9;
}

function buildFormDisplayName(speciesName: string, varietyName: string): string {
  const label = getFormLabel(varietyName);
  const base = titleCase(speciesName);
  return label ? `${label} ${base}` : base;
}

const LIVING_DEX_CACHE_KEY = 'pokeapi:living-dex-entries';
const SPECIES_BATCH_SIZE = 100;

export async function fetchAllLivingDexEntries(): Promise<LivingDexEntry[]> {
  const cached = await get<LivingDexEntry[]>(LIVING_DEX_CACHE_KEY);
  if (cached) return cached;

  const list = await fetchPokemonList(1025, 0);
  const entries: LivingDexEntry[] = [];

  // Base entries — one per national dex number
  for (const item of list) {
    const speciesId = getPokemonIdFromUrl(item.url);
    entries.push({
      id: speciesId,
      speciesId,
      name: item.name,
      formName: null,
      displayName: titleCase(item.name),
      generation: getGenerationFromSpeciesId(speciesId),
      spriteUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${speciesId}.png`,
    });
  }

  // Fetch all species in batches to discover regional form varieties
  for (let i = 0; i < list.length; i += SPECIES_BATCH_SIZE) {
    const batch = list.slice(i, i + SPECIES_BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map((item) => fetchPokemonSpecies(getPokemonIdFromUrl(item.url)))
    );

    for (const result of results) {
      if (result.status !== 'fulfilled') continue;
      const species = result.value;

      for (const variety of species.varieties) {
        if (variety.is_default) continue;
        if (!isLivingDexForm(variety.pokemon.name)) continue;

        const formPokemonId = getIdFromAnyUrl(variety.pokemon.url);
        entries.push({
          id: formPokemonId,
          speciesId: species.id,
          name: variety.pokemon.name,
          formName: variety.pokemon.name,
          displayName: buildFormDisplayName(species.name, variety.pokemon.name),
          generation: getGenerationFromSpeciesId(species.id),
          spriteUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${formPokemonId}.png`,
        });
      }
    }
  }

  console.log(`[Living Dex] Total entries: ${entries.length} (${entries.length - 1025} regional forms)`);
  await set(LIVING_DEX_CACHE_KEY, entries);
  return entries;
}

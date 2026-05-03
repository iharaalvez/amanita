export type PokeApiReadyGameEntry = {
  id: string;
  name: string;
  versionGroup: string;
  generation: number;
  pokedexId: string;
  hasShinyCharm: boolean;
  pokeapiReady: true;
};

export type PendingGameEntry = {
  id: string;
  name: string;
  generation: number;
  hasShinyCharm: boolean;
  pokeapiReady: false;
};

export type GameEntry = PokeApiReadyGameEntry | PendingGameEntry;

export const GAME_LIST: readonly GameEntry[] = [
  { id: 'red-blue', name: 'Red / Blue', versionGroup: 'red-blue', generation: 1, pokedexId: 'kanto', hasShinyCharm: false, pokeapiReady: true },
  { id: 'yellow', name: 'Yellow', versionGroup: 'yellow', generation: 1, pokedexId: 'kanto', hasShinyCharm: false, pokeapiReady: true },
  { id: 'gold-silver', name: 'Gold / Silver', versionGroup: 'gold-silver', generation: 2, pokedexId: 'original-johto', hasShinyCharm: false, pokeapiReady: true },
  { id: 'crystal', name: 'Crystal', versionGroup: 'crystal', generation: 2, pokedexId: 'original-johto', hasShinyCharm: false, pokeapiReady: true },
  { id: 'ruby-sapphire', name: 'Ruby / Sapphire', versionGroup: 'ruby-sapphire', generation: 3, pokedexId: 'hoenn', hasShinyCharm: false, pokeapiReady: true },
  { id: 'emerald', name: 'Emerald', versionGroup: 'emerald', generation: 3, pokedexId: 'hoenn', hasShinyCharm: false, pokeapiReady: true },
  { id: 'firered-leafgreen', name: 'FireRed / LeafGreen', versionGroup: 'firered-leafgreen', generation: 3, pokedexId: 'kanto', hasShinyCharm: false, pokeapiReady: true },
  { id: 'diamond-pearl', name: 'Diamond / Pearl', versionGroup: 'diamond-pearl', generation: 4, pokedexId: 'original-sinnoh', hasShinyCharm: false, pokeapiReady: true },
  { id: 'platinum', name: 'Platinum', versionGroup: 'platinum', generation: 4, pokedexId: 'extended-sinnoh', hasShinyCharm: false, pokeapiReady: true },
  { id: 'heartgold-soulsilver', name: 'HeartGold / SoulSilver', versionGroup: 'heartgold-soulsilver', generation: 4, pokedexId: 'updated-johto', hasShinyCharm: false, pokeapiReady: true },
  { id: 'black-white', name: 'Black / White', versionGroup: 'black-white', generation: 5, pokedexId: 'original-unova', hasShinyCharm: false, pokeapiReady: true },
  { id: 'black2-white2', name: 'Black 2 / White 2', versionGroup: 'black-2-white-2', generation: 5, pokedexId: 'updated-unova', hasShinyCharm: true, pokeapiReady: true },
  { id: 'x-y', name: 'X / Y', versionGroup: 'x-y', generation: 6, pokedexId: 'kalos-central', hasShinyCharm: true, pokeapiReady: true },
  { id: 'oras', name: 'Omega Ruby / Alpha Sapphire', versionGroup: 'omega-ruby-alpha-sapphire', generation: 6, pokedexId: 'updated-hoenn', hasShinyCharm: true, pokeapiReady: true },
  { id: 'sun-moon', name: 'Sun / Moon', versionGroup: 'sun-moon', generation: 7, pokedexId: 'original-alola', hasShinyCharm: true, pokeapiReady: true },
  { id: 'usum', name: 'Ultra Sun / Ultra Moon', versionGroup: 'ultra-sun-ultra-moon', generation: 7, pokedexId: 'updated-alola', hasShinyCharm: true, pokeapiReady: true },
  { id: 'swsh', name: 'Sword / Shield', versionGroup: 'sword-shield', generation: 8, pokedexId: 'galar', hasShinyCharm: true, pokeapiReady: true },
  { id: 'bdsp', name: 'Brilliant Diamond / Shining Pearl', versionGroup: 'brilliant-diamond-shining-pearl', generation: 8, pokedexId: 'original-sinnoh', hasShinyCharm: true, pokeapiReady: true },
  { id: 'pla', name: 'Legends: Arceus', versionGroup: 'legends-arceus', generation: 8, pokedexId: 'hisui', hasShinyCharm: true, pokeapiReady: true },
  { id: 'scarlet-violet', name: 'Scarlet / Violet', versionGroup: 'scarlet-violet', generation: 9, pokedexId: 'paldea', hasShinyCharm: true, pokeapiReady: true },
  { id: 'legends-za', name: 'Legends: Z-A', generation: 9, hasShinyCharm: true, pokeapiReady: false },
] as const;

export const GAME_BY_ID = Object.fromEntries(
  GAME_LIST.map((game) => [game.id, game])
) as Record<string, GameEntry>;

export function getGameById(gameId: string): GameEntry | undefined {
  return GAME_LIST.find((game) => game.id === gameId);
}

export function getPokeApiReadyGames(): PokeApiReadyGameEntry[] {
  return GAME_LIST.filter((game): game is PokeApiReadyGameEntry => game.pokeapiReady);
}

export function getGamesByGeneration(games: readonly GameEntry[] = GAME_LIST): Array<[number, GameEntry[]]> {
  const groups = new Map<number, GameEntry[]>();

  for (const game of games) {
    if (!groups.has(game.generation)) groups.set(game.generation, []);
    groups.get(game.generation)!.push(game);
  }

  return Array.from(groups.entries()).sort(([a], [b]) => a - b);
}

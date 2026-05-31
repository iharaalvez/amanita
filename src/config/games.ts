export type GameEntry = {
  id: string;
  name: string;
  generation: number;
  hasShinyCharm: boolean;
  dlcOf?: string; // parent game id — hidden from catalog, surfaced as tabs inside the parent
};

export const GAME_LIST: readonly GameEntry[] = [
  { id: "red-blue", name: "Red / Blue", generation: 1, hasShinyCharm: false },
  { id: "yellow", name: "Yellow", generation: 1, hasShinyCharm: false },
  {
    id: "gold-silver",
    name: "Gold / Silver",
    generation: 2,
    hasShinyCharm: false,
  },
  { id: "crystal", name: "Crystal", generation: 2, hasShinyCharm: false },
  {
    id: "ruby-sapphire",
    name: "Ruby / Sapphire",
    generation: 3,
    hasShinyCharm: false,
  },
  { id: "emerald", name: "Emerald", generation: 3, hasShinyCharm: false },
  {
    id: "firered-leafgreen",
    name: "FireRed / LeafGreen",
    generation: 3,
    hasShinyCharm: false,
  },
  {
    id: "diamond-pearl",
    name: "Diamond / Pearl",
    generation: 4,
    hasShinyCharm: false,
  },
  { id: "platinum", name: "Platinum", generation: 4, hasShinyCharm: false },
  {
    id: "heartgold-soulsilver",
    name: "HeartGold / SoulSilver",
    generation: 4,
    hasShinyCharm: false,
  },
  {
    id: "black-white",
    name: "Black / White",
    generation: 5,
    hasShinyCharm: false,
  },
  {
    id: "black2-white2",
    name: "Black 2 / White 2",
    generation: 5,
    hasShinyCharm: true,
  },
  { id: "x-y", name: "X / Y", generation: 6, hasShinyCharm: true },
  {
    id: "oras",
    name: "Omega Ruby / Alpha Sapphire",
    generation: 6,
    hasShinyCharm: true,
  },
  { id: "sun-moon", name: "Sun / Moon", generation: 7, hasShinyCharm: true },
  {
    id: "usum",
    name: "Ultra Sun / Ultra Moon",
    generation: 7,
    hasShinyCharm: true,
  },
  {
    id: "lgpe",
    name: "Let's Go Pikachu / Eevee",
    generation: 7,
    hasShinyCharm: true,
  },
  { id: "swsh", name: "Sword / Shield", generation: 8, hasShinyCharm: true },
  {
    id: "bdsp",
    name: "Brilliant Diamond / Shining Pearl",
    generation: 8,
    hasShinyCharm: true,
  },
  { id: "pla", name: "Legends: Arceus", generation: 8, hasShinyCharm: true },
  {
    id: "scarlet-violet",
    name: "Scarlet / Violet",
    generation: 9,
    hasShinyCharm: true,
  },
  {
    id: "scarlet-violet-teal-mask",
    name: "The Teal Mask",
    generation: 9,
    hasShinyCharm: false,
    dlcOf: "scarlet-violet",
  },
  {
    id: "scarlet-violet-indigo-disk",
    name: "The Indigo Disk",
    generation: 9,
    hasShinyCharm: false,
    dlcOf: "scarlet-violet",
  },
  {
    id: "legends-za",
    name: "Legends: Z-A",
    generation: 9,
    hasShinyCharm: true,
  },
  {
    id: "legends-za-hyperspace",
    name: "Hyperspace",
    generation: 9,
    hasShinyCharm: false,
    dlcOf: "legends-za",
  },
] as const;

export const VISIBLE_GAME_LIST: readonly GameEntry[] = GAME_LIST.filter(
  (g) => !g.dlcOf,
);

// Game IDs that have a paired second version logo at /icons/games/{id}-alt.png
export const GAME_ALT_LOGOS = new Set([
  "red-blue",
  "gold-silver",
  "ruby-sapphire",
  "firered-leafgreen",
  "diamond-pearl",
  "heartgold-soulsilver",
  "black-white",
  "black2-white2",
  "x-y",
  "oras",
  "sun-moon",
  "usum",
  "lgpe",
  "swsh",
  "bdsp",
  "scarlet-violet",
]);

export const GAME_BY_ID = Object.fromEntries(
  GAME_LIST.map((game) => [game.id, game]),
) as Record<string, GameEntry>;

export function getGameById(gameId: string): GameEntry | undefined {
  return GAME_LIST.find((game) => game.id === gameId);
}

export function getDlcGames(parentId: string): readonly GameEntry[] {
  return GAME_LIST.filter((g) => g.dlcOf === parentId);
}

export function getGamesByGeneration(
  games: readonly GameEntry[] = VISIBLE_GAME_LIST,
): Array<[number, GameEntry[]]> {
  const groups = new Map<number, GameEntry[]>();

  for (const game of games) {
    if (!groups.has(game.generation)) groups.set(game.generation, []);
    groups.get(game.generation)!.push(game);
  }

  return Array.from(groups.entries()).sort(([a], [b]) => a - b);
}

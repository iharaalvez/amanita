import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { GAME_LIST } from "@/config/games";
import { fetchEncounters } from "@/lib/pokeapi.legacy";
import type { EncounterLocation } from "@/types/pokemon";

const GAME_NAME_BY_ID = Object.fromEntries(
  GAME_LIST.map((game) => [game.id, game.name]),
);

export function useEncounters(speciesId: number | null) {
  return useQuery<EncounterLocation[]>({
    queryKey: ["encounters", speciesId],
    queryFn: async () => {
      if (speciesId === null) return [];

      const [pokeApiResult, storedResult] = await Promise.allSettled([
        fetchEncounters(speciesId),
        api.getEncounters(speciesId),
      ]);
      const merged = new Map<string, Set<string>>();

      const addEncounter = (location: string, games: string[]) => {
        const existing = merged.get(location) ?? new Set<string>();
        for (const game of games) existing.add(game);
        merged.set(location, existing);
      };

      if (pokeApiResult.status === "fulfilled") {
        for (const encounter of pokeApiResult.value) {
          addEncounter(encounter.location, encounter.games);
        }
      }

      if (storedResult.status === "fulfilled") {
        for (const [gameId, locations] of Object.entries(storedResult.value)) {
          for (const location of locations) {
            addEncounter(location, [GAME_NAME_BY_ID[gameId] ?? gameId]);
          }
        }
      }

      return Array.from(merged.entries()).map(([location, games]) => ({
        location,
        games: Array.from(games),
      }));
    },
    enabled: speciesId !== null,
    staleTime: Infinity,
  });
}

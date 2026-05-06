import { useQuery } from "@tanstack/react-query";
import { getGameById } from "@/config/games";
import { api } from "@/lib/api";
import type { GameDexEntry } from "@/types/pokemon";

export function useGamePokedex(gameId: string) {
  const entry = getGameById(gameId);

  return useQuery<GameDexEntry[]>({
    queryKey: ["game-pokedex", gameId],
    queryFn: () => api.getGameDex(gameId),
    enabled: !!entry,
    staleTime: Infinity,
  });
}

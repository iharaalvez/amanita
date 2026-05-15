import { useQuery } from "@tanstack/react-query";
import { getGameById } from "@/config/games";
import { api } from "@/lib/api";
import type { GameLocationGroup } from "@/types/pokemon";

export function useGameLocations(gameId: string) {
  const entry = getGameById(gameId);

  return useQuery<GameLocationGroup[]>({
    queryKey: ["game-locations", gameId],
    queryFn: () => api.getGameLocations(gameId),
    enabled: !!entry,
    staleTime: Infinity,
  });
}

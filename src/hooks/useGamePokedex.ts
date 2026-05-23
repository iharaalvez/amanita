import { useQuery } from "@tanstack/react-query";
import { getGameById } from "@/config/games";
import { api } from "@/lib/api";
import type { GameDexEntry, GameHomeBoxEntry } from "@/types/pokemon";

export function useGamePokedex(
  gameId: string,
  options: { enabled?: boolean } = {},
) {
  const entry = getGameById(gameId);

  return useQuery<GameDexEntry[]>({
    queryKey: ["game-pokedex", gameId],
    queryFn: () => api.getGameDex(gameId),
    enabled: !!entry && (options.enabled ?? true),
    staleTime: Infinity,
  });
}

export function useGameHomeBoxDex(gameId: string) {
  const entry = getGameById(gameId);

  return useQuery<GameHomeBoxEntry[]>({
    queryKey: ["game-home-box-dex", gameId],
    queryFn: () => api.getGameHomeBoxDex(gameId),
    enabled: !!entry,
    staleTime: Infinity,
  });
}

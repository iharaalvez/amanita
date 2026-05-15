import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { MapLocationOutline } from "@/types/pokemon";

export function useMapOutlines(gameId: string) {
  return useQuery<MapLocationOutline[]>({
    queryKey: ["map-outlines", gameId],
    queryFn: () => api.getMapOutlines(gameId),
    staleTime: Infinity,
  });
}

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { GAME_LIST } from '@/config/games';
import type { EncounterLocation } from '@/types/pokemon';

const GAME_NAME_BY_ID = Object.fromEntries(GAME_LIST.map((game) => [game.id, game.name]));

export function useEncounters(speciesId: number | null) {
  return useQuery<EncounterLocation[]>({
    queryKey: ['encounters', speciesId],
    queryFn: async () => {
      if (speciesId === null) return [];
      const data = await api.getEncounters(speciesId);
      return Object.entries(data).flatMap(([gameId, locations]) =>
        locations.map((location) => ({
          location,
          games: [GAME_NAME_BY_ID[gameId] ?? gameId],
        }))
      );
    },
    enabled: speciesId !== null,
    staleTime: Infinity,
  });
}

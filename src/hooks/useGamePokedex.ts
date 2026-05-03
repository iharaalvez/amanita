import { useQuery } from "@tanstack/react-query";
import { getGamePokedexOverride } from "@/config/game-pokedex-overrides";
import { getGameById } from "@/config/games";
import { api } from "@/lib/api";
import type { GameDexEntry, LivingDexEntry } from "@/types/pokemon";

export function useGamePokedex(gameId: string) {
  const entry = getGameById(gameId);
  const override = getGamePokedexOverride(gameId);

  return useQuery<GameDexEntry[]>({
    queryKey: ["game-pokedex", gameId],
    queryFn: async () => {
      if (!override) return api.getGameDex(gameId);

      const entries = await api.getLivingDexEntries();
      const baseEntries = new Map(
        entries
          .filter((livingEntry) => livingEntry.formName === null)
          .map((livingEntry) => [livingEntry.speciesId, livingEntry]),
      );

      return override
        .map((speciesId) => baseEntries.get(speciesId))
        .filter((livingEntry): livingEntry is LivingDexEntry => !!livingEntry)
        .map((livingEntry) => ({
          speciesId: livingEntry.speciesId,
          entryNumber: override.indexOf(livingEntry.speciesId) + 1,
          formName: livingEntry.formName,
          displayName: livingEntry.displayName,
          spriteUrl: livingEntry.spriteUrl,
        }));
    },
    enabled: !!entry && (entry.pokeapiReady || !!override),
    staleTime: Infinity,
  });
}

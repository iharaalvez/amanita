import { useQuery } from '@tanstack/react-query';
import { api, toPokemonListItem } from '@/lib/api';
import type { EvolutionStage, LivingDexEntry, Pokemon, PokemonListItem } from '@/types/pokemon';

export type PokemonSpecies = {
  id: number;
  name: string;
  varieties: Array<{
    is_default: boolean;
    pokemon: { name: string; url: string };
  }>;
};

export function useAllPokemon() {
  return useQuery<PokemonListItem[]>({
    queryKey: ['pokemon-list'],
    queryFn: async () => {
      const entries = await api.getLivingDexEntries();
      return entries
        .filter((entry) => entry.formName === null)
        .map(toPokemonListItem);
    },
    staleTime: Infinity,
  });
}

export function useLivingDexEntries() {
  return useQuery<LivingDexEntry[]>({
    queryKey: ['living-dex-entries'],
    queryFn: () => api.getLivingDexEntries(),
    staleTime: Infinity,
  });
}

export function usePokemonDetail(idOrName: number | string) {
  return useQuery<Pokemon>({
    queryKey: ['pokemon', idOrName],
    queryFn: () =>
      Promise.resolve({
        id: Number(idOrName),
        name: String(idOrName),
        sprites: { front_default: null, front_shiny: null },
        types: [],
      }),
    staleTime: Infinity,
  });
}

export function usePokemonSpecies(speciesId: number) {
  return useQuery<LivingDexEntry[]>({
    queryKey: ['species-forms', speciesId],
    queryFn: () => api.getSpeciesForms(speciesId),
    staleTime: Infinity,
  });
}

export function usePokemonEvolution(speciesId: number) {
  return useQuery<EvolutionStage[][]>({
    queryKey: ['evolution-unavailable', speciesId],
    queryFn: () => Promise.resolve([]),
    staleTime: Infinity,
  });
}

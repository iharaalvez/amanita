import { useQuery } from "@tanstack/react-query";
import { api, toPokemonListItem } from "@/lib/api";
import type {
  EvolutionStage,
  LivingDexEntry,
  Pokemon,
  PokemonListItem,
} from "@/types/pokemon";

export type PokemonSpecies = {
  id: number;
  name: string;
  varieties: Array<{
    is_default: boolean;
    pokemon: { name: string; url: string };
  }>;
};

type NamedApiResource = {
  name: string;
  url: string;
};

type EvolutionDetail = {
  gender: number | null;
  held_item: NamedApiResource | null;
  item: NamedApiResource | null;
  known_move: NamedApiResource | null;
  known_move_type: NamedApiResource | null;
  location: NamedApiResource | null;
  min_affection: number | null;
  min_beauty: number | null;
  min_happiness: number | null;
  min_level: number | null;
  needs_overworld_rain: boolean;
  party_species: NamedApiResource | null;
  party_type: NamedApiResource | null;
  relative_physical_stats: number | null;
  time_of_day: string;
  trade_species: NamedApiResource | null;
  trigger: NamedApiResource | null;
  turn_upside_down: boolean;
};

type ChainLink = {
  is_baby: boolean;
  species: NamedApiResource;
  evolution_details: EvolutionDetail[] | null;
  evolves_to: ChainLink[];
};

type PokemonSpeciesResponse = PokemonSpecies & {
  evolution_chain: { url: string };
};

type EvolutionChainResponse = {
  id: number;
  chain: ChainLink;
};

const POKEAPI_BASE_URL = "https://pokeapi.co/api/v2";

function getIdFromResourceUrl(url: string): number {
  const match = url.match(/\/(\d+)\/?$/);
  return match ? Number(match[1]) : 0;
}

function titleCase(name: string): string {
  return name
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatTriggerName(triggerName: string): string {
  if (triggerName === "level-up") return "Level up";
  if (triggerName === "use-item") return "Use item";
  return titleCase(triggerName);
}

function formatEvolutionDetail(detail: EvolutionDetail): string {
  const parts: string[] = [];
  const triggerName = detail.trigger?.name;

  if (triggerName === "level-up" && detail.min_level !== null) {
    parts.push(`Level ${detail.min_level}`);
  } else if (triggerName === "trade") {
    parts.push("Trade");
  } else if (triggerName === "use-item" && detail.item) {
    parts.push(`Use ${titleCase(detail.item.name)}`);
  } else if (triggerName) {
    parts.push(formatTriggerName(triggerName));
  }

  if (detail.item && triggerName !== "use-item") {
    parts.push(`with ${titleCase(detail.item.name)}`);
  }
  if (detail.held_item) {
    parts.push(`while holding ${titleCase(detail.held_item.name)}`);
  }
  if (detail.min_happiness !== null) {
    parts.push(`with ${detail.min_happiness}+ friendship`);
  }
  if (detail.min_affection !== null) {
    parts.push(`with ${detail.min_affection}+ affection`);
  }
  if (detail.min_beauty !== null) {
    parts.push(`with ${detail.min_beauty}+ beauty`);
  }
  if (detail.known_move) {
    parts.push(`knowing ${titleCase(detail.known_move.name)}`);
  }
  if (detail.known_move_type) {
    parts.push(`knowing a ${titleCase(detail.known_move_type.name)} move`);
  }
  if (detail.location) {
    parts.push(`at ${titleCase(detail.location.name)}`);
  }
  if (detail.time_of_day) {
    parts.push(`during ${detail.time_of_day}`);
  }
  if (detail.needs_overworld_rain) {
    parts.push("while it is raining");
  }
  if (detail.party_species) {
    parts.push(`with ${titleCase(detail.party_species.name)} in party`);
  }
  if (detail.party_type) {
    parts.push(`with a ${titleCase(detail.party_type.name)} type in party`);
  }
  if (detail.trade_species) {
    parts.push(`for ${titleCase(detail.trade_species.name)}`);
  }
  if (detail.relative_physical_stats === 1) {
    parts.push("with Attack > Defense");
  }
  if (detail.relative_physical_stats === 0) {
    parts.push("with Attack = Defense");
  }
  if (detail.relative_physical_stats === -1) {
    parts.push("with Attack < Defense");
  }
  if (detail.turn_upside_down) {
    parts.push("while the system is upside down");
  }
  if (detail.gender !== null) {
    parts.push("with required gender");
  }

  return parts.length > 0 ? parts.join(" ") : "Special evolution";
}

function buildEvolutionLines(chain: ChainLink): EvolutionStage[][] {
  const walk = (
    link: ChainLink,
    path: EvolutionStage[],
    evolvesFromId: number | null,
  ): EvolutionStage[][] => {
    const stage: EvolutionStage = {
      id: getIdFromResourceUrl(link.species.url),
      name: link.species.name,
      evolvesFromId,
      conditions: (link.evolution_details ?? []).map(formatEvolutionDetail),
    };
    const nextPath = [...path, stage];

    if (link.evolves_to.length === 0) return [nextPath];

    return link.evolves_to.flatMap((nextLink) =>
      walk(nextLink, nextPath, stage.id),
    );
  };

  return walk(chain, [], null);
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`PokeAPI request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export function useAllPokemon() {
  return useQuery<PokemonListItem[]>({
    queryKey: ["pokemon-list"],
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
    queryKey: ["living-dex-entries"],
    queryFn: () => api.getLivingDexEntries(),
    staleTime: Infinity,
  });
}

export function usePokemonDetail(idOrName: number | string) {
  return useQuery<Pokemon>({
    queryKey: ["pokemon", idOrName],
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
    queryKey: ["species-forms", speciesId],
    queryFn: () => api.getSpeciesForms(speciesId),
    staleTime: Infinity,
  });
}

export function usePokemonEvolution(speciesId: number, enabled = true) {
  return useQuery<EvolutionStage[][]>({
    queryKey: ["pokemon-evolution", speciesId],
    queryFn: async () => {
      const species = await fetchJson<PokemonSpeciesResponse>(
        `${POKEAPI_BASE_URL}/pokemon-species/${speciesId}/`,
      );
      const chain = await fetchJson<EvolutionChainResponse>(
        species.evolution_chain.url,
      );
      return buildEvolutionLines(chain.chain);
    },
    staleTime: Infinity,
    enabled: enabled && speciesId > 0,
  });
}

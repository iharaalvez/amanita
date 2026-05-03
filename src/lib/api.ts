import type { ApiHealth, GameDexEntry, LivingDexEntry, ProgressSnapshot } from '@/types/pokemon';
import type { GameEntry } from '@/config/games';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

type RawLivingDexEntry = {
  id: number;
  species_id: number;
  form_name: string | null;
  display_name: string;
  sprite_url: string;
  shiny_sprite_url: string;
  is_regional_form: boolean;
  region_label: string | null;
  sort_order: number;
  types?: string[];
  stats?: Record<string, number>;
  height?: number | null;
  weight?: number | null;
};

type LivingDexEntriesResponse = {
  entries: RawLivingDexEntry[];
  total: number;
};

type GameDexResponse = {
  game_id: string;
  entries: Array<{
    species_id: number;
    entry_number: number;
    form_name: string | null;
    display_name: string;
    sprite_url: string;
  }>;
};

type ProgressResponse = {
  owned: ProgressSnapshot['owned'];
  game_dex_progress: ProgressSnapshot['gameDexProgress'];
  available_games: ProgressSnapshot['availableGames'];
};

function getGenerationFromSpeciesId(speciesId: number): number {
  if (speciesId <= 151) return 1;
  if (speciesId <= 251) return 2;
  if (speciesId <= 386) return 3;
  if (speciesId <= 493) return 4;
  if (speciesId <= 649) return 5;
  if (speciesId <= 721) return 6;
  if (speciesId <= 809) return 7;
  if (speciesId <= 905) return 8;
  return 9;
}

// Regional forms were introduced in the generation of their region, not their base species.
const REGION_GENERATION: Record<string, number> = {
  Alolan:   7,
  Galarian: 8,
  Hisuian:  8,
  Paldean:  9,
};

function titleCase(name: string): string {
  return name.split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function mapLivingDexEntry(entry: RawLivingDexEntry): LivingDexEntry {
  return {
    id: entry.id,
    speciesId: entry.species_id,
    name: entry.form_name ?? entry.display_name.toLowerCase().replaceAll(' ', '-'),
    formName: entry.form_name,
    displayName: entry.display_name,
    generation: (entry.is_regional_form && entry.region_label && REGION_GENERATION[entry.region_label])
      ? REGION_GENERATION[entry.region_label]
      : getGenerationFromSpeciesId(entry.species_id),
    spriteUrl: entry.sprite_url,
    shinySpriteUrl: entry.shiny_sprite_url,
    isRegionalForm: entry.is_regional_form,
    regionLabel: entry.region_label,
    sortOrder: entry.sort_order,
    types: entry.types as LivingDexEntry['types'],
    stats: entry.stats as LivingDexEntry['stats'],
    height: entry.height,
    weight: entry.weight,
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${path}`, init);
  if (!response.ok) {
    throw new Error(`Local API request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const api = {
  async getLivingDexEntries(): Promise<LivingDexEntry[]> {
    const data = await request<LivingDexEntriesResponse>('/living-dex-entries');
    return data.entries.map(mapLivingDexEntry);
  },

  async getGameDex(gameId: string): Promise<GameDexEntry[]> {
    const data = await request<GameDexResponse>(`/games/${gameId}/dex`);
    return data.entries.map((entry) => ({
      speciesId: entry.species_id,
      entryNumber: entry.entry_number,
      formName: entry.form_name,
      displayName: entry.display_name,
      spriteUrl: entry.sprite_url,
    }));
  },

  getEncounters(speciesId: number): Promise<Record<string, string[]>> {
    return request<Record<string, string[]>>(`/encounters/${speciesId}`);
  },

  getGames(): Promise<GameEntry[]> {
    return request<GameEntry[]>('/games');
  },

  async getSpeciesForms(speciesId: number): Promise<LivingDexEntry[]> {
    const data = await request<LivingDexEntriesResponse>(`/living-dex-entries/${speciesId}`);
    return data.entries.map(mapLivingDexEntry);
  },

  health(): Promise<ApiHealth> {
    return request<ApiHealth>('/health');
  },

  async getProgress(): Promise<ProgressSnapshot> {
    const data = await request<ProgressResponse>('/progress');
    return {
      owned: data.owned,
      gameDexProgress: data.game_dex_progress,
      availableGames: data.available_games,
    };
  },

  async saveProgress(progress: ProgressSnapshot): Promise<ProgressSnapshot> {
    const data = await request<ProgressResponse>('/progress', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        owned: progress.owned,
        game_dex_progress: progress.gameDexProgress,
        available_games: progress.availableGames,
      }),
    });

    return {
      owned: data.owned,
      gameDexProgress: data.game_dex_progress,
      availableGames: data.available_games,
    };
  },
};

export function toPokemonListItem(entry: LivingDexEntry) {
  return {
    name: entry.name || titleCase(entry.displayName),
    url: `${BASE}/pokemon/${entry.speciesId}`,
  };
}

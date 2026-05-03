'use client';

import { useLivingDexEntries } from '@/hooks/usePokemon';
import { useGenerationFilter } from '@/hooks/useGeneration';
import { GEN_FILTER_VALUES, type GenerationFilter } from '@/types/pokemon';
import { PokemonCard } from './PokemonCard';

const GEN_LABELS: Record<(typeof GEN_FILTER_VALUES)[number], string> = {
  all: 'All',
  1: 'Gen I', 2: 'Gen II', 3: 'Gen III', 4: 'Gen IV', 5: 'Gen V',
  6: 'Gen VI', 7: 'Gen VII', 8: 'Gen VIII', 9: 'Gen IX',
};

type Props = {
  onSelect: (speciesId: number, formName: string | null) => void;
};

export function PokemonGrid({ onSelect }: Props) {
  const { data, isLoading, error } = useLivingDexEntries();
  const { generation, setGeneration } = useGenerationFilter();

  const all = data ?? [];
  const visibleEntries = (generation === 'all' ? all : all.filter((entry) => entry.generation === generation))
    .toSorted((a, b) => {
      if (a.speciesId !== b.speciesId) return a.speciesId - b.speciesId;
      if (a.formName === null) return -1;
      if (b.formName === null) return 1;
      return a.displayName.localeCompare(b.displayName);
    });

  if (error) {
    return (
      <div className="text-center py-20 text-red-500">
        Failed to load Pokemon data. Check your connection and try again.
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 pt-4 pb-8">
      <div className="flex flex-wrap gap-2 mb-6">
        {GEN_FILTER_VALUES.map((value) => (
          <button
            key={value}
            onClick={() => setGeneration(value as GenerationFilter)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors
              ${generation === value
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
          >
            {GEN_LABELS[value]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
          {Array.from({ length: 32 }).map((_, index) => (
            <div key={index} className="h-28 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
          {visibleEntries.map((entry) => (
            <PokemonCard
              key={`${entry.speciesId}-${entry.formName ?? 'base'}`}
              entry={entry}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

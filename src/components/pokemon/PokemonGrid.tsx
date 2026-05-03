'use client';

import { useState } from 'react';
import { useLivingDexEntries } from '@/hooks/usePokemon';
import { useGenerationFilter } from '@/hooks/useGeneration';
import { GEN_FILTER_VALUES, type GenerationFilter, type LivingDexEntry, type PokemonType } from '@/types/pokemon';
import { ownedKey, usePokedexStore } from '@/store/pokedexStore';
import { PokemonCard } from './PokemonCard';

const GEN_LABELS: Record<(typeof GEN_FILTER_VALUES)[number], string> = {
  all: 'All',
  1: 'Gen I',
  2: 'Gen II',
  3: 'Gen III',
  4: 'Gen IV',
  5: 'Gen V',
  6: 'Gen VI',
  7: 'Gen VII',
  8: 'Gen VIII',
  9: 'Gen IX',
};

const TYPE_FILTER_VALUES: PokemonType[] = [
  'normal', 'fire', 'water', 'electric', 'grass', 'ice',
  'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug',
  'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy',
];

type OwnershipFilter = 'all' | 'owned' | 'missing' | 'planned' | 'shiny' | 'pending';
type SortMode = 'dex' | 'name' | 'missing';

type Props = {
  onSelect: (speciesId: number, formName: string | null) => void;
  search: string;
  filtersOpen: boolean;
};

function dexCompare(a: LivingDexEntry, b: LivingDexEntry) {
  if (a.speciesId !== b.speciesId) return a.speciesId - b.speciesId;
  if (a.formName === null) return -1;
  if (b.formName === null) return 1;
  return a.displayName.localeCompare(b.displayName);
}

export function PokemonGrid({ onSelect, search, filtersOpen }: Props) {
  const { data, isLoading, error } = useLivingDexEntries();
  const { generation, setGeneration } = useGenerationFilter();
  const [ownershipFilter, setOwnershipFilter] = useState<OwnershipFilter>('all');
  const [typeFilter, setTypeFilter] = useState<PokemonType | 'all'>('all');
  const [sortMode, setSortMode] = useState<SortMode>('dex');
  const ownedRecords = usePokedexStore((s) => s.owned);

  const all = data ?? [];
  const byGen = generation === 'all' ? all : all.filter((e) => e.generation === generation);

  const sorted = byGen.toSorted((a, b) => {
    if (sortMode === 'name') return a.displayName.localeCompare(b.displayName) || dexCompare(a, b);
    if (sortMode === 'missing') {
      const aOwned = !!ownedRecords[ownedKey(a.speciesId, a.formName)]?.owned;
      const bOwned = !!ownedRecords[ownedKey(b.speciesId, b.formName)]?.owned;
      if (aOwned !== bOwned) return aOwned ? 1 : -1;
    }
    return dexCompare(a, b);
  });

  const ownedCount = sorted.filter((e) => ownedRecords[ownedKey(e.speciesId, e.formName)]?.owned).length;
  const missingCount = sorted.length - ownedCount;
  const plannedCount = sorted.filter((e) => {
    const record = ownedRecords[ownedKey(e.speciesId, e.formName)];
    return !record?.owned && record?.planned;
  }).length;
  const shinyCount = sorted.filter((e) => ownedRecords[ownedKey(e.speciesId, e.formName)]?.shiny_owned).length;
  const pendingCount = sorted.filter((e) => {
    const record = ownedRecords[ownedKey(e.speciesId, e.formName)];
    return record?.owned && !record.in_home;
  }).length;

  const q = search.trim().toLowerCase();

  const visibleEntries = sorted.filter((e) => {
    const record = ownedRecords[ownedKey(e.speciesId, e.formName)];
    if (ownershipFilter === 'owned' && record?.owned !== true) return false;
    if (ownershipFilter === 'missing' && record?.owned) return false;
    if (ownershipFilter === 'planned' && (record?.owned || !record?.planned)) return false;
    if (ownershipFilter === 'shiny' && !record?.shiny_owned) return false;
    if (ownershipFilter === 'pending' && (!record?.owned || record?.in_home)) return false;
    if (typeFilter !== 'all' && !e.types?.includes(typeFilter)) return false;
    if (q) {
      const nameMatch = e.displayName.toLowerCase().includes(q);
      const numMatch = String(e.speciesId).startsWith(q.replace(/^#0*/, ''));
      if (!nameMatch && !numMatch) return false;
    }
    return true;
  });

  const ownershipOptions: { value: OwnershipFilter; label: string; count: number }[] = [
    { value: 'all', label: 'All', count: sorted.length },
    { value: 'owned', label: 'Owned', count: ownedCount },
    { value: 'missing', label: 'Missing', count: missingCount },
    { value: 'planned', label: 'Planned', count: plannedCount },
    { value: 'shiny', label: 'Shiny', count: shinyCount },
    { value: 'pending', label: 'Pending', count: pendingCount },
  ];

  const sortOptions: { value: SortMode; label: string }[] = [
    { value: 'dex', label: 'Dex order' },
    { value: 'name', label: 'Name A-Z' },
    { value: 'missing', label: 'Missing first' },
  ];

  if (error) {
    return (
      <div className="py-20 text-center text-red-500">
        Failed to load Pokemon data. Check your connection and try again.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pb-8">
      {filtersOpen && (
        <div className="-mx-4 mb-4 border-b border-gray-100 bg-white/95 px-4 pb-3 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/95">
          <div>
            <div className="mb-3 flex flex-wrap gap-2" aria-label="Generation filters">
              {GEN_FILTER_VALUES.map((value) => (
                <button
                  key={value}
                  onClick={() => setGeneration(value as GenerationFilter)}
                  className={`rounded-full px-3 py-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                    generation === value
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {GEN_LABELS[value]}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2" aria-label="Ownership filters">
              {ownershipOptions.map(({ value, label, count }) => (
                <button
                  key={value}
                  onClick={() => setOwnershipFilter(value)}
                  className={`rounded-full px-3 py-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                    ownershipFilter === value
                      ? value === 'owned'
                        ? 'bg-green-500 text-white'
                        : value === 'missing'
                          ? 'bg-red-400 text-white'
                          : value === 'planned'
                            ? 'bg-violet-500 text-white'
                            : value === 'shiny'
                              ? 'bg-yellow-500 text-white'
                              : value === 'pending'
                                ? 'bg-blue-500 text-white'
                                : 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {label} <span className="tabular-nums opacity-75">({count})</span>
                </button>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <label className="sr-only" htmlFor="type-filter">Filter by type</label>
              <select
                id="type-filter"
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value as PokemonType | 'all')}
                className="rounded-full border border-gray-200 bg-white px-3 py-1 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              >
                <option value="all">All types</option>
                {TYPE_FILTER_VALUES.map((type) => (
                  <option key={type} value={type}>{type[0].toUpperCase() + type.slice(1)}</option>
                ))}
              </select>

              <label className="sr-only" htmlFor="sort-mode">Sort Pokemon</label>
              <select
                id="sort-mode"
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value as SortMode)}
                className="rounded-full border border-gray-200 bg-white px-3 py-1 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
          {Array.from({ length: 32 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />
          ))}
        </div>
      ) : visibleEntries.length === 0 ? (
        <div className="py-20 text-center text-sm text-gray-400">
          No Pokemon match your filters.
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
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

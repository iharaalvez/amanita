"use client";

import { useState } from "react";
import { useLivingDexEntries } from "@/hooks/usePokemon";
import { useGenerationFilter } from "@/hooks/useGeneration";
import {
  GEN_FILTER_VALUES,
  type GenerationFilter,
  type PokemonType,
} from "@/types/pokemon";
import { usePokedexStore } from "@/store/pokedexStore";
import { compareLivingDexEntries, isHomeTrackedEntry } from "@/lib/livingDex";
import { PokemonCard } from "./PokemonCard";

const GEN_LABELS: Record<(typeof GEN_FILTER_VALUES)[number], string> = {
  all: "All",
  1: "Gen I",
  2: "Gen II",
  3: "Gen III",
  4: "Gen IV",
  5: "Gen V",
  6: "Gen VI",
  7: "Gen VII",
  8: "Gen VIII",
  9: "Gen IX",
};

const TYPE_FILTER_VALUES: PokemonType[] = [
  "normal",
  "fire",
  "water",
  "electric",
  "grass",
  "ice",
  "fighting",
  "poison",
  "ground",
  "flying",
  "psychic",
  "bug",
  "rock",
  "ghost",
  "dragon",
  "dark",
  "steel",
  "fairy",
];

type SortMode = "dex" | "name";

type Props = {
  onSelect: (speciesId: number, formName: string | null) => void;
  search: string;
  filtersOpen: boolean;
};

export function PokemonGrid({ onSelect, search, filtersOpen }: Props) {
  const { data, isLoading, error } = useLivingDexEntries();
  const { generation, setGeneration } = useGenerationFilter();
  const [typeFilter, setTypeFilter] = useState<PokemonType | "all">("all");
  const [sortMode, setSortMode] = useState<SortMode>("dex");
  const showCosmeticForms = usePokedexStore((s) => s.showCosmeticForms);
  const setShowCosmeticForms = usePokedexStore((s) => s.setShowCosmeticForms);
  const showGenderForms = usePokedexStore((s) => s.showGenderForms);
  const setShowGenderForms = usePokedexStore((s) => s.setShowGenderForms);
  const showGigantamaxForms = usePokedexStore((s) => s.showGigantamaxForms);
  const setShowGigantamaxForms = usePokedexStore(
    (s) => s.setShowGigantamaxForms,
  );

  const all = (data ?? []).filter((e) =>
    isHomeTrackedEntry(
      e,
      showCosmeticForms,
      showGenderForms,
      showGigantamaxForms,
    ),
  );
  const byGen =
    generation === "all" ? all : all.filter((e) => e.generation === generation);

  const sorted = byGen.toSorted((a, b) => {
    if (sortMode === "name")
      return (
        a.displayName.localeCompare(b.displayName) ||
        compareLivingDexEntries(a, b)
      );
    return compareLivingDexEntries(a, b);
  });

  const q = search.trim().toLowerCase();

  const visibleEntries = sorted.filter((e) => {
    if (typeFilter !== "all" && !e.types?.includes(typeFilter)) return false;
    if (q) {
      const nameMatch = e.displayName.toLowerCase().includes(q);
      const numMatch = String(e.speciesId).startsWith(q.replace(/^#0*/, ""));
      if (!nameMatch && !numMatch) return false;
    }
    return true;
  });

  const sortOptions: { value: SortMode; label: string }[] = [
    { value: "dex", label: "Dex order" },
    { value: "name", label: "Name A-Z" },
  ];

  if (error) {
    return (
      <div className="py-20 text-center text-red-500">
        Failed to load Pokemon data. Check your connection and try again.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-3 pb-8 sm:px-4">
      <div
        id="pokedex-filters"
        className={`${filtersOpen ? "block" : "hidden"} -mx-3 mb-4 border-b border-gray-100 bg-white/95 px-3 pb-3 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/95 sm:-mx-4 sm:block sm:px-4`}
      >
        <div>
          <div className="my-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
              <button
                type="button"
                onClick={() => setShowCosmeticForms(!showCosmeticForms)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 sm:py-1 sm:text-sm ${
                  showCosmeticForms
                    ? "bg-teal-500 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                }`}
              >
                Form variants {showCosmeticForms ? "on" : "off"}
              </button>
              <button
                type="button"
                onClick={() => setShowGenderForms(!showGenderForms)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 sm:py-1 sm:text-sm ${
                  showGenderForms
                    ? "bg-pink-500 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                }`}
              >
                Gender forms {showGenderForms ? "on" : "off"}
              </button>
              <button
                type="button"
                onClick={() => setShowGigantamaxForms(!showGigantamaxForms)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 sm:py-1 sm:text-sm ${
                  showGigantamaxForms
                    ? "bg-rose-500 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                }`}
              >
                G-Max {showGigantamaxForms ? "on" : "off"}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
              <label className="sr-only" htmlFor="type-filter">
                Filter by type
              </label>
              <select
                id="type-filter"
                value={typeFilter}
                onChange={(event) =>
                  setTypeFilter(event.target.value as PokemonType | "all")
                }
                className="min-w-0 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 sm:py-1 sm:text-sm"
              >
                <option value="all">All types</option>
                {TYPE_FILTER_VALUES.map((type) => (
                  <option key={type} value={type}>
                    {type[0].toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>

              <label className="sr-only" htmlFor="sort-mode">
                Sort Pokemon
              </label>
              <select
                id="sort-mode"
                value={sortMode}
                onChange={(event) =>
                  setSortMode(event.target.value as SortMode)
                }
                className="min-w-0 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 sm:py-1 sm:text-sm"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div
            className="-mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0"
            aria-label="Generation filters"
          >
            {GEN_FILTER_VALUES.map((value) => (
              <button
                key={value}
                onClick={() => setGeneration(value as GenerationFilter)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 sm:py-1 sm:text-sm ${
                  generation === value
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                }`}
              >
                {GEN_LABELS[value]}
              </button>
            ))}
          </div>

          <p className="text-xs text-gray-400">
            Showing {visibleEntries.length} of {sorted.length} Pokedex entries.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-2 min-[430px]:grid-cols-4 sm:grid-cols-5 lg:grid-cols-8">
          {Array.from({ length: 32 }).map((_, index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700"
            />
          ))}
        </div>
      ) : visibleEntries.length === 0 ? (
        <div className="py-20 text-center text-sm text-gray-400">
          No Pokemon match your filters.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 min-[430px]:grid-cols-4 sm:grid-cols-5 lg:grid-cols-8">
          {visibleEntries.map((entry) => (
            <PokemonCard
              key={`${entry.speciesId}-${entry.formName ?? "base"}`}
              entry={entry}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { PokemonGrid } from "@/components/pokemon/PokemonGrid";
import { useOpenPokemon } from "@/hooks/useOpenPokemon";
import { FilterIcon, XIcon } from "@/components/ui";

export default function PokedexPage() {
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const openPokemon = useOpenPokemon();

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-gray-700/60 dark:bg-gray-900/95">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <label htmlFor="pokedex-search" className="sr-only">
              Search Pokémon
            </label>
            <input
              id="pokedex-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Find a Pokémon…"
              className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 pr-8 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 dark:hover:text-gray-200"
              >
                <XIcon className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            aria-label="Toggle filters"
            aria-expanded={filtersOpen}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
              filtersOpen
                ? "border-blue-500 bg-blue-500 text-white"
                : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            }`}
          >
            <FilterIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <PokemonGrid
        onSelect={(speciesId, formName) => openPokemon(speciesId, formName)}
        search={search}
        filtersOpen={filtersOpen}
      />
    </div>
  );
}

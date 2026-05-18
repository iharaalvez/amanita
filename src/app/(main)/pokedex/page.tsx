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
    <div className="flex min-h-full flex-col bg-[#f4f0e8] dark:bg-[#0d0f18]">
      <div className="sticky top-0 z-10 border-y border-[#ded6c8] bg-[#f4f0e8]/95 px-4 py-3 backdrop-blur dark:border-[#302a40] dark:bg-[#0d0f18]/95">
        <div className="mx-auto flex max-w-7xl items-center gap-2">
          <div className="relative flex-1">
            <label htmlFor="pokedex-search" className="sr-only">
              Search Pokemon
            </label>
            <input
              id="pokedex-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Find a Pokemon..."
              className="h-10 w-full rounded-lg border border-[#ded6c8] bg-white px-3 pr-8 text-sm font-medium text-[#10131d] placeholder:text-[#8f8799] focus:outline-none focus:ring-2 focus:ring-[#f43434] dark:border-[#524969] dark:bg-[#161522] dark:text-[#f8f0df]"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[#8f8799] hover:text-[#10131d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f43434] dark:hover:text-[#f8f0df]"
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
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f43434] ${
              filtersOpen
                ? "border-[#f43434] bg-[#f43434] text-white"
                : "border-[#ded6c8] bg-white text-[#514874] hover:bg-[#fffaf0] dark:border-[#524969] dark:bg-[#161522] dark:text-[#c9c1d7] dark:hover:bg-[#211b32]"
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

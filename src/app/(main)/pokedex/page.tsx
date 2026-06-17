"use client";

import { useState } from "react";
import { PokemonGrid } from "@/components/pokemon/PokemonGrid";
import { useOpenPokemon } from "@/hooks/useOpenPokemon";
import { FilterIcon, XIcon, GridIcon } from "@/components/ui";

export default function PokedexPage() {
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const openPokemon = useOpenPokemon();

  return (
    <div className="flex min-h-full flex-col bg-[#0d0f18]">
      <div className="mx-auto w-full max-w-7xl px-3 py-5 sm:px-4">
        <header className="overflow-hidden rounded-lg border border-[#302a43] bg-[#151421]">
          <div className="grid gap-4 bg-[radial-gradient(circle_at_12%_0%,rgba(244,52,52,0.16),transparent_34%),linear-gradient(135deg,rgba(48,42,67,0.72),rgba(16,19,31,0.92))] p-4 lg:grid-cols-[1fr_minmax(280px,420px)] lg:items-end">
            <div>
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-[#f43434]/15 text-[#ff9a9a] ring-1 ring-[#f43434]/25">
                <GridIcon className="h-6 w-6" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ff9a9a]">
                Reference Library
              </p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-[#f8f0df] sm:text-3xl">
                Dex
              </h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-[#aaa2ba]">
                Browse species, forms, types, stats, evolutions, and catch data.
              </p>
            </div>
            <div className="flex items-center gap-2">
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
                  className="h-10 w-full rounded-lg border border-[#302a43] bg-[#0d1220] px-3 pr-8 text-sm font-medium text-[#f8f0df] placeholder:text-[#554a70] focus:outline-none focus:ring-2 focus:ring-[#f43434]/60"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[#8f8799] hover:text-[#f8f0df] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f43434]"
                  >
                    <XIcon className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setFiltersOpen((v) => !v)}
                aria-label="Toggle filters"
                aria-controls="pokedex-filters"
                aria-expanded={filtersOpen}
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f43434] sm:hidden ${
                  filtersOpen
                    ? "border-[#f43434] bg-[#f43434] text-white"
                    : "border-[#302a43] bg-[#0d1220] text-[#c9c1d7] hover:bg-[#211b32]"
                }`}
              >
                <FilterIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>
      </div>

      <PokemonGrid
        onSelect={(speciesId, formName) => openPokemon(speciesId, formName)}
        search={search}
        filtersOpen={filtersOpen}
      />
    </div>
  );
}

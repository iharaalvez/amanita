'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ownedKey, usePokedexStore } from '@/store/pokedexStore';
import { useLivingDexEntries } from '@/hooks/usePokemon';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { PokemonGrid } from '@/components/pokemon/PokemonGrid';
import { HomeBoxView } from '@/components/pokemon/HomeBoxView';
import { GameDexView } from '@/components/pokemon/GameDexView';
import { StatsView } from '@/components/pokemon/StatsView';
import { PokemonDetailModal } from '@/components/pokemon/PokemonDetailModal';
import { AuthModal } from '@/components/auth/AuthModal';
import { FilterIcon, XIcon } from '@/components/ui';

type Tab = 'pokedex' | 'home' | 'gamedex' | 'stats';

type SelectedPokemon = {
  pokemonId: number;
  speciesId: number;
  formName: string | null;
};

const GENERATIONS = [
  { id: 1, label: 'I' },
  { id: 2, label: 'II' },
  { id: 3, label: 'III' },
  { id: 4, label: 'IV' },
  { id: 5, label: 'V' },
  { id: 6, label: 'VI' },
  { id: 7, label: 'VII' },
  { id: 8, label: 'VIII' },
  { id: 9, label: 'IX' },
] as const;

const TABS: { id: Tab; label: string }[] = [
  { id: 'pokedex', label: 'Pokedex' },
  { id: 'home', label: 'HOME' },
  { id: 'gamedex', label: 'Game Dex' },
  { id: 'stats', label: 'Stats' },
];

const SHOW_PROGRESS_TABS = new Set<Tab>(['pokedex', 'home']);

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('pokedex');
  const [selected, setSelected] = useState<SelectedPokemon | null>(null);
  const [pokedexSearch, setPokedexSearch] = useState('');
  const [pokedexFiltersOpen, setPokedexFiltersOpen] = useState(false);
  const [homeSearch, setHomeSearch] = useState('');
  const [authOpen, setAuthOpen] = useState(false);
  const { user } = useAuth();
  const ownedRecords = usePokedexStore((s) => s.owned);

  const ownedCount = Object.values(ownedRecords).filter((r) => r.owned).length;
  const { data: livingDexEntries } = useLivingDexEntries();
  const [milestoneMessage, setMilestoneMessage] = useState<string | null>(null);
  const prevOwnedRef = useRef<number | null>(null);

  useEffect(() => {
    const prev = prevOwnedRef.current;
    prevOwnedRef.current = ownedCount;
    if (prev === null || ownedCount <= prev) return;
    const milestones: [number, string][] = [
      [1,    'First Pokémon caught!'],
      [50,   '50 caught — just getting started.'],
      [100,  '100 Pokémon owned!'],
      [250,  '250 owned — a quarter of the way there.'],
      [500,  'Halfway to a complete Living Dex!'],
      [750,  '750 owned — almost there.'],
      [1025, 'Living Dex complete!'],
    ];
    for (const [threshold, message] of milestones) {
      if (prev < threshold && ownedCount >= threshold) {
        setMilestoneMessage(message);
        const timer = setTimeout(() => setMilestoneMessage(null), 4500);
        return () => clearTimeout(timer);
      }
    }
  }, [ownedCount]);
  const total = livingDexEntries?.length ?? 1025;
  const progressPct = total > 0 ? (ownedCount / total) * 100 : 0;

  const generationProgress = useMemo(() => {
    const totals = new Map<number, { owned: number; total: number }>();
    for (const generation of GENERATIONS) {
      totals.set(generation.id, { owned: 0, total: 0 });
    }
    for (const entry of livingDexEntries ?? []) {
      const progress = totals.get(entry.generation);
      if (!progress) continue;
      progress.total += 1;
      if (ownedRecords[ownedKey(entry.speciesId, entry.formName)]?.owned) {
        progress.owned += 1;
      }
    }
    return GENERATIONS.map((g) => ({ ...g, ...(totals.get(g.id) ?? { owned: 0, total: 0 }) }));
  }, [livingDexEntries, ownedRecords]);

  function handleSelect(speciesId: number, formName: string | null) {
    const entry = livingDexEntries?.find((e) => e.speciesId === speciesId && e.formName === formName);
    setSelected({ pokemonId: entry?.id ?? speciesId, speciesId, formName });
  }

  return (
    <main className="min-h-screen bg-white dark:bg-gray-900">
      <header className="mx-auto max-w-7xl px-4 pb-0 pt-4 sm:pt-6">
        <div className="mb-4 flex items-baseline justify-between">
          <h1 className="text-xl font-bold tracking-tight dark:text-white">Living Pokédex</h1>
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-2">
                <span className="hidden text-xs text-gray-400 sm:block">{user.email}</span>
                <button
                  type="button"
                  onClick={() => supabase.auth.signOut()}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAuthOpen(true)}
                className="rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-600"
              >
                Sign in
              </button>
            )}
            {SHOW_PROGRESS_TABS.has(activeTab) && (
              <div className="text-right">
                <p className="text-lg font-bold tabular-nums text-green-400">{progressPct.toFixed(1)}%</p>
                <p className="text-xs font-semibold tabular-nums text-gray-400">
                  <span className="text-green-400">{ownedCount}</span>
                  <span className="mx-1 text-gray-600">/</span>
                  {total}
                </p>
              </div>
            )}
          </div>
        </div>

        {SHOW_PROGRESS_TABS.has(activeTab) && (
          <div className="mb-4">
            <div className="mb-3 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
              <div
                className="h-full rounded-full bg-green-400 transition-all duration-700"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            <div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
              {generationProgress.map((g) => {
                const pct = g.total > 0 ? (g.owned / g.total) * 100 : 0;
                return (
                  <div key={g.id} className="flex min-w-0 items-center gap-2">
                    <span className="w-14 shrink-0 text-[10px] font-semibold text-gray-500 dark:text-gray-500">
                      Gen {g.label}
                    </span>
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                      <div
                        className="h-full rounded-full bg-blue-400 transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-12 shrink-0 text-right text-[10px] tabular-nums text-gray-400">
                      {g.owned}/{g.total}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 border-b border-gray-200 dark:border-gray-700/60 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-wrap">
            {TABS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`-mb-px shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 sm:px-5 ${
                  activeTab === id
                    ? 'border-blue-500 text-blue-500 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-800 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {activeTab === 'home' && (
            <div className="pb-2 sm:pb-2">
              <div className="relative w-full sm:w-72">
                <label htmlFor="home-search" className="sr-only">Search Pokémon in HOME</label>
                <input
                  id="home-search"
                  type="search"
                  value={homeSearch}
                  onChange={(event) => setHomeSearch(event.target.value)}
                  placeholder="Find a Pokémon…"
                  className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 pr-8 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
                {homeSearch && (
                  <button
                    type="button"
                    onClick={() => setHomeSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 dark:hover:text-gray-200"
                    aria-label="Clear search"
                  >
                    <XIcon className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}
          {activeTab === 'pokedex' && (
            <div className="flex items-center gap-2 pb-2 sm:pb-2">
              <div className="relative w-full sm:w-72">
                <label htmlFor="pokedex-search" className="sr-only">Search Pokemon</label>
                <input
                  id="pokedex-search"
                  type="search"
                  value={pokedexSearch}
                  onChange={(event) => setPokedexSearch(event.target.value)}
                  placeholder="Find a Pokémon..."
                  className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 pr-8 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
                {pokedexSearch && (
                  <button
                    type="button"
                    onClick={() => setPokedexSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 dark:hover:text-gray-200"
                    aria-label="Clear search"
                  >
                    <XIcon className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setPokedexFiltersOpen((value) => !value)}
                aria-label="Toggle filters"
                aria-expanded={pokedexFiltersOpen}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                  pokedexFiltersOpen
                    ? 'border-blue-500 bg-blue-500 text-white'
                    : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                <FilterIcon className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="mt-4">
        {activeTab === 'pokedex' && (
          <PokemonGrid
            onSelect={handleSelect}
            search={pokedexSearch}
            filtersOpen={pokedexFiltersOpen}
          />
        )}
        {activeTab === 'home' && <HomeBoxView onSelect={handleSelect} search={homeSearch} />}
        {activeTab === 'gamedex' && <GameDexView onSelect={handleSelect} />}
        {activeTab === 'stats' && <StatsView />}
      </div>

      {selected !== null && (
        <PokemonDetailModal
          pokemonId={selected.pokemonId}
          speciesId={selected.speciesId}
          formName={selected.formName}
          onClose={() => setSelected(null)}
          onNavigate={(pokemonId, speciesId, formName) => setSelected({ pokemonId, speciesId, formName })}
        />
      )}

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}

      {milestoneMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white shadow-lg dark:bg-white dark:text-gray-900"
        >
          {milestoneMessage}
        </div>
      )}
    </main>
  );
}

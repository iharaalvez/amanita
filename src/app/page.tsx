'use client';

import { useState } from 'react';
import { usePokedexStore } from '@/store/pokedexStore';
import { useLivingDexEntries } from '@/hooks/usePokemon';
import { PokemonGrid } from '@/components/pokemon/PokemonGrid';
import { HomeBoxView } from '@/components/pokemon/HomeBoxView';
import { GameDexView } from '@/components/pokemon/GameDexView';
import { PokemonDetailModal } from '@/components/pokemon/PokemonDetailModal';

type Tab = 'pokedex' | 'home' | 'gamedex';

type SelectedPokemon = {
  pokemonId: number;   // Local entry ID for regional-form navigation
  speciesId: number;   // National Dex species ID (1–1025)
  formName: string | null;
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('pokedex');
  const [selected, setSelected] = useState<SelectedPokemon | null>(null);

  const ownedCount = usePokedexStore(
    (s) => Object.values(s.owned).filter((r) => r.owned).length
  );

  const { data: livingDexEntries } = useLivingDexEntries();
  const total = livingDexEntries?.length ?? 1025;
  const progressPct = total > 0 ? (ownedCount / total) * 100 : 0;

  function handleSelect(speciesId: number, formName: string | null) {
    // Regional forms use their local living_dex_entries ID for modal navigation.
    const entry = livingDexEntries?.find(
      (e) => e.speciesId === speciesId && e.formName === formName
    );
    setSelected({
      pokemonId: entry?.id ?? speciesId,
      speciesId,
      formName,
    });
  }

  return (
    <main className="min-h-screen bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 pt-8 pb-4">
        <h1 className="text-2xl font-bold mb-4 dark:text-white">Living Pokédex</h1>

        {activeTab !== 'gamedex' && (
          <div className="mb-5">
            <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-1.5">
              <span>Progress</span>
              <span className="tabular-nums font-medium">
                {ownedCount} / {total}
              </span>
            </div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-400 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Tab pills */}
        <div className="flex gap-2">
          {([
            ['pokedex', 'Pokédex'],
            ['home', 'HOME'],
            ['gamedex', 'Game Dex'],
          ] as const).map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors
                ${activeTab === tab
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'pokedex' && <PokemonGrid onSelect={handleSelect} />}
      {activeTab === 'home' && <HomeBoxView onSelect={handleSelect} />}
      {activeTab === 'gamedex' && <GameDexView onSelect={handleSelect} />}

      {selected !== null && (
        <PokemonDetailModal
          pokemonId={selected.pokemonId}
          speciesId={selected.speciesId}
          formName={selected.formName}
          onClose={() => setSelected(null)}
          onNavigate={(pokemonId, speciesId, formName) =>
            setSelected({ pokemonId, speciesId, formName })
          }
        />
      )}
    </main>
  );
}

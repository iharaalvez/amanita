'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { usePokedexStore, ownedKey } from '@/store/pokedexStore';
import { usePokemonSpecies } from '@/hooks/usePokemon';
import { useEncounters } from '@/hooks/useEncounters';
import { hasGamePokedexOverride } from '@/config/game-pokedex-overrides';
import { GAME_POKEMON_LOCATION_OVERRIDES, getGamePokemonLocationOverride } from '@/config/game-pokemon-location-overrides';
import { GAME_LIST } from '@/config/games';
import { CheckIcon, ChevronDownIcon, XIcon } from '@/components/ui';
import type { OwnershipMethod } from '@/types/pokemon';

const METHODS: OwnershipMethod[] = ['caught', 'bred', 'hatched', 'event'];

type EncounterLocationGroup = {
  games: string[];
  locations: string[];
};

function buildEncounterLocationGroups(encountersByGame: Map<string, string[]>): EncounterLocationGroup[] {
  const groupsByLocations = new Map<string, EncounterLocationGroup>();

  for (const [game, locations] of Array.from(encountersByGame.entries())) {
    const uniqueLocations = Array.from(new Set<string>(locations)).sort((a, b) => a.localeCompare(b));
    const key = uniqueLocations.join('|');
    const existing = groupsByLocations.get(key);
    if (existing) {
      existing.games.push(game);
    } else {
      groupsByLocations.set(key, { games: [game], locations: uniqueLocations });
    }
  }

  return Array.from(groupsByLocations.values());
}

function gameNameMatchesAvailableGame(gameName: string, availableGameNames: Set<string>): boolean {
  return gameName.split(' / ').some((name) => availableGameNames.has(name));
}

type Props = {
  pokemonId: number;
  speciesId: number;
  formName: string | null;
  onClose: () => void;
  onNavigate: (pokemonId: number, speciesId: number, formName: string | null) => void;
};

export function PokemonDetailModal({ pokemonId, speciesId, formName, onClose, onNavigate }: Props) {
  const [collapsedEncounterGroups, setCollapsedEncounterGroups] = useState<Record<string, boolean>>({});

  const { data: speciesForms, isLoading } = usePokemonSpecies(speciesId);
  const { data: encounters, isLoading: encLoading } = useEncounters(speciesId);
  const selectedEntry =
    speciesForms?.find((entry) => entry.formName === formName) ??
    speciesForms?.find((entry) => entry.formName === null);

  const storeKey = ownedKey(speciesId, formName);
  const owned = usePokedexStore((s) => !!s.owned[storeKey]?.owned);
  const ownedRecord = usePokedexStore((s) => s.owned[storeKey]);
  const markOwned = usePokedexStore((s) => s.markOwned);
  const clearOwnership = usePokedexStore((s) => s.clearOwnership);
  const markOwnedInGame = usePokedexStore((s) => s.markOwnedInGame);
  const clearOwnedInGame = usePokedexStore((s) => s.clearOwnedInGame);
  const availableGames = usePokedexStore((s) => s.availableGames);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    setCollapsedEncounterGroups({});
  }, [pokemonId]);

  const displayName = selectedEntry?.displayName ?? '';
  const paddedNumber = `#${String(speciesId).padStart(4, '0')}`;
  const spriteUrl = selectedEntry?.spriteUrl ?? '';
  const livingDexForms = (speciesForms ?? []).filter((entry) => entry.formName !== null);

  const registeredGames = GAME_LIST.filter((game) => ownedRecord?.game_dex[game.id]);
  const availableGameOptions = GAME_LIST.filter((game) => availableGames[game.id]);
  const availableGameNames = new Set(availableGameOptions.map((game) => game.name));

  const encountersByGame = new Map<string, string[]>();
  for (const enc of encounters ?? []) {
    for (const game of enc.games) {
      if (!encountersByGame.has(game)) encountersByGame.set(game, []);
      encountersByGame.get(game)!.push(enc.location);
    }
  }
  for (const game of GAME_LIST) {
    if (!(game.id in GAME_POKEMON_LOCATION_OVERRIDES)) continue;
    const locationOverride = getGamePokemonLocationOverride(game.id, speciesId);
    if (locationOverride.length > 0) {
      encountersByGame.set(game.name, locationOverride);
    }
  }
  const encounterLocationGroups = buildEncounterLocationGroups(encountersByGame);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex justify-end" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={selectedEntry ? `${displayName} details` : 'Pokemon details'}
        className="relative h-full w-full max-w-[440px] overflow-y-auto bg-white shadow-2xl dark:bg-gray-800 border-l border-gray-100 dark:border-gray-700"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="sticky top-4 ml-auto mr-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/90 hover:bg-gray-100 dark:bg-gray-800/90 dark:hover:bg-gray-700"
          aria-label="Close modal"
        >
          <XIcon className="w-4 h-4" />
        </button>

        {isLoading ? (
          <div className="p-8 flex flex-col items-center gap-4">
            <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
            <div className="w-32 h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        ) : selectedEntry ? (
          <>
            <div className="p-6 flex gap-5 items-start">
              <Image
                src={spriteUrl}
                alt={displayName}
                width={96}
                height={96}
                style={{ imageRendering: 'pixelated' }}
                className="w-24 h-24 object-contain flex-shrink-0"
              />
              <div className="flex-1 min-w-0 pt-1">
                <p className="text-xs text-gray-400 tabular-nums mb-0.5">{paddedNumber}</p>
                <h2 className="text-xl font-bold dark:text-white mb-2">{displayName}</h2>
              </div>
              <div className="flex-shrink-0 pt-1">
                <button
                  onClick={() => (owned ? clearOwnership(speciesId, formName) : markOwned(speciesId, formName))}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    owned
                      ? 'bg-green-400 text-white hover:bg-green-500'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {owned ? (
                    <span className="inline-flex items-center gap-1.5">
                      <CheckIcon className="w-4 h-4" />
                      Owned
                    </span>
                  ) : (
                    'Mark as owned'
                  )}
                </button>
              </div>
            </div>

            {livingDexForms.length > 0 && (
              <div className="px-6 pb-4">
                <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">Forms</p>
                <div className="flex gap-1.5 flex-wrap">
                  <button
                    onClick={() => onNavigate(speciesId, speciesId, null)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                      formName === null
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    Base
                  </button>
                  {livingDexForms.map((entry) => (
                    <button
                      key={entry.formName}
                      onClick={() => onNavigate(entry.id, speciesId, entry.formName)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                        formName === entry.formName
                          ? 'bg-teal-500 text-white'
                          : 'bg-teal-50 hover:bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300 dark:hover:bg-teal-900'
                      }`}
                    >
                      {entry.regionLabel ?? entry.displayName.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {owned && (
              <div className="px-6 pb-4 flex flex-col gap-3">
                <div>
                  <p className="text-xs text-gray-400 mb-1.5 font-medium uppercase tracking-wide">Method</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {METHODS.map((method) => (
                      <button
                        key={method}
                        onClick={() => markOwned(speciesId, formName, method)}
                        className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors ${
                          ownedRecord?.method === method
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                        }`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="caught-in" className="text-xs text-gray-400 mb-1.5 font-medium uppercase tracking-wide block">
                    Caught in
                  </label>
                  <select
                    id="caught-in"
                    value={ownedRecord?.game_caught ?? ''}
                    onChange={(event) => event.target.value && markOwnedInGame(speciesId, event.target.value)}
                    disabled={availableGameOptions.length === 0}
                    className="text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-3 py-1.5 w-full max-w-xs"
                  >
                    <option value="">{availableGameOptions.length > 0 ? '- select game -' : 'Mark games available first'}</option>
                    {availableGameOptions.map((game) => (
                      <option key={game.id} value={game.id}>
                        {game.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="px-6 pb-4 flex flex-col gap-2">
              <label htmlFor="registered-game" className="text-xs text-gray-400 mb-0.5 font-medium uppercase tracking-wide block">
                National Dex registration
              </label>
              <select
                id="registered-game"
                value=""
                onChange={(event) => {
                  if (event.target.value) markOwnedInGame(speciesId, event.target.value);
                }}
                disabled={availableGameOptions.length === 0}
                className="text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-3 py-1.5 w-full max-w-xs"
              >
                <option value="">{availableGameOptions.length > 0 ? 'Add game...' : 'Mark games available first'}</option>
                {availableGameOptions.map((game) => (
                  <option key={game.id} value={game.id} disabled={!!ownedRecord?.game_dex[game.id]}>
                    {game.name}
                  </option>
                ))}
              </select>

              {registeredGames.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {registeredGames.map((game) => (
                    <button
                      key={game.id}
                      type="button"
                      onClick={() => clearOwnedInGame(speciesId, game.id)}
                      className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-950 dark:text-green-300 dark:hover:bg-green-900"
                      title={`Remove from ${game.name}`}
                    >
                      <span className="inline-flex items-center gap-1">
                        {game.name}
                        <XIcon className="w-3 h-3" />
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <hr className="border-gray-100 dark:border-gray-700" />

            <div className="px-6 py-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Where to catch
                </h3>
                {encounterLocationGroups.length > 0 && (
                  <span className="text-[11px] text-gray-400 tabular-nums">
                    {encounterLocationGroups.length} group{encounterLocationGroups.length === 1 ? '' : 's'}
                  </span>
                )}
              </div>
              {encLoading ? (
                <div className="flex flex-col gap-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  ))}
                </div>
              ) : encounterLocationGroups.length === 0 ? (
                <p className="text-sm text-gray-400 italic">Not available in the wild - check breeding or events</p>
              ) : (
                <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-700">
                  {encounterLocationGroups.map((group) => {
                    const groupKey = `${group.games.join('|')}:${group.locations.join('|')}`;
                    const hasAvailableGame =
                      availableGameNames.size === 0 ||
                      group.games.some((game) => gameNameMatchesAvailableGame(game, availableGameNames));
                    const collapsed = collapsedEncounterGroups[groupKey] ?? !hasAvailableGame;

                    return (
                      <div key={groupKey} className="py-2 first:pt-0 last:pb-0">
                        <button
                          type="button"
                          onClick={() => setCollapsedEncounterGroups((state) => ({ ...state, [groupKey]: !collapsed }))}
                          className="w-full flex items-start justify-between gap-3 py-1 text-left rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                          aria-expanded={!collapsed}
                        >
                          <span className="min-w-0">
                            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 leading-tight block">
                              {group.games.join(' / ')}
                            </span>
                            {collapsed && (
                              <span className="text-[10px] text-gray-400">
                                {group.locations.slice(0, 2).join(', ')}
                                {group.locations.length > 2 ? ` +${group.locations.length - 2} more` : ''}
                              </span>
                            )}
                          </span>
                          <span className="shrink-0 inline-flex items-center gap-1 text-[10px] text-gray-400 tabular-nums">
                            {group.locations.length}
                            <ChevronDownIcon className={`w-3.5 h-3.5 transition-transform ${collapsed ? '-rotate-90' : ''}`} />
                          </span>
                        </button>
                        {!collapsed && (
                          <div className="flex flex-wrap gap-1.5 pt-2">
                            {group.locations.map((location) => (
                              <span
                                key={location}
                                className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-md leading-tight"
                              >
                                {location}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {GAME_LIST.some((game) => !game.pokeapiReady && !hasGamePokedexOverride(game.id)) && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-3 italic">
                  Location data for{' '}
                  {GAME_LIST.filter((game) => !game.pokeapiReady && !hasGamePokedexOverride(game.id))
                    .map((game) => game.name)
                    .join(', ')}{' '}
                  is not yet available in the local database.
                </p>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

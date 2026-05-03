"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { ReactNode } from "react";
import { usePokedexStore, ownedKey } from "@/store/pokedexStore";
import { usePokemonSpecies } from "@/hooks/usePokemon";
import { useEncounters } from "@/hooks/useEncounters";
import { hasGamePokedexOverride } from "@/config/game-pokedex-overrides";
import {
  GAME_POKEMON_LOCATION_OVERRIDES,
  getGamePokemonLocationOverride,
} from "@/config/game-pokemon-location-overrides";
import { GAME_LIST } from "@/config/games";
import {
  BookmarkIcon,
  CheckIcon,
  ChevronDownIcon,
  HomeIcon,
  SparkleIcon,
  XIcon,
} from "@/components/ui";
import type { OwnershipMethod, ShinyHuntMethod } from "@/types/pokemon";
import {
  isMythical,
  isShinyLocked,
  requiresTrade,
} from "@/config/pokemon-flags";

const METHODS: OwnershipMethod[] = [
  "caught",
  "bred",
  "hatched",
  "transferred",
  "event",
];

const SHINY_HUNT_METHODS: { value: ShinyHuntMethod; label: string }[] = [
  { value: "random", label: "Random" },
  { value: "masuda", label: "Masuda" },
  { value: "soft-reset", label: "Soft Reset" },
  { value: "sos-chain", label: "SOS Chain" },
  { value: "poke-radar", label: "Poke Radar" },
  { value: "dex-nav", label: "DexNav" },
  { value: "outbreak", label: "Outbreak" },
];

const TYPE_COLORS: Record<string, string> = {
  normal: "#A8A878",
  fire: "#F08030",
  water: "#6890F0",
  electric: "#F8D030",
  grass: "#78C850",
  ice: "#98D8D8",
  fighting: "#C03028",
  poison: "#A040A0",
  ground: "#E0C068",
  flying: "#A890F0",
  psychic: "#F85888",
  bug: "#A8B820",
  rock: "#B8A038",
  ghost: "#705898",
  dragon: "#7038F8",
  dark: "#705848",
  steel: "#B8B8D0",
  fairy: "#EE99AC",
};

const STAT_LABELS: Record<string, string> = {
  hp: "HP",
  attack: "Atk",
  defense: "Def",
  "special-attack": "SpA",
  "special-defense": "SpD",
  speed: "Spe",
};

type EncounterLocationGroup = {
  games: string[];
  locations: string[];
};

function buildEncounterLocationGroups(
  encountersByGame: Map<string, string[]>,
): EncounterLocationGroup[] {
  const groupsByLocations = new Map<string, EncounterLocationGroup>();

  for (const [game, locations] of Array.from(encountersByGame.entries())) {
    const uniqueLocations = Array.from(new Set<string>(locations)).sort(
      (a, b) => a.localeCompare(b),
    );
    const key = uniqueLocations.join("|");
    const existing = groupsByLocations.get(key);
    if (existing) {
      existing.games.push(game);
    } else {
      groupsByLocations.set(key, { games: [game], locations: uniqueLocations });
    }
  }

  return Array.from(groupsByLocations.values());
}

function gameNameMatchesAvailableGame(
  gameName: string,
  availableGameNames: Set<string>,
): boolean {
  return gameName.split(" / ").some((name) => availableGameNames.has(name));
}

type StatusToggleProps = {
  active: boolean;
  disabled?: boolean;
  label: string;
  helper: string;
  activeClass: string;
  icon: ReactNode;
  onClick?: () => void;
};

function StatusToggle({
  active,
  disabled,
  label,
  helper,
  activeClass,
  icon,
  onClick,
}: StatusToggleProps) {
  const [justActivated, setJustActivated] = useState(false);
  const prevActiveRef = useRef(active);

  useEffect(() => {
    if (!prevActiveRef.current && active) {
      setJustActivated(true);
      const timer = setTimeout(() => setJustActivated(false), 400);
      return () => clearTimeout(timer);
    }
    prevActiveRef.current = active;
  }, [active]);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`flex min-h-[64px] items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-left transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 sm:gap-3 sm:px-4 sm:py-3 ${
        active
          ? `${activeClass} text-white shadow-sm`
          : disabled
            ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-500"
            : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-gray-600 dark:hover:bg-gray-700"
      }`}
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/10 dark:bg-white/10 sm:h-10 sm:w-10 ${justActivated ? "animate-sprite-pop" : ""}`}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-bold leading-tight">{label}</span>
        <span
          className={`block text-[11px] leading-snug mt-0.5 ${active ? "text-white/75" : "text-gray-400"}`}
        >
          {helper}
        </span>
      </span>
    </button>
  );
}

type Props = {
  pokemonId: number;
  speciesId: number;
  formName: string | null;
  onClose: () => void;
  onNavigate: (
    pokemonId: number,
    speciesId: number,
    formName: string | null,
  ) => void;
};

export function PokemonDetailModal({
  pokemonId,
  speciesId,
  formName,
  onClose,
  onNavigate,
}: Props) {
  const [collapsedEncounterGroups, setCollapsedEncounterGroups] = useState<
    Record<string, boolean>
  >({});
  const [showShiny, setShowShiny] = useState(false);

  const { data: speciesForms, isLoading } = usePokemonSpecies(speciesId);
  const { data: encounters, isLoading: encLoading } = useEncounters(speciesId);
  const selectedEntry =
    speciesForms?.find((entry) => entry.formName === formName) ??
    speciesForms?.find((entry) => entry.formName === null);

  const storeKey = ownedKey(speciesId, formName);
  const owned = usePokedexStore((s) => !!s.owned[storeKey]?.owned);
  const shinyOwned = usePokedexStore((s) => !!s.owned[storeKey]?.shiny_owned);
  const ownedRecord = usePokedexStore((s) => s.owned[storeKey]);
  const inHome = usePokedexStore((s) => !!s.owned[storeKey]?.in_home);
  const markOwned = usePokedexStore((s) => s.markOwned);
  const markShinyOwned = usePokedexStore((s) => s.markShinyOwned);
  const clearShinyOwned = usePokedexStore((s) => s.clearShinyOwned);
  const markInHome = usePokedexStore((s) => s.markInHome);
  const clearInHome = usePokedexStore((s) => s.clearInHome);
  const markPlanned = usePokedexStore((s) => s.markPlanned);
  const clearPlanned = usePokedexStore((s) => s.clearPlanned);
  const clearOwnership = usePokedexStore((s) => s.clearOwnership);
  const markOwnedInGame = usePokedexStore((s) => s.markOwnedInGame);
  const clearOwnedInGame = usePokedexStore((s) => s.clearOwnedInGame);
  const availableGames = usePokedexStore((s) => s.availableGames);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    setCollapsedEncounterGroups({});
    setShowShiny(false);
  }, [pokemonId]);

  const displayName = selectedEntry?.displayName ?? "";
  const paddedNumber = `#${String(speciesId).padStart(4, "0")}`;
  const spriteUrl = selectedEntry?.spriteUrl ?? "";
  const livingDexForms = (speciesForms ?? []).filter(
    (entry) => entry.formName !== null,
  );
  const planned = !!ownedRecord?.planned;
  const shinyLocked = isShinyLocked(speciesId, formName);
  const stats = selectedEntry?.stats ?? {};
  const totalStats = Object.values(stats).reduce(
    (sum, stat) => sum + (stat ?? 0),
    0,
  );

  const registeredGames = GAME_LIST.filter(
    (game) => ownedRecord?.game_dex[game.id],
  );
  const availableGameOptions = GAME_LIST.filter(
    (game) => availableGames[game.id],
  );
  const availableGameNames = new Set(
    availableGameOptions.map((game) => game.name),
  );

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

  const encounterLocationGroups =
    buildEncounterLocationGroups(encountersByGame);
  const hasWildEncounters = encounterLocationGroups.length > 0;
  const availableWildGames = availableGameOptions.filter((game) =>
    encounterLocationGroups.some((group) =>
      group.games.some((name) =>
        gameNameMatchesAvailableGame(name, new Set([game.name])),
      ),
    ),
  );
  const unavailableWildGames = availableGameOptions.filter(
    (game) => !availableWildGames.some((wildGame) => wildGame.id === game.id),
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/40 sm:justify-end"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={
          selectedEntry ? `${displayName} details` : "Pokemon details"
        }
        className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border-gray-100 bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl dark:border-gray-700 dark:bg-gray-800 sm:h-full sm:max-h-none sm:max-w-[460px] sm:rounded-none sm:border-l sm:pb-0"
        onClick={(event) => event.stopPropagation()}
      >
        {selectedEntry?.types?.[0] && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-96"
            style={{
              background: `radial-gradient(ellipse 100% 55% at 50% 0%, ${TYPE_COLORS[selectedEntry.types[0]]}45, transparent)`,
            }}
          />
        )}
        <div
          aria-hidden
          className="mx-auto mb-1 mt-3 h-1 w-10 rounded-full bg-gray-300 dark:bg-gray-600 sm:hidden"
        />
        <button
          type="button"
          onClick={onClose}
          className="sticky top-4 z-10 ml-auto mr-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 dark:bg-gray-800/90 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          aria-label="Close modal"
        >
          <XIcon className="h-4 w-4" />
        </button>

        {isLoading ? (
          <div className="flex flex-col items-center gap-4 p-8">
            <div className="h-24 w-24 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />
            <div className="h-5 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        ) : selectedEntry ? (
          <>
            <div className="px-6 pb-5">
              <div className="mb-5 flex items-start gap-5">
                <div className="relative shrink-0">
                  <Image
                    src={
                      showShiny && selectedEntry.shinySpriteUrl
                        ? selectedEntry.shinySpriteUrl
                        : spriteUrl
                    }
                    alt={displayName}
                    width={112}
                    height={112}
                    style={{ imageRendering: "pixelated" }}
                    className="h-28 w-28 object-contain"
                  />
                  {selectedEntry.shinySpriteUrl && (
                    <button
                      type="button"
                      onClick={() => setShowShiny((value) => !value)}
                      title={
                        showShiny ? "Show normal sprite" : "Show shiny sprite"
                      }
                      aria-pressed={showShiny}
                      className={`absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                        showShiny
                          ? "border-yellow-500 bg-yellow-400 text-white"
                          : "border-gray-200 bg-white text-gray-400 hover:text-yellow-400 dark:border-gray-600 dark:bg-gray-700"
                      }`}
                    >
                      <SparkleIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="min-w-0 flex-1 pt-2">
                  <p className="mb-0.5 text-xs tabular-nums text-gray-400">
                    {paddedNumber}
                  </p>
                  <h2 className="mb-2 text-2xl font-bold leading-tight dark:text-white">
                    {displayName}
                  </h2>
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {(selectedEntry.types ?? []).map((type) => (
                      <span
                        key={type}
                        className="rounded px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-white"
                        style={{ backgroundColor: TYPE_COLORS[type] ?? "#888" }}
                      >
                        {type}
                      </span>
                    ))}
                  </div>
                  {(selectedEntry.height || selectedEntry.weight) && (
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      {selectedEntry.height ? (
                        <span>{(selectedEntry.height / 10).toFixed(1)} m</span>
                      ) : null}
                      {selectedEntry.weight ? (
                        <span>{(selectedEntry.weight / 10).toFixed(1)} kg</span>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="grid grid-cols-2 gap-2">
                  <StatusToggle
                    active={owned}
                    label={owned ? "Owned" : "Missing"}
                    helper={
                      owned ? "Caught or bred by you" : "Not in your Living Dex"
                    }
                    activeClass="border-green-400 bg-green-500"
                    icon={<CheckIcon className="h-5 w-5" />}
                    onClick={() =>
                      owned
                        ? clearOwnership(speciesId, formName)
                        : markOwned(speciesId, formName)
                    }
                  />
                  <StatusToggle
                    active={inHome}
                    disabled={!owned}
                    label={inHome ? "In HOME" : "HOME"}
                    helper={owned ? "Transferred to HOME" : "Mark owned first"}
                    activeClass="border-blue-400 bg-blue-500"
                    icon={<HomeIcon className="h-5 w-5" />}
                    onClick={() =>
                      inHome
                        ? clearInHome(speciesId, formName)
                        : markInHome(speciesId, formName)
                    }
                  />
                  <StatusToggle
                    active={shinyOwned}
                    disabled={shinyLocked}
                    label={
                      shinyLocked
                        ? "Shiny locked"
                        : shinyOwned
                          ? "Shiny owned"
                          : "Shiny"
                    }
                    helper={
                      shinyLocked
                        ? "Not currently available"
                        : "Track shiny variant"
                    }
                    activeClass="border-yellow-400 bg-yellow-500"
                    icon={<SparkleIcon className="h-5 w-5" />}
                    onClick={() =>
                      shinyOwned
                        ? clearShinyOwned(speciesId, formName)
                        : markShinyOwned(speciesId, formName)
                    }
                  />
                  <StatusToggle
                    active={!owned && planned}
                    disabled={owned}
                    label={planned ? "Planned" : "Plan catch"}
                    helper={owned ? "Already owned" : "Add to catching queue"}
                    activeClass="border-violet-400 bg-violet-500"
                    icon={<BookmarkIcon className="h-5 w-5" />}
                    onClick={() =>
                      planned
                        ? clearPlanned(speciesId, formName)
                        : markPlanned(speciesId, formName)
                    }
                  />
                </div>
              </div>
            </div>

            {livingDexForms.length > 0 && (
              <section className="px-6 pb-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                  Forms
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => onNavigate(speciesId, speciesId, null)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                      formName === null
                        ? "bg-blue-500 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                    }`}
                  >
                    Base
                  </button>
                  {livingDexForms.map((entry) => (
                    <button
                      key={entry.formName}
                      type="button"
                      onClick={() =>
                        onNavigate(entry.id, speciesId, entry.formName)
                      }
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                        formName === entry.formName
                          ? "bg-teal-500 text-white"
                          : "bg-teal-50 text-teal-700 hover:bg-teal-100 dark:bg-teal-950 dark:text-teal-300 dark:hover:bg-teal-900"
                      }`}
                    >
                      {entry.regionLabel ?? entry.displayName.split(" ")[0]}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {owned && (
              <section className="flex flex-col gap-3 px-6 pb-4">
                <div>
                  <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-gray-400">
                    Method
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {METHODS.map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => markOwned(speciesId, formName, method)}
                        className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                          ownedRecord?.method === method
                            ? "bg-blue-500 text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                        }`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="caught-in"
                    className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-400"
                  >
                    Caught in
                  </label>
                  <select
                    id="caught-in"
                    value={ownedRecord?.game_caught ?? ""}
                    onChange={(event) =>
                      event.target.value &&
                      markOwnedInGame(speciesId, event.target.value)
                    }
                    disabled={availableGameOptions.length === 0}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                  >
                    <option value="">
                      {availableGameOptions.length > 0
                        ? "- select game -"
                        : "Mark games available first"}
                    </option>
                    {availableGameOptions.map((game) => (
                      <option key={game.id} value={game.id}>
                        {game.name}
                      </option>
                    ))}
                  </select>
                </div>
              </section>
            )}

            {shinyOwned && (
              <section className="flex flex-col gap-3 border-t border-yellow-100 px-6 pb-4 pt-4 dark:border-yellow-900/40">
                <p className="text-xs font-semibold uppercase tracking-wide text-yellow-600 dark:text-yellow-400">
                  Shiny details
                </p>
                <div>
                  <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-gray-400">
                    Hunt method
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {SHINY_HUNT_METHODS.map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() =>
                          markShinyOwned(
                            speciesId,
                            formName,
                            value,
                            ownedRecord?.shiny_game,
                          )
                        }
                        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                          ownedRecord?.shiny_method === value
                            ? "bg-yellow-400 text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="shiny-game"
                    className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-400"
                  >
                    Found in
                  </label>
                  <select
                    id="shiny-game"
                    value={ownedRecord?.shiny_game ?? ""}
                    onChange={(event) =>
                      markShinyOwned(
                        speciesId,
                        formName,
                        ownedRecord?.shiny_method,
                        event.target.value || undefined,
                      )
                    }
                    disabled={availableGameOptions.length === 0}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                  >
                    <option value="">
                      {availableGameOptions.length > 0
                        ? "- select game -"
                        : "Mark games available first"}
                    </option>
                    {availableGameOptions.map((game) => (
                      <option key={game.id} value={game.id}>
                        {game.name}
                      </option>
                    ))}
                  </select>
                </div>
              </section>
            )}

            <section className="flex flex-col gap-2 px-6 pb-4">
              <label
                htmlFor="registered-game"
                className="mb-0.5 block text-xs font-medium uppercase tracking-wide text-gray-400"
              >
                National Dex registration
              </label>
              <select
                id="registered-game"
                value=""
                onChange={(event) => {
                  if (event.target.value)
                    markOwnedInGame(speciesId, event.target.value);
                }}
                disabled={availableGameOptions.length === 0}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
              >
                <option value="">
                  {availableGameOptions.length > 0
                    ? "Add game..."
                    : "Mark games available first"}
                </option>
                {availableGameOptions.map((game) => (
                  <option
                    key={game.id}
                    value={game.id}
                    disabled={!!ownedRecord?.game_dex[game.id]}
                  >
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
                      className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 dark:bg-green-950 dark:text-green-300 dark:hover:bg-green-900"
                      title={`Remove from ${game.name}`}
                    >
                      <span className="inline-flex items-center gap-1">
                        {game.name}
                        <XIcon className="h-3 w-3" />
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <hr className="border-gray-100 dark:border-gray-700" />

            {Object.keys(stats).length > 0 && (
              <section className="px-6 py-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Base stats
                  </h3>
                  <span className="text-xs font-semibold tabular-nums text-gray-400">
                    BST {totalStats}
                  </span>
                </div>
                <div className="space-y-2">
                  {Object.entries(STAT_LABELS).map(([statKey, label]) => {
                    const value = stats[statKey as keyof typeof stats] ?? 0;
                    return (
                      <div
                        key={statKey}
                        className="grid grid-cols-[36px_36px_1fr] items-center gap-2 text-xs"
                      >
                        <span className="font-semibold text-gray-500 dark:text-gray-400">
                          {label}
                        </span>
                        <span className="text-right tabular-nums text-gray-400">
                          {value}
                        </span>
                        <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                          <div
                            className="h-full rounded-full bg-blue-400"
                            style={{
                              width: `${Math.min(100, (value / 180) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            <hr className="border-gray-100 dark:border-gray-700" />

            <section className="px-6 py-4">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Availability
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {isMythical(speciesId) && (
                  <span className="rounded-md bg-yellow-100 px-2 py-1 text-xs font-semibold text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300">
                    Mythical - event only
                  </span>
                )}
                {requiresTrade(speciesId) && (
                  <span className="rounded-md bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                    Trade evolution
                  </span>
                )}
                {hasWildEncounters && (
                  <span className="rounded-md bg-green-100 px-2 py-1 text-xs font-semibold text-green-700 dark:bg-green-950 dark:text-green-300">
                    Wild encounter data
                  </span>
                )}
                {!hasWildEncounters &&
                  !isMythical(speciesId) &&
                  !requiresTrade(speciesId) && (
                    <span className="rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                      No wild encounters - check breeding or transfer
                    </span>
                  )}
                {availableWildGames.length > 0 && (
                  <span className="rounded-md bg-green-50 px-2 py-1 text-xs font-semibold text-green-600 dark:bg-green-950 dark:text-green-400">
                    Available in {availableWildGames.length} selected game
                    {availableWildGames.length === 1 ? "" : "s"}
                  </span>
                )}
                {unavailableWildGames.length > 0 && hasWildEncounters && (
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    Not wild in {unavailableWildGames.length} selected game
                    {unavailableWildGames.length === 1 ? "" : "s"}
                  </span>
                )}
              </div>
            </section>

            <hr className="border-gray-100 dark:border-gray-700" />

            <section className="px-6 py-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Where to catch
                </h3>
                {encounterLocationGroups.length > 0 && (
                  <span className="text-[11px] tabular-nums text-gray-400">
                    {encounterLocationGroups.length} group
                    {encounterLocationGroups.length === 1 ? "" : "s"}
                  </span>
                )}
              </div>

              {encLoading ? (
                <div className="flex flex-col gap-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-4 animate-pulse rounded bg-gray-200 dark:bg-gray-700"
                    />
                  ))}
                </div>
              ) : encounterLocationGroups.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 px-4 py-6 text-center dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Not available in the wild
                  </p>
                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                    {isMythical(speciesId)
                      ? "Mythical — obtain via event distribution"
                      : requiresTrade(speciesId)
                        ? "Evolves via trade — catch the pre-evolution"
                        : "Check breeding, HOME transfers, or events"}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-700">
                  {encounterLocationGroups.map((group) => {
                    const groupKey = `${group.games.join("|")}:${group.locations.join("|")}`;
                    const hasAvailableGame =
                      availableGameNames.size === 0 ||
                      group.games.some((game) =>
                        gameNameMatchesAvailableGame(game, availableGameNames),
                      );
                    const collapsed =
                      collapsedEncounterGroups[groupKey] ?? !hasAvailableGame;

                    return (
                      <div key={groupKey} className="py-2 first:pt-0 last:pb-0">
                        <button
                          type="button"
                          onClick={() =>
                            setCollapsedEncounterGroups((state) => ({
                              ...state,
                              [groupKey]: !collapsed,
                            }))
                          }
                          className="flex w-full items-start justify-between gap-3 rounded-md py-1 text-left transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 dark:hover:bg-gray-700/50"
                          aria-expanded={!collapsed}
                        >
                          <span className="min-w-0">
                            <span className="block text-xs font-semibold leading-tight text-gray-600 dark:text-gray-300">
                              {group.games.join(" / ")}
                            </span>
                            {collapsed && (
                              <span className="text-[10px] text-gray-400">
                                {group.locations.slice(0, 2).join(", ")}
                                {group.locations.length > 2
                                  ? ` +${group.locations.length - 2} more`
                                  : ""}
                              </span>
                            )}
                          </span>
                          <span className="inline-flex shrink-0 items-center gap-1 text-[10px] tabular-nums text-gray-400">
                            {group.locations.length}
                            <ChevronDownIcon
                              className={`h-3.5 w-3.5 transition-transform ${collapsed ? "-rotate-90" : ""}`}
                            />
                          </span>
                        </button>
                        {!collapsed && (
                          <div className="flex flex-wrap gap-1.5 pt-2">
                            {group.locations.map((location) => (
                              <span
                                key={location}
                                className="rounded-md bg-gray-100 px-2 py-1 text-xs leading-tight text-gray-600 dark:bg-gray-700 dark:text-gray-300"
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

              <p className="mt-3 text-[11px] italic text-amber-600 dark:text-amber-400">
                Encounter data can be incomplete in PokeAPI for some titles; use
                it as guidance, not a guarantee.
              </p>

              {GAME_LIST.some(
                (game) =>
                  !game.pokeapiReady && !hasGamePokedexOverride(game.id),
              ) && (
                <p className="mt-2 text-[11px] italic text-amber-600 dark:text-amber-400">
                  Location data for{" "}
                  {GAME_LIST.filter(
                    (game) =>
                      !game.pokeapiReady && !hasGamePokedexOverride(game.id),
                  )
                    .map((game) => game.name)
                    .join(", ")}{" "}
                  is not yet available in the local database.
                </p>
              )}
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}

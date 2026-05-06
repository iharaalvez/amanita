"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useGamePokedex } from "@/hooks/useGamePokedex";
import { usePokedexStore } from "@/store/pokedexStore";
import { GAME_LIST, getGameById, getGamesByGeneration } from "@/config/games";
import { getExclusiveVersion } from "@/config/version-exclusives";
import { CheckIcon, SparkleIcon, XIcon } from "@/components/ui";
import type { GameDexEntry } from "@/types/pokemon";

const GEN_LABELS: Record<number, string> = {
  1: "Generation I",
  2: "Generation II",
  3: "Generation III",
  4: "Generation IV",
  5: "Generation V",
  6: "Generation VI",
  7: "Generation VII",
  8: "Generation VIII",
  9: "Generation IX",
};

type GameSlotProps = {
  entry: GameDexEntry;
  gameId: string;
  onSelect: (speciesId: number, formName: string | null) => void;
};

function GameSlot({ entry, gameId, onSelect }: GameSlotProps) {
  const owned = usePokedexStore((state) =>
    state.isOwnedInGame(entry.speciesId, gameId),
  );
  const paddedGameNumber = `#${String(entry.entryNumber).padStart(3, "0")}`;
  const paddedNationalNumber = `Nat. #${String(entry.speciesId).padStart(4, "0")}`;
  const exclusiveVersion = getExclusiveVersion(gameId, entry.speciesId);

  return (
    <button
      onClick={() => onSelect(entry.speciesId, entry.formName)}
      aria-label={`${entry.displayName}, ${owned ? "registered" : "not registered"} in this game`}
      title={
        exclusiveVersion
          ? `${paddedGameNumber} - ${entry.displayName} (${paddedNationalNumber}) · ${exclusiveVersion} exclusive`
          : `${paddedGameNumber} - ${entry.displayName} (${paddedNationalNumber})`
      }
      className={`relative flex h-[132px] w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-lg p-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 sm:w-[120px] ${
        owned
          ? "bg-green-50 ring-1 ring-green-400 dark:bg-green-950/30"
          : "bg-white/50 hover:bg-gray-200 dark:bg-gray-900/20 dark:hover:bg-gray-600"
      }`}
    >
      {owned && (
        <span
          className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-green-400 text-white"
          aria-hidden
        >
          <CheckIcon className="h-2.5 w-2.5" />
        </span>
      )}
      {exclusiveVersion && (
        <span
          className="absolute left-2 top-2 rounded bg-amber-100 px-1 text-[8px] font-bold uppercase tracking-wide text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
          aria-hidden
        >
          {exclusiveVersion.split(" ")[0]}
        </span>
      )}
      <Image
        src={entry.spriteUrl}
        alt={entry.displayName}
        width={88}
        height={88}
        unoptimized
        style={{ imageRendering: "pixelated" }}
        className={`h-20 w-20 object-contain transition-all duration-200 ${
          owned ? "" : "grayscale opacity-55"
        }`}
      />
      <span className="text-[10px] text-gray-400 tabular-nums">
        {paddedGameNumber}
      </span>
      <span className="w-full truncate px-1 text-center text-[11px] font-medium text-gray-600 dark:text-gray-300">
        {entry.displayName}
      </span>
    </button>
  );
}

type AvailableGamesModalProps = {
  onClose: () => void;
};

function AvailableGamesModal({ onClose }: AvailableGamesModalProps) {
  const availableGames = usePokedexStore((state) => state.availableGames);
  const setGameAvailable = usePokedexStore((state) => state.setGameAvailable);
  const gamesByGen = getGamesByGeneration(GAME_LIST);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Manage available games"
        className="max-h-[82vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-5 shadow-2xl dark:bg-gray-800"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Available Games
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Choose which games you own or want to track.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close available games"
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          {gamesByGen.map(([generation, games]) => (
            <section key={generation}>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                {GEN_LABELS[generation]}
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {games.map((game) => {
                  const checked = !!availableGames[game.id];
                  return (
                    <button
                      key={game.id}
                      type="button"
                      onClick={() => setGameAvailable(game.id, !checked)}
                      aria-pressed={checked}
                      className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${
                        checked
                          ? "border-green-300 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200"
                          : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">
                          {game.name}
                        </span>
                      </span>
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                          checked
                            ? "border-green-400 bg-green-400 text-white"
                            : "border-gray-300 text-transparent"
                        }`}
                      >
                        <CheckIcon className="h-3 w-3" />
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

type Props = {
  onSelect: (speciesId: number, formName: string | null, contextGameId: string) => void;
};

type CompletionFilter = "all" | "missing" | "registered";

export function GameDexView({ onSelect }: Props) {
  const availableGames = usePokedexStore((state) => state.availableGames);
  const gameDexProgress = usePokedexStore((state) => state.gameDexProgress);
  const [selectedGameId, setSelectedGameId] = useState("scarlet-violet");
  const [showAvailableOnly, setShowAvailableOnly] = useState(true);
  const [completionFilter, setCompletionFilter] =
    useState<CompletionFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showGamesModal, setShowGamesModal] = useState(false);

  const {
    data: gameDex,
    isLoading: dexLoading,
    error: dexError,
  } = useGamePokedex(selectedGameId);
  const selectedGame = getGameById(selectedGameId) ?? GAME_LIST[0];

  const availableGameIds = useMemo(
    () =>
      Object.entries(availableGames)
        .filter(([, available]) => available)
        .map(([gameId]) => gameId),
    [availableGames],
  );

  useEffect(() => {
    if (availableGameIds.length === 0) return;
    if (!availableGames[selectedGameId]) {
      setSelectedGameId(availableGameIds[0]);
    }
  }, [availableGameIds, availableGames, selectedGameId]);

  const registeredByGame = useMemo(() => {
    return new Map(
      Object.entries(gameDexProgress).map(([gameId, ids]) => [
        gameId,
        new Set(ids),
      ]),
    );
  }, [gameDexProgress]);

  const filteredGamePokemon = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const entries = gameDex ?? [];
    const numericQuery = normalizedQuery.replace(/^#/, "").replace(/^0+/, "");
    return entries.filter((entry) => {
      const registered =
        registeredByGame.get(selectedGameId)?.has(entry.speciesId) ?? false;
      if (completionFilter === "missing" && registered) return false;
      if (completionFilter === "registered" && !registered) return false;
      if (!normalizedQuery) return true;
      const displayName = entry.displayName.toLowerCase();
      const formName = entry.formName?.toLowerCase() ?? "";
      return (
        displayName.includes(normalizedQuery) ||
        formName.includes(normalizedQuery) ||
        String(entry.speciesId).includes(numericQuery) ||
        String(entry.speciesId).padStart(4, "0").includes(numericQuery)
      );
    });
  }, [
    completionFilter,
    gameDex,
    registeredByGame,
    searchQuery,
    selectedGameId,
  ]);

  const gamesByGen = useMemo(() => {
    const hasAvailableGames = availableGameIds.length > 0;
    const visibleGames = GAME_LIST.filter(
      (game) =>
        !showAvailableOnly || !hasAvailableGames || availableGames[game.id],
    );
    return getGamesByGeneration(visibleGames);
  }, [availableGameIds.length, availableGames, showAvailableOnly]);

  const ownedInGame = registeredByGame.get(selectedGameId)?.size ?? 0;
  const totalInGame = gameDex?.filter((e) => !e.optional).length ?? 0;
  const progressPct = totalInGame > 0 ? (ownedInGame / totalInGame) * 100 : 0;
  const shinyCharmReady =
    selectedGame.hasShinyCharm && ownedInGame >= totalInGame && totalInGame > 0;
  const hasGameDexData = true;
  const missingInGame = Math.max(0, totalInGame - ownedInGame);
  const completionFilters: {
    value: CompletionFilter;
    label: string;
    count: number;
  }[] = [
    { value: "all", label: "All", count: totalInGame },
    { value: "missing", label: "Missing", count: missingInGame },
    { value: "registered", label: "Registered", count: ownedInGame },
  ];

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 pb-8 lg:flex-row">
      {/* Mobile game selector */}
      <div className="flex items-center gap-2 lg:hidden">
        <select
          value={selectedGameId}
          onChange={(e) => setSelectedGameId(e.target.value)}
          className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          aria-label="Select game"
        >
          {GAME_LIST.map((game) => (
            <option key={game.id} value={game.id}>
              {game.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setShowGamesModal(true)}
          className="rounded-lg bg-blue-500 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-600"
        >
          Manage
        </button>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden w-56 flex-shrink-0 lg:block">
        <div className="max-h-[80vh] overflow-y-auto rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800 lg:sticky lg:top-4">
          <div className="mb-3 flex items-center justify-between gap-2 px-1">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Games
              </p>
              <p className="text-[10px] tabular-nums text-gray-400">
                {availableGameIds.length} available
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowGamesModal(true)}
              className="rounded-lg bg-blue-500 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-600"
            >
              Manage
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowAvailableOnly((value) => !value)}
            className={`mb-3 w-full rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors ${
              showAvailableOnly
                ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                : "bg-white text-gray-500 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            }`}
            aria-pressed={showAvailableOnly}
          >
            Available only
          </button>

          {gamesByGen.map(([generation, games]) => (
            <div key={generation} className="mb-3">
              <p className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                {GEN_LABELS[generation]}
              </p>
              {games.map((game) => {
                const ownedCount = registeredByGame.get(game.id)?.size ?? 0;
                const isSelected = game.id === selectedGameId;
                const isAvailable = !!availableGames[game.id];
                return (
                  <button
                    key={game.id}
                    type="button"
                    onClick={() => setSelectedGameId(game.id)}
                    className={`mb-0.5 w-full rounded-lg px-2 py-1.5 text-left transition-colors ${
                      isSelected
                        ? "bg-blue-500 text-white"
                        : "text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700"
                    } ${isAvailable ? "" : "opacity-70"}`}
                  >
                    <span className="flex items-center gap-1 truncate text-xs font-medium leading-tight">
                      {game.name}
                      {game.hasShinyCharm && (
                        <SparkleIcon
                          className={`h-3 w-3 shrink-0 ${isSelected ? "text-yellow-300" : "text-yellow-400"}`}
                        />
                      )}
                    </span>
                    {ownedCount > 0 ? (
                      <span
                        className={`text-[10px] tabular-nums ${isSelected ? "text-blue-100" : "text-gray-400"}`}
                      >
                        {ownedCount} registered
                      </span>
                    ) : isAvailable ? (
                      <span
                        className={`text-[10px] ${isSelected ? "text-blue-100" : "text-green-500 dark:text-green-400"}`}
                      >
                        Available
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-4 rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-lg font-bold dark:text-white">
              {selectedGame.name}
            </h2>
            {selectedGame.hasShinyCharm && (
              <span
                className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                  shinyCharmReady
                    ? "bg-yellow-400 text-white"
                    : "bg-yellow-50 text-yellow-600 dark:bg-yellow-950/40 dark:text-yellow-400"
                }`}
              >
                <SparkleIcon className="h-3.5 w-3.5" />
                {shinyCharmReady ? "Charm unlocked" : "Charm available"}
              </span>
            )}
          </div>
          {totalInGame > 0 && (
            <>
              <div className="mb-2 h-2.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${selectedGame.hasShinyCharm ? "bg-yellow-400" : "bg-green-400"}`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                <span className="font-bold tabular-nums text-green-600 dark:text-green-400">
                  {ownedInGame}
                </span>
                <span className="mx-1 text-gray-300 dark:text-gray-600">/</span>
                <span className="tabular-nums">{totalInGame}</span>
                {" · "}
                <span className={`font-semibold tabular-nums ${selectedGame.hasShinyCharm ? "text-yellow-600 dark:text-yellow-400" : ""}`}>
                  {missingInGame}
                </span>
                {" "}
                {selectedGame.hasShinyCharm ? "to charm" : "missing"}
                {" · "}
                <span className="tabular-nums">{progressPct.toFixed(1)}%</span>
              </p>

              {shinyCharmReady && (
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-yellow-300 bg-yellow-50 px-3 py-2.5 dark:border-yellow-700 dark:bg-yellow-950/30">
                  <SparkleIcon className="h-4 w-4 shrink-0 text-yellow-500" />
                  <span className="text-sm font-bold text-yellow-700 dark:text-yellow-400">
                    Shiny Charm unlocked — all {totalInGame} registered!
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        <div className="mb-4">
          <label htmlFor="game-dex-search" className="sr-only">
            Search selected game Pokedex
          </label>
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <input
              id="game-dex-search"
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={`Search ${selectedGame.name}`}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition-colors placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-950 lg:max-w-sm"
            />
            <div className="flex flex-wrap items-center gap-2">
              <div
                className="flex rounded-lg bg-gray-100 p-1 dark:bg-gray-800"
                aria-label="Completion filter"
              >
                {completionFilters.map(({ value, label, count }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setCompletionFilter(value)}
                    aria-pressed={completionFilter === value}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                      completionFilter === value
                        ? "bg-blue-500 text-white"
                        : "text-gray-500 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white"
                    }`}
                  >
                    {label}{" "}
                    <span className="tabular-nums opacity-75">({count})</span>
                  </button>
                ))}
              </div>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {!hasGameDexData ? (
          <div className="py-8 text-center">
            <p className="mb-1 text-sm font-medium text-amber-600 dark:text-amber-400">
              Pokedex data not yet available in the local database
            </p>
            <p className="text-xs text-gray-400">
              Check back once this game has a curated dex.
            </p>
          </div>
        ) : dexError ? (
          <div className="py-4 text-sm text-red-500">
            Failed to load Pokedex for this game. Try refreshing.
          </div>
        ) : dexLoading ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-[repeat(auto-fill,minmax(100px,120px))]">
            {Array.from({ length: 48 }).map((_, index) => (
              <div
                key={index}
                className="h-[132px] w-full animate-pulse rounded-lg bg-gray-200 sm:w-[120px] dark:bg-gray-700"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-[repeat(auto-fill,minmax(100px,120px))]">
            {filteredGamePokemon.map((entry) => (
              <GameSlot
                key={`${entry.speciesId}-${entry.formName ?? "base"}`}
                entry={entry}
                gameId={selectedGameId}
                onSelect={(speciesId, formName) => onSelect(speciesId, formName, selectedGameId)}
              />
            ))}
            {filteredGamePokemon.length === 0 && (
              <div className="col-span-full py-8 text-sm text-gray-400">
                No Pokemon match this view.
              </div>
            )}
          </div>
        )}
      </div>

      {showGamesModal && (
        <AvailableGamesModal onClose={() => setShowGamesModal(false)} />
      )}
    </div>
  );
}

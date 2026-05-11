"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useGamePokedex } from "@/hooks/useGamePokedex";
import { usePokedexStore } from "@/store/pokedexStore";
import { getGameById } from "@/config/games";
import { getExclusiveVersion } from "@/config/version-exclusives";
import { CheckIcon, SparkleIcon } from "@/components/ui";
import type { GameDexEntry } from "@/types/pokemon";

type GameSlotProps = {
  entry: GameDexEntry;
  gameId: string;
  onSelect: (speciesId: number, formName: string | null) => void;
};

function GameSlot({ entry, gameId, onSelect }: GameSlotProps) {
  const owned = usePokedexStore((state) =>
    state.isOwnedInGame(entry.speciesId, gameId),
  );
  const shinyOwned = usePokedexStore((state) =>
    state.isShinyOwnedInGame(entry.speciesId, gameId),
  );
  const markShinyOwnedInGame = usePokedexStore((s) => s.markShinyOwnedInGame);
  const clearShinyOwnedInGame = usePokedexStore((s) => s.clearShinyOwnedInGame);
  const paddedGameNumber = `#${String(entry.entryNumber).padStart(3, "0")}`;
  const paddedNationalNumber = `Nat. #${String(entry.speciesId).padStart(4, "0")}`;
  const exclusiveVersion = getExclusiveVersion(gameId, entry.speciesId);

  return (
    <div className="group relative sm:w-[120px]">
      <button
        onClick={() => onSelect(entry.speciesId, entry.formName)}
        aria-label={`${entry.displayName}, ${owned ? "registered" : "not registered"} in this game`}
        title={
          exclusiveVersion
            ? `${paddedGameNumber} - ${entry.displayName} (${paddedNationalNumber}) · ${exclusiveVersion} exclusive`
            : `${paddedGameNumber} - ${entry.displayName} (${paddedNationalNumber})`
        }
        className={`relative flex h-[132px] w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-lg p-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
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
      {owned && (
        <button
          type="button"
          onClick={() =>
            shinyOwned
              ? clearShinyOwnedInGame(entry.speciesId, gameId)
              : markShinyOwnedInGame(entry.speciesId, gameId)
          }
          title={shinyOwned ? "Remove shiny" : "Mark as shiny"}
          aria-label={
            shinyOwned
              ? `Remove shiny for ${entry.displayName}`
              : `Mark ${entry.displayName} as shiny in this game`
          }
          className={`absolute bottom-2 right-2 z-10 flex h-5 w-5 items-center justify-center rounded-full border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 ${
            shinyOwned
              ? "border-yellow-400 bg-yellow-400 text-white"
              : "border-gray-200 bg-white/90 text-gray-300 opacity-0 group-hover:opacity-100 dark:border-gray-600 dark:bg-gray-800/90 dark:text-gray-500"
          }`}
        >
          <SparkleIcon className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

type CompletionFilter = "all" | "missing" | "registered";

type Props = {
  gameId: string;
  onSelect: (speciesId: number, formName: string | null, contextGameId: string) => void;
};

export function GameDexView({ gameId, onSelect }: Props) {
  const gameDexProgress = usePokedexStore((state) => state.gameDexProgress);
  const [completionFilter, setCompletionFilter] = useState<CompletionFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: gameDex, isLoading: dexLoading, error: dexError } = useGamePokedex(gameId);
  const selectedGame = getGameById(gameId);

  const registeredByGame = useMemo(() => {
    return new Map(
      Object.entries(gameDexProgress).map(([gId, ids]) => [gId, new Set(ids)]),
    );
  }, [gameDexProgress]);

  const filteredGamePokemon = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const entries = gameDex ?? [];
    const numericQuery = normalizedQuery.replace(/^#/, "").replace(/^0+/, "");
    return entries.filter((entry) => {
      const registered = registeredByGame.get(gameId)?.has(entry.speciesId) ?? false;
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
  }, [completionFilter, gameDex, registeredByGame, searchQuery, gameId]);

  const ownedInGame = registeredByGame.get(gameId)?.size ?? 0;
  const totalInGame = gameDex?.filter((e) => !e.optional).length ?? 0;
  const progressPct = totalInGame > 0 ? (ownedInGame / totalInGame) * 100 : 0;
  const shinyCharmReady =
    selectedGame?.hasShinyCharm && ownedInGame >= totalInGame && totalInGame > 0;
  const missingInGame = Math.max(0, totalInGame - ownedInGame);
  const hasShinyCharmTarget = !!selectedGame?.hasShinyCharm;
  const charmStatusLabel = shinyCharmReady
    ? "Charm unlocked"
    : "Shiny Charm target";
  const progressLabel = hasShinyCharmTarget ? "remaining to charm" : "missing";

  const completionFilters: { value: CompletionFilter; label: string; count: number }[] = [
    { value: "all", label: "All", count: totalInGame },
    { value: "missing", label: "Missing", count: missingInGame },
    { value: "registered", label: "Registered", count: ownedInGame },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 pb-8">
      {/* Game header / progress */}
      <div className="mb-4 rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold dark:text-white">
            {selectedGame?.name ?? gameId}
          </h2>
          {hasShinyCharmTarget && (
            <span
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                shinyCharmReady
                  ? "bg-yellow-400 text-white"
                  : "bg-yellow-50 text-yellow-600 dark:bg-yellow-950/40 dark:text-yellow-400"
              }`}
            >
              <SparkleIcon className="h-3.5 w-3.5" />
              {charmStatusLabel}
            </span>
          )}
        </div>
        {totalInGame > 0 && (
          <>
            <div className="mb-2 h-2.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className={`h-full rounded-full transition-all duration-500 ${hasShinyCharmTarget ? "bg-yellow-400" : "bg-green-400"}`}
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
              <span
                className={`font-semibold tabular-nums ${hasShinyCharmTarget ? "text-yellow-600 dark:text-yellow-400" : ""}`}
              >
                {missingInGame}
              </span>{" "}
              {progressLabel}
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

      {/* Search + filter */}
      <div className="mb-4">
        <label htmlFor="game-dex-search" className="sr-only">
          Search Pokédex
        </label>
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <input
            id="game-dex-search"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${selectedGame?.name ?? "this game"}`}
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

      {/* Grid */}
      {dexError ? (
        <div className="py-4 text-sm text-red-500">
          Failed to load Pokédex for this game. Try refreshing.
        </div>
      ) : dexLoading ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-[repeat(auto-fill,minmax(100px,120px))]">
          {Array.from({ length: 48 }).map((_, i) => (
            <div
              key={i}
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
              gameId={gameId}
              onSelect={(speciesId, formName) => onSelect(speciesId, formName, gameId)}
            />
          ))}
          {filteredGamePokemon.length === 0 && (
            <div className="col-span-full py-8 text-sm text-gray-400">
              No Pokémon match this view.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

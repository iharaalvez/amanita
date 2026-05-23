"use client";

import Image from "next/image";
import { useMemo, useState, type ReactNode } from "react";
import { useGamePokedex } from "@/hooks/useGamePokedex";
import { usePokedexStore, ALPHA_GAMES } from "@/store/pokedexStore";
import { getGameById } from "@/config/games";
import { getExclusiveVersion } from "@/config/version-exclusives";
import { CheckIcon, SparkleIcon } from "@/components/ui";
import { PokemonSprite } from "@/components/pokemon/PokemonSprite";
import { isShinyLocked } from "@/config/pokemon-flags";
import type { GameDexEntry, GameDexFlags } from "@/types/pokemon";

const EMPTY_GAME_FLAGS: Record<string, GameDexFlags> = {};
const GAME_SHINY_CHARM_NOTES: Record<string, string> = {
  "legends-za":
    "Legends: Z-A Shiny Charm progress also depends on Mable's Research requests.",
};

type GameSlotProps = {
  entry: GameDexEntry;
  gameId: string;
  onSelect: (speciesId: number, formName: string | null) => void;
};

const DEFAULT_FLAGS: GameDexFlags = { owned: false, shiny: false };

function getCardVisual(flags: GameDexFlags) {
  if (flags.shiny_alpha) {
    return {
      frame:
        "border-amber-300 bg-[radial-gradient(circle_at_50%_20%,rgba(251,191,36,0.26),transparent_38%),radial-gradient(circle_at_50%_100%,rgba(239,68,68,0.24),transparent_46%)] shadow-sm shadow-amber-100 dark:border-amber-500/70 dark:shadow-none",
      button:
        "hover:bg-amber-50/50 dark:hover:bg-amber-950/20 focus-visible:ring-amber-300",
      spriteHalo:
        "bg-amber-100/60 ring-1 ring-amber-300/60 dark:bg-amber-950/20 dark:ring-amber-500/30",
      statusLabel: "Shiny Alpha",
      statusClass:
        "bg-amber-100 text-amber-700 ring-1 ring-amber-300/70 dark:bg-amber-950/50 dark:text-amber-200 dark:ring-amber-500/40",
    };
  }

  if (flags.alpha) {
    return {
      frame:
        "border-red-300 bg-[radial-gradient(circle_at_50%_18%,rgba(248,113,113,0.24),transparent_42%),linear-gradient(180deg,rgba(239,68,68,0.12),transparent)] shadow-sm shadow-red-100 dark:border-red-500/70 dark:shadow-none",
      button:
        "hover:bg-red-50/50 dark:hover:bg-red-950/20 focus-visible:ring-red-300",
      spriteHalo:
        "bg-red-100/60 ring-1 ring-red-300/60 dark:bg-red-950/20 dark:ring-red-500/30",
      statusLabel: "Alpha",
      statusClass:
        "bg-red-100 text-red-700 ring-1 ring-red-300/70 dark:bg-red-950/50 dark:text-red-200 dark:ring-red-500/40",
    };
  }

  if (flags.shiny) {
    return {
      frame:
        "border-yellow-300 bg-[radial-gradient(circle_at_50%_18%,rgba(250,204,21,0.25),transparent_42%),linear-gradient(180deg,rgba(250,204,21,0.12),transparent)] shadow-sm shadow-yellow-100 dark:border-yellow-500/70 dark:shadow-none",
      button:
        "hover:bg-yellow-50/50 dark:hover:bg-yellow-950/20 focus-visible:ring-yellow-300",
      spriteHalo:
        "bg-yellow-100/60 ring-1 ring-yellow-300/60 dark:bg-yellow-950/20 dark:ring-yellow-500/30",
      statusLabel: "Shiny",
      statusClass:
        "bg-yellow-100 text-yellow-700 ring-1 ring-yellow-300/70 dark:bg-yellow-950/50 dark:text-yellow-200 dark:ring-yellow-500/40",
    };
  }

  if (flags.owned) {
    return {
      frame:
        "border-green-200 bg-[radial-gradient(circle_at_50%_18%,rgba(74,222,128,0.18),transparent_42%)] shadow-sm shadow-green-100 dark:border-green-900/70 dark:shadow-none",
      button:
        "hover:bg-green-50/50 dark:hover:bg-green-950/20 focus-visible:ring-green-300",
      spriteHalo:
        "bg-green-100/60 ring-1 ring-green-300/50 dark:bg-green-950/20 dark:ring-green-500/25",
      statusLabel: null,
      statusClass: "",
    };
  }

  return {
    frame:
      "border-transparent bg-white/40 dark:bg-gray-900/20 dark:hover:border-gray-700/70",
    button: "hover:bg-gray-100 dark:hover:bg-gray-800",
    spriteHalo:
      "bg-gray-100/60 ring-1 ring-gray-200/60 dark:bg-gray-900/40 dark:ring-gray-800",
    statusLabel: null,
    statusClass: "",
  };
}

function GameSlot({ entry, gameId, onSelect }: GameSlotProps) {
  const isAlphaGame = ALPHA_GAMES.has(gameId);
  const entryKey = `${entry.speciesId}-${entry.formName ?? "base"}`;
  const flags = usePokedexStore(
    (state) => state.gameDex[gameId]?.[entryKey] ?? DEFAULT_FLAGS,
  );
  const {
    owned,
    shiny: shinyOwned,
    alpha: alphaOwned,
    shiny_alpha: shinyAlphaOwned,
  } = flags;

  const markOwnedInGame = usePokedexStore((s) => s.markOwnedInGame);
  const clearOwnedInGame = usePokedexStore((s) => s.clearOwnedInGame);
  const markShinyOwnedInGame = usePokedexStore((s) => s.markShinyOwnedInGame);
  const clearShinyOwnedInGame = usePokedexStore((s) => s.clearShinyOwnedInGame);
  const markAlphaInGame = usePokedexStore((s) => s.markAlphaInGame);
  const clearAlphaInGame = usePokedexStore((s) => s.clearAlphaInGame);
  const markShinyAlphaInGame = usePokedexStore((s) => s.markShinyAlphaInGame);
  const clearShinyAlphaInGame = usePokedexStore((s) => s.clearShinyAlphaInGame);

  const paddedGameNumber = `#${String(entry.entryNumber).padStart(3, "0")}`;
  const paddedNationalNumber = `Nat. #${String(entry.speciesId).padStart(4, "0")}`;
  const exclusiveVersion = getExclusiveVersion(gameId, entry.speciesId);
  const shinyLocked = isShinyLocked(entry.speciesId, entry.formName);

  const toggleRegistered = () => {
    if (owned) {
      clearOwnedInGame(entry.speciesId, gameId, entry.formName);
      if (shinyOwned)
        clearShinyOwnedInGame(entry.speciesId, gameId, entry.formName);
    } else {
      markOwnedInGame(entry.speciesId, gameId, entry.formName);
    }
  };

  const toggleShiny = () => {
    if (shinyOwned) {
      clearShinyOwnedInGame(entry.speciesId, gameId, entry.formName);
    } else {
      if (!owned) markOwnedInGame(entry.speciesId, gameId, entry.formName);
      markShinyOwnedInGame(entry.speciesId, gameId, entry.formName);
    }
  };

  const anyOwned = owned || shinyOwned || alphaOwned || shinyAlphaOwned;
  const visual = getCardVisual(flags);

  return (
    <div
      className={`group relative flex min-w-0 flex-col overflow-hidden rounded-xl border transition-all sm:w-[140px] ${visual.frame}`}
    >
      <button
        onClick={() => onSelect(entry.speciesId, entry.formName)}
        aria-label={`${entry.displayName}, ${owned ? "registered" : "not registered"} in this game`}
        title={
          exclusiveVersion
            ? `${paddedGameNumber} - ${entry.displayName} (${paddedNationalNumber}) · ${exclusiveVersion} exclusive`
            : `${paddedGameNumber} - ${entry.displayName} (${paddedNationalNumber})`
        }
        className={`relative flex h-[132px] w-full cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl p-1.5 pb-5 transition-all focus-visible:outline-none focus-visible:ring-2 sm:h-[164px] sm:gap-1 sm:p-2 sm:pb-6 ${visual.button}`}
      >
        {exclusiveVersion && (
          <span
            className="absolute left-2 top-2 rounded bg-amber-100 px-1 text-[8px] font-bold uppercase tracking-wide text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
            aria-hidden
          >
            {exclusiveVersion.split(" ")[0]}
          </span>
        )}
        <span
          className={`grid h-[64px] w-[64px] place-items-center rounded-full transition-transform duration-200 group-hover:scale-105 sm:h-[84px] sm:w-[84px] ${visual.spriteHalo}`}
          aria-hidden
        >
          <PokemonSprite
            src={entry.spriteUrl}
            alt={entry.displayName}
            width={88}
            height={88}
            style={{ imageRendering: "pixelated" }}
            className={`h-[58px] w-[58px] object-contain transition-all duration-200 sm:h-[78px] sm:w-[78px] ${
              anyOwned ? "" : "grayscale opacity-55"
            }`}
          />
        </span>
        <span className="text-[10px] text-gray-400 tabular-nums">
          {paddedGameNumber}
        </span>
        <span className="min-h-[24px] w-full px-1 text-center text-[10px] font-medium leading-tight text-gray-600 line-clamp-2 dark:text-gray-300 sm:min-h-[28px] sm:text-[11px]">
          {entry.displayName}
        </span>
        {visual.statusLabel && (
          <span
            className={`absolute bottom-1.5 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${visual.statusClass}`}
          >
            {visual.statusLabel}
          </span>
        )}
      </button>
      <div
        className={`grid justify-items-center gap-1 px-1 pb-2 ${
          isAlphaGame ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2"
        }`}
      >
        <QuickToggle
          active={!!owned}
          label={owned ? "Clear registered" : "Mark registered"}
          className={
            owned
              ? "border-green-400 bg-green-50 text-green-600 dark:bg-green-950/30 dark:text-green-300"
              : "border-gray-200 bg-white text-green-300 hover:border-green-300 hover:text-green-600 dark:border-gray-700 dark:bg-gray-900 dark:text-green-900 dark:hover:text-green-400"
          }
          onClick={toggleRegistered}
        >
          <CheckIcon className="h-4 w-4" />
        </QuickToggle>

        <QuickToggle
          active={!!shinyOwned}
          label={
            shinyLocked
              ? "Shiny unavailable"
              : shinyOwned
                ? "Clear shiny registered"
                : "Mark shiny registered"
          }
          disabled={shinyLocked}
          className={
            shinyOwned
              ? "border-yellow-400 bg-yellow-50 text-yellow-600 dark:bg-yellow-950/30 dark:text-yellow-300"
              : "border-gray-200 bg-white text-gray-300 hover:border-yellow-300 hover:text-yellow-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-600 dark:hover:text-yellow-400"
          }
          onClick={toggleShiny}
        >
          <Image
            src="/icons/pokemon/shiny-symbol-home.png"
            alt=""
            width={18}
            height={18}
            aria-hidden
            className={`h-4 w-4 object-contain ${shinyOwned ? "" : "opacity-45"}`}
          />
        </QuickToggle>

        {isAlphaGame && (
          <>
            <QuickToggle
              active={!!alphaOwned}
              label={alphaOwned ? "Clear alpha owned" : "Mark alpha owned"}
              className={
                alphaOwned
                  ? "border-red-400 bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-300"
                  : "border-gray-200 bg-white text-red-300 hover:border-red-300 hover:text-red-600 dark:border-gray-700 dark:bg-gray-900 dark:text-red-900 dark:hover:text-red-400"
              }
              onClick={() =>
                alphaOwned
                  ? clearAlphaInGame(entry.speciesId, gameId, entry.formName)
                  : markAlphaInGame(entry.speciesId, gameId, entry.formName)
              }
            >
              <Image
                src="/icons/pokemon/alpha-symbol.png"
                alt=""
                width={18}
                height={18}
                aria-hidden
                className={`h-4 w-4 object-contain ${alphaOwned ? "" : "opacity-45"}`}
              />
            </QuickToggle>

            <QuickToggle
              active={!!shinyAlphaOwned}
              label={
                shinyLocked
                  ? "Shiny alpha unavailable"
                  : shinyAlphaOwned
                    ? "Clear shiny alpha owned"
                    : "Mark shiny alpha owned"
              }
              disabled={shinyLocked}
              className={
                shinyAlphaOwned
                  ? "border-amber-400 bg-red-50 text-red-600 ring-1 ring-amber-300 dark:bg-red-950/30 dark:text-red-300"
                  : "border-gray-200 bg-white text-red-300 hover:border-amber-300 hover:text-red-600 dark:border-gray-700 dark:bg-gray-900 dark:text-red-900 dark:hover:text-red-400"
              }
              onClick={() => {
                if (shinyAlphaOwned) {
                  clearShinyAlphaInGame(
                    entry.speciesId,
                    gameId,
                    entry.formName,
                  );
                } else {
                  if (!owned)
                    markOwnedInGame(entry.speciesId, gameId, entry.formName);
                  if (!shinyOwned)
                    markShinyOwnedInGame(
                      entry.speciesId,
                      gameId,
                      entry.formName,
                    );
                  markShinyAlphaInGame(entry.speciesId, gameId, entry.formName);
                }
              }}
            >
              <ShinyAlphaIcon active={!!shinyAlphaOwned} />
            </QuickToggle>
          </>
        )}
      </div>
    </div>
  );
}

function ShinyAlphaIcon({ active }: { active: boolean }) {
  return (
    <span className="relative grid h-4 w-4 place-items-center">
      <Image
        src="/icons/pokemon/alpha-symbol.png"
        alt=""
        width={18}
        height={18}
        aria-hidden
        className={`h-4 w-4 object-contain ${active ? "" : "opacity-45"}`}
      />
      <Image
        src="/icons/pokemon/shiny-symbol-home.png"
        alt=""
        width={10}
        height={10}
        aria-hidden
        className={`absolute -right-1 -top-1 h-2.5 w-2.5 object-contain ${active ? "" : "opacity-50"}`}
      />
    </span>
  );
}

function QuickToggle({
  active,
  disabled,
  label,
  className,
  children,
  onClick,
}: {
  active: boolean;
  disabled?: boolean;
  label: string;
  className: string;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={`grid h-8 w-8 place-items-center rounded-full border shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-40 sm:h-7 sm:w-7 ${className}`}
    >
      {children}
    </button>
  );
}

type CompletionFilter = "all" | "missing" | "registered";

type Props = {
  gameId: string;
  onSelect: (
    speciesId: number,
    formName: string | null,
    contextGameId: string,
  ) => void;
};

export function GameDexView({ gameId, onSelect }: Props) {
  const gameFlags = usePokedexStore(
    (state) => state.gameDex[gameId] ?? EMPTY_GAME_FLAGS,
  );
  const [completionFilter, setCompletionFilter] =
    useState<CompletionFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: gameDex,
    isLoading: dexLoading,
    error: dexError,
  } = useGamePokedex(gameId);
  const selectedGame = getGameById(gameId);

  const requiredEntries = useMemo(
    () => (gameDex ?? []).filter((entry) => !entry.optional),
    [gameDex],
  );

  const filteredGamePokemon = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const entries = gameDex ?? [];
    const numericQuery = normalizedQuery.replace(/^#/, "").replace(/^0+/, "");
    return entries.filter((entry) => {
      const key = `${entry.speciesId}-${entry.formName ?? "base"}`;
      const registered = !!gameFlags[key]?.owned;
      if (completionFilter === "missing" && registered) {
        return false;
      }
      if (completionFilter === "registered" && !registered) {
        return false;
      }
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
  }, [completionFilter, gameDex, gameFlags, searchQuery]);

  const totalDexEntries = gameDex?.length ?? 0;
  const registeredDexEntries = (gameDex ?? []).filter((entry) => {
    const key = `${entry.speciesId}-${entry.formName ?? "base"}`;
    return !!gameFlags[key]?.owned;
  }).length;
  const missingDexEntries = Math.max(0, totalDexEntries - registeredDexEntries);
  const totalInGame = requiredEntries.length;
  const ownedInGame = requiredEntries.filter((entry) => {
    const key = `${entry.speciesId}-${entry.formName ?? "base"}`;
    return !!gameFlags[key]?.owned;
  }).length;
  const progressPct =
    totalDexEntries > 0 ? (registeredDexEntries / totalDexEntries) * 100 : 0;
  const shinyCharmReady =
    selectedGame?.hasShinyCharm &&
    ownedInGame >= totalInGame &&
    totalInGame > 0;
  const missingInGame = Math.max(0, totalInGame - ownedInGame);
  const hasShinyCharmTarget = !!selectedGame?.hasShinyCharm;
  const charmStatusLabel = shinyCharmReady
    ? "Charm unlocked"
    : "Shiny Charm target";
  const shinyCharmNote = GAME_SHINY_CHARM_NOTES[gameId];

  const completionFilters: {
    value: CompletionFilter;
    label: string;
    count: number;
  }[] = [
    { value: "all", label: "All", count: totalDexEntries },
    { value: "missing", label: "Missing", count: missingDexEntries },
    { value: "registered", label: "Registered", count: registeredDexEntries },
  ];

  return (
    <div className="mx-auto max-w-7xl px-3 pb-8 sm:px-4">
      {/* Game header / progress */}
      <div className="mb-4 rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800 sm:p-4">
        <div className="mb-3 flex flex-col gap-2 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
          <h2 className="text-base font-bold dark:text-white sm:text-lg">
            {selectedGame?.name ?? gameId}
          </h2>
          {hasShinyCharmTarget && (
            <span
              className={`flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
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
                className="h-full rounded-full bg-green-400 transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              <span className="font-bold tabular-nums text-green-600 dark:text-green-400">
                {registeredDexEntries}
              </span>
              <span className="mx-1 text-gray-300 dark:text-gray-600">/</span>
              <span className="tabular-nums">{totalDexEntries}</span>
              {" · "}
              <span className="font-semibold tabular-nums">
                {missingDexEntries}
              </span>{" "}
              missing
              {" · "}
              <span className="tabular-nums">{progressPct.toFixed(1)}%</span>
              {hasShinyCharmTarget && totalDexEntries > totalInGame && (
                <>
                  {" · "}
                  <span className="tabular-nums">
                    {totalDexEntries - totalInGame}
                  </span>{" "}
                  optional
                </>
              )}
            </p>

            {hasShinyCharmTarget && (
              <p className="mt-2 text-[11px] font-medium leading-snug text-gray-500 dark:text-gray-400">
                Shiny Charm target:{" "}
                <span className="font-bold tabular-nums text-yellow-600 dark:text-yellow-400">
                  {ownedInGame}/{totalInGame}
                </span>{" "}
                required registered
                {missingInGame > 0 ? ` (${missingInGame} remaining)` : ""}.
                {shinyCharmNote ? ` ${shinyCharmNote}` : ""}
              </p>
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
          <div className="flex min-w-0 flex-col gap-2 min-[430px]:flex-row min-[430px]:items-center">
            <div
              className="grid grid-cols-3 rounded-lg bg-gray-100 p-1 dark:bg-gray-800 min-[430px]:flex"
              aria-label="Completion filter"
            >
              {completionFilters.map(({ value, label, count }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCompletionFilter(value)}
                  aria-pressed={completionFilter === value}
                  className={`min-w-0 rounded-md px-2 py-1.5 text-xs font-semibold transition-colors sm:px-3 ${
                    completionFilter === value
                      ? "bg-blue-500 text-white"
                      : "text-gray-500 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white"
                  }`}
                >
                  <span className="truncate">{label}</span>{" "}
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
        <div className="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-2 sm:grid-cols-[repeat(auto-fill,minmax(132px,140px))]">
          {Array.from({ length: 48 }).map((_, i) => (
            <div
              key={i}
              className="h-[188px] w-full animate-pulse rounded-xl bg-gray-200 sm:h-[202px] sm:w-[140px] dark:bg-gray-700"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-2 sm:grid-cols-[repeat(auto-fill,minmax(132px,140px))]">
          {filteredGamePokemon.map((entry) => (
            <GameSlot
              key={`${entry.speciesId}-${entry.formName ?? "base"}`}
              entry={entry}
              gameId={gameId}
              onSelect={(speciesId, formName) =>
                onSelect(speciesId, formName, gameId)
              }
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

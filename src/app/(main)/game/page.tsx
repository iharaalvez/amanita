"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Pin, PinOff } from "lucide-react";
import { AvailableGamesModal } from "@/components/pokemon/AvailableGamesModal";
import {
  ArrowRightIcon,
  CheckIcon,
  GamepadIcon,
  SparkleIcon,
} from "@/components/ui";
import {
  VISIBLE_GAME_LIST,
  getGamesByGeneration,
  type GameEntry,
} from "@/config/games";
import { useGamePokedex } from "@/hooks/useGamePokedex";
import { usePokedexStore } from "@/store/pokedexStore";
import type { GameDexFlags } from "@/types/pokemon";

const EMPTY_GAME_FLAGS: Record<string, GameDexFlags> = {};

const GEN_STYLES: Record<number, string> = {
  1: "border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300",
  2: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300",
  3: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300",
  4: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-300",
  5: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300",
  6: "border-pink-200 bg-pink-50 text-pink-700 dark:border-pink-900/50 dark:bg-pink-950/30 dark:text-pink-300",
  7: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/50 dark:bg-orange-950/30 dark:text-orange-300",
  8: "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-950/30 dark:text-indigo-300",
  9: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/50 dark:bg-violet-950/30 dark:text-violet-300",
};

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

type GenerationFilter = "all" | number;

function GameCard({ game }: { game: GameEntry }) {
  const available = usePokedexStore((s) => !!s.availableGames[game.id]);
  const setGameAvailable = usePokedexStore((s) => s.setGameAvailable);
  const pinnedGameId = usePokedexStore((s) => s.pinnedGameId);
  const setPinnedGameId = usePokedexStore((s) => s.setPinnedGameId);
  const gameFlags = usePokedexStore((s) => s.gameDex[game.id] ?? EMPTY_GAME_FLAGS);
  const registered = useMemo(
    () => Object.values(gameFlags).filter((f) => f.owned).length,
    [gameFlags],
  );
  const shinyRegistered = useMemo(
    () => Object.values(gameFlags).filter((f) => f.shiny).length,
    [gameFlags],
  );
  const { data: gameDex } = useGamePokedex(game.id);
  const genStyle = GEN_STYLES[game.generation] ?? GEN_STYLES[1];
  const total = gameDex?.filter((entry) => !entry.optional).length;
  const hasTotal = typeof total === "number" && total > 0;
  const missing = hasTotal ? Math.max(0, total - registered) : 0;
  const percent = hasTotal ? Math.min(100, (registered / total) * 100) : 0;
  const charmReady = game.hasShinyCharm && hasTotal && missing === 0;
  const pinned = pinnedGameId === game.id;

  return (
    <article
      className={`flex min-h-[164px] flex-col justify-between rounded-lg border bg-white p-4 shadow-sm transition-all dark:bg-gray-900 ${
        available
          ? "border-blue-200 ring-1 ring-blue-100 dark:border-blue-900/70 dark:ring-blue-950"
          : "border-gray-200 hover:border-gray-300 dark:border-gray-800 dark:hover:border-gray-700"
      }`}
    >
      <div>
        <div className="mb-3 flex items-start justify-between gap-3">
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${genStyle}`}
          >
            Gen {game.generation}
          </span>
          <div className="flex items-center gap-1.5">
            {available && (
              <button
                type="button"
                onClick={() => setPinnedGameId(pinned ? null : game.id)}
                aria-pressed={pinned}
                aria-label={
                  pinned ? `Unpin ${game.name}` : `Pin ${game.name} to sidebar`
                }
                className={`grid h-7 w-7 place-items-center rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                  pinned
                    ? "border-violet-200 bg-violet-50 text-violet-600 dark:border-violet-900/70 dark:bg-violet-950/40 dark:text-violet-300"
                    : "border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-gray-700 dark:border-gray-700 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                }`}
              >
                {pinned ? (
                  <PinOff className="h-3.5 w-3.5" />
                ) : (
                  <Pin className="h-3.5 w-3.5" />
                )}
              </button>
            )}
            {available && (
              <span className="flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-green-700 dark:bg-green-950/40 dark:text-green-300">
                <CheckIcon className="h-3 w-3" />
                Added
              </span>
            )}
          </div>
        </div>

        <h2 className="text-base font-bold leading-snug text-gray-950 dark:text-white">
          {game.name}
        </h2>
        <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span className="tabular-nums">
            {hasTotal ? `${registered}/${total}` : registered} registered
          </span>
          {hasTotal && (
            <>
              <span className="tabular-nums">{missing} missing</span>
              <span className="tabular-nums">{percent.toFixed(1)}%</span>
            </>
          )}
          {shinyRegistered > 0 && (
            <span className="flex items-center gap-1 tabular-nums text-yellow-600 dark:text-yellow-400">
              <SparkleIcon className="h-3 w-3" />
              {shinyRegistered}
            </span>
          )}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        {game.hasShinyCharm ? (
          <span
            className={`flex items-center gap-1 text-xs font-semibold ${
              charmReady
                ? "text-green-600 dark:text-green-400"
                : "text-yellow-600 dark:text-yellow-400"
            }`}
          >
            <SparkleIcon className="h-3.5 w-3.5" />
            {charmReady
              ? "Charm unlocked"
              : hasTotal
                ? `${missing} to charm`
                : "Charm target"}
          </span>
        ) : (
          <span className="text-xs font-semibold text-gray-400">
            National Dex
          </span>
        )}

        {available ? (
          <Link
            href={`/game/${game.id}`}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-500 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            Open
            <ArrowRightIcon className="h-3.5 w-3.5" />
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setGameAvailable(game.id, true)}
            className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Add
          </button>
        )}
      </div>
    </article>
  );
}

export default function GameIndexPage() {
  const [showGamesModal, setShowGamesModal] = useState(false);
  const [selectedGeneration, setSelectedGeneration] =
    useState<GenerationFilter>("all");
  const availableGames = usePokedexStore((s) => s.availableGames);

  const myGames = useMemo(
    () => VISIBLE_GAME_LIST.filter((game) => availableGames[game.id]),
    [availableGames],
  );
  const otherGames = useMemo(
    () => VISIBLE_GAME_LIST.filter((game) => !availableGames[game.id]),
    [availableGames],
  );
  const catalogGames = useMemo(
    () => (myGames.length > 0 ? otherGames : [...VISIBLE_GAME_LIST]),
    [myGames.length, otherGames],
  );
  const filteredCatalogGames = useMemo(
    () =>
      selectedGeneration === "all"
        ? catalogGames
        : catalogGames.filter((game) => game.generation === selectedGeneration),
    [catalogGames, selectedGeneration],
  );
  const catalogGroups = useMemo(
    () => getGamesByGeneration(filteredCatalogGames),
    [filteredCatalogGames],
  );
  const generationFilters = useMemo(
    () =>
      getGamesByGeneration(catalogGames).map(([generation, games]) => ({
        generation,
        count: games.length,
      })),
    [catalogGames],
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 pb-10">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-500 dark:bg-blue-950/40 dark:text-blue-300">
            <GamepadIcon className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-gray-950 dark:text-white">
            Games
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
            Add the games you own or want to track, then open a National Dex
            from any device.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowGamesModal(true)}
          className="inline-flex w-fit items-center justify-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200"
        >
          Manage games
        </button>
      </div>

      {myGames.length > 0 && (
        <section className="mb-7">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-black uppercase tracking-wide text-gray-700 dark:text-gray-200">
              My Games
            </h2>
            <span className="text-xs tabular-nums text-gray-400">
              {myGames.length}/{VISIBLE_GAME_LIST.length}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {myGames.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        </section>
      )}

      {(myGames.length === 0 || otherGames.length > 0) && (
        <section>
          <div className="mb-3 flex flex-col gap-3">
            <div>
              <h2 className="text-sm font-black uppercase tracking-wide text-gray-700 dark:text-gray-200">
                {myGames.length > 0 ? "Add More Games" : "Choose Your Games"}
              </h2>
              {myGames.length === 0 && (
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Start with one game to unlock its National Dex and hunt guide.
                </p>
              )}
            </div>

            <div
              className="flex gap-2 overflow-x-auto pb-1"
              aria-label="Filter games by generation"
            >
              <button
                type="button"
                onClick={() => setSelectedGeneration("all")}
                aria-pressed={selectedGeneration === "all"}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                  selectedGeneration === "all"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                }`}
              >
                All{" "}
                <span className="tabular-nums opacity-75">
                  {catalogGames.length}
                </span>
              </button>
              {generationFilters.map(({ generation, count }) => (
                <button
                  key={generation}
                  type="button"
                  onClick={() => setSelectedGeneration(generation)}
                  aria-pressed={selectedGeneration === generation}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                    selectedGeneration === generation
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  }`}
                >
                  Gen {generation}{" "}
                  <span className="tabular-nums opacity-75">{count}</span>
                </button>
              ))}
            </div>
          </div>

          {catalogGroups.length > 0 ? (
            <div className="space-y-5">
              {catalogGroups.map(([generation, games]) => (
                <section key={generation}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <h3 className="text-xs font-black uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      {GEN_LABELS[generation] ?? `Generation ${generation}`}
                    </h3>
                    <span className="text-xs tabular-nums text-gray-400">
                      {games.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {games.map((game) => (
                      <GameCard key={game.id} game={game} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-200 p-6 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
              No games match this generation filter.
            </div>
          )}
        </section>
      )}

      {showGamesModal && (
        <AvailableGamesModal onClose={() => setShowGamesModal(false)} />
      )}
    </div>
  );
}

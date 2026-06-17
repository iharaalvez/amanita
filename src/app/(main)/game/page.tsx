"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Pin, PinOff, Trash2 } from "lucide-react";
import { AvailableGamesModal } from "@/components/pokemon/AvailableGamesModal";
import {
  ArrowRightIcon,
  CheckIcon,
  GamepadIcon,
  SparkleIcon,
} from "@/components/ui";
import {
  GAME_ALT_LOGOS,
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
  const logoAlt = `${game.name} logo`;

  return (
    <article
      className={`group flex min-h-[238px] flex-col overflow-hidden rounded-lg border bg-[#151421] shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20 ${
        available
          ? "border-[#62b6ff]/45 ring-1 ring-[#62b6ff]/15"
          : "border-[#302a43] hover:border-[#4b4564]"
      }`}
    >
      <div className="relative grid h-24 place-items-center border-b border-[#302a43] bg-[radial-gradient(circle_at_50%_0%,rgba(98,182,255,0.16),transparent_44%),#0d1220] px-4">
        <div className="flex items-center justify-center gap-3">
          <div className="grid h-14 w-24 place-items-center rounded-lg border border-white/10 bg-black/20 px-2">
            <Image
              src={`/icons/games/${game.id}.png`}
              alt={logoAlt}
              width={128}
              height={56}
              className="max-h-11 w-auto object-contain"
            />
          </div>
          {GAME_ALT_LOGOS.has(game.id) && (
            <div className="grid h-14 w-24 place-items-center rounded-lg border border-white/10 bg-black/15 px-2">
              <Image
                src={`/icons/games/${game.id}-alt.png`}
                alt={`${logoAlt} alternate version`}
                width={128}
                height={56}
                className="max-h-11 w-auto object-contain"
              />
            </div>
          )}
        </div>
        {available && (
          <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-[#102319] px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-[#82ee88] ring-1 ring-[#82ee88]/25">
            <CheckIcon className="h-3 w-3" />
            Added
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${genStyle}`}
          >
            Gen {game.generation}
          </span>
          {available && (
            <button
              type="button"
              onClick={() => setPinnedGameId(pinned ? null : game.id)}
              aria-pressed={pinned}
              aria-label={
                pinned ? `Unpin ${game.name}` : `Pin ${game.name} to sidebar`
              }
              title={pinned ? "Unpin from sidebar" : "Pin to sidebar"}
              className={`grid h-7 w-7 place-items-center rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#62b6ff] ${
                pinned
                  ? "border-[#8b5cf6]/45 bg-[#2a1948] text-[#c4b5fd]"
                  : "border-[#302a43] text-[#9189a4] hover:bg-white/5 hover:text-[#f8f0df]"
              }`}
            >
              {pinned ? (
                <PinOff className="h-3.5 w-3.5" />
              ) : (
                <Pin className="h-3.5 w-3.5" />
              )}
            </button>
          )}
        </div>

        <h2 className="text-base font-black leading-snug text-[#f8f0df]">
          {game.name}
        </h2>

        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="font-semibold text-[#aaa2ba]">Required dex</span>
            <span className="font-black tabular-nums text-[#f8f0df]">
              {hasTotal ? `${registered}/${total}` : registered}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#0d1220] ring-1 ring-white/5">
            <div
              className="h-full rounded-full bg-[#62b6ff] transition-all duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="flex min-h-5 flex-wrap items-center gap-2 text-[11px] font-bold text-[#9189a4]">
            {hasTotal && (
              <>
                <span className="tabular-nums">{missing} missing</span>
                <span className="tabular-nums">{percent.toFixed(1)}%</span>
              </>
            )}
            {shinyRegistered > 0 && (
              <span className="flex items-center gap-1 tabular-nums text-[#f8d85a]">
                <SparkleIcon className="h-3 w-3" />
                {shinyRegistered} shiny
              </span>
            )}
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 pt-4">
          {game.hasShinyCharm ? (
            <span
              className={`flex min-w-0 items-center gap-1 text-xs font-black ${
                charmReady ? "text-[#82ee88]" : "text-[#f8d85a]"
              }`}
            >
              <SparkleIcon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">
                {charmReady
                  ? "Charm unlocked"
                  : hasTotal
                    ? `${missing} to charm`
                    : "Charm target"}
              </span>
            </span>
          ) : (
            <span className="text-xs font-bold text-[#9189a4]">
              National Dex
            </span>
          )}

          {available ? (
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => setGameAvailable(game.id, false)}
                aria-label={`Remove ${game.name}`}
                title="Remove from My Games"
                className="grid h-8 w-8 place-items-center rounded-md border border-[#302a43] text-[#9189a4] transition-colors hover:bg-[#2a1720] hover:text-[#fca5a5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fca5a5]"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <Link
                href={`/game/${game.id}`}
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#62b6ff] px-3 text-xs font-black text-[#061016] transition-colors hover:bg-[#8fcbff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#62b6ff]"
              >
                Open
                <ArrowRightIcon className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setGameAvailable(game.id, true)}
              className="h-8 rounded-md border border-[#3c3550] px-3 text-xs font-black text-[#f8f0df] transition-colors hover:border-[#62b6ff]/60 hover:bg-[#172033] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#62b6ff]"
            >
              Add
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function LibraryStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="border-t border-[#302a43] px-4 py-3 first:sm:border-l-0 sm:border-l sm:border-t-0">
      <p className="text-xl font-black tabular-nums text-[#f8f0df]">{value}</p>
      <p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-[#9189a4]">
        {label}
      </p>
    </div>
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
  const shinyCharmGameCount = useMemo(
    () => myGames.filter((game) => game.hasShinyCharm).length,
    [myGames],
  );

  return (
    <div className="mx-auto max-w-7xl px-3 py-5 pb-10 sm:px-4">
      <header className="mb-5 overflow-hidden rounded-lg border border-[#302a43] bg-[#151421]">
        <div className="grid gap-4 bg-[radial-gradient(circle_at_12%_0%,rgba(98,182,255,0.18),transparent_34%),linear-gradient(135deg,rgba(48,42,67,0.72),rgba(16,19,31,0.92))] p-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-[#62b6ff]/15 text-[#62b6ff] ring-1 ring-[#62b6ff]/25">
              <GamepadIcon className="h-6 w-6" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#62b6ff]">
              Game Library
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-[#f8f0df] sm:text-3xl">
              Games
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[#aaa2ba]">
              Choose the games you want in Amanita, then jump into each
              National Dex or arrange its HOME-style boxes.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowGamesModal(true)}
            className="inline-flex h-10 w-fit items-center justify-center rounded-lg border border-[#62b6ff]/35 bg-[#62b6ff]/12 px-4 text-sm font-black text-[#d9efff] transition-colors hover:bg-[#62b6ff]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#62b6ff]"
          >
            Manage games
          </button>
        </div>
        <div className="grid border-t border-[#302a43] bg-[#0d1220]/65 sm:grid-cols-3">
          <LibraryStat
            label="Tracking"
            value={`${myGames.length}/${VISIBLE_GAME_LIST.length}`}
          />
          <LibraryStat label="Not Added" value={otherGames.length} />
          <LibraryStat label="Charm Games" value={shinyCharmGameCount} />
        </div>
      </header>

      {myGames.length > 0 && (
        <section className="mb-7">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#9189a4]">
                Tracking
              </p>
              <h2 className="mt-1 text-lg font-black text-[#f8f0df]">
                My Games
              </h2>
            </div>
            <span className="rounded-full border border-[#302a43] bg-[#151421] px-2.5 py-1 text-xs font-black tabular-nums text-[#aaa2ba]">
              {myGames.length} active
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
        <section className="rounded-lg border border-[#302a43] bg-[#11131f]/80 p-3 sm:p-4">
          <div className="mb-4 flex flex-col gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#9189a4]">
                Catalog
              </p>
              <h2 className="mt-1 text-lg font-black text-[#f8f0df]">
                {myGames.length > 0 ? "Add More Games" : "Choose Your Games"}
              </h2>
              {myGames.length === 0 && (
                <p className="mt-1 text-sm text-[#aaa2ba]">
                  Start with one game to unlock its National Dex and HOME boxes.
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
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#62b6ff] ${
                  selectedGeneration === "all"
                    ? "bg-[#62b6ff] text-[#061016]"
                    : "border border-[#302a43] bg-[#151421] text-[#aaa2ba] hover:bg-[#1d2637] hover:text-[#f8f0df]"
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
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#62b6ff] ${
                    selectedGeneration === generation
                      ? "bg-[#62b6ff] text-[#061016]"
                      : "border border-[#302a43] bg-[#151421] text-[#aaa2ba] hover:bg-[#1d2637] hover:text-[#f8f0df]"
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
                    <h3 className="text-xs font-black uppercase tracking-[0.18em] text-[#9189a4]">
                      {GEN_LABELS[generation] ?? `Generation ${generation}`}
                    </h3>
                    <span className="text-xs font-bold tabular-nums text-[#9189a4]">
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
            <div className="rounded-lg border border-dashed border-[#302a43] p-6 text-sm text-[#9189a4]">
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

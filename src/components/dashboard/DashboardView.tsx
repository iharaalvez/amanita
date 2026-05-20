"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useLivingDexEntries } from "@/hooks/usePokemon";
import { useOpenPokemon } from "@/hooks/useOpenPokemon";
import {
  getOwnedEntryCount,
  getShinyEntryCount,
  isLivingDexSpecies,
  isShinyTargetEntry,
} from "@/lib/livingDex";
import { ownedKey, usePokedexStore } from "@/store/pokedexStore";
import { getGameById, GAME_ALT_LOGOS, GAME_LIST } from "@/config/games";
import type { CatchEvent } from "@/store/pokedexStore";
import type { LivingDexEntry } from "@/types/pokemon";
import { Search } from "lucide-react";

type Stat = {
  label: string;
  value: number;
  total: number;
  colorClass: string;
};

type RecentCatch = {
  id: number;
  name: string;
  spriteUrl: string;
  dateLabel: string;
  gameName: string | null;
  isShiny: boolean;
  isAlpha: boolean;
};

export function DashboardView() {
  const [search, setSearch] = useState("");
  const ownedRecords = usePokedexStore((s) => s.owned);
  const catchLog = usePokedexStore((s) => s.recentCatches);
  const availableGames = usePokedexStore((s) => s.availableGames);
  const availableGameIds = useMemo(() => {
    const gameOrder = new Map(GAME_LIST.map((g, i) => [g.id, i]));
    return Object.entries(availableGames)
      .filter(([, v]) => v)
      .map(([k]) => k)
      .sort((a, b) => (gameOrder.get(a) ?? 999) - (gameOrder.get(b) ?? 999));
  }, [availableGames]);
  const pinnedGameId = usePokedexStore((s) => s.pinnedGameId);
  const gameDex = usePokedexStore((s) => s.gameDex);
  const openPokemon = useOpenPokemon();
  const { data: entries } = useLivingDexEntries();

  const allEntries = useMemo(() => entries ?? [], [entries]);
  const livingEntries = useMemo(
    () => allEntries.filter(isLivingDexSpecies),
    [allEntries],
  );

  const livingTotal = livingEntries.length || 1025;
  const shinyEntries = useMemo(
    () => livingEntries.filter(isShinyTargetEntry),
    [livingEntries],
  );
  const shinyTotal = shinyEntries.length || livingTotal;
  const ownedCount = getOwnedEntryCount(livingEntries, ownedRecords);
  const shinyCount = getShinyEntryCount(shinyEntries, ownedRecords);
  const progress = livingTotal > 0 ? (ownedCount / livingTotal) * 100 : 0;
  const roundedProgress = Math.round(progress);

  const stats: Stat[] = [
    {
      label: "Living Dex",
      value: ownedCount,
      total: livingTotal,
      colorClass: "bg-[#b9ec86]",
    },
    {
      label: "Shiny Owned",
      value: shinyCount,
      total: shinyTotal,
      colorClass: "bg-[#f8d85a]",
    },
  ];

  const recentCatches = getRecentCatches(allEntries, catchLog);
  const nextTargets = getNextTargets(livingEntries, ownedRecords);
  const remaining = Math.max(livingTotal - ownedCount, 0);
  const searchResults = getSearchResults(livingEntries, search);

  return (
    <div className="min-h-full bg-[#11111b] px-4 py-5 text-[#f8f0df] sm:px-6 lg:px-7">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-black tracking-tight">Dashboard</h1>
          <div className="relative w-full sm:w-80">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const first = searchResults[0];
                if (first) {
                  openPokemon(first.speciesId, first.formName);
                  setSearch("");
                }
              }}
            >
              <label htmlFor="dashboard-search" className="sr-only">
                Search Pokemon
              </label>
              <div className="flex h-9 w-full items-center gap-2 rounded-md border border-[#2f2b40] bg-[#151520] px-3 text-[#837b91]">
                <Search className="h-3.5 w-3.5 shrink-0" />
                <input
                  id="dashboard-search"
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search Pokémon..."
                  className="min-w-0 flex-1 bg-transparent text-[11px] font-medium text-[#f8f0df] outline-none placeholder:text-[#837b91]"
                />
              </div>
            </form>

            {search.trim() && (
              <div className="absolute right-0 top-11 z-20 w-full overflow-hidden rounded-lg border border-[#2f2b40] bg-[#151520] shadow-2xl shadow-black/30">
                {searchResults.length > 0 ? (
                  searchResults.map((entry) => (
                    <button
                      key={`${entry.speciesId}-${entry.formName ?? "base"}`}
                      type="button"
                      onClick={() => {
                        openPokemon(entry.speciesId, entry.formName);
                        setSearch("");
                      }}
                      className="grid w-full grid-cols-[38px_1fr_auto] items-center gap-3 border-t border-[#2f2b40]/70 px-3 py-2 text-left first:border-t-0 hover:bg-white/5"
                    >
                      <Image
                        src={entry.spriteUrl}
                        alt=""
                        width={36}
                        height={36}
                        unoptimized
                        className="h-9 w-9 object-contain [image-rendering:pixelated]"
                      />
                      <span className="min-w-0 truncate text-xs font-bold text-[#f8f0df]">
                        {entry.displayName}
                      </span>
                      <span className="text-[10px] font-semibold text-[#8f8799]">
                        #{String(entry.speciesId).padStart(4, "0")}
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="px-3 py-4 text-sm text-[#8f8799]">
                    No Pokémon found.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Games bar */}
        <section className="rounded-lg border border-[#2f2b40] bg-[#1a1a27]/80 px-4 py-3">
          <div className="mb-2.5 flex items-center justify-between">
            <p className="text-[10px] font-black">Your Games</p>
            <Link
              href="/games"
              className="text-[9px] text-[#8f8799] transition-colors hover:text-[#f8f0df]"
            >
              Manage →
            </Link>
          </div>
          <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
            {availableGameIds.length > 0 ? (
              availableGameIds.map((gameId) => {
                const game = getGameById(gameId);
                if (!game) return null;
                const caught = Object.values(gameDex[gameId] ?? {}).filter(
                  (f) => f.owned,
                ).length;
                const isPinned = gameId === pinnedGameId;
                return (
                  <Link
                    key={gameId}
                    href={`/game/${gameId}`}
                    title={game.name}
                    className={`flex flex-col items-center gap-1 rounded-lg px-2 py-1 transition-colors hover:bg-white/5 ${
                      isPinned ? "bg-[#b9ec86]/5 ring-1 ring-[#b9ec86]/30" : ""
                    }`}
                  >
                    {GAME_ALT_LOGOS.has(gameId) ? (
                      <div className="flex items-end">
                        <Image
                          src={`/icons/games/${gameId}-alt.png`}
                          alt=""
                          width={150}
                          height={52}
                          unoptimized
                          className="h-12 w-auto max-w-[150px] object-contain opacity-80 -mr-6"
                        />
                        <Image
                          src={`/icons/games/${gameId}.png`}
                          alt={game.name}
                          width={160}
                          height={64}
                          unoptimized
                          className="relative z-10 h-16 w-auto max-w-[160px] object-contain"
                        />
                      </div>
                    ) : (
                      <Image
                        src={`/icons/games/${gameId}.png`}
                        alt={game.name}
                        width={180}
                        height={64}
                        unoptimized
                        className="h-16 w-auto max-w-[180px] object-contain"
                      />
                    )}
                    {caught > 0 && (
                      <span
                        className={`text-[9px] font-semibold ${isPinned ? "text-[#b9ec86]" : "text-[#8f8799]"}`}
                      >
                        {caught}
                      </span>
                    )}
                  </Link>
                );
              })
            ) : (
              <Link
                href="/games"
                className="text-[10px] text-[#8f8799] transition-colors hover:text-[#f8f0df]"
              >
                No games added yet — click to get started →
              </Link>
            )}
          </div>
        </section>

        {/* Main content: 2-col */}
        <div className="mt-4 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
          {/* Recent Catches */}
          <section className="rounded-lg border border-[#2f2b40] bg-[#1a1a27]/80 p-4">
            <h2 className="mb-3 text-xs font-black">Recent Catches</h2>
            <div>
              {recentCatches.length > 0 ? (
                recentCatches.map((pokemon) => (
                  <div
                    key={`${pokemon.id}-${pokemon.name}-${pokemon.isShiny ? "shiny" : "normal"}`}
                    className="grid min-h-14 grid-cols-[44px_1fr_auto] items-center gap-4 border-t border-[#2f2b40]/70 py-3 first:border-t-0"
                  >
                    <Image
                      src={pokemon.spriteUrl}
                      alt={pokemon.name}
                      width={44}
                      height={44}
                      unoptimized
                      style={{ width: "auto", height: "auto" }}
                      className="h-11 w-11 object-contain [image-rendering:pixelated]"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-sm font-bold">
                          {pokemon.name}
                        </p>
                        {pokemon.isShiny && (
                          <span className="shrink-0 text-xs font-bold text-[#f8d85a]">
                            ✦
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        {pokemon.gameName && (
                          <span className="truncate text-xs text-[#8f8799]">
                            {pokemon.gameName}
                          </span>
                        )}
                        {pokemon.isAlpha && (
                          <span className="text-xs font-bold text-[#c084fc]">
                            α
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs font-semibold text-[#d4cedb]">
                      {pokemon.dateLabel}
                    </p>
                  </div>
                ))
              ) : (
                <p className="py-6 text-center text-[10px] text-[#8f8799]">
                  No catches yet — mark Pokémon in a game dex to get started.
                </p>
              )}
            </div>
          </section>

          {/* Right column */}
          <div className="flex flex-col gap-4">
            {/* Progress */}
            <section className="rounded-lg border border-[#2f2b40] bg-[#1a1a27]/80 p-4">
              <h2 className="mb-3 text-xs font-black">Living Dex Progress</h2>
              <div className="flex items-center gap-5">
                <div
                  className="grid h-[88px] w-[88px] shrink-0 place-items-center rounded-full"
                  style={{
                    background: `conic-gradient(#b9ec86 ${progress}%, #343045 0)`,
                  }}
                >
                  <div className="grid h-[68px] w-[68px] place-items-center rounded-full bg-[#1a1a27]">
                    <div className="text-center">
                      <p className="text-xl font-black leading-none">
                        {roundedProgress}%
                      </p>
                      <p className="mt-0.5 text-[9px] text-[#cfc8d8]">
                        {ownedCount} / {livingTotal}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="min-w-0 flex-1 space-y-2.5">
                  {stats.map((stat) => {
                    const pct =
                      stat.total > 0
                        ? Math.min((stat.value / stat.total) * 100, 100)
                        : 0;
                    return (
                      <div key={stat.label}>
                        <div className="flex items-baseline justify-between gap-1">
                          <p className="text-[10px] font-semibold text-[#8f8799]">
                            {stat.label}
                          </p>
                          <p className="shrink-0 text-[10px] font-black">
                            {stat.value}
                            <span className="ml-0.5 font-medium text-[#8f8799]">
                              /{stat.total}
                            </span>
                          </p>
                        </div>
                        <div className="mt-1 h-1 overflow-hidden rounded-full bg-[#343045]">
                          <span
                            className={`block h-full rounded-full ${stat.colorClass}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Next Targets */}
            <section className="rounded-lg border border-[#2f2b40] bg-[#1a1a27]/80 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-xs font-black">Next Targets</h2>
                <span className="rounded-full bg-[#b9ec86]/10 px-2 py-0.5 text-[10px] font-black text-[#b9ec86]">
                  {remaining} left
                </span>
              </div>
              <div>
                {(nextTargets.length > 0 ? nextTargets : FALLBACK_TARGETS).map(
                  (pokemon) => (
                    <div
                      key={`${pokemon.dexNumber}-${pokemon.name}`}
                      className="grid min-h-10 grid-cols-[34px_1fr] items-center gap-3 border-t border-[#2f2b40]/70 py-1.5 first:border-t-0"
                    >
                      <span className="grid h-8 w-8 place-items-center rounded-full border border-[#554a70] bg-[#242536] text-[8px] font-black text-[#bcaee0]">
                        #{pokemon.dexNumber}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-bold">
                          {pokemon.name}
                        </p>
                        <p className="truncate text-[9px] text-[#8f8799]">
                          {pokemon.detail}
                        </p>
                      </div>
                    </div>
                  ),
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatDateLabel(dateString?: string): string {
  if (!dateString) return "Tracked";
  const date = new Date(dateString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (d.getTime() === today.getTime()) return "Today";
  if (d.getTime() === yesterday.getTime()) return "Yesterday";
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}

function getRecentCatches(
  entries: LivingDexEntry[],
  catchLog: CatchEvent[],
): RecentCatch[] {
  const entryMap = new Map<string, LivingDexEntry>();
  for (const entry of entries) {
    entryMap.set(ownedKey(entry.speciesId, entry.formName), entry);
  }

  const results: RecentCatch[] = [];
  for (const event of catchLog) {
    if (results.length >= 4) break;
    const key = ownedKey(event.speciesId, event.formName);
    const entry = entryMap.get(key);
    if (!entry) continue;
    results.push({
      id: event.speciesId,
      name: entry.displayName,
      spriteUrl: event.isShiny
        ? (entry.shinySpriteUrl ?? entry.spriteUrl)
        : entry.spriteUrl,
      dateLabel: formatDateLabel(event.date),
      gameName: getGameById(event.gameId)?.name ?? event.gameId,
      isShiny: event.isShiny,
      isAlpha: event.isAlpha,
    });
  }
  return results;
}

type NextTarget = {
  dexNumber: string;
  name: string;
  detail: string;
};

const FALLBACK_TARGETS: NextTarget[] = [
  { dexNumber: "0152", name: "Chikorita", detail: "Johto starter" },
  { dexNumber: "0350", name: "Milotic", detail: "Trade evolution" },
  { dexNumber: "0442", name: "Spiritomb", detail: "Rare encounter" },
  { dexNumber: "1006", name: "Iron Valiant", detail: "Version target" },
];

function getNextTargets(
  entries: LivingDexEntry[],
  ownedRecords: ReturnType<typeof usePokedexStore.getState>["owned"],
): NextTarget[] {
  return entries
    .filter(
      (entry) =>
        !ownedRecords[ownedKey(entry.speciesId, entry.formName)]?.owned,
    )
    .slice(0, 4)
    .map((entry) => ({
      dexNumber: String(entry.speciesId).padStart(4, "0"),
      name: entry.displayName,
      detail:
        entry.generation > 0
          ? `Generation ${entry.generation}`
          : "Living Dex target",
    }));
}

function getSearchResults(
  entries: LivingDexEntry[],
  search: string,
): LivingDexEntry[] {
  const query = search.trim().toLowerCase();
  if (!query) return [];

  const dexQuery = query.replace(/^#0*/, "");
  return entries
    .filter((entry) => {
      const nameMatch = entry.displayName.toLowerCase().includes(query);
      const dexMatch = String(entry.speciesId).startsWith(dexQuery);
      return nameMatch || dexMatch;
    })
    .slice(0, 6);
}

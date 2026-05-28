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
import type { CatchEvent, HuntCounterMode } from "@/store/pokedexStore";
import type {
  LivingDexEntry,
  ShinyHunt,
  ShinyHuntMethod,
} from "@/types/pokemon";
import {
  Check,
  Clock3,
  Minus,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Trophy,
  X,
} from "lucide-react";

const METHOD_LABELS: Partial<Record<ShinyHuntMethod, string>> = {
  masuda: "Masuda Method",
  "sos-chain": "SOS Chain",
  "poke-radar": "Poke Radar",
  "dex-nav": "DexNav",
  "soft-reset": "Soft Reset",
  outbreak: "Mass Outbreak",
  random: "Random",
};

const HUNT_METHOD_OPTIONS: { value: ShinyHuntMethod; label: string }[] = [
  { value: "random", label: "Random" },
  { value: "overworld", label: "Overworld" },
  { value: "masuda", label: "Masuda Method" },
  { value: "breeding", label: "Breeding" },
  { value: "soft-reset", label: "Soft Reset" },
  { value: "outbreak", label: "Mass Outbreak" },
  { value: "massive-mass-outbreak", label: "Massive Mass Outbreak" },
  { value: "sandwich", label: "Sandwich" },
  { value: "isolated-encounter", label: "Isolated Encounter" },
  { value: "dynamax-adventures", label: "Dynamax Adventures" },
  { value: "max-raid", label: "Max Raid" },
  { value: "tera-raid", label: "Tera Raid" },
  { value: "wild-zone-reset", label: "Wild Zone Reset" },
  { value: "alpha-reset", label: "Alpha Reset" },
  { value: "poke-radar", label: "Poke Radar" },
  { value: "chain-fishing", label: "Chain Fishing" },
  { value: "friend-safari", label: "Friend Safari" },
  { value: "horde", label: "Horde" },
  { value: "dex-nav", label: "DexNav" },
  { value: "sos-chain", label: "SOS Chain" },
  { value: "ultra-wormhole", label: "Ultra Wormhole" },
  { value: "lets-go-catch-combo", label: "Catch Combo" },
  { value: "charm-boosted", label: "Charm Boosted" },
];

const COUNTER_MODE_OPTIONS: { value: HuntCounterMode; label: string }[] = [
  { value: "encounters", label: "Encounters" },
  { value: "soft-resets", label: "Soft Resets" },
  { value: "eggs", label: "Eggs" },
  { value: "raids", label: "Raids" },
  { value: "outbreaks", label: "Outbreaks" },
  { value: "sandwiches", label: "Sandwiches" },
  { value: "checks", label: "Checks" },
];

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
  event: CatchEvent;
};

export function DashboardView() {
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingHuntId, setEditingHuntId] = useState<string | null>(null);
  const [huntSearch, setHuntSearch] = useState("");
  const [selectedHuntEntry, setSelectedHuntEntry] =
    useState<LivingDexEntry | null>(null);
  const [huntGameId, setHuntGameId] = useState("");
  const [huntMethod, setHuntMethod] = useState<ShinyHuntMethod>("random");
  const [huntCounterMode, setHuntCounterMode] =
    useState<HuntCounterMode>("encounters");

  const ownedRecords = usePokedexStore((s) => s.owned);
  const catchLog = usePokedexStore((s) => s.recentCatches);
  const shinyHunts = usePokedexStore((s) => s.shinyHunts);
  const addShinyHunt = usePokedexStore((s) => s.addShinyHunt);
  const updateShinyHunt = usePokedexStore((s) => s.updateShinyHunt);
  const incrementShinyHunt = usePokedexStore((s) => s.incrementShinyHunt);
  const decrementShinyHunt = usePokedexStore((s) => s.decrementShinyHunt);
  const setShinyHuntCount = usePokedexStore((s) => s.setShinyHuntCount);
  const removeShinyHunt = usePokedexStore((s) => s.removeShinyHunt);
  const completeShinyHunt = usePokedexStore((s) => s.completeShinyHunt);
  const removeRecentCatch = usePokedexStore((s) => s.removeRecentCatch);
  const availableGames = usePokedexStore((s) => s.availableGames);
  const removeGameAvailable = usePokedexStore((s) => s.removeGameAvailable);
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

  const entryByKey = useMemo(() => {
    const map = new Map<string, LivingDexEntry>();
    for (const e of allEntries) map.set(ownedKey(e.speciesId, e.formName), e);
    return map;
  }, [allEntries]);

  const resetHuntModal = () => {
    setShowAddModal(false);
    setEditingHuntId(null);
    setHuntSearch("");
    setSelectedHuntEntry(null);
    setHuntGameId("");
    setHuntMethod("random");
    setHuntCounterMode("encounters");
  };

  const openAddHuntModal = () => {
    resetHuntModal();
    setShowAddModal(true);
  };

  const openEditHuntModal = (hunt: ShinyHunt) => {
    setEditingHuntId(hunt.id);
    setSelectedHuntEntry(
      entryByKey.get(ownedKey(hunt.speciesId, hunt.formName)) ?? null,
    );
    setHuntSearch("");
    setHuntGameId(hunt.gameId);
    setHuntMethod(hunt.method);
    setHuntCounterMode(hunt.counterMode);
    setShowAddModal(true);
  };

  const huntSearchResults = useMemo(() => {
    const q = huntSearch.trim().toLowerCase();
    if (!q) return [];
    const dexQ = q.replace(/^#0*/, "");
    return allEntries
      .filter(
        (e) =>
          e.displayName.toLowerCase().includes(q) ||
          String(e.speciesId).startsWith(dexQ),
      )
      .slice(0, 5);
  }, [allEntries, huntSearch]);

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
  const searchResults = getSearchResults(livingEntries, search);
  const activeShinyHunts = useMemo(
    () => shinyHunts.filter((hunt) => !hunt.completedAt),
    [shinyHunts],
  );
  const completedShinyHunts = useMemo(
    () =>
      shinyHunts
        .filter((hunt) => hunt.completedAt)
        .toSorted((a, b) =>
          (b.completedAt ?? b.startedAt).localeCompare(
            a.completedAt ?? a.startedAt,
          ),
        )
        .slice(0, 5),
    [shinyHunts],
  );

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
              href="/game"
              className="text-[9px] text-[#8f8799] transition-colors hover:text-[#f8f0df]"
            >
              Manage →
            </Link>
          </div>
          <div className="-mx-1 flex items-end gap-x-3 gap-y-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0 lg:gap-x-4">
            {availableGameIds.length > 0 ? (
              availableGameIds.map((gameId) => {
                const game = getGameById(gameId);
                if (!game) return null;
                const caught = Object.values(gameDex[gameId] ?? {}).filter(
                  (f) => f.owned,
                ).length;
                const isPinned = gameId === pinnedGameId;
                return (
                  <div
                    key={gameId}
                    className={`group relative flex shrink-0 flex-col items-center rounded-lg transition-colors hover:bg-white/5 ${
                      isPinned ? "bg-[#b9ec86]/5 ring-1 ring-[#b9ec86]/30" : ""
                    }`}
                  >
                    <Link
                      href={`/game/${gameId}`}
                      title={game.name}
                      className="flex flex-col items-center gap-1 px-2 py-1"
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
                    <button
                      type="button"
                      onClick={() => removeGameAvailable(gameId)}
                      aria-label={`Remove ${game.name} from your games`}
                      title={`Remove ${game.name}`}
                      className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-[#151520] text-[#8f8799] opacity-0 ring-1 ring-[#2f2b40] transition hover:text-[#f8f0df] group-hover:opacity-100 focus:opacity-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                );
              })
            ) : (
              <Link
                href="/game"
                className="text-[10px] text-[#8f8799] transition-colors hover:text-[#f8f0df]"
              >
                No games added yet - click to get started
              </Link>
            )}
          </div>
        </section>

        {/* Main content: 2-col */}
        <div className="mt-4 grid items-start gap-4 lg:grid-cols-[1.35fr_1fr]">
          {/* Recent Catches */}
          <section className="order-3 rounded-lg border border-[#2f2b40] bg-[#1a1a27]/80 p-4 lg:col-start-2 lg:row-start-2">
            <h2 className="mb-3 text-xs font-black">Recent Catches</h2>
            <div>
              {recentCatches.length > 0 ? (
                recentCatches.map((pokemon) => (
                  <div
                    key={`${pokemon.id}-${pokemon.name}-${pokemon.isShiny ? "shiny" : "normal"}`}
                    className="grid min-h-14 grid-cols-[44px_minmax(0,1fr)] items-center gap-x-3 gap-y-1 border-t border-[#2f2b40]/70 py-3 first:border-t-0 min-[420px]:grid-cols-[44px_1fr_auto] min-[420px]:gap-4"
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
                            shiny
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
                            alpha
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="col-start-2 flex items-center justify-between gap-2 min-[420px]:col-start-auto">
                      <p className="text-xs font-semibold text-[#d4cedb]">
                        {pokemon.dateLabel}
                      </p>
                      <button
                        type="button"
                        onClick={() => removeRecentCatch(pokemon.event)}
                        aria-label={`Delete ${pokemon.name} from recent catches`}
                        title="Delete recent catch"
                        className="grid h-7 w-7 place-items-center rounded-lg text-[#8f8799] transition-colors hover:bg-white/5 hover:text-[#f8f0df]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="py-6 text-center text-[10px] text-[#8f8799]">
                  No catches yet - mark Pokemon in a game dex to get started.
                </p>
              )}
            </div>
          </section>

          {/* Right column */}
          <div className="contents">
            {/* Progress */}
            <section className="order-2 rounded-lg border border-[#2f2b40] bg-[#1a1a27]/80 p-4 lg:col-start-2 lg:row-start-1">
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

            {/* Shiny Hunts */}
            <section className="order-1 overflow-hidden rounded-lg border border-[#2f2b40] bg-[#1a1a27]/80 lg:col-start-1 lg:row-start-1">
              <div className="flex items-center justify-between gap-3 border-b border-[#2f2b40]/70 px-4 py-3">
                <div>
                  <h2 className="text-xs font-black">Shiny Hunts</h2>
                  <p className="mt-0.5 text-[10px] font-semibold text-[#8f8799]">
                    {activeShinyHunts.length} active ·{" "}
                    {completedShinyHunts.length} recent complete
                  </p>
                </div>
                <button
                  onClick={openAddHuntModal}
                  className="inline-flex items-center gap-1 rounded-full bg-[#f8d85a]/10 px-2.5 py-1 text-[10px] font-black text-[#f8d85a] transition-colors hover:bg-[#f8d85a]/20"
                >
                  <Plus className="h-3 w-3" />
                  Add
                </button>
              </div>

              <div className="p-4">
                {activeShinyHunts.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
                    {activeShinyHunts.map((hunt) => (
                      <ShinyHuntCard
                        key={hunt.id}
                        hunt={hunt}
                        entry={entryByKey.get(
                          ownedKey(hunt.speciesId, hunt.formName),
                        )}
                        onComplete={() => completeShinyHunt(hunt.id)}
                        onRemove={() => removeShinyHunt(hunt.id)}
                        onIncrement={() => incrementShinyHunt(hunt.id)}
                        onDecrement={() => decrementShinyHunt(hunt.id)}
                        onCountChange={(count) =>
                          setShinyHuntCount(hunt.id, count)
                        }
                        onEdit={() => openEditHuntModal(hunt)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-[#2f2b40] bg-[#151520]/70 px-3 py-6 text-center">
                    <Sparkles className="mx-auto mb-2 h-5 w-5 text-[#f8d85a]/70" />
                    <p className="text-[10px] font-semibold text-[#8f8799]">
                      No active hunts yet.
                    </p>
                  </div>
                )}

                {completedShinyHunts.length > 0 && (
                  <div className="mt-3 border-t border-[#2f2b40]/70 pt-3">
                    <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-wide text-[#8f8799]">
                      <Trophy className="h-3.5 w-3.5 text-[#f8d85a]" />
                      Hunt History
                    </div>
                    <div className="space-y-2">
                      {completedShinyHunts.map((hunt) => (
                        <CompletedHuntRow
                          key={hunt.id}
                          hunt={hunt}
                          entry={entryByKey.get(
                            ownedKey(hunt.speciesId, hunt.formName),
                          )}
                          onRemove={() => removeShinyHunt(hunt.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Add Hunt modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) resetHuntModal();
          }}
        >
          <div className="w-full max-w-sm rounded-xl border border-[#2f2b40] bg-[#1a1a27] p-5 shadow-2xl">
            <h3 className="mb-4 text-sm font-black">
              {editingHuntId ? "Edit Shiny Hunt" : "Add Shiny Hunt"}
            </h3>

            {/* Pokémon picker */}
            {selectedHuntEntry ? (
              <div className="mb-3 flex items-center gap-3 rounded-lg border border-[#2f2b40] bg-[#151520] px-3 py-2">
                <Image
                  src={
                    selectedHuntEntry.shinySpriteUrl ??
                    selectedHuntEntry.spriteUrl
                  }
                  alt={selectedHuntEntry.displayName}
                  width={40}
                  height={40}
                  unoptimized
                  className="h-10 w-10 object-contain [image-rendering:pixelated]"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">
                    {selectedHuntEntry.displayName}
                  </p>
                  <p className="text-[10px] text-[#8f8799]">
                    #{String(selectedHuntEntry.speciesId).padStart(4, "0")}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedHuntEntry(null)}
                  className="grid h-8 w-8 place-items-center rounded-lg text-[#8f8799] hover:bg-white/5 hover:text-[#f8f0df]"
                  aria-label="Clear selected Pokemon"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="relative mb-3">
                <input
                  autoFocus
                  value={huntSearch}
                  onChange={(e) => setHuntSearch(e.target.value)}
                  placeholder="Search Pokémon…"
                  className="w-full rounded-lg border border-[#2f2b40] bg-[#151520] px-3 py-2 text-xs text-[#f8f0df] outline-none placeholder:text-[#8f8799] focus:border-[#554a70]"
                />
                {huntSearchResults.length > 0 && (
                  <div className="absolute top-full z-10 mt-1 w-full overflow-hidden rounded-lg border border-[#2f2b40] bg-[#151520] shadow-xl">
                    {huntSearchResults.map((entry) => (
                      <button
                        key={`${entry.speciesId}-${entry.formName ?? "base"}`}
                        type="button"
                        onClick={() => {
                          setSelectedHuntEntry(entry);
                          setHuntSearch("");
                        }}
                        className="flex w-full items-center gap-2 border-t border-[#2f2b40]/70 px-3 py-1.5 text-left first:border-t-0 hover:bg-white/5"
                      >
                        <Image
                          src={entry.shinySpriteUrl ?? entry.spriteUrl}
                          alt=""
                          width={28}
                          height={28}
                          unoptimized
                          className="h-7 w-7 object-contain [image-rendering:pixelated]"
                        />
                        <span className="flex-1 truncate text-xs font-bold">
                          {entry.displayName}
                        </span>
                        <span className="shrink-0 text-[10px] text-[#8f8799]">
                          #{String(entry.speciesId).padStart(4, "0")}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Game */}
            <select
              value={huntGameId}
              onChange={(e) => setHuntGameId(e.target.value)}
              className="mb-3 w-full rounded-lg border border-[#2f2b40] bg-[#151520] px-3 py-2 text-xs text-[#f8f0df] outline-none focus:border-[#554a70]"
            >
              <option value="">Select game…</option>
              {availableGameIds.map((id) => (
                <option key={id} value={id}>
                  {getGameById(id)?.name ?? id}
                </option>
              ))}
            </select>

            {/* Method */}
            <select
              value={huntMethod}
              onChange={(e) => setHuntMethod(e.target.value as ShinyHuntMethod)}
              className="mb-3 w-full rounded-lg border border-[#2f2b40] bg-[#151520] px-3 py-2 text-xs text-[#f8f0df] outline-none focus:border-[#554a70]"
            >
              {HUNT_METHOD_OPTIONS.map(({ value: method, label }) => (
                <option key={method} value={method}>
                  {label}
                </option>
              ))}
            </select>

            {/* Counter mode */}
            <div className="mb-4 grid grid-cols-2 gap-2 min-[420px]:grid-cols-3">
              {COUNTER_MODE_OPTIONS.map(({ value: mode, label }) => (
                <button
                  key={mode}
                  onClick={() => setHuntCounterMode(mode)}
                  className={`rounded-lg px-2 py-1.5 text-[11px] font-bold transition-colors ${
                    huntCounterMode === mode
                      ? "bg-[#f8d85a]/20 text-[#f8d85a]"
                      : "bg-[#151520] text-[#8f8799] hover:text-[#f8f0df]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={resetHuntModal}
                className="flex-1 rounded-lg border border-[#2f2b40] py-2 text-xs font-bold text-[#8f8799] hover:text-[#f8f0df]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!selectedHuntEntry || !huntGameId) return;
                  if (editingHuntId) {
                    updateShinyHunt(editingHuntId, {
                      speciesId: selectedHuntEntry.speciesId,
                      formName: selectedHuntEntry.formName,
                      gameId: huntGameId,
                      method: huntMethod,
                      counterMode: huntCounterMode,
                    });
                  } else {
                    addShinyHunt(
                      selectedHuntEntry.speciesId,
                      selectedHuntEntry.formName,
                      huntGameId,
                      huntMethod,
                      huntCounterMode,
                    );
                  }
                  resetHuntModal();
                }}
                disabled={!selectedHuntEntry || !huntGameId}
                className="flex-1 rounded-lg bg-[#f8d85a]/20 py-2 text-xs font-bold text-[#f8d85a] transition-colors hover:bg-[#f8d85a]/30 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {editingHuntId ? "Save Hunt" : "Start Hunt"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ShinyHuntCard({
  hunt,
  entry,
  onComplete,
  onRemove,
  onIncrement,
  onDecrement,
  onCountChange,
  onEdit,
}: {
  hunt: ShinyHunt;
  entry?: LivingDexEntry;
  onComplete: () => void;
  onRemove: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
  onCountChange: (count: number) => void;
  onEdit: () => void;
}) {
  const spriteUrl = entry?.shinySpriteUrl ?? entry?.spriteUrl;
  const gameName = getGameById(hunt.gameId)?.name ?? hunt.gameId;
  const methodLabel = METHOD_LABELS[hunt.method] ?? titleCaseLabel(hunt.method);
  const counterLabel =
    COUNTER_MODE_OPTIONS.find((option) => option.value === hunt.counterMode)
      ?.label ?? titleCaseLabel(hunt.counterMode);
  const [isEditingCount, setIsEditingCount] = useState(false);
  const [countDraft, setCountDraft] = useState("");
  const displayedCount = isEditingCount ? countDraft : String(hunt.count);

  const commitCountDraft = () => {
    const nextCount = Number.parseInt(countDraft, 10);
    const safeCount = Number.isFinite(nextCount) ? Math.max(0, nextCount) : 0;
    onCountChange(safeCount);
    setCountDraft(String(safeCount));
    setIsEditingCount(false);
  };

  return (
    <article className="relative overflow-hidden rounded-xl border border-[#3b3350] bg-[radial-gradient(circle_at_50%_0%,rgba(248,216,90,0.18),transparent_42%),#151520] shadow-sm">
      <div className="flex flex-col items-center px-4 pb-3 pt-5 text-center">
        <button
          type="button"
          onClick={onIncrement}
          className="relative grid h-24 w-24 place-items-center rounded-2xl bg-[#0f101a] ring-1 ring-[#f8d85a]/25 transition-transform hover:scale-[1.03]"
          aria-label="Add one shiny hunt check"
        >
          {spriteUrl && (
            <Image
              src={spriteUrl}
              alt={entry?.displayName ?? ""}
              width={96}
              height={96}
              unoptimized
              className="h-20 w-20 object-contain [image-rendering:pixelated]"
            />
          )}
          <Sparkles className="absolute right-2 top-2 h-4 w-4 text-[#f8d85a]" />
        </button>

        <div className="mt-3 w-full min-w-0">
          <div className="flex min-w-0 flex-col items-center gap-2">
            <div className="max-w-full min-w-0 text-center">
              <p className="truncate text-base font-black">
                {entry?.displayName ??
                  `#${String(hunt.speciesId).padStart(4, "0")}`}
              </p>
              <p className="mt-1 truncate text-[11px] font-semibold text-[#8f8799]">
                {gameName} / {methodLabel}
              </p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-[38px_1fr_44px] items-center gap-2 rounded-xl bg-[#0f101a] p-2 ring-1 ring-white/5">
            <button
              type="button"
              onClick={onDecrement}
              className="grid h-9 w-9 place-items-center rounded-lg bg-white/5 text-[#8f8799] transition-colors hover:bg-white/10 hover:text-[#f8f0df]"
              aria-label="Remove one shiny hunt check"
            >
              <Minus className="h-4 w-4" />
            </button>
            <div className="min-w-0 text-center">
              <input
                aria-label="Edit shiny hunt count"
                inputMode="numeric"
                pattern="[0-9]*"
                value={displayedCount}
                onFocus={() => {
                  setCountDraft(String(hunt.count));
                  setIsEditingCount(true);
                }}
                onChange={(event) =>
                  setCountDraft(event.target.value.replace(/\D/g, ""))
                }
                onBlur={commitCountDraft}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.currentTarget.blur();
                  }
                  if (event.key === "Escape") {
                    setCountDraft(String(hunt.count));
                    setIsEditingCount(false);
                    event.currentTarget.blur();
                  }
                }}
                className="mx-auto block w-full min-w-0 bg-transparent text-center font-mono text-2xl font-black leading-none text-[#f8d85a] outline-none selection:bg-[#f8d85a]/25"
              />
              <p className="mt-1 truncate text-[9px] font-bold uppercase tracking-wide text-[#8f8799]">
                {counterLabel}
              </p>
            </div>
            <button
              type="button"
              onClick={onIncrement}
              className="grid h-9 w-full place-items-center rounded-lg bg-[#f8d85a]/15 text-xs font-black text-[#f8d85a] transition-colors hover:bg-[#f8d85a]/25"
              aria-label="Add one shiny hunt check"
            >
              +1
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1.5 border-t border-[#2f2b40]/70 px-3 py-3">
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex h-8 items-center justify-center gap-1 rounded-lg bg-white/5 text-[10px] font-black text-[#8f8799] transition-colors hover:bg-white/10 hover:text-[#f8f0df]"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </button>
        <button
          type="button"
          onClick={onComplete}
          className="inline-flex h-8 items-center justify-center gap-1 rounded-lg bg-[#b9ec86]/10 text-[10px] font-black text-[#b9ec86] transition-colors hover:bg-[#b9ec86]/20"
        >
          <Check className="h-3.5 w-3.5" />
          Done
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex h-8 items-center justify-center rounded-lg bg-white/5 text-[#8f8799] transition-colors hover:bg-white/10 hover:text-[#f8f0df]"
          aria-label="Delete hunt"
          title="Delete hunt"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </article>
  );
}

function CompletedHuntRow({
  hunt,
  entry,
  onRemove,
}: {
  hunt: ShinyHunt;
  entry?: LivingDexEntry;
  onRemove: () => void;
}) {
  const spriteUrl = entry?.shinySpriteUrl ?? entry?.spriteUrl;
  const methodLabel = METHOD_LABELS[hunt.method] ?? titleCaseLabel(hunt.method);

  return (
    <div className="grid grid-cols-[36px_1fr_auto] items-center gap-2 rounded-lg bg-[#151520] px-2.5 py-2">
      <span className="relative grid h-9 w-9 place-items-center rounded-md bg-[#0f101a]">
        {spriteUrl && (
          <Image
            src={spriteUrl}
            alt=""
            width={36}
            height={36}
            unoptimized
            className="h-8 w-8 object-contain [image-rendering:pixelated]"
          />
        )}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-xs font-bold">
          {entry?.displayName ?? `#${String(hunt.speciesId).padStart(4, "0")}`}
        </span>
        <span className="mt-0.5 flex items-center gap-1 truncate text-[10px] text-[#8f8799]">
          <Clock3 className="h-3 w-3 shrink-0" />
          {formatDuration(hunt.startedAt, hunt.completedAt)} · {methodLabel}
        </span>
      </span>
      <span className="flex items-center gap-1.5">
        <span className="rounded-full bg-[#f8d85a]/10 px-2 py-1 font-mono text-[10px] font-black text-[#f8d85a]">
          {hunt.count.toLocaleString()}
        </span>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Delete hunt history entry"
          title="Delete hunt history entry"
          className="grid h-7 w-7 place-items-center rounded-lg text-[#8f8799] transition-colors hover:bg-white/5 hover:text-[#f8f0df]"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </span>
    </div>
  );
}

function titleCaseLabel(value: string): string {
  return value
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDuration(startedAt: string, completedAt?: string): string {
  const start = new Date(startedAt).getTime();
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return "same day";
  }

  const totalHours = Math.max(1, Math.round((end - start) / 36e5));
  if (totalHours < 24) return `${totalHours}h`;
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (days < 30) return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  const months = Math.floor(days / 30);
  const remDays = days % 30;
  return remDays > 0 ? `${months}mo ${remDays}d` : `${months}mo`;
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
      event,
    });
  }
  return results;
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

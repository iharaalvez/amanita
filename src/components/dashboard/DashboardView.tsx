"use client";

import Image from "next/image";
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
};

const FALLBACK_CATCHES: RecentCatch[] = [
  {
    id: 906,
    name: "Sprigatito",
    spriteUrl:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/906.png",
    dateLabel: "Today",
  },
  {
    id: 661,
    name: "Fletchling",
    spriteUrl:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/661.png",
    dateLabel: "Today",
  },
  {
    id: 747,
    name: "Mareanie",
    spriteUrl:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/747.png",
    dateLabel: "Yesterday",
  },
  {
    id: 633,
    name: "Deino",
    spriteUrl:
      "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/633.png",
    dateLabel: "Yesterday",
  },
];

export function DashboardView() {
  const [search, setSearch] = useState("");
  const ownedRecords = usePokedexStore((s) => s.owned);
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

  const recentCatches = getRecentCatches(allEntries, ownedRecords);
  const nextTargets = getNextTargets(livingEntries, ownedRecords);
  const remaining = Math.max(livingTotal - ownedCount, 0);
  const searchResults = getSearchResults(livingEntries, search);

  return (
    <div className="min-h-full bg-[#11111b] px-4 py-5 text-[#f8f0df] sm:px-6 lg:px-7">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-black tracking-tight">Dashboard</h1>
          <div className="relative">
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
              <div className="flex h-8 w-full min-w-0 items-center gap-2 rounded-md border border-[#2f2b40] bg-[#151520] px-3 text-[10px] text-[#837b91] sm:w-56">
                <Search className="h-3 w-3" />
                <input
                  id="dashboard-search"
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search Pokemon..."
                  className="min-w-0 flex-1 bg-transparent text-[10px] font-medium text-[#f8f0df] outline-none placeholder:text-[#837b91]"
                />
              </div>
            </form>

            {search.trim() && (
              <div className="absolute right-0 top-10 z-20 w-72 overflow-hidden rounded-lg border border-[#2f2b40] bg-[#151520] shadow-2xl shadow-black/30">
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
                    No Pokemon found.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {stats.map((stat) => (
            <StatCard key={stat.label} stat={stat} />
          ))}
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1.18fr_0.95fr_0.92fr]">
          <section className="rounded-lg border border-[#2f2b40] bg-[#1a1a27]/80 p-4">
            <h2 className="mb-4 text-xs font-black">Recent Catches</h2>
            <div>
              {(recentCatches.length > 0
                ? recentCatches
                : FALLBACK_CATCHES
              ).map((pokemon, index) => (
                <div
                  key={`${pokemon.id}-${pokemon.name}`}
                  className="grid min-h-12 grid-cols-[32px_1fr_auto] items-center gap-3 border-t border-[#2f2b40]/70 py-2 first:border-t-0"
                >
                  <Image
                    src={pokemon.spriteUrl}
                    alt={pokemon.name}
                    width={36}
                    height={36}
                    unoptimized
                    style={{ width: "auto", height: "auto" }}
                    className="h-9 w-9 object-contain [image-rendering:pixelated]"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-bold">
                      {pokemon.name}
                    </p>
                    <p className="text-[9px] text-[#8f8799]">
                      Lv. {index === 0 ? 12 : index === 1 ? 5 : 17}
                    </p>
                  </div>
                  <p className="text-[9px] font-semibold text-[#d4cedb]">
                    {pokemon.dateLabel}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-[#2f2b40] bg-[#1a1a27]/80 p-4">
            <h2 className="mb-5 text-xs font-black">Living Dex Progress</h2>
            <div className="grid place-items-center">
              <div
                className="grid h-36 w-36 place-items-center rounded-full"
                style={{
                  background: `conic-gradient(#b9ec86 ${progress}%, #343045 0)`,
                }}
              >
                <div className="grid h-[116px] w-[116px] place-items-center rounded-full bg-[#1a1a27]">
                  <div className="text-center">
                    <p className="text-3xl font-black">{roundedProgress}%</p>
                    <p className="text-xs text-[#cfc8d8]">
                      {ownedCount} / {livingTotal}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <p className="mt-5 text-center text-[10px] font-semibold text-[#d4cedb]">
              {ownedCount >= livingTotal
                ? "All Pokemon caught!"
                : `${Math.max(livingTotal - ownedCount, 0)} Pokemon remaining`}
            </p>
          </section>

          <section className="rounded-lg border border-[#2f2b40] bg-[#1a1a27]/80 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-xs font-black">Next Targets</h2>
              <span className="rounded-full bg-[#b9ec86]/10 px-2 py-1 text-[10px] font-black text-[#b9ec86]">
                {remaining} left
              </span>
            </div>
            <div>
              {(nextTargets.length > 0 ? nextTargets : FALLBACK_TARGETS).map(
                (pokemon) => (
                  <div
                    key={`${pokemon.dexNumber}-${pokemon.name}`}
                    className="grid min-h-12 grid-cols-[40px_1fr] items-center gap-3 border-t border-[#2f2b40]/70 py-2 first:border-t-0"
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-full border border-[#554a70] bg-[#242536] text-[8px] font-black text-[#bcaee0]">
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
  );
}

function StatCard({ stat }: { stat: Stat }) {
  const percent = stat.total > 0 ? (stat.value / stat.total) * 100 : 0;

  return (
    <section className="rounded-lg border border-[#2f2b40] bg-[#1a1a27]/80 p-4">
      <p className="text-[10px] font-semibold text-[#8f8799]">{stat.label}</p>
      <p className="mt-1 text-2xl font-black">
        {stat.value}
        <span className="ml-1 text-[11px] font-medium text-[#8f8799]">
          / {stat.total}
        </span>
      </p>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-[#343045]">
        <span
          className={`block h-full rounded-full ${stat.colorClass}`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
    </section>
  );
}

function getRecentCatches(
  entries: LivingDexEntry[],
  ownedRecords: ReturnType<typeof usePokedexStore.getState>["owned"],
): RecentCatch[] {
  return entries
    .filter(
      (entry) => ownedRecords[ownedKey(entry.speciesId, entry.formName)]?.owned,
    )
    .slice(-4)
    .reverse()
    .map((entry) => {
      const record = ownedRecords[ownedKey(entry.speciesId, entry.formName)];
      return {
        id: entry.speciesId,
        name: entry.displayName,
        spriteUrl: entry.spriteUrl,
        dateLabel: record?.date_obtained ?? "Tracked",
      };
    });
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
      (entry) => !ownedRecords[ownedKey(entry.speciesId, entry.formName)]?.owned,
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

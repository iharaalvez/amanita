"use client";

import { useEffect, useMemo, useState } from "react";
import { useLivingDexEntries } from "@/hooks/usePokemon";
import {
  usePokedexStore,
  ownedKey,
  type HomeBoxMode,
} from "@/store/pokedexStore";
import {
  getOwnedEntryCount,
  getShinyEntryCount,
  isHomeTrackedEntry,
  isLivingDexSpecies,
} from "@/lib/livingDex";
import { BoxSlot } from "./BoxSlot";
import { XIcon } from "@/components/ui";
import type { LivingDexEntry } from "@/types/pokemon";

const BOX_SIZE = 30;
type HomeStatusFilter = "all" | "shiny" | "missing" | "owned";
type HomeFilterOption = {
  value: HomeStatusFilter;
  label: string;
  count: number;
  activeClass: string;
};

const HOME_MODE_OPTIONS: { value: HomeBoxMode; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "shiny", label: "Shiny" },
  { value: "paired", label: "Pair" },
];

function buildBoxes(entries: LivingDexEntry[]): (LivingDexEntry | null)[][] {
  const totalBoxes = Math.ceil(entries.length / BOX_SIZE);
  return Array.from({ length: totalBoxes }, (_, index) => {
    const chunk: (LivingDexEntry | null)[] = entries.slice(
      index * BOX_SIZE,
      (index + 1) * BOX_SIZE,
    );
    while (chunk.length < BOX_SIZE) chunk.push(null);
    return chunk;
  });
}

type Props = {
  onSelect: (speciesId: number, formName: string | null) => void;
};

export function HomeBoxView({ onSelect }: Props) {
  const { data, isLoading, error } = useLivingDexEntries();
  const [statusFilter, setStatusFilter] = useState<HomeStatusFilter>("all");
  const [search, setSearch] = useState("");
  const ownedRecords = usePokedexStore((s) => s.owned);
  const showCosmeticForms = usePokedexStore((s) => s.showCosmeticForms);
  const setShowCosmeticForms = usePokedexStore((s) => s.setShowCosmeticForms);
  const homeBoxMode = usePokedexStore((s) => s.homeBoxMode);
  const setHomeBoxMode = usePokedexStore((s) => s.setHomeBoxMode);
  const isShinyOnlyMode = homeBoxMode === "shiny";
  const isPairedMode = homeBoxMode === "paired";

  useEffect(() => {
    if (isShinyOnlyMode && statusFilter === "shiny") {
      setStatusFilter("owned");
    }
  }, [isShinyOnlyMode, statusFilter]);

  const summary = useMemo(() => {
    const entries = (data ?? []).filter((entry) =>
      isHomeTrackedEntry(entry, showCosmeticForms),
    );
    const baseEntries = (data ?? []).filter(isLivingDexSpecies);
    const owned = getOwnedEntryCount(entries, ownedRecords);
    const shiny = getShinyEntryCount(entries, ownedRecords);
    const baseOwned = getOwnedEntryCount(baseEntries, ownedRecords);

    return {
      owned,
      shiny,
      total: entries.length,
      baseOwned,
      baseTotal: baseEntries.length,
      includesForms: entries.length !== baseEntries.length,
    };
  }, [data, ownedRecords, showCosmeticForms]);

  if (error) {
    return (
      <div className="py-20 text-center text-red-500">
        Failed to load Pokémon data. Check your connection and try again.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-2 pb-8 sm:px-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-96 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700"
            />
          ))}
        </div>
      </div>
    );
  }

  const filteredData = (data ?? []).filter((entry) =>
    isHomeTrackedEntry(entry, showCosmeticForms),
  );

  const orderedEntries = [...filteredData].toSorted((a, b) => {
    if (a.speciesId !== b.speciesId) return a.speciesId - b.speciesId;
    if (a.formName === null) return -1;
    if (b.formName === null) return 1;
    return a.displayName.localeCompare(b.displayName);
  });
  const boxes = buildBoxes(orderedEntries);

  const q = search.trim().toLowerCase();
  const matchingKeys = new Set(
    orderedEntries
      .filter((entry) => {
        const record = ownedRecords[ownedKey(entry.speciesId, entry.formName)];
        const modeOwned = isShinyOnlyMode ? record?.shiny_owned : record?.owned;
        if (statusFilter === "shiny" && !record?.shiny_owned) return false;
        if (statusFilter === "owned" && !modeOwned) return false;
        if (statusFilter === "missing" && modeOwned) return false;
        if (!q) return true;
        const nameMatch = entry.displayName.toLowerCase().includes(q);
        const numMatch = String(entry.speciesId).startsWith(
          q.replace(/^#0*/, ""),
        );
        return nameMatch || numMatch;
      })
      .map((entry) => `${entry.speciesId}-${entry.formName ?? "base"}`),
  );
  const hasActiveFilter = q.length > 0 || statusFilter !== "all";
  const visibleBoxes = !hasActiveFilter
    ? boxes.map((box, boxIndex) => ({ box, boxIndex }))
    : boxes.flatMap((box, boxIndex) =>
        box.some((entry) =>
          entry
            ? matchingKeys.has(`${entry.speciesId}-${entry.formName ?? "base"}`)
            : false,
        )
          ? [{ box, boxIndex }]
          : [],
      );

  const allFilterOptions: HomeFilterOption[] = [
    {
      value: "all",
      label: "All species",
      count: summary.total,
      activeClass:
        "bg-slate-700 text-white dark:bg-slate-200 dark:text-slate-900",
    },
    {
      value: "owned",
      label: isShinyOnlyMode ? "Shiny owned" : "Owned",
      count: isShinyOnlyMode ? summary.shiny : summary.owned,
      activeClass: isShinyOnlyMode
        ? "bg-yellow-400 text-white"
        : "bg-green-500 text-white",
    },
    {
      value: "missing",
      label: isShinyOnlyMode ? "Missing shiny" : "Missing",
      count: isShinyOnlyMode
        ? summary.total - summary.shiny
        : summary.total - summary.owned,
      activeClass:
        "bg-slate-600 text-white dark:bg-slate-300 dark:text-slate-900",
    },
    {
      value: "shiny",
      label: "Shiny",
      count: summary.shiny,
      activeClass: "bg-yellow-400 text-white",
    },
  ];
  const filterOptions = allFilterOptions.filter(
    ({ value }) => !(isShinyOnlyMode && value === "shiny"),
  );

  return (
    <div className="mx-auto max-w-7xl px-2 pb-8 sm:px-4">
      {/* Controls */}
      <div className="sticky top-0 z-20 -mx-2 my-3 space-y-2.5 rounded-b-lg border-b border-gray-100 bg-white/95 p-3 backdrop-blur dark:border-gray-800 dark:bg-[#0f172a]/95 sm:-mx-4 sm:px-4">
        {/* Row 1: filters left, search + forms right */}
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-2">
          <div className="grid w-full grid-cols-2 gap-1.5 min-[430px]:flex min-[430px]:w-auto min-[430px]:flex-wrap min-[430px]:items-center sm:gap-1.5">
            {filterOptions.map(({ value, label, count, activeClass }) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatusFilter(value)}
                aria-pressed={statusFilter === value}
                className={`flex min-w-0 items-center justify-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 sm:gap-1.5 sm:px-3 sm:text-xs ${
                  statusFilter === value
                    ? activeClass
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                }`}
              >
                <span className="truncate">{label}</span>
                <span
                  className={`shrink-0 tabular-nums text-[10px] ${statusFilter === value ? "opacity-80" : "opacity-60"}`}
                >
                  {count}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-1 grid w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-1.5 min-[430px]:mt-0 min-[430px]:flex min-[430px]:w-auto min-[430px]:gap-2">
            {/* Forms toggle */}
            <button
              type="button"
              onClick={() => setShowCosmeticForms(!showCosmeticForms)}
              className={`rounded-full px-3 py-1.5 text-[11px] font-semibold leading-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 sm:text-xs ${
                showCosmeticForms
                  ? "bg-teal-500 text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
              }`}
            >
              <span className="hidden sm:inline">
                Forms {showCosmeticForms ? "on" : "off"}
              </span>
              <span className="sm:hidden">
                Forms
                <br />
                {showCosmeticForms ? "on" : "off"}
              </span>
            </button>

            {/* Search */}
            <div className="relative">
              <label htmlFor="home-search" className="sr-only">
                Search Pokémon
              </label>
              <input
                id="home-search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="h-8 w-full rounded-full border border-gray-200 bg-white pl-3 pr-7 text-xs text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 min-[430px]:w-36 sm:w-44"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <XIcon className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          {summary.includesForms ? (
            <p className="min-w-0 flex-1 text-[10px] font-medium leading-snug text-gray-500 dark:text-gray-500 sm:text-[11px]">
              Slot counts include forms. Species Living Dex:{" "}
              <span className="tabular-nums text-green-500">
                {summary.baseOwned}/{summary.baseTotal}
              </span>
            </p>
          ) : (
            <span aria-hidden className="min-w-0 flex-1" />
          )}

          <div
            className="grid shrink-0 grid-cols-3 gap-1 rounded-full bg-gray-100 p-1 dark:bg-gray-800"
            aria-label="HOME display mode"
          >
            {HOME_MODE_OPTIONS.map(({ value, label }) => {
              const active = homeBoxMode === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setHomeBoxMode(value)}
                  aria-pressed={active}
                  className={`rounded-full px-2.5 py-1.5 text-[11px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 sm:px-3 sm:text-xs ${
                    active
                      ? value === "normal"
                        ? "bg-green-500 text-white"
                        : value === "shiny"
                          ? "bg-yellow-400 text-slate-950"
                          : "bg-blue-500 text-white"
                      : "text-gray-500 hover:bg-white dark:text-gray-400 dark:hover:bg-gray-700"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Box grid */}
      <div className="grid grid-cols-1 gap-2 sm:gap-3 lg:grid-cols-2">
        {visibleBoxes.flatMap(({ box, boxIndex }) => {
          const renderGrid = (isShiny: boolean) =>
            box.map((entry, slotIndex) => {
              const slotKey = entry
                ? `${entry.speciesId}-${entry.formName ?? "base"}`
                : null;
              const dimmed =
                hasActiveFilter &&
                slotKey !== null &&
                !matchingKeys.has(slotKey);
              return (
                <div
                  key={slotIndex}
                  className={`transition-opacity duration-150 ${dimmed ? "opacity-20" : ""}`}
                >
                  <BoxSlot
                    entry={entry}
                    onSelect={onSelect}
                    isShinySlot={isShiny}
                    hasShinyPair={!isShiny && isPairedMode}
                  />
                </div>
              );
            });

          const normalBox = (
            <section
              key={`n-${boxIndex}`}
              className="scroll-mt-14 rounded-lg border border-gray-100 bg-gray-50 p-1.5 dark:border-gray-700/50 dark:bg-gray-800/60 sm:rounded-xl sm:p-3"
            >
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 sm:mb-2">
                Box {boxIndex + 1}
              </p>
              <div className="grid grid-cols-6 gap-0.5 sm:gap-1">
                {renderGrid(false)}
              </div>
            </section>
          );

          if (homeBoxMode === "normal") return [normalBox];

          const shinyBox = (
            <section
              key={`s-${boxIndex}`}
              className="scroll-mt-14 rounded-lg border border-yellow-200/60 bg-yellow-50/30 p-1.5 dark:border-yellow-900/40 dark:bg-yellow-950/20 sm:rounded-xl sm:p-3"
            >
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-yellow-500 dark:text-yellow-600 sm:mb-2">
                Shiny Box {boxIndex + 1}
              </p>
              <div className="grid grid-cols-6 gap-0.5 sm:gap-1">
                {renderGrid(true)}
              </div>
            </section>
          );

          if (homeBoxMode === "shiny") return [shinyBox];

          return [normalBox, shinyBox];
        })}
        {visibleBoxes.length === 0 && (
          <div className="col-span-full py-12 text-center text-sm text-gray-400">
            No Pokémon match this HOME view.
          </div>
        )}
      </div>
    </div>
  );
}

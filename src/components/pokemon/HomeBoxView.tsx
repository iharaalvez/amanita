"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLivingDexEntries } from "@/hooks/usePokemon";
import {
  usePokedexStore,
  ownedKey,
  type HomeBoxMode,
} from "@/store/pokedexStore";
import {
  compareLivingDexEntries,
  getOwnedEntryCount,
  getShinyEntryCount,
  getSpeciesOwnedCount,
  isHomeTrackedEntry,
  isLivingDexSpecies,
  isShinyTargetEntry,
} from "@/lib/livingDex";
import { BoxSlot } from "./BoxSlot";
import { HomeIcon, SparkleIcon, XIcon } from "@/components/ui";
import { api } from "@/lib/api";
import type { GameHomeBoxFormRule, LivingDexEntry } from "@/types/pokemon";
import { SlidersHorizontal } from "lucide-react";

const BOX_SIZE = 30;
const HOME_DEX_GAME_ID = "home";
type HomeStatusFilter = "all" | "shiny" | "missing" | "owned";
type HomeBoxSlot = {
  entry: LivingDexEntry;
  isShiny: boolean;
};
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

function buildSlotBoxes(slots: HomeBoxSlot[]): (HomeBoxSlot | null)[][] {
  const totalBoxes = Math.ceil(slots.length / BOX_SIZE);
  return Array.from({ length: totalBoxes }, (_, index) => {
    const chunk: (HomeBoxSlot | null)[] = slots.slice(
      index * BOX_SIZE,
      (index + 1) * BOX_SIZE,
    );
    while (chunk.length < BOX_SIZE) chunk.push(null);
    return chunk;
  });
}

function getEntryKey(entry: LivingDexEntry): string {
  return `${entry.speciesId}-${entry.formName ?? "base"}`;
}

function getSlotKey(slot: HomeBoxSlot): string {
  return `${getEntryKey(slot.entry)}-${slot.isShiny ? "shiny" : "normal"}`;
}

function formRuleKey(formName: string | null): string {
  return formName ?? "base";
}

function buildRulesBySpecies(
  rules: readonly GameHomeBoxFormRule[],
): Map<number, Map<string, GameHomeBoxFormRule>> {
  const bySpecies = new Map<number, Map<string, GameHomeBoxFormRule>>();
  for (const rule of rules) {
    const formRules = bySpecies.get(rule.speciesId) ?? new Map();
    formRules.set(formRuleKey(rule.formName), rule);
    bySpecies.set(rule.speciesId, formRules);
  }
  return bySpecies;
}

type Props = {
  onSelect: (speciesId: number, formName: string | null) => void;
};

export function HomeBoxView({ onSelect }: Props) {
  const { data, isLoading, error } = useLivingDexEntries();
  const homeRulesQuery = useQuery({
    queryKey: ["game-home-box-form-rules", HOME_DEX_GAME_ID],
    queryFn: () =>
      api.getGameHomeBoxFormRules(HOME_DEX_GAME_ID).catch(() => []),
    staleTime: Infinity,
  });
  const [statusFilter, setStatusFilter] = useState<HomeStatusFilter>("all");
  const [search, setSearch] = useState("");
  const ownedRecords = usePokedexStore((s) => s.owned);
  const showCosmeticForms = usePokedexStore((s) => s.showCosmeticForms);
  const setShowCosmeticForms = usePokedexStore((s) => s.setShowCosmeticForms);
  const showGenderForms = usePokedexStore((s) => s.showGenderForms);
  const setShowGenderForms = usePokedexStore((s) => s.setShowGenderForms);
  const homeBoxMode = usePokedexStore((s) => s.homeBoxMode);
  const setHomeBoxMode = usePokedexStore((s) => s.setHomeBoxMode);
  const isShinyOnlyMode = homeBoxMode === "shiny";
  const isPairedMode = homeBoxMode === "paired";
  const activeStatusFilter =
    isShinyOnlyMode && statusFilter === "shiny" ? "owned" : statusFilter;
  const homeRulesBySpecies = useMemo(
    () => buildRulesBySpecies(homeRulesQuery.data ?? []),
    [homeRulesQuery.data],
  );

  const isTrackedHomeEntry = useCallback(
    (entry: LivingDexEntry) => {
      if (
        !isHomeTrackedEntry(
          entry,
          showCosmeticForms,
          showGenderForms,
        )
      ) {
        return false;
      }

      const speciesRules = homeRulesBySpecies.get(entry.speciesId);
      if (!speciesRules?.size) return true;
      return !!speciesRules.get(formRuleKey(entry.formName))?.allowed;
    },
    [
      homeRulesBySpecies,
      showCosmeticForms,
      showGenderForms,
    ],
  );

  const isShinyTrackedEntry = useCallback(
    (entry: LivingDexEntry) => {
      const speciesRules = homeRulesBySpecies.get(entry.speciesId);
      const rule = speciesRules?.get(formRuleKey(entry.formName));
      if (rule) return rule.showShiny;
      return isShinyTargetEntry(entry);
    },
    [homeRulesBySpecies],
  );

  // Unlike isShinyTrackedEntry, this controls slot existence: locks keep a disabled slot; showShiny:false removes it.
  const hasShinySlot = useCallback(
    (entry: LivingDexEntry) => {
      const speciesRules = homeRulesBySpecies.get(entry.speciesId);
      if (!speciesRules?.size) return true;
      const rule = speciesRules.get(formRuleKey(entry.formName));
      return rule ? rule.showShiny : true;
    },
    [homeRulesBySpecies],
  );

  const summary = useMemo(() => {
    const entries = (data ?? []).filter(isTrackedHomeEntry);
    const shinyTargetEntries = entries.filter(isShinyTrackedEntry);
    const baseEntries = (data ?? []).filter(isLivingDexSpecies);
    const owned = getOwnedEntryCount(entries, ownedRecords);
    const shiny = getShinyEntryCount(shinyTargetEntries, ownedRecords);
    const baseOwned = getSpeciesOwnedCount(baseEntries, ownedRecords);

    return {
      owned,
      shiny,
      total: entries.length,
      shinyTotal: shinyTargetEntries.length,
      shinySlotTotal: entries.length,
      shinyLocked: entries.length - shinyTargetEntries.length,
      baseOwned,
      baseTotal: baseEntries.length,
      includesForms: entries.length !== baseEntries.length,
    };
  }, [
    data,
    ownedRecords,
    isTrackedHomeEntry,
    isShinyTrackedEntry,
  ]);

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

  const filteredData = (data ?? []).filter(isTrackedHomeEntry);

  const orderedEntries = [...filteredData].toSorted(compareLivingDexEntries);
  const homeBoxEntries = orderedEntries;
  const pairedSlots: HomeBoxSlot[] = orderedEntries.flatMap((entry) => [
    { entry, isShiny: false },
    ...(hasShinySlot(entry) ? [{ entry, isShiny: true }] : []),
  ]);
  const boxes = buildBoxes(homeBoxEntries);
  const pairedBoxes = buildSlotBoxes(pairedSlots);

  const q = search.trim().toLowerCase();
  const matchingKeys = new Set(
    orderedEntries
      .filter((entry) => {
        const record = ownedRecords[ownedKey(entry.speciesId, entry.formName)];
        const shinyTarget = isShinyTrackedEntry(entry);
        const shinyOwned = !!record?.shiny_owned;
        const modeOwned = isShinyOnlyMode ? shinyOwned : record?.owned;
        if (isShinyOnlyMode && !shinyTarget && activeStatusFilter !== "all") {
          return false;
        }
        if (activeStatusFilter === "shiny" && (!shinyTarget || !shinyOwned))
          return false;
        if (activeStatusFilter === "owned" && !modeOwned) return false;
        if (activeStatusFilter === "missing" && modeOwned) return false;
        if (!q) return true;
        const nameMatch = entry.displayName.toLowerCase().includes(q);
        const numMatch = String(entry.speciesId).startsWith(
          q.replace(/^#0*/, ""),
        );
        return nameMatch || numMatch;
      })
      .map(getEntryKey),
  );
  const matchingSlotKeys = new Set(
    pairedSlots
      .filter((slot) => {
        const record =
          ownedRecords[ownedKey(slot.entry.speciesId, slot.entry.formName)];
        const shinyTarget = isShinyTrackedEntry(slot.entry);
        const shinyOwned = !!record?.shiny_owned;
        const entryMatchesQuery =
          !q || matchingKeys.has(getEntryKey(slot.entry));
        if (!entryMatchesQuery) return false;
        if (activeStatusFilter === "shiny") {
          return slot.isShiny && shinyTarget && shinyOwned;
        }
        if (activeStatusFilter === "owned") {
          return slot.isShiny ? shinyOwned : !!record?.owned;
        }
        if (activeStatusFilter === "missing") {
          return slot.isShiny ? shinyTarget && !shinyOwned : !record?.owned;
        }
        return true;
      })
      .map(getSlotKey),
  );
  const hasActiveFilter = q.length > 0 || activeStatusFilter !== "all";
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
  const visiblePairedBoxes = !hasActiveFilter
    ? pairedBoxes.map((box, boxIndex) => ({ box, boxIndex }))
    : pairedBoxes.flatMap((box, boxIndex) =>
        box.some((slot) =>
          slot ? matchingSlotKeys.has(getSlotKey(slot)) : false,
        )
          ? [{ box, boxIndex }]
          : [],
      );

  const allFilterOptions: HomeFilterOption[] = [
    {
      value: "all",
      label: isShinyOnlyMode
        ? "Shiny slots"
        : isPairedMode
          ? "All slots"
          : "All species",
      count: isShinyOnlyMode
        ? summary.shinySlotTotal
        : isPairedMode
          ? summary.total + summary.shinySlotTotal
          : summary.total,
      activeClass:
        "bg-slate-700 text-white dark:bg-slate-200 dark:text-slate-900",
    },
    {
      value: "owned",
      label: isShinyOnlyMode ? "Shiny owned" : "Owned",
      count: isShinyOnlyMode
        ? summary.shiny
        : isPairedMode
          ? summary.owned + summary.shiny
          : summary.owned,
      activeClass: isShinyOnlyMode
        ? "bg-yellow-400 text-white"
        : "bg-green-500 text-white",
    },
    {
      value: "missing",
      label: isShinyOnlyMode ? "Missing shiny" : "Missing",
      count: isShinyOnlyMode
        ? summary.shinyTotal - summary.shiny
        : isPairedMode
          ? summary.total + summary.shinyTotal - summary.owned - summary.shiny
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
  const displayedSlotTotal = isShinyOnlyMode
    ? summary.shinyTotal
    : isPairedMode
      ? summary.total + summary.shinyTotal
      : summary.total;
  const displayedOwnedTotal = isShinyOnlyMode
    ? summary.shiny
    : isPairedMode
      ? summary.owned + summary.shiny
      : summary.owned;
  const completionPct =
    displayedSlotTotal > 0
      ? Math.min(100, (displayedOwnedTotal / displayedSlotTotal) * 100)
      : 0;
  const enabledVariantCount = [showCosmeticForms, showGenderForms].filter(
    Boolean,
  ).length;
  const variantOptions = [
    {
      label: "Forms",
      enabled: showCosmeticForms,
      onToggle: () => setShowCosmeticForms(!showCosmeticForms),
      activeClass: "bg-teal-500",
    },
    {
      label: "Gender",
      enabled: showGenderForms,
      onToggle: () => setShowGenderForms(!showGenderForms),
      activeClass: "bg-purple-500",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-2 pb-8 sm:px-4">
      <header className="py-3 sm:py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-500 dark:bg-green-950/40 dark:text-green-300">
              <HomeIcon className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-black tracking-tight text-gray-950 dark:text-white sm:text-2xl">
                HOME Boxes
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Your Living Dex arranged in 30-slot boxes.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1.5 sm:min-w-80 sm:gap-2">
            <div className="rounded-lg border border-green-100 bg-green-50 px-2 py-2 dark:border-green-900/40 dark:bg-green-950/30 sm:px-3">
              <p className="text-base font-black tabular-nums text-green-600 dark:text-green-400 sm:text-lg">
                {displayedOwnedTotal}/{displayedSlotTotal}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-wide text-green-700/70 dark:text-green-300/70">
                Owned
              </p>
            </div>
            <div className="rounded-lg border border-blue-100 bg-blue-50 px-2 py-2 dark:border-blue-900/40 dark:bg-blue-950/30 sm:px-3">
              <p className="text-base font-black tabular-nums text-blue-950 dark:text-white sm:text-lg">
                {summary.baseOwned}/{summary.baseTotal}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-wide text-blue-400">
                Species Dex
              </p>
            </div>
            <div className="rounded-lg border border-yellow-100 bg-yellow-50 px-2 py-2 dark:border-yellow-900/40 dark:bg-yellow-950/30 sm:px-3">
              <p className="flex items-center gap-1 text-base font-black tabular-nums text-yellow-600 dark:text-yellow-400 sm:text-lg">
                <SparkleIcon className="h-4 w-4" />
                {summary.shiny}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-wide text-yellow-700/70 dark:text-yellow-300/70">
                Shiny
              </p>
            </div>
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
          <div
            className="h-full rounded-full bg-green-400 transition-all duration-700"
            style={{ width: `${completionPct}%` }}
          />
        </div>
      </header>

      {/* Controls */}
      <div className="sticky top-0 z-20 -mx-2 mb-3 space-y-2.5 rounded-b-lg border-b border-gray-100 bg-white/95 p-3 backdrop-blur dark:border-gray-800 dark:bg-[#0f172a]/95 sm:-mx-4 sm:px-4">
        {/* Row 1: filters left, search + forms right */}
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-2">
          <div className="grid w-full grid-cols-2 gap-1.5 min-[430px]:flex min-[430px]:w-auto min-[430px]:flex-wrap min-[430px]:items-center sm:gap-1.5">
            {filterOptions.map(({ value, label, count, activeClass }) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatusFilter(value)}
                aria-pressed={activeStatusFilter === value}
                className={`flex min-w-0 items-center justify-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 sm:gap-1.5 sm:px-3 sm:text-xs ${
                  activeStatusFilter === value
                    ? activeClass
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                }`}
              >
                <span className="truncate">{label}</span>
                <span
                  className={`shrink-0 tabular-nums text-[10px] ${activeStatusFilter === value ? "opacity-80" : "opacity-60"}`}
                >
                  {count}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-1 grid w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-1.5 min-[520px]:mt-0 min-[520px]:flex min-[520px]:w-auto min-[520px]:gap-2">
            <details className="group relative">
              <summary className="flex h-8 cursor-pointer list-none items-center gap-1.5 rounded-full bg-gray-100 px-3 text-[11px] font-semibold text-gray-600 transition-colors hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 group-open:bg-slate-700 group-open:text-white dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 dark:group-open:bg-slate-200 dark:group-open:text-slate-900 sm:text-xs [&::-webkit-details-marker]:hidden">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span>Variants</span>
                {enabledVariantCount > 0 && (
                  <span className="rounded-full bg-white/70 px-1.5 py-0.5 text-[10px] font-black text-slate-700 dark:bg-slate-900/20 dark:text-slate-900">
                    {enabledVariantCount}
                  </span>
                )}
              </summary>
              <div className="absolute right-0 top-10 z-30 w-56 overflow-hidden rounded-lg border border-gray-200 bg-white p-1.5 shadow-xl shadow-black/10 dark:border-gray-700 dark:bg-gray-900 dark:shadow-black/40">
                {variantOptions.map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    onClick={option.onToggle}
                    aria-pressed={option.enabled}
                    className="flex h-10 w-full items-center justify-between gap-3 rounded-md px-2.5 text-left text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-white/5"
                  >
                    <span>{option.label}</span>
                    <span
                      className={`relative h-5 w-9 rounded-full transition-colors ${
                        option.enabled
                          ? option.activeClass
                          : "bg-gray-200 dark:bg-gray-700"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                          option.enabled ? "translate-x-4" : "translate-x-0.5"
                        }`}
                      />
                    </span>
                  </button>
                ))}
              </div>
            </details>

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
              Slot counts include forms
              {(isShinyOnlyMode || isPairedMode) && summary.shinyLocked > 0 ? (
                <>
                  {" "}
                  - Shiny targets exclude{" "}
                  <span className="tabular-nums text-slate-400">
                    {summary.shinyLocked}
                  </span>{" "}
                  locked forms.
                </>
              ) : null}
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
        {isPairedMode &&
          visiblePairedBoxes.map(({ box, boxIndex }) => (
            <section
              key={`p-${boxIndex}`}
              className="scroll-mt-14 rounded-lg border border-blue-100 bg-blue-50/40 p-1.5 dark:border-blue-900/40 dark:bg-blue-950/20 sm:rounded-xl sm:p-3"
            >
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-blue-500 dark:text-blue-400 sm:mb-2">
                {boxIndex * BOX_SIZE + 1}–{(boxIndex + 1) * BOX_SIZE}
              </p>
              <div className="grid grid-cols-6 gap-0.5 sm:gap-1">
                {box.map((slot, slotIndex) => {
                  const dimmed =
                    hasActiveFilter &&
                    slot !== null &&
                    !matchingSlotKeys.has(getSlotKey(slot));
                  return (
                    <div
                      key={slotIndex}
                      className={`transition-opacity duration-150 ${dimmed ? "opacity-20" : ""}`}
                    >
                      <BoxSlot
                        entry={slot?.entry ?? null}
                        onSelect={onSelect}
                        isShinySlot={slot?.isShiny ?? false}
                        shinyLocked={
                          slot?.isShiny && slot.entry
                            ? !isShinyTrackedEntry(slot.entry)
                            : undefined
                        }
                      />
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        {!isPairedMode &&
          visibleBoxes.flatMap(({ box, boxIndex }) => {
            const renderGrid = (isShiny: boolean) =>
              box.map((entry, slotIndex) => {
                const slotKey = entry ? getEntryKey(entry) : null;
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
                      shinyLocked={
                        isShiny && entry
                          ? !isShinyTrackedEntry(entry)
                          : undefined
                      }
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
                  {boxIndex * BOX_SIZE + 1}–{(boxIndex + 1) * BOX_SIZE}
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
                  ✦ {boxIndex * BOX_SIZE + 1}–{(boxIndex + 1) * BOX_SIZE}
                </p>
                <div className="grid grid-cols-6 gap-0.5 sm:gap-1">
                  {renderGrid(true)}
                </div>
              </section>
            );

            if (homeBoxMode === "shiny") return [shinyBox];

            return [normalBox, shinyBox];
          })}
        {(isPairedMode ? visiblePairedBoxes.length : visibleBoxes.length) ===
          0 && (
          <div className="col-span-full py-12 text-center text-sm text-gray-400">
            No Pokémon match this HOME view.
          </div>
        )}
      </div>
    </div>
  );
}

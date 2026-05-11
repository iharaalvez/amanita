"use client";

import { useMemo, useState } from "react";
import { useLivingDexEntries } from "@/hooks/usePokemon";
import { usePokedexStore, ownedKey } from "@/store/pokedexStore";
import { BoxSlot } from "./BoxSlot";
import type { LivingDexEntry } from "@/types/pokemon";

const BOX_SIZE = 30;
type HomeStatusFilter = "all" | "shiny" | "missing" | "owned";

const HOME_STATUS_OPTIONS: { value: HomeStatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "owned", label: "Owned" },
  { value: "missing", label: "Missing" },
  { value: "shiny", label: "Shiny" },
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
  search: string;
};

export function HomeBoxView({ onSelect, search }: Props) {
  const { data, isLoading, error } = useLivingDexEntries();
  const [statusFilter, setStatusFilter] = useState<HomeStatusFilter>("all");
  const ownedRecords = usePokedexStore((s) => s.owned);
  const showCosmeticForms = usePokedexStore((s) => s.showCosmeticForms);
  const setShowCosmeticForms = usePokedexStore((s) => s.setShowCosmeticForms);
  const summary = useMemo(() => {
    const entries = (data ?? []).filter(
      (e) => e.formName === null || e.isRegionalForm || showCosmeticForms,
    );
    const owned = entries.filter(
      (e) => ownedRecords[ownedKey(e.speciesId, e.formName)]?.owned,
    ).length;
    const shiny = entries.filter(
      (e) => ownedRecords[ownedKey(e.speciesId, e.formName)]?.shiny_owned,
    ).length;
    return { owned, shiny, total: entries.length };
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
      <div className="mx-auto max-w-7xl px-4 pb-8">
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

  const filteredData = (data ?? []).filter(
    (e) => e.formName === null || e.isRegionalForm || showCosmeticForms,
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
        if (statusFilter === "owned" && !record?.owned) return false;
        if (statusFilter === "shiny" && !record?.shiny_owned) return false;
        if (statusFilter === "missing" && record?.owned) return false;
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

  return (
    <div className="mx-auto max-w-7xl px-4 pb-8">
      {/* Summary and controls */}
      <div className="mb-4 border-b border-gray-100 pb-4 dark:border-gray-800">

        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
            {HOME_STATUS_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatusFilter(value)}
                aria-pressed={statusFilter === value}
                className={`rounded-md px-2.5 py-1 text-[10px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                  statusFilter === value
                    ? "bg-gray-800 text-white shadow-sm dark:bg-gray-100 dark:text-gray-900"
                    : "text-gray-500 hover:bg-white hover:text-gray-700 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setShowCosmeticForms(!showCosmeticForms)}
            className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
              showCosmeticForms
                ? "bg-teal-500 text-white"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600"
            }`}
          >
            Form variants {showCosmeticForms ? "on" : "off"}
          </button>
        </div>

        <div className="my-3 flex flex-wrap items-center gap-2">
          <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 dark:border-green-900/60 dark:bg-green-950/30">
            <span className="text-lg font-black tabular-nums text-green-500">
              {summary.owned}
            </span>
            <span className="ml-1.5 text-xs font-semibold text-green-700 dark:text-green-300">
              Owned
            </span>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-800">
            <span className="text-lg font-black tabular-nums text-gray-400 dark:text-gray-500">
              {summary.total - summary.owned}
            </span>
            <span className="ml-1.5 text-xs font-semibold text-gray-500 dark:text-gray-300">
              Missing
            </span>
          </div>
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2 dark:border-yellow-900/60 dark:bg-yellow-950/30">
            <span className="text-lg font-black tabular-nums text-yellow-500">
              {summary.shiny}
            </span>
            <span className="ml-1.5 text-xs font-semibold text-yellow-700 dark:text-yellow-300">
              Shiny
            </span>
          </div>
        </div>
      </div>

      {/* Box grid */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {visibleBoxes.map(({ box, boxIndex }) => (
          <section
            key={boxIndex}
            className="scroll-mt-14 rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-gray-700/50 dark:bg-gray-800/60"
          >
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
              Box {boxIndex + 1}
            </p>
            <div className="grid grid-cols-6 gap-1">
              {box.map((entry, slotIndex) => {
                const slotKey = entry
                  ? `${entry.speciesId}-${entry.formName ?? "base"}`
                  : null;
                const dimmed =
                  matchingKeys !== null &&
                  slotKey !== null &&
                  !matchingKeys.has(slotKey);
                return (
                  <div
                    key={`${boxIndex}-${slotIndex}`}
                    className={`transition-opacity duration-150 ${dimmed ? "opacity-20" : ""}`}
                  >
                    <BoxSlot entry={entry} onSelect={onSelect} />
                  </div>
                );
              })}
            </div>
          </section>
        ))}
        {visibleBoxes.length === 0 && (
          <div className="col-span-full py-12 text-center text-sm text-gray-400">
            No Pokemon match this HOME view.
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useMemo } from "react";
import { useLivingDexEntries } from "@/hooks/usePokemon";
import { usePokedexStore, ownedKey } from "@/store/pokedexStore";
import { BoxSlot } from "./BoxSlot";
import type { LivingDexEntry } from "@/types/pokemon";

const BOX_SIZE = 30;

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
    const inHome = entries.filter(
      (e) => ownedRecords[ownedKey(e.speciesId, e.formName)]?.in_home,
    ).length;
    const pending = owned - inHome;
    return { owned, inHome, pending, total: entries.length };
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
  const matchingKeys = q
    ? new Set(
        orderedEntries
          .filter((e) => {
            const nameMatch = e.displayName.toLowerCase().includes(q);
            const numMatch = String(e.speciesId).startsWith(
              q.replace(/^#0*/, ""),
            );
            return nameMatch || numMatch;
          })
          .map((e) => `${e.speciesId}-${e.formName ?? "base"}`),
      )
    : null;

  return (
    <div className="mx-auto max-w-7xl px-4 pb-8">
      {/* Summary bar */}
      <div className="mb-4 flex flex-wrap items-baseline gap-x-5 gap-y-2 border-b border-gray-100 pb-4 dark:border-gray-800">
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold tabular-nums text-green-400">
            {summary.inHome}
          </span>
          <span className="text-xs text-gray-400">in HOME</span>
          <span className="mx-1 text-gray-600 dark:text-gray-600">/</span>
          <span className="text-sm font-semibold tabular-nums text-gray-300">
            {summary.owned}
          </span>
          <span className="text-xs text-gray-400">owned</span>
        </div>
        {summary.pending > 0 && (
          <span className="text-xs font-semibold tabular-nums text-blue-400">
            {summary.pending} pending transfer
          </span>
        )}
        <button
          type="button"
          onClick={() => setShowCosmeticForms(!showCosmeticForms)}
          className={`rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
            showCosmeticForms
              ? "bg-teal-500 text-white"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600"
          }`}
        >
          Form variants {showCosmeticForms ? "on" : "off"}
        </button>
        <div className="ml-auto flex items-center gap-3 text-[10px] text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm bg-green-950/30 ring-1 ring-green-400" />
            In HOME
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm bg-blue-950/20 ring-1 ring-blue-400" />
            Pending
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm bg-yellow-950/40 ring-1 ring-yellow-400" />
            Shiny
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm bg-violet-950/30 ring-1 ring-violet-400" />
            Planned
          </span>
        </div>
      </div>

      {/* Box grid */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {boxes.map((box, boxIndex) => (
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
      </div>
    </div>
  );
}

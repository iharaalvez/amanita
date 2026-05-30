"use client";

import { useMemo, useState } from "react";
import { useGameHomeBoxDex } from "@/hooks/useGamePokedex";
import { ownedKey, usePokedexStore } from "@/store/pokedexStore";
import { CheckIcon, HomeIcon, XIcon } from "@/components/ui";
import {
  getCosmeticFormLabel,
  getDisplayNameWithoutFormLabel,
  getFormLabel,
} from "@/lib/forms";
import type { GameHomeBoxEntry } from "@/types/pokemon";
import { EmptySlot, SlotTile } from "@/components/pokemon/SlotTile";

const BOX_SIZE = 30;
const EMPTY_BOX_RECORDS: Record<string, boolean> = {};

type StatusFilter = "all" | "missing" | "boxed";

type Props = {
  gameId: string;
  gameName: string;
  onSelect: (
    speciesId: number,
    formName: string | null,
    contextGameId: string,
  ) => void;
};

function buildBoxes(
  entries: GameHomeBoxEntry[],
): (GameHomeBoxEntry | null)[][] {
  const totalBoxes = Math.max(1, Math.ceil(entries.length / BOX_SIZE));
  return Array.from({ length: totalBoxes }, (_, index) => {
    const chunk: (GameHomeBoxEntry | null)[] = entries.slice(
      index * BOX_SIZE,
      (index + 1) * BOX_SIZE,
    );
    while (chunk.length < BOX_SIZE) chunk.push(null);
    return chunk;
  });
}

function entryKey(entry: GameHomeBoxEntry): string {
  return ownedKey(entry.speciesId, entry.formName);
}

function GameHomeSlot({
  entry,
  boxed,
  onToggle,
  onSelect,
}: {
  entry: GameHomeBoxEntry | null;
  boxed: boolean;
  onToggle: () => void;
  onSelect: () => void;
}) {
  if (!entry) return <EmptySlot />;

  const paddedNumber = `#${String(entry.entryNumber).padStart(3, "0")}`;
  const nationalNumber = `Nat. #${String(entry.speciesId).padStart(4, "0")}`;
  const regionLabel = entry.formName ? getFormLabel(entry.formName) : null;
  const cosmeticLabel =
    entry.formName && !regionLabel
      ? getCosmeticFormLabel(entry.formName)
      : null;
  const formPill = regionLabel || cosmeticLabel;
  const slotName = getDisplayNameWithoutFormLabel(entry.displayName, formPill);
  const label = `${paddedNumber} - ${entry.displayName} (${nationalNumber})${
    boxed ? " - in HOME transfer box" : " - missing from HOME transfer box"
  }`;
  const toggleLabel = boxed
    ? `Remove ${entry.displayName} from HOME transfer box`
    : `Add ${entry.displayName} to HOME transfer box`;

  return (
    <SlotTile
      spriteUrl={entry.spriteUrl}
      spriteAlt={entry.displayName}
      slotName={slotName}
      tooltipLabel={label}
      formPill={formPill}
      regionLabel={regionLabel}
      isActive={boxed}
      toggleActive={boxed}
      onSelect={onSelect}
      onToggle={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      toggleLabel={toggleLabel}
      activeIcon={<CheckIcon className="h-4 w-4 sm:h-3 sm:w-3" />}
    />
  );
}

export function GameHomeBoxView({ gameId, gameName, onSelect }: Props) {
  const { data, isLoading, error } = useGameHomeBoxDex(gameId);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const boxRecords = usePokedexStore(
    (state) => state.gameHomeBoxes[gameId] ?? EMPTY_BOX_RECORDS,
  );
  const markInGameHomeBox = usePokedexStore((state) => state.markInGameHomeBox);
  const clearFromGameHomeBox = usePokedexStore(
    (state) => state.clearFromGameHomeBox,
  );

  const entries = useMemo(() => data ?? [], [data]);
  const boxedCount = entries.filter(
    (entry) => boxRecords[entryKey(entry)],
  ).length;
  const missingCount = Math.max(0, entries.length - boxedCount);
  const progressPct =
    entries.length > 0 ? Math.min(100, (boxedCount / entries.length) * 100) : 0;

  const q = search.trim().toLowerCase();
  const matchingKeys = useMemo(
    () =>
      new Set(
        entries
          .filter((entry) => {
            const boxed = !!boxRecords[entryKey(entry)];
            if (statusFilter === "boxed" && !boxed) return false;
            if (statusFilter === "missing" && boxed) return false;
            if (!q) return true;
            const normalizedNumber = q.replace(/^#0*/, "");
            return (
              entry.displayName.toLowerCase().includes(q) ||
              String(entry.entryNumber).includes(normalizedNumber) ||
              String(entry.speciesId).includes(normalizedNumber) ||
              String(entry.speciesId)
                .padStart(4, "0")
                .includes(normalizedNumber)
            );
          })
          .map(entryKey),
      ),
    [boxRecords, entries, q, statusFilter],
  );

  const hasActiveFilter = q.length > 0 || statusFilter !== "all";
  const boxes = buildBoxes(entries);
  const visibleBoxes = !hasActiveFilter
    ? boxes.map((box, boxIndex) => ({ box, boxIndex }))
    : boxes.flatMap((box, boxIndex) =>
        box.some((entry) => entry && matchingKeys.has(entryKey(entry)))
          ? [{ box, boxIndex }]
          : [],
      );

  const toggleEntry = (entry: GameHomeBoxEntry) => {
    if (boxRecords[entryKey(entry)]) {
      clearFromGameHomeBox(entry.speciesId, gameId, entry.formName);
    } else {
      markInGameHomeBox(entry.speciesId, gameId, entry.formName);
    }
  };

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-4 pb-10">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
          Failed to load HOME box order for {gameName}.
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 pb-10">
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
                National Dex Boxes
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
                {gameName} arranged in 30-slot HOME transfer boxes. This
                progress is separate from the in-game dex.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1.5 sm:min-w-80 sm:gap-2">
            <div className="rounded-lg border border-green-100 bg-green-50 px-2 py-2 dark:border-green-900/40 dark:bg-green-950/30 sm:px-3">
              <p className="text-base font-black tabular-nums text-green-600 dark:text-green-400 sm:text-lg">
                {boxedCount}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-wide text-green-700/70 dark:text-green-300/70">
                Boxed
              </p>
            </div>
            <div className="rounded-lg border border-gray-100 bg-gray-50 px-2 py-2 dark:border-gray-800 dark:bg-gray-900 sm:px-3">
              <p className="text-base font-black tabular-nums text-gray-950 dark:text-white sm:text-lg">
                {entries.length}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                Slots
              </p>
            </div>
            <div className="rounded-lg border border-amber-100 bg-amber-50 px-2 py-2 dark:border-amber-900/40 dark:bg-amber-950/30 sm:px-3">
              <p className="text-base font-black tabular-nums text-amber-600 dark:text-amber-400 sm:text-lg">
                {missingCount}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-wide text-amber-700/70 dark:text-amber-300/70">
                Missing
              </p>
            </div>
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
          <div
            className="h-full rounded-full bg-green-400 transition-all duration-700"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </header>
      <div className="-mx-2 mb-3 flex flex-col gap-2 rounded-b-lg border-b border-gray-100 bg-white/95 p-3 backdrop-blur dark:border-gray-800 dark:bg-[#0f172a]/95 sm:-mx-4 sm:px-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid grid-cols-3 gap-1.5 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
          {[
            ["all", "All", entries.length],
            ["boxed", "Boxed", boxedCount],
            ["missing", "Missing", missingCount],
          ].map(([value, label, count]) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatusFilter(value as StatusFilter)}
              aria-pressed={statusFilter === value}
              className={`flex min-w-0 items-center justify-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 sm:gap-1.5 sm:px-3 sm:text-xs ${
                statusFilter === value
                  ? value === "boxed"
                    ? "bg-green-500 text-white"
                    : value === "missing"
                      ? "bg-slate-600 text-white"
                      : "bg-slate-700 text-white dark:bg-slate-200 dark:text-slate-900"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
              }`}
            >
              <span className="truncate">{label}</span>
              <span className="shrink-0 tabular-nums text-[10px] opacity-70">
                {count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative">
          <label htmlFor="game-home-box-search" className="sr-only">
            Search Pokemon
          </label>
          <input
            id="game-home-box-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search boxes..."
            className="h-8 w-full rounded-full border border-gray-200 bg-white pl-3 pr-7 text-xs text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 sm:w-56"
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

      <div className="grid grid-cols-1 gap-2 sm:gap-3 lg:grid-cols-2">
        {visibleBoxes.map(({ box, boxIndex }) => {
          const nonNull = box.filter((e): e is GameHomeBoxEntry => e !== null);
          const first = nonNull[0]?.entryNumber ?? boxIndex * BOX_SIZE + 1;
          const last = nonNull[nonNull.length - 1]?.entryNumber ?? (boxIndex + 1) * BOX_SIZE;
          return (
          <section
            key={boxIndex}
            className="scroll-mt-14 rounded-lg border border-gray-100 bg-gray-50 p-1.5 dark:border-gray-700/50 dark:bg-gray-800/60 sm:rounded-xl sm:p-3"
          >
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 sm:mb-2">
              {first}–{last}
            </p>
            <div className="grid grid-cols-6 gap-0.5 sm:gap-1">
              {box.map((entry, slotIndex) => {
                const boxed = entry ? !!boxRecords[entryKey(entry)] : false;
                const dimmed =
                  hasActiveFilter &&
                  entry !== null &&
                  !matchingKeys.has(entryKey(entry));
                return (
                  <div
                    key={slotIndex}
                    className={`transition-opacity duration-150 ${
                      dimmed ? "opacity-20" : ""
                    }`}
                  >
                    <GameHomeSlot
                      entry={entry}
                      boxed={boxed}
                      onToggle={() => {
                        if (entry) toggleEntry(entry);
                      }}
                      onSelect={() => {
                        if (entry) {
                          onSelect(entry.speciesId, entry.formName, gameId);
                        }
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </section>
          );
        })}

        {visibleBoxes.length === 0 && (
          <div className="col-span-full py-12 text-center text-sm text-gray-400">
            No Pokemon match this box view.
          </div>
        )}
      </div>
    </div>
  );
}

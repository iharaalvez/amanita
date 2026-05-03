"use client";

import { useMemo, useRef, useState } from "react";
import { usePokedexStore, ownedKey } from "@/store/pokedexStore";
import { useLivingDexEntries } from "@/hooks/usePokemon";
import { SparkleIcon } from "@/components/ui";
import type {
  LivingDexEntry,
  OwnedRecord,
  OwnershipMethod,
  ProgressSnapshot,
  ShinyHuntMethod,
} from "@/types/pokemon";

function downloadJSON(snapshot: ProgressSnapshot) {
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `living-pokedex-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadCSV(
  owned: Record<string, OwnedRecord>,
  entries: LivingDexEntry[],
) {
  const nameMap = new Map(
    entries.map((e) => [ownedKey(e.speciesId, e.formName), e.displayName]),
  );
  const header =
    "speciesId,formName,name,owned,shiny_owned,method,game_caught,shiny_method,shiny_game,planned";
  const rows = Object.entries(owned).map(([key, r]) => {
    const name = (nameMap.get(key) ?? "").replace(/"/g, '""');
    return [
      r.pokedex_number,
      r.form_name ?? "base",
      `"${name}"`,
      r.owned ? "TRUE" : "FALSE",
      r.shiny_owned ? "TRUE" : "FALSE",
      r.method ?? "",
      r.game_caught ?? "",
      r.shiny_method ?? "",
      r.shiny_game ?? "",
      r.planned ? "TRUE" : "FALSE",
    ].join(",");
  });
  const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `living-pokedex-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function isProgressSnapshot(value: unknown): value is ProgressSnapshot {
  if (typeof value !== "object" || value === null) return false;
  const snapshot = value as Partial<ProgressSnapshot>;
  return (
    typeof snapshot.owned === "object" &&
    snapshot.owned !== null &&
    typeof snapshot.gameDexProgress === "object" &&
    snapshot.gameDexProgress !== null &&
    typeof snapshot.availableGames === "object" &&
    snapshot.availableGames !== null
  );
}

const GENERATIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
const GEN_LABELS: Record<number, string> = {
  1: "I",
  2: "II",
  3: "III",
  4: "IV",
  5: "V",
  6: "VI",
  7: "VII",
  8: "VIII",
  9: "IX",
};

const OWNERSHIP_METHODS: { value: OwnershipMethod; label: string }[] = [
  { value: "caught", label: "Caught" },
  { value: "bred", label: "Bred" },
  { value: "hatched", label: "Hatched" },
  { value: "transferred", label: "Transferred" },
  { value: "event", label: "Event" },
];

const SHINY_METHODS: { value: ShinyHuntMethod; label: string; odds: string }[] =
  [
    { value: "random", label: "Random", odds: "1/4096" },
    { value: "masuda", label: "Masuda", odds: "1/683" },
    { value: "soft-reset", label: "Soft Reset", odds: "1/4096" },
    { value: "sos-chain", label: "SOS Chain", odds: "~1/315" },
    { value: "poke-radar", label: "Poke Radar", odds: "~1/99" },
    { value: "dex-nav", label: "DexNav", odds: "varies" },
    { value: "outbreak", label: "Outbreak", odds: "varies" },
  ];

function HBar({ pct, colorClass }: { pct: number; colorClass: string }) {
  return (
    <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
        style={{ width: `${Math.max(pct, pct > 0 ? 2 : 0)}%` }}
      />
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  accent,
}: {
  icon?: string;
  title: string;
  accent: string;
}) {
  return (
    <div className={`flex items-center gap-2 mb-5 pb-3 border-b-2 ${accent}`}>
      {icon && <span className="text-lg">{icon}</span>}
      <h2 className="text-base font-bold dark:text-white tracking-tight">
        {title}
      </h2>
    </div>
  );
}

export function StatsView() {
  const ownedRecords = usePokedexStore((s) => s.owned);
  const getProgressSnapshot = usePokedexStore((s) => s.getProgressSnapshot);
  const setProgressSnapshot = usePokedexStore((s) => s.setProgressSnapshot);
  const { data: entries } = useLivingDexEntries();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  const stats = useMemo(() => {
    const livingDexEntries = (entries ?? []).filter((e) => e.formName === null);
    const livingDexKeys = new Set(
      livingDexEntries.map((e) => ownedKey(e.speciesId, e.formName)),
    );
    const records = Object.entries(ownedRecords)
      .filter(([key]) => livingDexKeys.has(key))
      .map(([, record]) => record);
    const total = livingDexEntries.length;

    const ownedCount = livingDexEntries.filter(
      (e) => ownedRecords[ownedKey(e.speciesId, e.formName)]?.owned,
    ).length;
    const shinyCount = livingDexEntries.filter(
      (e) => ownedRecords[ownedKey(e.speciesId, e.formName)]?.shiny_owned,
    ).length;

    const genData = GENERATIONS.map((gen) => {
      const genEntries = livingDexEntries.filter((e) => e.generation === gen);
      const genTotal = genEntries.length;
      const genOwned = genEntries.filter(
        (e) => ownedRecords[ownedKey(e.speciesId, e.formName)]?.owned,
      ).length;
      const genShiny = genEntries.filter(
        (e) => ownedRecords[ownedKey(e.speciesId, e.formName)]?.shiny_owned,
      ).length;
      return {
        gen,
        label: GEN_LABELS[gen],
        total: genTotal,
        owned: genOwned,
        shiny: genShiny,
      };
    });

    const methodCounts: Record<OwnershipMethod, number> = {
      caught: 0,
      bred: 0,
      hatched: 0,
      transferred: 0,
      event: 0,
    };
    for (const r of records) {
      if (r.owned && r.method) methodCounts[r.method]++;
    }
    const taggedOwned = Object.values(methodCounts).reduce((a, b) => a + b, 0);
    const untaggedOwned = ownedCount - taggedOwned;
    const maxMethodCount = Math.max(1, ownedCount);

    const shinyMethodCounts: Partial<Record<ShinyHuntMethod, number>> = {};
    for (const r of records) {
      if (r.shiny_owned && r.shiny_method) {
        shinyMethodCounts[r.shiny_method] =
          (shinyMethodCounts[r.shiny_method] ?? 0) + 1;
      }
    }
    const taggedShiny = Object.values(shinyMethodCounts).reduce(
      (a, b) => a + b,
      0,
    );
    const untaggedShiny = shinyCount - taggedShiny;

    return {
      total,
      ownedCount,
      shinyCount,
      genData,
      methodCounts,
      untaggedOwned,
      shinyMethodCounts,
      untaggedShiny,
      maxMethodCount,
    };
  }, [ownedRecords, entries]);

  const ownedPct = stats.total > 0 ? (stats.ownedCount / stats.total) * 100 : 0;
  const shinyPct = stats.total > 0 ? (stats.shinyCount / stats.total) * 100 : 0;

  async function handleImport(file: File | undefined) {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;
      if (!isProgressSnapshot(parsed)) {
        setImportMessage(
          "That file does not look like a Living Pokedex backup.",
        );
        return;
      }
      const importedOwnedCount = Object.values(parsed.owned).filter(
        (record) => record.owned,
      ).length;
      const confirmed = window.confirm(
        `Restore this backup and replace current local data?\n\nOwned records: ${importedOwnedCount}`,
      );
      if (!confirmed) return;
      setProgressSnapshot(parsed);
      setImportMessage(
        `Backup restored. ${importedOwnedCount} owned records loaded.`,
      );
    } catch {
      setImportMessage("Could not read that JSON backup.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 pt-6 pb-16 space-y-12">
      {/* Living Dex */}
      <section>
        <SectionHeader title="Living Dex" accent="border-green-400" />

        {/* Summary */}
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-5">
          <div className="rounded-xl bg-green-50 p-4 text-center dark:bg-green-950/50 sm:col-span-2 border border-green-100 dark:border-green-900">
            <p className="text-3xl font-bold tabular-nums text-green-600 dark:text-green-400">
              {ownedPct.toFixed(1)}%
            </p>
            <p className="text-xs text-green-500 mt-0.5">complete</p>
          </div>
          <div className="rounded-xl bg-green-50 dark:bg-green-950/50 border border-green-100 dark:border-green-900 p-4 text-center">
            <p className="text-2xl font-bold tabular-nums text-green-600 dark:text-green-400">
              {stats.ownedCount}
            </p>
            <p className="text-xs text-green-500 mt-0.5">owned</p>
          </div>
          <div className="rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4 text-center">
            <p className="text-2xl font-bold tabular-nums dark:text-white">
              {stats.total}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">total</p>
          </div>
          <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 p-4 text-center">
            <p className="text-2xl font-bold tabular-nums text-red-400">
              {stats.total - stats.ownedCount}
            </p>
            <p className="text-xs text-red-400 mt-0.5">missing</p>
          </div>
        </div>

        {/* Overall bar */}
        <div className="mb-1 flex justify-between text-xs text-gray-400">
          <span>Overall progress</span>
          <span className="tabular-nums font-medium">
            {ownedPct.toFixed(1)}%
          </span>
        </div>
        <div className="h-3 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden mb-6">
          <div
            className="h-full rounded-full bg-green-400 transition-all duration-500"
            style={{ width: `${ownedPct}%` }}
          />
        </div>

        {/* Per-gen */}
        <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 divide-y divide-gray-50 dark:divide-gray-700 mb-6">
          {stats.genData.map(({ gen, label, total, owned }) => {
            const pct = total > 0 ? (owned / total) * 100 : 0;
            return (
              <div
                key={gen}
                className="px-4 py-3 grid grid-cols-[52px_1fr_64px] items-center gap-4"
              >
                <span className="text-xs font-semibold text-gray-400">
                  Gen {label}
                </span>
                <HBar pct={pct} colorClass="bg-green-400" />
                <span className="text-xs tabular-nums text-right text-gray-500 dark:text-gray-400">
                  {owned}
                  <span className="text-gray-300 dark:text-gray-600">/</span>
                  {total}
                </span>
              </div>
            );
          })}
        </div>

        {/* Acquisition methods */}
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
          How you caught them
        </h3>
        {stats.ownedCount === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 p-6 text-center text-sm text-gray-400">
            Tag your first Pokémon with a catch method to see a breakdown here.
          </div>
        ) : (
          <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 divide-y divide-gray-50 dark:divide-gray-700">
            {OWNERSHIP_METHODS.filter(
              ({ value }) => stats.methodCounts[value] > 0,
            ).map(({ value, label }) => {
              const count = stats.methodCounts[value];
              const pct = (count / stats.maxMethodCount) * 100;
              return (
                <div
                  key={value}
                  className="px-4 py-3 grid grid-cols-[88px_1fr_32px] items-center gap-3"
                >
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    {label}
                  </span>
                  <HBar pct={pct} colorClass="bg-green-400" />
                  <span className="text-xs tabular-nums text-right text-gray-400">
                    {count}
                  </span>
                </div>
              );
            })}
            {stats.untaggedOwned > 0 && (
              <div className="px-4 py-3 grid grid-cols-[88px_1fr_32px] items-center gap-3">
                <span className="text-xs font-medium text-gray-400 italic">
                  Untagged
                </span>
                <HBar
                  pct={(stats.untaggedOwned / stats.maxMethodCount) * 100}
                  colorClass="bg-gray-200 dark:bg-gray-600"
                />
                <span className="text-xs tabular-nums text-right text-gray-400">
                  {stats.untaggedOwned}
                </span>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Shiny Living Dex */}
      <section>
        <div className="mb-5 flex items-center gap-2 border-b-2 border-yellow-400 pb-3">
          <SparkleIcon className="h-4 w-4 text-yellow-400" />
          <h2 className="text-base font-bold tracking-tight dark:text-white">
            Shiny Living Dex
          </h2>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="rounded-xl bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-100 dark:border-yellow-900/50 p-4 text-center">
            <p className="text-2xl font-bold tabular-nums text-yellow-500">
              {stats.shinyCount}
            </p>
            <p className="text-xs text-yellow-500 mt-0.5">shiny owned</p>
          </div>
          <div className="rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4 text-center">
            <p className="text-2xl font-bold tabular-nums dark:text-white">
              {stats.total}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">total</p>
          </div>
          <div className="rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4 text-center">
            <p className="text-2xl font-bold tabular-nums text-gray-500 dark:text-gray-300">
              {stats.total - stats.shinyCount}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">still needed</p>
          </div>
        </div>

        {/* Overall bar */}
        <div className="mb-1 flex justify-between text-xs text-gray-400">
          <span>Overall progress</span>
          <span className="tabular-nums font-medium">
            {shinyPct.toFixed(1)}%
          </span>
        </div>
        <div className="h-3 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden mb-6">
          <div
            className="h-full rounded-full bg-yellow-400 transition-all duration-500"
            style={{ width: `${shinyPct}%` }}
          />
        </div>

        {/* Per-gen shiny — only when there's something to show */}
        {stats.shinyCount > 0 && (
          <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 divide-y divide-gray-50 dark:divide-gray-700 mb-6">
            {stats.genData
              .filter(({ shiny }) => shiny > 0)
              .map(({ gen, label, total, shiny }) => {
                const pct = total > 0 ? (shiny / total) * 100 : 0;
                return (
                  <div
                    key={gen}
                    className="px-4 py-3 grid grid-cols-[52px_1fr_64px] items-center gap-4"
                  >
                    <span className="text-xs font-semibold text-gray-400">
                      Gen {label}
                    </span>
                    <HBar pct={pct} colorClass="bg-yellow-400" />
                    <span className="text-xs tabular-nums text-right text-yellow-500">
                      {shiny}
                      <span className="text-gray-300 dark:text-gray-600">
                        /
                      </span>
                      <span className="text-gray-400">{total}</span>
                    </span>
                  </div>
                );
              })}
          </div>
        )}

        {/* Hunt methods */}
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
          Hunt methods
        </h3>
        {stats.shinyCount === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 p-8 text-center text-sm text-gray-400 italic">
            No shinies logged yet - mark a Pokemon as shiny owned in the detail
            panel
          </div>
        ) : (
          <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 divide-y divide-gray-50 dark:divide-gray-700">
            {SHINY_METHODS.map(({ value, label, odds }) => {
              const count = stats.shinyMethodCounts[value] ?? 0;
              if (count === 0) return null;
              const pct = (count / stats.shinyCount) * 100;
              return (
                <div
                  key={value}
                  className="px-4 py-3 grid grid-cols-[96px_1fr_48px] items-center gap-3"
                >
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      {label}
                    </p>
                    <p className="text-[10px] text-gray-300 dark:text-gray-600">
                      {odds}
                    </p>
                  </div>
                  <HBar pct={pct} colorClass="bg-yellow-400" />
                  <span className="text-xs tabular-nums text-right text-yellow-500 font-medium">
                    * {count}
                  </span>
                </div>
              );
            })}
            {stats.untaggedShiny > 0 && (
              <div className="px-4 py-3 grid grid-cols-[96px_1fr_48px] items-center gap-3">
                <span className="text-xs font-medium text-gray-400 italic">
                  Untagged
                </span>
                <HBar
                  pct={(stats.untaggedShiny / stats.shinyCount) * 100}
                  colorClass="bg-gray-200 dark:bg-gray-600"
                />
                <span className="text-xs tabular-nums text-right text-yellow-500">
                  * {stats.untaggedShiny}
                </span>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Export / Backup */}
      <section>
        <SectionHeader
          title="Export / Backup"
          accent="border-gray-300 dark:border-gray-600"
        />
        <p className="text-xs text-gray-400 mb-4">
          Download your Pokedex data to back it up, or restore a previous JSON
          backup.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          onChange={(event) => void handleImport(event.target.files?.[0])}
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <button
            onClick={() => downloadJSON(getProgressSnapshot())}
            className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <span className="block text-base mb-0.5">JSON</span>
            <span className="text-xs font-normal text-gray-400">
              Full backup - reimportable
            </span>
          </button>
          <button
            onClick={() => downloadCSV(ownedRecords, entries ?? [])}
            className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <span className="block text-base mb-0.5">CSV</span>
            <span className="text-xs font-normal text-gray-400">
              Spreadsheet-friendly
            </span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <span className="block text-base mb-0.5">Import JSON</span>
            <span className="text-xs font-normal text-gray-400">
              Restore backup
            </span>
          </button>
        </div>
        {importMessage && (
          <p className="mt-3 text-xs text-gray-400">{importMessage}</p>
        )}
      </section>
    </div>
  );
}

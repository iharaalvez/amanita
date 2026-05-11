"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { usePokedexStore, ownedKey } from "@/store/pokedexStore";
import { useLivingDexEntries } from "@/hooks/usePokemon";
import {
  getOwnedEntryCount,
  getShinyEntryCount,
  isLivingDexSpecies,
} from "@/lib/livingDex";
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
    entries.map((entry) => [
      ownedKey(entry.speciesId, entry.formName),
      entry.displayName,
    ]),
  );
  const header =
    "speciesId,formName,name,owned,shiny_owned,method,shiny_method,shiny_game";
  const rows = Object.entries(owned).map(([key, record]) => {
    const name = (nameMap.get(key) ?? "").replace(/"/g, '""');
    return [
      record.pokedex_number,
      record.form_name ?? "base",
      `"${name}"`,
      record.owned ? "TRUE" : "FALSE",
      record.shiny_owned ? "TRUE" : "FALSE",
      record.method ?? "",
      record.shiny_method ?? "",
      record.shiny_game ?? "",
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
    <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
      <div
        className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
        style={{ width: `${Math.max(pct, pct > 0 ? 2 : 0)}%` }}
      />
    </div>
  );
}

type MetricTone = "green" | "yellow" | "red" | "slate";

const METRIC_TONES: Record<MetricTone, string> = {
  green:
    "border-green-400/30 bg-green-400/10 text-green-600 dark:text-green-300",
  yellow:
    "border-yellow-400/30 bg-yellow-400/10 text-yellow-600 dark:text-yellow-300",
  red: "border-red-400/30 bg-red-400/10 text-red-500 dark:text-red-300",
  slate:
    "border-slate-300 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-800/80 dark:text-white",
};

function MetricCard({
  label,
  value,
  tone,
  detail,
}: {
  label: string;
  value: string | number;
  tone: MetricTone;
  detail?: string;
}) {
  return (
    <div className={`rounded-lg border p-4 ${METRIC_TONES[tone]}`}>
      <p className="text-2xl font-black tabular-nums">{value}</p>
      <p className="mt-0.5 text-xs font-bold uppercase tracking-wide opacity-80">
        {label}
      </p>
      {detail && <p className="mt-2 text-xs opacity-70">{detail}</p>}
    </div>
  );
}

export function StatsView() {
  const ownedRecords = usePokedexStore((state) => state.owned);
  const getProgressSnapshot = usePokedexStore(
    (state) => state.getProgressSnapshot,
  );
  const setProgressSnapshot = usePokedexStore(
    (state) => state.setProgressSnapshot,
  );
  const { data: entries } = useLivingDexEntries();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  const stats = useMemo(() => {
    const livingDexEntries = (entries ?? []).filter(isLivingDexSpecies);
    const livingDexKeys = new Set(
      livingDexEntries.map((entry) =>
        ownedKey(entry.speciesId, entry.formName),
      ),
    );
    const records = Object.entries(ownedRecords)
      .filter(([key]) => livingDexKeys.has(key))
      .map(([, record]) => record);
    const total = livingDexEntries.length;

    const ownedCount = getOwnedEntryCount(livingDexEntries, ownedRecords);
    const shinyCount = getShinyEntryCount(livingDexEntries, ownedRecords);

    const genData = GENERATIONS.map((gen) => {
      const genEntries = livingDexEntries.filter(
        (entry) => entry.generation === gen,
      );
      const genTotal = genEntries.length;
      const genOwned = getOwnedEntryCount(genEntries, ownedRecords);
      const genShiny = getShinyEntryCount(genEntries, ownedRecords);
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
    for (const record of records) {
      if (record.owned && record.method) methodCounts[record.method]++;
    }
    const taggedOwned = Object.values(methodCounts).reduce(
      (sum, count) => sum + count,
      0,
    );
    const untaggedOwned = ownedCount - taggedOwned;
    const maxMethodCount = Math.max(1, ownedCount);

    const shinyMethodCounts: Partial<Record<ShinyHuntMethod, number>> = {};
    for (const record of records) {
      if (record.shiny_owned && record.shiny_method) {
        shinyMethodCounts[record.shiny_method] =
          (shinyMethodCounts[record.shiny_method] ?? 0) + 1;
      }
    }
    const taggedShiny = Object.values(shinyMethodCounts).reduce(
      (sum, count) => sum + count,
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
    <div className="bg-slate-50 px-3 py-5 text-slate-900 dark:bg-[#0f172a] dark:text-white sm:px-5 sm:py-7">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="flex flex-col gap-1">
          <p className="text-[11px] font-black uppercase tracking-widest text-green-500">
            Trainer dashboard
          </p>
          <h1 className="text-2xl font-black tracking-tight">Stats</h1>
          <p className="max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            Species completion, shiny progress, capture methods, and backup
            tools in one place.
          </p>
        </header>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard
            label="complete"
            value={`${ownedPct.toFixed(1)}%`}
            tone="green"
            detail={`${stats.ownedCount}/${stats.total} species`}
          />
          <MetricCard label="owned" value={stats.ownedCount} tone="green" />
          <MetricCard
            label="species total"
            value={stats.total}
            tone="slate"
          />
          <MetricCard
            label="missing"
            value={stats.total - stats.ownedCount}
            tone="red"
          />
        </section>

        <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/70">
            <div className="mb-4 flex items-start justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-700">
              <div>
                <h2 className="text-base font-black">Living Dex</h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Base species only, matching the official Living Dex goal.
                </p>
              </div>
              <span className="rounded-full bg-green-400/10 px-2.5 py-1 text-xs font-bold tabular-nums text-green-600 dark:text-green-300">
                {ownedPct.toFixed(1)}%
              </span>
            </div>

            <div className="mb-5">
              <div className="mb-1 flex justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Overall progress</span>
                <span className="tabular-nums">{ownedPct.toFixed(1)}%</span>
              </div>
              <HBar pct={ownedPct} colorClass="bg-green-400" />
            </div>

            <div className="mb-6 divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 dark:divide-slate-700 dark:border-slate-700">
              {stats.genData.map(({ gen, label, total, owned }) => {
                const pct = total > 0 ? (owned / total) * 100 : 0;
                return (
                  <div
                    key={gen}
                    className="grid grid-cols-[52px_1fr_64px] items-center gap-3 px-3 py-2.5"
                  >
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      Gen {label}
                    </span>
                    <HBar pct={pct} colorClass="bg-green-400" />
                    <span className="text-right text-xs tabular-nums text-slate-500 dark:text-slate-400">
                      {owned}
                      <span className="text-slate-300 dark:text-slate-600">
                        /
                      </span>
                      {total}
                    </span>
                  </div>
                );
              })}
            </div>

            <h3 className="mb-3 text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
              How you caught them
            </h3>
            {stats.ownedCount === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 p-5 text-center dark:border-slate-700">
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                  No catch methods yet.
                </p>
                <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
                  Open a Pokemon detail page, mark it owned, and choose how you
                  caught or bred it.
                </p>
                <Link
                  href="/pokedex"
                  className="mt-4 inline-flex rounded-lg bg-green-500 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-green-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400"
                >
                  Go to Pokedex
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 dark:divide-slate-700 dark:border-slate-700">
                {OWNERSHIP_METHODS.filter(
                  ({ value }) => stats.methodCounts[value] > 0,
                ).map(({ value, label }) => {
                  const count = stats.methodCounts[value];
                  const pct = (count / stats.maxMethodCount) * 100;
                  return (
                    <div
                      key={value}
                      className="grid grid-cols-[88px_1fr_36px] items-center gap-3 px-3 py-2.5"
                    >
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {label}
                      </span>
                      <HBar pct={pct} colorClass="bg-green-400" />
                      <span className="text-right text-xs tabular-nums text-slate-500 dark:text-slate-400">
                        {count}
                      </span>
                    </div>
                  );
                })}
                {stats.untaggedOwned > 0 && (
                  <div className="grid grid-cols-[88px_1fr_36px] items-center gap-3 px-3 py-2.5">
                    <span className="text-xs font-medium italic text-slate-400">
                      Untagged
                    </span>
                    <HBar
                      pct={(stats.untaggedOwned / stats.maxMethodCount) * 100}
                      colorClass="bg-slate-400"
                    />
                    <span className="text-right text-xs tabular-nums text-slate-500 dark:text-slate-400">
                      {stats.untaggedOwned}
                    </span>
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/70">
            <div className="mb-4 flex items-start justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-700">
              <div>
                <div className="flex items-center gap-2">
                  <SparkleIcon className="h-4 w-4 text-yellow-400" />
                  <h2 className="text-base font-black">Shiny Living Dex</h2>
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Parallel shiny species progress.
                </p>
              </div>
              <span className="rounded-full bg-yellow-400/10 px-2.5 py-1 text-xs font-bold tabular-nums text-yellow-600 dark:text-yellow-300">
                {shinyPct.toFixed(1)}%
              </span>
            </div>

            <div className="mb-5 grid grid-cols-3 gap-2">
              <div>
                <p className="text-xl font-black tabular-nums text-yellow-500">
                  {stats.shinyCount}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  owned
                </p>
              </div>
              <div>
                <p className="text-xl font-black tabular-nums">{stats.total}</p>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  total
                </p>
              </div>
              <div>
                <p className="text-xl font-black tabular-nums text-slate-500 dark:text-slate-300">
                  {stats.total - stats.shinyCount}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  needed
                </p>
              </div>
            </div>

            <div className="mb-6">
              <div className="mb-1 flex justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Overall progress</span>
                <span className="tabular-nums">{shinyPct.toFixed(1)}%</span>
              </div>
              <HBar pct={shinyPct} colorClass="bg-yellow-400" />
            </div>

            {stats.shinyCount > 0 && (
              <div className="mb-6 divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 dark:divide-slate-700 dark:border-slate-700">
                {stats.genData
                  .filter(({ shiny }) => shiny > 0)
                  .map(({ gen, label, total, shiny }) => {
                    const pct = total > 0 ? (shiny / total) * 100 : 0;
                    return (
                      <div
                        key={gen}
                        className="grid grid-cols-[52px_1fr_64px] items-center gap-3 px-3 py-2.5"
                      >
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                          Gen {label}
                        </span>
                        <HBar pct={pct} colorClass="bg-yellow-400" />
                        <span className="text-right text-xs tabular-nums text-yellow-500">
                          {shiny}
                          <span className="text-slate-300 dark:text-slate-600">
                            /
                          </span>
                          <span className="text-slate-500 dark:text-slate-400">
                            {total}
                          </span>
                        </span>
                      </div>
                    );
                  })}
              </div>
            )}

            <h3 className="mb-3 text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Hunt methods
            </h3>
            {stats.shinyCount === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 p-5 text-center dark:border-slate-700">
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                  No shiny hunts logged yet.
                </p>
                <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
                  Open a Pokemon detail page and mark a shiny as owned to start
                  tracking hunt methods.
                </p>
                <Link
                  href="/home"
                  className="mt-4 inline-flex rounded-lg bg-yellow-400 px-4 py-2 text-sm font-bold text-slate-950 transition-colors hover:bg-yellow-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400"
                >
                  Open HOME
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 dark:divide-slate-700 dark:border-slate-700">
                {SHINY_METHODS.map(({ value, label, odds }) => {
                  const count = stats.shinyMethodCounts[value] ?? 0;
                  if (count === 0) return null;
                  const pct = (count / stats.shinyCount) * 100;
                  return (
                    <div
                      key={value}
                      className="grid grid-cols-[86px_1fr_36px] items-center gap-3 px-3 py-2.5"
                    >
                      <div>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          {label}
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">
                          {odds}
                        </p>
                      </div>
                      <HBar pct={pct} colorClass="bg-yellow-400" />
                      <span className="text-right text-xs font-medium tabular-nums text-yellow-500">
                        {count}
                      </span>
                    </div>
                  );
                })}
                {stats.untaggedShiny > 0 && (
                  <div className="grid grid-cols-[86px_1fr_36px] items-center gap-3 px-3 py-2.5">
                    <span className="text-xs font-medium italic text-slate-400">
                      Untagged
                    </span>
                    <HBar
                      pct={(stats.untaggedShiny / stats.shinyCount) * 100}
                      colorClass="bg-slate-400"
                    />
                    <span className="text-right text-xs tabular-nums text-yellow-500">
                      {stats.untaggedShiny}
                    </span>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/70">
          <div className="mb-4">
            <h2 className="text-base font-black">Export / Backup</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Download your Pokedex data or restore a previous JSON backup.
            </p>
          </div>
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
              className="rounded-lg border border-slate-200 px-4 py-3 text-left text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700/70"
            >
              <span className="block">JSON</span>
              <span className="text-xs font-normal text-slate-400">
                Full backup, reimportable
              </span>
            </button>
            <button
              onClick={() => downloadCSV(ownedRecords, entries ?? [])}
              className="rounded-lg border border-slate-200 px-4 py-3 text-left text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700/70"
            >
              <span className="block">CSV</span>
              <span className="text-xs font-normal text-slate-400">
                Spreadsheet-friendly
              </span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg border border-slate-200 px-4 py-3 text-left text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700/70"
            >
              <span className="block">Import JSON</span>
              <span className="text-xs font-normal text-slate-400">
                Restore backup
              </span>
            </button>
          </div>
          {importMessage && (
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              {importMessage}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

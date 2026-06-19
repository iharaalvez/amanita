"use client";

import { useMemo, useRef, useState } from "react";
import { usePokedexStore, ownedKey } from "@/store/pokedexStore";
import { useLivingDexEntries } from "@/hooks/usePokemon";
import {
  getOwnedEntryCount,
  getShinyEntryCount,
  isLivingDexSpecies,
  isShinyTargetEntry,
} from "@/lib/livingDex";
import { isProgressSnapshot } from "@/lib/progressSnapshot";
import { syncAllRecords } from "@/lib/sync";
import { SparkleIcon } from "@/components/ui";
import type {
  GameDexFlags,
  LivingDexEntry,
  ProgressSnapshot,
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
  progressFlags: Record<string, GameDexFlags>,
  entries: LivingDexEntry[],
) {
  const nameMap = new Map(
    entries.map((entry) => [
      ownedKey(entry.speciesId, entry.formName),
      entry.displayName,
    ]),
  );
  const header = "speciesId,formName,name,owned,shiny";
  const rows = Object.entries(progressFlags).flatMap(([key, flags]) => {
    const parsed = parseProgressKey(key);
    if (!parsed) return [];
    const name = (nameMap.get(key) ?? "").replace(/"/g, '""');
    return [
      [
        parsed.speciesId,
        parsed.formName ?? "base",
        `"${name}"`,
        flags.owned ? "TRUE" : "FALSE",
        flags.shiny ? "TRUE" : "FALSE",
      ].join(","),
    ];
  });
  const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `living-pokedex-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function parseProgressKey(
  key: string,
): { speciesId: number; formName: string | null } | null {
  const separatorIndex = key.indexOf("-");
  if (separatorIndex < 1) return null;
  const speciesId = Number(key.slice(0, separatorIndex));
  if (!Number.isInteger(speciesId)) return null;
  const formKey = key.slice(separatorIndex + 1);
  return { speciesId, formName: formKey === "base" ? null : formKey };
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
  const activeHomeBoxLayoutId = usePokedexStore(
    (state) => state.activeHomeBoxLayoutId,
  );
  const gameDex = usePokedexStore((state) => state.gameDex);
  const homeLayoutFlags = useMemo(
    () => gameDex[activeHomeBoxLayoutId] ?? {},
    [activeHomeBoxLayoutId, gameDex],
  );
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
    const shinyTargetEntries = livingDexEntries.filter(isShinyTargetEntry);
    const total = livingDexEntries.length;
    const shinyTotal = shinyTargetEntries.length;

    const ownedCount = getOwnedEntryCount(livingDexEntries, homeLayoutFlags);
    const shinyCount = getShinyEntryCount(shinyTargetEntries, homeLayoutFlags);

    const genData = GENERATIONS.map((gen) => {
      const genEntries = livingDexEntries.filter(
        (entry) => entry.generation === gen,
      );
      const genShinyTargetEntries = genEntries.filter(isShinyTargetEntry);
      const genTotal = genEntries.length;
      const genOwned = getOwnedEntryCount(genEntries, homeLayoutFlags);
      const genShinyTotal = genShinyTargetEntries.length;
      const genShiny = getShinyEntryCount(genShinyTargetEntries, homeLayoutFlags);
      return {
        gen,
        label: GEN_LABELS[gen],
        total: genTotal,
        shinyTotal: genShinyTotal,
        owned: genOwned,
        shiny: genShiny,
      };
    });

    return {
      total,
      shinyTotal,
      ownedCount,
      shinyCount,
      genData,
    };
  }, [homeLayoutFlags, entries]);

  const ownedPct = stats.total > 0 ? (stats.ownedCount / stats.total) * 100 : 0;
  const shinyPct =
    stats.shinyTotal > 0 ? (stats.shinyCount / stats.shinyTotal) * 100 : 0;

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
      const importedActiveLayoutId = parsed.activeHomeBoxLayoutId ?? "";
      const importedOwnedCount = Object.values(
        parsed.gameDex[importedActiveLayoutId] ?? {},
      ).filter((record) => record.owned).length;
      const confirmed = window.confirm(
        `Restore this backup and replace current local data?\n\nOwned records: ${importedOwnedCount}`,
      );
      if (!confirmed) return;
      setProgressSnapshot(parsed);
      await syncAllRecords(parsed);
      setImportMessage(
        `Backup restored. ${importedOwnedCount} active layout marks loaded.`,
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
          <MetricCard label="species total" value={stats.total} tone="slate" />
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
                <p className="text-xl font-black tabular-nums">
                  {stats.shinyTotal}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  total
                </p>
              </div>
              <div>
                <p className="text-xl font-black tabular-nums text-slate-500 dark:text-slate-300">
                  {stats.shinyTotal - stats.shinyCount}
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
                  .map(({ gen, label, shinyTotal, shiny }) => {
                    const pct = shinyTotal > 0 ? (shiny / shinyTotal) * 100 : 0;
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
                            {shinyTotal}
                          </span>
                        </span>
                      </div>
                    );
                  })}
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
              onClick={() => downloadCSV(homeLayoutFlags, entries ?? [])}
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

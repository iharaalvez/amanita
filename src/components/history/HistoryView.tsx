"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Check, Clock3, History, Search, Sparkles, Trash2 } from "lucide-react";
import { getGameById } from "@/config/games";
import { useLivingDexEntries } from "@/hooks/usePokemon";
import { useOpenPokemon } from "@/hooks/useOpenPokemon";
import { ownedKey, usePokedexStore } from "@/store/pokedexStore";
import type { CatchEvent } from "@/store/pokedexStore";
import type {
  LivingDexEntry,
  ShinyHunt,
  ShinyHuntMethod,
} from "@/types/pokemon";

type HistoryTab = "all" | "hunts" | "catches";

type CatchHistoryRow = {
  id: number;
  name: string;
  spriteUrl: string;
  dateLabel: string;
  gameName: string;
  isShiny: boolean;
  isAlpha: boolean;
  event: CatchEvent;
};

const METHOD_LABELS: Partial<Record<ShinyHuntMethod, string>> = {
  masuda: "Masuda Method",
  "sos-chain": "SOS Chain",
  "poke-radar": "Poke Radar",
  "dex-nav": "DexNav",
  "soft-reset": "Soft Reset",
  outbreak: "Mass Outbreak",
  random: "Random",
};

export function HistoryView() {
  const [tab, setTab] = useState<HistoryTab>("all");
  const [query, setQuery] = useState("");
  const { data: entries } = useLivingDexEntries();
  const openPokemon = useOpenPokemon();

  const shinyHunts = usePokedexStore((s) => s.shinyHunts);
  const catchLog = usePokedexStore((s) => s.recentCatches);
  const removeShinyHunt = usePokedexStore((s) => s.removeShinyHunt);
  const removeRecentCatch = usePokedexStore((s) => s.removeRecentCatch);

  const entryByKey = useMemo(() => {
    const map = new Map<string, LivingDexEntry>();
    for (const entry of entries ?? []) {
      map.set(ownedKey(entry.speciesId, entry.formName), entry);
    }
    return map;
  }, [entries]);

  const normalizedQuery = query.trim().toLowerCase();

  const completedHunts = useMemo(
    () =>
      shinyHunts
        .filter((hunt) => hunt.completedAt)
        .toSorted((a, b) =>
          (b.completedAt ?? b.startedAt).localeCompare(
            a.completedAt ?? a.startedAt,
          ),
        ),
    [shinyHunts],
  );
  const activeHunts = useMemo(
    () =>
      shinyHunts
        .filter((hunt) => !hunt.completedAt)
        .toSorted((a, b) => b.startedAt.localeCompare(a.startedAt)),
    [shinyHunts],
  );

  const filteredActiveHunts = activeHunts.filter((hunt) =>
    matchesHunt(hunt, entryByKey, normalizedQuery),
  );
  const filteredCompletedHunts = completedHunts.filter((hunt) =>
    matchesHunt(hunt, entryByKey, normalizedQuery),
  );
  const catches = getCatchHistory(entries ?? [], catchLog).filter((catchRow) =>
    matchesCatch(catchRow, normalizedQuery),
  );

  const showHunts = tab === "all" || tab === "hunts";
  const showCatches = tab === "all" || tab === "catches";

  return (
    <div className="min-h-full bg-[#11111b] px-4 py-5 text-[#f8f0df] sm:px-6 lg:px-7">
      <div className="mx-auto max-w-7xl">
        <header className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[#b9ec86]">
              <History className="h-5 w-5" />
              <span className="text-[10px] font-black uppercase tracking-widest">
                Trainer Log
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight">History</h1>
            <p className="mt-1 text-sm font-medium text-[#8f8799]">
              Shiny hunt records and recent catches in one place.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-[auto_minmax(220px,320px)] sm:items-center">
            <div className="grid grid-cols-3 rounded-full bg-[#1a1a27] p-1 ring-1 ring-[#2f2b40]">
              {(["all", "hunts", "catches"] as HistoryTab[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTab(value)}
                  className={`rounded-full px-3 py-1.5 text-xs font-black capitalize transition-colors ${
                    tab === value
                      ? "bg-[#4e367f] text-[#f8f0df]"
                      : "text-[#8f8799] hover:text-[#f8f0df]"
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>

            <div className="flex h-9 items-center gap-2 rounded-md border border-[#2f2b40] bg-[#151520] px-3 text-[#837b91]">
              <Search className="h-3.5 w-3.5 shrink-0" />
              <label htmlFor="history-search" className="sr-only">
                Search history
              </label>
              <input
                id="history-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search Pokemon, games, methods..."
                className="min-w-0 flex-1 bg-transparent text-[11px] font-medium text-[#f8f0df] outline-none placeholder:text-[#837b91]"
              />
            </div>
          </div>
        </header>

        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <SummaryCard label="Active Hunts" value={activeHunts.length} />
          <SummaryCard label="Completed Hunts" value={completedHunts.length} />
          <SummaryCard label="Recent Catches" value={catchLog.length} />
        </div>

        <div className="grid items-start gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          {showHunts && (
            <section className="overflow-hidden rounded-lg border border-[#2f2b40] bg-[#1a1a27]/80">
              <div className="border-b border-[#2f2b40]/70 px-4 py-3">
                <h2 className="text-sm font-black">Shiny Hunts</h2>
                <p className="mt-0.5 text-[10px] font-semibold text-[#8f8799]">
                  Active hunts and completed hunt history.
                </p>
              </div>
              <div className="space-y-4 p-4">
                <HuntGroup
                  title="Active"
                  hunts={filteredActiveHunts}
                  entryByKey={entryByKey}
                  onOpenPokemon={openPokemon}
                  onRemove={removeShinyHunt}
                />
                <HuntGroup
                  title="Completed"
                  hunts={filteredCompletedHunts}
                  entryByKey={entryByKey}
                  onOpenPokemon={openPokemon}
                  onRemove={removeShinyHunt}
                />
              </div>
            </section>
          )}

          {showCatches && (
            <section className="overflow-hidden rounded-lg border border-[#2f2b40] bg-[#1a1a27]/80">
              <div className="border-b border-[#2f2b40]/70 px-4 py-3">
                <h2 className="text-sm font-black">Recent Catches</h2>
                <p className="mt-0.5 text-[10px] font-semibold text-[#8f8799]">
                  Full local catch log from game dex and HOME tracking actions.
                </p>
              </div>
              <div className="divide-y divide-[#2f2b40]/70">
                {catches.length > 0 ? (
                  catches.map((catchRow) => (
                    <CatchRow
                      key={`${catchRow.id}-${catchRow.name}-${catchRow.event.gameId}-${catchRow.event.date}-${catchRow.isShiny}-${catchRow.isAlpha}`}
                      catchRow={catchRow}
                      onOpenPokemon={openPokemon}
                      onRemove={removeRecentCatch}
                    />
                  ))
                ) : (
                  <EmptyState label="No catches match this view." />
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-[#2f2b40] bg-[#1a1a27]/80 px-4 py-3">
      <p className="text-2xl font-black tabular-nums text-[#f8f0df]">{value}</p>
      <p className="mt-0.5 text-[10px] font-black uppercase tracking-widest text-[#8f8799]">
        {label}
      </p>
    </div>
  );
}

function HuntGroup({
  title,
  hunts,
  entryByKey,
  onOpenPokemon,
  onRemove,
}: {
  title: string;
  hunts: ShinyHunt[];
  entryByKey: Map<string, LivingDexEntry>;
  onOpenPokemon: (speciesId: number, formName: string | null) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div>
      <h3 className="mb-2 text-[10px] font-black uppercase tracking-widest text-[#8f8799]">
        {title}
      </h3>
      <div className="space-y-2">
        {hunts.length > 0 ? (
          hunts.map((hunt) => (
            <HuntRow
              key={hunt.id}
              hunt={hunt}
              entry={entryByKey.get(ownedKey(hunt.speciesId, hunt.formName))}
              onOpenPokemon={onOpenPokemon}
              onRemove={onRemove}
            />
          ))
        ) : (
          <EmptyState label={`No ${title.toLowerCase()} hunts.`} compact />
        )}
      </div>
    </div>
  );
}

function HuntRow({
  hunt,
  entry,
  onOpenPokemon,
  onRemove,
}: {
  hunt: ShinyHunt;
  entry?: LivingDexEntry;
  onOpenPokemon: (speciesId: number, formName: string | null) => void;
  onRemove: (id: string) => void;
}) {
  const spriteUrl = entry?.shinySpriteUrl ?? entry?.spriteUrl;
  const methodLabel = METHOD_LABELS[hunt.method] ?? titleCaseLabel(hunt.method);
  const gameName = getGameById(hunt.gameId)?.name ?? hunt.gameId;

  return (
    <div className="grid grid-cols-[44px_1fr_auto] items-center gap-3 rounded-lg bg-[#151520] px-3 py-2.5">
      <button
        type="button"
        onClick={() => onOpenPokemon(hunt.speciesId, hunt.formName)}
        className="relative grid h-11 w-11 place-items-center rounded-lg bg-[#0f101a] ring-1 ring-[#2f2b40] transition-transform hover:scale-[1.03]"
      >
        {spriteUrl && (
          <Image
            src={spriteUrl}
            alt=""
            width={44}
            height={44}
            unoptimized
            className="h-10 w-10 object-contain [image-rendering:pixelated]"
          />
        )}
        <Sparkles className="absolute right-1 top-1 h-3 w-3 text-[#f8d85a]" />
      </button>
      <div className="min-w-0">
        <button
          type="button"
          onClick={() => onOpenPokemon(hunt.speciesId, hunt.formName)}
          className="block max-w-full truncate text-left text-sm font-black text-[#f8f0df] hover:text-[#b9ec86]"
        >
          {entry?.displayName ?? `#${String(hunt.speciesId).padStart(4, "0")}`}
        </button>
        <p className="mt-0.5 truncate text-[11px] font-semibold text-[#8f8799]">
          {gameName} / {methodLabel}
        </p>
        <p className="mt-0.5 flex items-center gap-1 truncate text-[10px] text-[#8f8799]">
          <Clock3 className="h-3 w-3 shrink-0" />
          {hunt.completedAt
            ? `Completed ${formatDateLabel(hunt.completedAt)}`
            : `Started ${formatDateLabel(hunt.startedAt)}`}
          {" / "}
          {formatDuration(hunt.startedAt, hunt.completedAt)}
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 font-mono text-[10px] font-black ${
            hunt.completedAt
              ? "bg-[#b9ec86]/10 text-[#b9ec86]"
              : "bg-[#f8d85a]/10 text-[#f8d85a]"
          }`}
        >
          {hunt.completedAt && <Check className="h-3 w-3" />}
          {hunt.count.toLocaleString()}
        </span>
        <button
          type="button"
          onClick={() => onRemove(hunt.id)}
          aria-label="Delete hunt"
          title="Delete hunt"
          className="grid h-8 w-8 place-items-center rounded-lg text-[#8f8799] transition-colors hover:bg-white/5 hover:text-[#f8f0df]"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function CatchRow({
  catchRow,
  onOpenPokemon,
  onRemove,
}: {
  catchRow: CatchHistoryRow;
  onOpenPokemon: (speciesId: number, formName: string | null) => void;
  onRemove: (event: CatchEvent) => void;
}) {
  return (
    <div className="grid grid-cols-[48px_1fr_auto] items-center gap-3 px-4 py-3">
      <button
        type="button"
        onClick={() =>
          onOpenPokemon(catchRow.event.speciesId, catchRow.event.formName)
        }
        className="grid h-12 w-12 place-items-center rounded-lg bg-[#151520] transition-transform hover:scale-[1.03]"
      >
        <Image
          src={catchRow.spriteUrl}
          alt=""
          width={48}
          height={48}
          unoptimized
          className="h-11 w-11 object-contain [image-rendering:pixelated]"
        />
      </button>
      <div className="min-w-0">
        <button
          type="button"
          onClick={() =>
            onOpenPokemon(catchRow.event.speciesId, catchRow.event.formName)
          }
          className="block max-w-full truncate text-left text-sm font-black text-[#f8f0df] hover:text-[#b9ec86]"
        >
          {catchRow.name}
        </button>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold text-[#8f8799]">
          <span>{catchRow.gameName}</span>
          {catchRow.isShiny && <span className="text-[#f8d85a]">shiny</span>}
          {catchRow.isAlpha && <span className="text-[#c084fc]">alpha</span>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="whitespace-nowrap text-xs font-bold text-[#d4cedb]">
          {catchRow.dateLabel}
        </span>
        <button
          type="button"
          onClick={() => onRemove(catchRow.event)}
          aria-label={`Delete ${catchRow.name} from catch history`}
          title="Delete catch"
          className="grid h-8 w-8 place-items-center rounded-lg text-[#8f8799] transition-colors hover:bg-white/5 hover:text-[#f8f0df]"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function EmptyState({
  label,
  compact = false,
}: {
  label: string;
  compact?: boolean;
}) {
  return (
    <p
      className={`rounded-lg border border-dashed border-[#2f2b40] bg-[#151520]/60 text-center text-xs font-semibold text-[#8f8799] ${
        compact ? "px-3 py-4" : "m-4 px-3 py-8"
      }`}
    >
      {label}
    </p>
  );
}

function matchesHunt(
  hunt: ShinyHunt,
  entryByKey: Map<string, LivingDexEntry>,
  query: string,
): boolean {
  if (!query) return true;
  const entry = entryByKey.get(ownedKey(hunt.speciesId, hunt.formName));
  const gameName = getGameById(hunt.gameId)?.name ?? hunt.gameId;
  const methodLabel = METHOD_LABELS[hunt.method] ?? titleCaseLabel(hunt.method);
  const haystack = [
    entry?.displayName,
    String(hunt.speciesId),
    gameName,
    methodLabel,
    hunt.counterMode,
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

function matchesCatch(catchRow: CatchHistoryRow, query: string): boolean {
  if (!query) return true;
  return [
    catchRow.name,
    String(catchRow.id),
    catchRow.gameName,
    catchRow.isShiny ? "shiny" : "",
    catchRow.isAlpha ? "alpha" : "",
  ]
    .join(" ")
    .toLowerCase()
    .includes(query);
}

function getCatchHistory(
  entries: LivingDexEntry[],
  catchLog: CatchEvent[],
): CatchHistoryRow[] {
  const entryMap = new Map<string, LivingDexEntry>();
  for (const entry of entries) {
    entryMap.set(ownedKey(entry.speciesId, entry.formName), entry);
  }

  return catchLog.flatMap((event) => {
    const entry = entryMap.get(ownedKey(event.speciesId, event.formName));
    if (!entry) return [];
    return [
      {
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
      },
    ];
  });
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
  if (Number.isNaN(date.getTime())) return "Tracked";
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (d.getTime() === today.getTime()) return "Today";
  if (d.getTime() === yesterday.getTime()) return "Yesterday";
  return `${String(date.getDate()).padStart(2, "0")}/${String(
    date.getMonth() + 1,
  ).padStart(2, "0")}/${date.getFullYear()}`;
}

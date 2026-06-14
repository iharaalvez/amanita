"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  History,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { getGameById } from "@/config/games";
import { useLivingDexEntries } from "@/hooks/usePokemon";
import { useOpenPokemon } from "@/hooks/useOpenPokemon";
import { ownedKey, usePokedexStore } from "@/store/pokedexStore";
import type { CatchEvent } from "@/store/pokedexStore";
import type { LivingDexEntry, ShinyHunt, ShinyHuntMethod } from "@/types/pokemon";

// ─── Constants ────────────────────────────────────────────────────────────────

type HistoryTab = "all" | "catches" | "hunts";

const ENTRIES_PER_PAGE = 30;

const METHOD_LABELS: Partial<Record<ShinyHuntMethod, string>> = {
  masuda: "Masuda Method",
  "sos-chain": "SOS Chain",
  "poke-radar": "Poké Radar",
  "dex-nav": "DexNav",
  "soft-reset": "Soft Reset",
  outbreak: "Mass Outbreak",
  "massive-mass-outbreak": "Mass Outbreak+",
  sandwich: "Sandwich",
  random: "Random",
  overworld: "Overworld",
  breeding: "Breeding",
  "chain-fishing": "Chain Fishing",
  "friend-safari": "Friend Safari",
  horde: "Horde",
  "ultra-wormhole": "Ultra Wormhole",
  "lets-go-catch-combo": "Catch Combo",
  "isolated-encounter": "Isolated",
  "dynamax-adventures": "Dynamax Adventures",
  "max-raid": "Max Raid",
  "tera-raid": "Tera Raid",
  "alpha-reset": "Alpha Reset",
  "wild-zone-reset": "Wild Zone Reset",
  "charm-boosted": "Charm Boosted",
};

// ─── Types ────────────────────────────────────────────────────────────────────

type CatchRow = {
  speciesId: number;
  formName: string | null;
  name: string;
  spriteUrl: string;
  gameName: string;
  isShiny: boolean;
  isAlpha: boolean;
  event: CatchEvent;
};

type LogEntry =
  | { kind: "catch"; date: string; row: CatchRow }
  | { kind: "hunt"; date: string; hunt: ShinyHunt; entry?: LivingDexEntry };

type DayGroup = { key: string; label: string; entries: LogEntry[] };

// ─── Main view ────────────────────────────────────────────────────────────────

export function HistoryView() {
  const [tab, setTab] = useState<HistoryTab>("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  const { data: entries } = useLivingDexEntries();
  const openPokemon = useOpenPokemon();

  const shinyHunts = usePokedexStore((s) => s.shinyHunts);
  const catchLog = usePokedexStore((s) => s.recentCatches);
  const removeShinyHunt = usePokedexStore((s) => s.removeShinyHunt);
  const removeRecentCatch = usePokedexStore((s) => s.removeRecentCatch);

  const entryByKey = useMemo(() => {
    const map = new Map<string, LivingDexEntry>();
    for (const e of entries ?? []) map.set(ownedKey(e.speciesId, e.formName), e);
    return map;
  }, [entries]);

  const activeHunts = useMemo(
    () =>
      shinyHunts
        .filter((h) => !h.completedAt)
        .toSorted((a, b) => b.startedAt.localeCompare(a.startedAt)),
    [shinyHunts],
  );

  const completedHunts = useMemo(
    () =>
      shinyHunts
        .filter((h) => !!h.completedAt)
        .toSorted((a, b) =>
          (b.completedAt ?? b.startedAt).localeCompare(
            a.completedAt ?? a.startedAt,
          ),
        ),
    [shinyHunts],
  );

  const catchRows = useMemo(
    () => buildCatchRows(entries ?? [], catchLog),
    [entries, catchLog],
  );

  const q = query.trim().toLowerCase();

  const logEntries = useMemo<LogEntry[]>(() => {
    const items: LogEntry[] = [];

    if (tab !== "hunts") {
      for (const row of catchRows) {
        if (q && !matchesCatch(row, q)) continue;
        items.push({ kind: "catch", date: row.event.date, row });
      }
    }

    if (tab !== "catches") {
      for (const hunt of completedHunts) {
        if (!hunt.completedAt) continue;
        const entry = entryByKey.get(ownedKey(hunt.speciesId, hunt.formName));
        if (q && !matchesHunt(hunt, entry, q)) continue;
        items.push({ kind: "hunt", date: hunt.completedAt, hunt, entry });
      }
    }

    return items.toSorted((a, b) => b.date.localeCompare(a.date));
  }, [tab, catchRows, completedHunts, entryByKey, q]);

  const filteredActiveHunts = useMemo(
    () =>
      activeHunts.filter((hunt) => {
        if (!q) return true;
        return matchesHunt(
          hunt,
          entryByKey.get(ownedKey(hunt.speciesId, hunt.formName)),
          q,
        );
      }),
    [activeHunts, entryByKey, q],
  );

  const totalPages = Math.max(1, Math.ceil(logEntries.length / ENTRIES_PER_PAGE));
  const safePage = Math.min(page, totalPages - 1);
  const pageSlice = logEntries.slice(
    safePage * ENTRIES_PER_PAGE,
    (safePage + 1) * ENTRIES_PER_PAGE,
  );
  const dayGroups = useMemo(() => groupByDay(pageSlice), [pageSlice]);

  const shinyCount = useMemo(
    () => catchLog.filter((e) => e.isShiny).length,
    [catchLog],
  );

  const showSidebar = tab !== "catches";

  function switchTab(next: HistoryTab) {
    setTab(next);
    setPage(0);
  }

  return (
    <div className="min-h-full bg-[#11111b] px-4 py-6 text-[#f8f0df] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-5">

        {/* ── Header ── */}
        <header>
          <div className="mb-1 flex items-center gap-2 text-[#b9ec86]">
            <History className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">
              Trainer Log
            </span>
          </div>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black tracking-tight">History</h1>
              <p className="mt-1 text-sm text-[#8f8799]">
                Every catch and shiny hunt — timestamped and searchable.
              </p>
            </div>
            <div className="flex h-9 w-full max-w-xs items-center gap-2 rounded-lg border border-[#2f2b40] bg-[#151520] px-3">
              <Search className="h-3.5 w-3.5 shrink-0 text-[#554a70]" />
              <label htmlFor="history-search" className="sr-only">
                Search history
              </label>
              <input
                id="history-search"
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
                placeholder="Search Pokémon, games, methods…"
                className="min-w-0 flex-1 bg-transparent text-[11px] font-medium text-[#f8f0df] outline-none placeholder:text-[#554a70]"
              />
            </div>
          </div>
        </header>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Catches Logged" value={catchLog.length} />
          <StatCard label="Shinies Caught" value={shinyCount} color="gold" />
          <StatCard label="Active Hunts" value={activeHunts.length} />
          <StatCard
            label="Hunts Completed"
            value={completedHunts.length}
            color="green"
          />
        </div>

        {/* ── Tabs ── */}
        <div className="flex w-fit items-center gap-1 rounded-full bg-[#1a1a27] p-1 ring-1 ring-[#2f2b40]">
          {(["all", "catches", "hunts"] as HistoryTab[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => switchTab(value)}
              className={`rounded-full px-4 py-1.5 text-xs font-black capitalize transition-colors ${
                tab === value
                  ? "bg-[#4e367f] text-[#f8f0df]"
                  : "text-[#8f8799] hover:text-[#f8f0df]"
              }`}
            >
              {value}
            </button>
          ))}
        </div>

        {/* ── Content ── */}
        <div
          className={`grid items-start gap-5 ${showSidebar ? "xl:grid-cols-[1fr_320px]" : ""}`}
        >
          {/* Log panel — second on mobile, first on desktop */}
          <section
            className={`overflow-hidden rounded-xl border border-[#2f2b40] bg-[#1a1a27]/80 ${showSidebar ? "order-2 xl:order-1" : ""}`}
          >
            <div className="border-b border-[#2f2b40] px-5 py-3.5">
              <h2 className="text-sm font-black">
                {tab === "catches"
                  ? "Catch Log"
                  : tab === "hunts"
                    ? "Completed Hunts"
                    : "Activity Log"}
              </h2>
              <p className="mt-0.5 text-[10px] text-[#8f8799]">
                {logEntries.length}{" "}
                {tab === "catches"
                  ? "catch"
                  : tab === "hunts"
                    ? "completed hunt"
                    : "event"}
                {logEntries.length !== 1 ? "s" : ""}
              </p>
            </div>

            {dayGroups.length > 0 ? (
              dayGroups.map((group) => (
                <div key={group.key}>
                  <div className="flex items-center gap-3 px-5 py-2.5">
                    <span className="whitespace-nowrap text-[10px] font-black uppercase tracking-widest text-[#554a70]">
                      {group.label}
                    </span>
                    <div className="h-px flex-1 bg-[#2f2b40]/60" />
                  </div>
                  <div className="divide-y divide-[#2f2b40]/40">
                    {group.entries.map((entry, i) =>
                      entry.kind === "catch" ? (
                        <CatchLogRow
                          key={`${entry.row.event.speciesId}-${entry.row.event.formName}-${entry.row.event.gameId}-${entry.row.event.date}-${i}`}
                          row={entry.row}
                          onOpen={openPokemon}
                          onRemove={removeRecentCatch}
                        />
                      ) : (
                        <HuntCompleteRow
                          key={entry.hunt.id}
                          hunt={entry.hunt}
                          entry={entry.entry}
                          onOpen={openPokemon}
                          onRemove={removeShinyHunt}
                        />
                      ),
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="m-5 rounded-xl border border-dashed border-[#2f2b40] py-12 text-center text-xs font-semibold text-[#554a70]">
                {q
                  ? "No results match your search."
                  : tab === "hunts"
                    ? "No completed hunts yet."
                    : tab === "catches"
                      ? "No catches recorded yet."
                      : "Nothing logged yet. Start catching!"}
              </p>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-[#2f2b40] px-5 py-3">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={safePage === 0}
                  className="grid h-8 w-8 place-items-center rounded-lg text-[#8f8799] transition-colors hover:bg-white/5 hover:text-[#f8f0df] disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-[11px] font-semibold text-[#8f8799]">
                  {safePage + 1} / {totalPages}
                  <span className="ml-2 text-[#3d3456]">
                    ({logEntries.length.toLocaleString()} total)
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setPage((p) => Math.min(totalPages - 1, p + 1))
                  }
                  disabled={safePage >= totalPages - 1}
                  className="grid h-8 w-8 place-items-center rounded-lg text-[#8f8799] transition-colors hover:bg-white/5 hover:text-[#f8f0df] disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </section>

          {/* Active hunts sidebar — first on mobile, second on desktop */}
          {showSidebar && (
            <aside className="order-1 xl:sticky xl:top-4 xl:order-2">
              <div className="overflow-hidden rounded-xl border border-[#2f2b40] bg-[#1a1a27]/80">
                <div className="border-b border-[#2f2b40] px-4 py-3.5">
                  <h2 className="flex items-center gap-2 text-sm font-black">
                    <Sparkles className="h-3.5 w-3.5 text-[#f8d85a]" />
                    Active Hunts
                  </h2>
                  <p className="mt-0.5 text-[10px] text-[#8f8799]">
                    {filteredActiveHunts.length} ongoing
                  </p>
                </div>
                <div className="divide-y divide-[#2f2b40]/40">
                  {filteredActiveHunts.length > 0 ? (
                    filteredActiveHunts.map((hunt) => (
                      <ActiveHuntRow
                        key={hunt.id}
                        hunt={hunt}
                        entry={entryByKey.get(
                          ownedKey(hunt.speciesId, hunt.formName),
                        )}
                        onOpen={openPokemon}
                        onRemove={removeShinyHunt}
                      />
                    ))
                  ) : (
                    <p className="m-4 rounded-xl border border-dashed border-[#2f2b40] py-8 text-center text-xs font-semibold text-[#554a70]">
                      {q ? "No hunts match." : "No active hunts."}
                    </p>
                  )}
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: "gold" | "green";
}) {
  const valueColor =
    color === "gold"
      ? "text-[#f8d85a]"
      : color === "green"
        ? "text-[#b9ec86]"
        : "text-[#f8f0df]";

  return (
    <div className="rounded-xl border border-[#2f2b40] bg-[#1a1a27]/80 px-4 py-3.5">
      <p className={`text-2xl font-black tabular-nums ${valueColor}`}>
        {value.toLocaleString()}
      </p>
      <p className="mt-0.5 text-[10px] font-black uppercase tracking-widest text-[#8f8799]">
        {label}
      </p>
    </div>
  );
}

function CatchLogRow({
  row,
  onOpen,
  onRemove,
}: {
  row: CatchRow;
  onOpen: (speciesId: number, formName: string | null) => void;
  onRemove: (event: CatchEvent) => void;
}) {
  const time = formatTime(row.event.date);

  return (
    <div className="group grid grid-cols-[52px_1fr_auto] items-center gap-3 px-5 py-3 transition-colors hover:bg-white/[0.02]">
      <button
        type="button"
        onClick={() => onOpen(row.speciesId, row.formName)}
        className={`relative grid h-12 w-12 shrink-0 place-items-center rounded-xl transition-transform hover:scale-105 ${
          row.isShiny
            ? "bg-[#2a2010] ring-2 ring-[#f8d85a]/50"
            : row.isAlpha
              ? "bg-[#1e1230] ring-2 ring-[#c084fc]/50"
              : "bg-[#151520]"
        }`}
      >
        <Image
          src={row.spriteUrl}
          alt=""
          width={44}
          height={44}
          unoptimized
          className="h-11 w-11 object-contain [image-rendering:pixelated]"
        />
        {row.isShiny && (
          <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-[#f8d85a] text-[8px] font-black leading-none text-black">
            ✦
          </span>
        )}
      </button>

      <div className="min-w-0">
        <button
          type="button"
          onClick={() => onOpen(row.speciesId, row.formName)}
          className="block max-w-full truncate text-left text-sm font-black text-[#f8f0df] hover:text-[#b9ec86]"
        >
          {row.name}
        </button>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-px">
          <span className="text-[11px] text-[#8f8799]">{row.gameName}</span>
          {row.isShiny && (
            <span className="text-[10px] font-black text-[#f8d85a]">
              ✦ Shiny
            </span>
          )}
          {row.isAlpha && (
            <span className="text-[10px] font-black text-[#c084fc]">
              α Alpha
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {time && (
          <span className="text-[11px] tabular-nums text-[#3d3456]">{time}</span>
        )}
        <button
          type="button"
          onClick={() => onRemove(row.event)}
          aria-label={`Remove ${row.name} from catch log`}
          className="grid h-7 w-7 place-items-center rounded-lg text-[#554a70] opacity-0 transition-all hover:bg-white/5 hover:text-[#f8f0df] group-hover:opacity-100"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function HuntCompleteRow({
  hunt,
  entry,
  onOpen,
  onRemove,
}: {
  hunt: ShinyHunt;
  entry?: LivingDexEntry;
  onOpen: (speciesId: number, formName: string | null) => void;
  onRemove: (id: string) => void;
}) {
  const spriteUrl = entry?.shinySpriteUrl ?? entry?.spriteUrl;
  const name =
    entry?.displayName ?? `#${String(hunt.speciesId).padStart(4, "0")}`;
  const methodLabel = METHOD_LABELS[hunt.method] ?? titleCase(hunt.method);
  const gameName = getGameById(hunt.gameId)?.name ?? hunt.gameId;
  const time = formatTime(hunt.completedAt ?? "");

  return (
    <div className="group grid grid-cols-[52px_1fr_auto] items-center gap-3 bg-[#1a1630]/70 px-5 py-3 transition-colors hover:bg-[#1e1a30]">
      <button
        type="button"
        onClick={() => onOpen(hunt.speciesId, hunt.formName)}
        className="relative grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#241b40] ring-2 ring-[#f8d85a]/30 transition-transform hover:scale-105"
      >
        {spriteUrl && (
          <Image
            src={spriteUrl}
            alt=""
            width={44}
            height={44}
            unoptimized
            className="h-11 w-11 object-contain [image-rendering:pixelated]"
          />
        )}
        <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-[#f8d85a] text-[8px] font-black leading-none text-black">
          ✦
        </span>
      </button>

      <div className="min-w-0">
        <p className="text-[9px] font-black uppercase tracking-widest text-[#f8d85a]/60">
          Hunt Complete
        </p>
        <button
          type="button"
          onClick={() => onOpen(hunt.speciesId, hunt.formName)}
          className="block max-w-full truncate text-left text-sm font-black text-[#f8f0df] hover:text-[#b9ec86]"
        >
          {name}
        </button>
        <p className="mt-0.5 truncate text-[11px] text-[#8f8799]">
          {methodLabel} · {gameName}
        </p>
        <div className="mt-0.5 flex items-center gap-1.5 text-[10px]">
          <span className="font-mono font-black text-[#f8d85a]/70">
            {hunt.count.toLocaleString()}
          </span>
          <span className="text-[#3d3456]">{hunt.counterMode}</span>
          <span className="text-[#3d3456]">·</span>
          <span className="text-[#3d3456]">
            {formatDuration(hunt.startedAt, hunt.completedAt)}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {time && (
          <span className="text-[11px] tabular-nums text-[#3d3456]">{time}</span>
        )}
        <button
          type="button"
          onClick={() => onRemove(hunt.id)}
          aria-label={`Delete ${name} hunt`}
          className="grid h-7 w-7 place-items-center rounded-lg text-[#554a70] opacity-0 transition-all hover:bg-white/5 hover:text-[#f8f0df] group-hover:opacity-100"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function ActiveHuntRow({
  hunt,
  entry,
  onOpen,
  onRemove,
}: {
  hunt: ShinyHunt;
  entry?: LivingDexEntry;
  onOpen: (speciesId: number, formName: string | null) => void;
  onRemove: (id: string) => void;
}) {
  const spriteUrl = entry?.shinySpriteUrl ?? entry?.spriteUrl;
  const name =
    entry?.displayName ?? `#${String(hunt.speciesId).padStart(4, "0")}`;
  const methodLabel = METHOD_LABELS[hunt.method] ?? titleCase(hunt.method);
  const gameName = getGameById(hunt.gameId)?.name ?? hunt.gameId;

  return (
    <div className="group grid grid-cols-[44px_1fr_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.02]">
      <button
        type="button"
        onClick={() => onOpen(hunt.speciesId, hunt.formName)}
        className="relative grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#241b40] ring-1 ring-[#f8d85a]/25 transition-transform hover:scale-105"
      >
        {spriteUrl && (
          <Image
            src={spriteUrl}
            alt=""
            width={40}
            height={40}
            unoptimized
            className="h-10 w-10 object-contain [image-rendering:pixelated]"
          />
        )}
      </button>

      <div className="min-w-0">
        <button
          type="button"
          onClick={() => onOpen(hunt.speciesId, hunt.formName)}
          className="block max-w-full truncate text-left text-sm font-black text-[#f8f0df] hover:text-[#b9ec86]"
        >
          {name}
        </button>
        <p className="mt-0.5 truncate text-[10px] text-[#8f8799]">
          {methodLabel} · {gameName}
        </p>
        <p className="mt-0.5 text-[10px] text-[#3d3456]">
          {formatRelativeDate(hunt.startedAt)}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <span className="font-mono text-base font-black tabular-nums text-[#f8d85a]">
          {hunt.count.toLocaleString()}
        </span>
        <span className="text-[9px] font-semibold uppercase tracking-wider text-[#554a70]">
          {hunt.counterMode}
        </span>
        <button
          type="button"
          onClick={() => onRemove(hunt.id)}
          aria-label={`Delete ${name} hunt`}
          className="mt-1 grid h-6 w-6 place-items-center rounded-lg text-[#554a70] opacity-0 transition-all hover:bg-white/5 hover:text-[#f8f0df] group-hover:opacity-100"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function buildCatchRows(
  entries: LivingDexEntry[],
  catchLog: CatchEvent[],
): CatchRow[] {
  const map = new Map<string, LivingDexEntry>();
  for (const e of entries) map.set(ownedKey(e.speciesId, e.formName), e);

  return catchLog.flatMap((event) => {
    const entry = map.get(ownedKey(event.speciesId, event.formName));
    if (!entry) return [];
    return [
      {
        speciesId: event.speciesId,
        formName: event.formName,
        name: entry.displayName,
        spriteUrl: event.isShiny
          ? (entry.shinySpriteUrl ?? entry.spriteUrl)
          : entry.spriteUrl,
        gameName: getGameById(event.gameId)?.name ?? event.gameId,
        isShiny: event.isShiny,
        isAlpha: event.isAlpha,
        event,
      },
    ];
  });
}

function matchesCatch(row: CatchRow, q: string): boolean {
  return [
    row.name,
    String(row.speciesId),
    row.gameName,
    row.isShiny ? "shiny" : "",
    row.isAlpha ? "alpha" : "",
  ]
    .join(" ")
    .toLowerCase()
    .includes(q);
}

function matchesHunt(
  hunt: ShinyHunt,
  entry: LivingDexEntry | undefined,
  q: string,
): boolean {
  const method = METHOD_LABELS[hunt.method] ?? hunt.method;
  const game = getGameById(hunt.gameId)?.name ?? hunt.gameId;
  return [entry?.displayName, String(hunt.speciesId), game, method, hunt.counterMode]
    .filter((v): v is string => !!v)
    .join(" ")
    .toLowerCase()
    .includes(q);
}

function groupByDay(entries: LogEntry[]): DayGroup[] {
  const groups = new Map<string, LogEntry[]>();
  for (const entry of entries) {
    const key = entry.date.slice(0, 10);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(entry);
  }
  return [...groups.entries()].map(([key, items]) => ({
    key,
    label: formatDayLabel(key),
    entries: items,
  }));
}

function formatDayLabel(dateKey: string): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const todayKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  const yesterdayKey = `${yest.getFullYear()}-${pad(yest.getMonth() + 1)}-${pad(yest.getDate())}`;

  if (dateKey === todayKey) return "Today";
  if (dateKey === yesterdayKey) return "Yesterday";

  // noon avoids DST-related off-by-one when parsing date-only strings
  const date = new Date(`${dateKey}T12:00:00`);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(dateString: string): string {
  if (!dateString || dateString.length <= 10) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatRelativeDate(dateString?: string): string {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "—";
  const now = new Date();
  const diff = Math.round(
    (now.getTime() - date.getTime()) / 86_400_000,
  );
  if (diff === 0) return "started today";
  if (diff === 1) return "started yesterday";
  if (diff < 7) return `started ${diff}d ago`;
  if (diff < 30) return `started ${Math.floor(diff / 7)}w ago`;
  return `started ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

function formatDuration(startedAt: string, completedAt?: string): string {
  const start = new Date(startedAt).getTime();
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();
  if (!isFinite(start) || !isFinite(end) || end <= start) return "0h";
  const totalHours = Math.max(1, Math.round((end - start) / 3_600_000));
  if (totalHours < 24) return `${totalHours}h`;
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (days < 30) return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  const months = Math.floor(days / 30);
  const remDays = days % 30;
  return remDays > 0 ? `${months}mo ${remDays}d` : `${months}mo`;
}

function titleCase(value: string): string {
  return value
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

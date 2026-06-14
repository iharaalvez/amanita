'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { usePokedexStore, ownedKey, type HomeBoxMode } from '@/store/pokedexStore';
import { useLivingDexEntries } from '@/hooks/usePokemon';
import { compareLivingDexEntries, isHomeTrackedEntry } from '@/lib/livingDex';
import type { LivingDexEntry } from '@/types/pokemon';

// ─────────────────────────────────────────────────
// Types + helpers
// ─────────────────────────────────────────────────

const BOX_SIZE = 30;
const COLS = 6;
const ROWS = BOX_SIZE / COLS;

type SlotData = { entry: LivingDexEntry; isShiny: boolean };

function slotKey(slot: SlotData): string {
  return `${ownedKey(slot.entry.speciesId, slot.entry.formName)}-${slot.isShiny ? 's' : 'n'}`;
}

function buildSlotBoxes(slots: SlotData[]): (SlotData | null)[][] {
  const total = Math.ceil(slots.length / BOX_SIZE);
  return Array.from({ length: total }, (_, i) => {
    const chunk: (SlotData | null)[] = slots.slice(i * BOX_SIZE, (i + 1) * BOX_SIZE);
    while (chunk.length < BOX_SIZE) chunk.push(null);
    return chunk;
  });
}

function isSlotOwned(
  slot: SlotData,
  record: { owned?: boolean; shiny_owned?: boolean } | undefined,
): boolean {
  return slot.isShiny ? !!record?.shiny_owned : !!record?.owned;
}

// ─────────────────────────────────────────────────
// Template slot
// ─────────────────────────────────────────────────

function TemplateSlot({ slot, highlighted }: { slot: SlotData | null; highlighted: boolean }) {
  const key = slot ? ownedKey(slot.entry.speciesId, slot.entry.formName) : '';
  const record = usePokedexStore((s) => (slot ? s.owned[key] : undefined));
  const markOwned = usePokedexStore((s) => s.markOwned);
  const clearOwnership = usePokedexStore((s) => s.clearOwnership);
  const markShinyOwned = usePokedexStore((s) => s.markShinyOwned);
  const clearShinyOwned = usePokedexStore((s) => s.clearShinyOwned);

  if (!slot) {
    return <div className={`rounded ${highlighted ? 'bg-[#1a1508]' : 'bg-[#0b0c10]'}`} />;
  }

  const owned = isSlotOwned(slot, record);
  const sprite = slot.isShiny
    ? (slot.entry.shinySpriteUrl ?? slot.entry.spriteUrl)
    : slot.entry.spriteUrl;

  const toggle = () => {
    if (slot.isShiny) {
      if (owned) clearShinyOwned(slot.entry.speciesId, slot.entry.formName);
      else markShinyOwned(slot.entry.speciesId, slot.entry.formName);
    } else {
      if (owned) clearOwnership(slot.entry.speciesId, slot.entry.formName);
      else markOwned(slot.entry.speciesId, slot.entry.formName);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      title={`${slot.entry.displayName}${slot.isShiny ? ' ✦' : ''} — ${owned ? 'owned' : 'missing'}`}
      className={`relative flex items-center justify-center rounded transition-all duration-100 ${
        highlighted
          ? 'ring-1 ring-[#f8d85a]/70 bg-[#1e1a08]'
          : owned
          ? slot.isShiny
            ? 'bg-[#1a1508]'
            : 'bg-[#091410]'
          : 'bg-[#0b0c10] hover:bg-[#10101a]'
      }`}
    >
      {owned && (
        <span
          className={`absolute right-0.5 top-0.5 text-[7px] leading-none ${
            slot.isShiny ? 'text-[#f8d85a]' : 'text-[#b9ec86]'
          }`}
        >
          {slot.isShiny ? '✦' : '✓'}
        </span>
      )}
      {highlighted && !owned && (
        <span className="absolute left-0.5 top-0.5 text-[7px] leading-none text-[#f8d85a]">
          →
        </span>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={sprite ?? slot.entry.spriteUrl}
        alt={slot.entry.displayName}
        className={`h-8 w-8 object-contain transition-all ${owned ? '' : 'grayscale opacity-20'} ${
          highlighted ? 'scale-110' : ''
        }`}
        loading="lazy"
      />
    </button>
  );
}

// ─────────────────────────────────────────────────
// Mode badge
// ─────────────────────────────────────────────────

function ModeBadge({ mode }: { mode: HomeBoxMode }) {
  if (mode === 'normal') return null;
  return (
    <span
      className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[8px] font-black uppercase tracking-widest ${
        mode === 'shiny' ? 'bg-[#1e1508] text-[#f8d85a]' : 'bg-[#0e1020] text-[#a78bfa]'
      }`}
    >
      {mode === 'shiny' ? '✦ Shiny' : '⇌ Paired'}
    </span>
  );
}

// ─────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────

export default function StreamPage() {
  const [boxIndex, setBoxIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [, forceUpdate] = useState(0);
  const activeItemRef = useRef<HTMLButtonElement>(null);

  const storeOwned = usePokedexStore((s) => s.owned);
  const showCosmeticForms = usePokedexStore((s) => s.showCosmeticForms);
  const showGenderForms = usePokedexStore((s) => s.showGenderForms);
  const showGigantamaxForms = usePokedexStore((s) => s.showGigantamaxForms);
  const homeBoxMode = usePokedexStore((s) => s.homeBoxMode);
  const homeBoxLayouts = usePokedexStore((s) => s.homeBoxLayouts);
  const activeHomeBoxLayoutId = usePokedexStore((s) => s.activeHomeBoxLayoutId);
  const setActiveHomeBoxLayout = usePokedexStore((s) => s.setActiveHomeBoxLayout);

  const isPairedMode = homeBoxMode === 'paired';
  const isShinyMode = homeBoxMode === 'shiny';

  const { data: allEntries, isLoading } = useLivingDexEntries();

  useEffect(() => {
    const id = setInterval(() => forceUpdate((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const filteredEntries = useMemo(() => {
    if (!allEntries) return [];
    return [...allEntries]
      .filter((e) => isHomeTrackedEntry(e, showCosmeticForms, showGenderForms, showGigantamaxForms))
      .sort(compareLivingDexEntries);
  }, [allEntries, showCosmeticForms, showGenderForms, showGigantamaxForms]);

  const allSlots = useMemo((): SlotData[] => {
    if (isPairedMode) {
      return filteredEntries.flatMap((e) => [
        { entry: e, isShiny: false },
        { entry: e, isShiny: true },
      ]);
    }
    return filteredEntries.map((e) => ({ entry: e, isShiny: isShinyMode }));
  }, [filteredEntries, isPairedMode, isShinyMode]);

  const boxes = useMemo(() => buildSlotBoxes(allSlots), [allSlots]);
  const totalBoxes = boxes.length;
  const safeIndex = Math.min(boxIndex, Math.max(0, totalBoxes - 1));
  const currentBox = boxes[safeIndex] ?? [];
  const currentSlots = currentBox.filter((s): s is SlotData => s !== null);

  const boxStats = useMemo(
    () =>
      boxes.map((box) => {
        const slots = box.filter((s): s is SlotData => s !== null);
        const owned = slots.filter((s) =>
          isSlotOwned(s, storeOwned[ownedKey(s.entry.speciesId, s.entry.formName)]),
        ).length;
        return { total: slots.length, owned };
      }),
    [boxes, storeOwned],
  );

  const ownedInBox = currentSlots.filter((s) =>
    isSlotOwned(s, storeOwned[ownedKey(s.entry.speciesId, s.entry.formName)]),
  ).length;
  const missingInBox = currentSlots.filter(
    (s) => !isSlotOwned(s, storeOwned[ownedKey(s.entry.speciesId, s.entry.formName)]),
  );

  const totalOwned = useMemo(
    () =>
      allSlots.filter((s) =>
        isSlotOwned(s, storeOwned[ownedKey(s.entry.speciesId, s.entry.formName)]),
      ).length,
    [allSlots, storeOwned],
  );
  const totalSlots = allSlots.length;
  const boxPct = currentSlots.length > 0 ? (ownedInBox / currentSlots.length) * 100 : 0;
  const overallPct = totalSlots > 0 ? (totalOwned / totalSlots) * 100 : 0;

  // ── Search ──
  const searchNorm = searchQuery.trim().toLowerCase();

  const highlightedKeys = useMemo(() => {
    if (!searchNorm) return new Set<string>();
    return new Set(
      allSlots
        .filter((s) => {
          const nameMatch = s.entry.displayName.toLowerCase().includes(searchNorm);
          const numMatch = String(s.entry.speciesId).startsWith(
            searchNorm.replace(/^#0*/, ''),
          );
          return nameMatch || numMatch;
        })
        .map(slotKey),
    );
  }, [allSlots, searchNorm]);

  const boxHasMatch = useMemo(
    () => boxes.map((box) => box.some((s) => s !== null && highlightedKeys.has(slotKey(s)))),
    [boxes, highlightedKeys],
  );

  useEffect(() => {
    if (!searchNorm) return;
    const first = boxHasMatch.findIndex(Boolean);
    if (first >= 0) setBoxIndex(first);
  }, [searchNorm, boxHasMatch]);

  // Scroll footer active tile into view
  useEffect(() => {
    activeItemRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }, [safeIndex]);

  // ── Recently toggled: owned records sorted by updated_at ──
  const entryByKey = useMemo(() => {
    const map = new Map<string, LivingDexEntry>();
    for (const e of allEntries ?? []) map.set(ownedKey(e.speciesId, e.formName), e);
    return map;
  }, [allEntries]);

  const recentlyOwned = useMemo(() => {
    return Object.entries(storeOwned)
      .filter(([, rec]) => (isShinyMode ? rec.shiny_owned : rec.owned))
      .sort(([, a], [, b]) => {
        if (!a.updated_at && !b.updated_at) return 0;
        if (!a.updated_at) return 1;
        if (!b.updated_at) return -1;
        return b.updated_at.localeCompare(a.updated_at);
      })
      .slice(0, 10)
      .flatMap(([key]) => {
        const entry = entryByKey.get(key);
        return entry ? [{ entry, isShiny: isShinyMode }] : [];
      });
  }, [storeOwned, entryByKey, isShinyMode]);

  const timeStr = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const prev = () => setBoxIndex((i) => Math.max(0, i - 1));
  const next = () => setBoxIndex((i) => Math.min(totalBoxes - 1, i + 1));

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#2d3348]" />
          <span className="font-mono text-xs text-[#2d3348]">Loading…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">

      {/* ─── Header ─── */}
      <header className="flex h-10 shrink-0 items-center justify-between border-b border-[#131620] px-4">
        <div className="flex w-52 items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#f87171]" />
            <span className="font-mono text-[9px] font-black uppercase tracking-widest text-[#3a3f52]">
              LIVE
            </span>
          </div>
          <div className="h-3.5 w-px bg-[#131620]" />
          <Image
            src="/brand/brand.svg"
            alt="Amanita"
            width={60}
            height={13}
            className="h-3 w-auto opacity-30"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={prev}
            disabled={safeIndex === 0}
            className="grid h-7 w-7 place-items-center rounded-lg bg-[#131620] text-[#3a3f52] transition-colors hover:bg-[#1a1e2e] hover:text-[#e0ddf5] disabled:opacity-25"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="font-mono text-sm font-black text-[#e0ddf5]">BOX {safeIndex + 1}</span>
          <span className="font-mono text-sm text-[#2d3348]">/ {totalBoxes}</span>
          <button
            type="button"
            onClick={next}
            disabled={safeIndex === totalBoxes - 1}
            className="grid h-7 w-7 place-items-center rounded-lg bg-[#131620] text-[#3a3f52] transition-colors hover:bg-[#1a1e2e] hover:text-[#e0ddf5] disabled:opacity-25"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <ModeBadge mode={homeBoxMode} />
        </div>

        <div className="flex w-52 items-center justify-end gap-3">
          <span className="font-mono text-[10px] text-[#b9ec86]">
            {totalOwned.toLocaleString()}
            <span className="text-[#2d3348]"> / {totalSlots}</span>
          </span>
          <div className="h-3.5 w-px bg-[#131620]" />
          <time className="font-mono text-[10px] text-[#3a3f52]">{timeStr}</time>
        </div>
      </header>

      {/* ─── Body ─── */}
      <div className="flex min-h-0 flex-1 overflow-hidden">

        {/* ─── Center: empty — Switch capture goes here ─── */}
        <div className="min-h-0 flex-1">
          <div className="h-full w-full border border-dashed border-[#131620]/60" />
        </div>

        {/* ─── Right panel ─── */}
        <aside className="flex w-[380px] shrink-0 flex-col overflow-hidden border-l border-[#131620]">

          {/* Layout selector */}
          {homeBoxLayouts.length > 0 && (
            <div className="shrink-0 border-b border-[#131620] px-4 py-2.5">
              <p className="mb-1.5 font-mono text-[9px] font-black uppercase tracking-widest text-[#3a3f52]">
                Layout
              </p>
              <div className="flex flex-wrap gap-1">
                {homeBoxLayouts.map((layout) => {
                  const isActive = layout.id === activeHomeBoxLayoutId;
                  return (
                    <button
                      key={layout.id}
                      type="button"
                      onClick={() => setActiveHomeBoxLayout(layout.id)}
                      className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 transition-colors ${
                        isActive
                          ? 'bg-[#1a1e2e] text-[#e0ddf5]'
                          : 'bg-[#0b0c10] text-[#525870] hover:bg-[#131620] hover:text-[#8b8fa8]'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                          isActive ? 'bg-[#b9ec86]' : 'bg-[#2d3348]'
                        }`}
                      />
                      <span className="font-mono text-[10px] font-bold">{layout.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Search */}
          <div className="shrink-0 border-b border-[#131620] px-4 py-2.5">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-[#3a3f52]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Find a Pokémon…"
                  className="h-8 w-full rounded-lg bg-[#0b0c10] pl-7 pr-7 font-mono text-[11px] text-[#e0ddf5] placeholder:text-[#2d3348] focus:outline-none focus:ring-1 focus:ring-[#2d3348]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[#3a3f52] hover:text-[#8b8fa8]"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              {searchNorm && (
                <span
                  className={`shrink-0 font-mono text-[10px] font-black ${
                    highlightedKeys.size > 0 ? 'text-[#f8d85a]' : 'text-[#3a3f52]'
                  }`}
                >
                  {highlightedKeys.size > 0 ? `${highlightedKeys.size} found` : 'no match'}
                </span>
              )}
            </div>
          </div>

          {/* Box header */}
          <div className="shrink-0 border-b border-[#131620] px-4 py-3">
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-2xl font-black leading-none text-[#e0ddf5]">
                BOX {safeIndex + 1}
              </span>
              <span className="font-mono text-xl font-black leading-none text-[#e0ddf5]">
                {ownedInBox}
                <span className="text-base font-normal text-[#2d3348]"> / {currentSlots.length}</span>
              </span>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#131620]">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  boxPct === 100
                    ? isShinyMode
                      ? 'bg-[#f8d85a]'
                      : 'bg-[#b9ec86]'
                    : boxPct >= 50
                    ? 'bg-[#67e8f9]'
                    : 'bg-[#a78bfa]'
                }`}
                style={{ width: `${boxPct}%` }}
              />
            </div>
          </div>

          {/* Box template grid */}
          <div className="shrink-0 border-b border-[#131620] px-4 py-3">
            <p className="mb-2 font-mono text-[9px] font-black uppercase tracking-widest text-[#3a3f52]">
              Box Template
            </p>
            <div
              className="grid gap-1"
              style={{
                gridTemplateColumns: `repeat(${COLS}, 1fr)`,
                gridTemplateRows: `repeat(${ROWS}, 1fr)`,
                height: '180px',
              }}
            >
              {currentBox.map((slot, i) => (
                <TemplateSlot
                  key={slot ? slotKey(slot) : `empty-${i}`}
                  slot={slot}
                  highlighted={!!slot && highlightedKeys.has(slotKey(slot))}
                />
              ))}
            </div>
          </div>

          {/* Missing list */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-3">
            <p className="mb-2 font-mono text-[9px] font-black uppercase tracking-widest text-[#3a3f52]">
              Missing
              {missingInBox.length > 0 && (
                <span className="ml-1.5 text-[#f87171]">({missingInBox.length})</span>
              )}
            </p>

            {missingInBox.length === 0 ? (
              <div className="flex items-center gap-1.5">
                <span className={`text-[10px] ${isShinyMode ? 'text-[#f8d85a]' : 'text-[#b9ec86]'}`}>
                  {isShinyMode ? '✦' : '✓'}
                </span>
                <p className="font-mono text-xs text-[#b9ec86]">Box complete!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 overflow-hidden">
                {missingInBox.slice(0, 16).map((slot) => {
                  const sprite = slot.isShiny
                    ? (slot.entry.shinySpriteUrl ?? slot.entry.spriteUrl)
                    : slot.entry.spriteUrl;
                  return (
                    <div key={slotKey(slot)} className="flex items-center gap-1.5 min-w-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={sprite ?? slot.entry.spriteUrl}
                        alt=""
                        className="h-6 w-6 shrink-0 object-contain grayscale opacity-35"
                        loading="lazy"
                      />
                      <span className="min-w-0 truncate text-[11px] text-[#525870]">
                        {slot.entry.displayName}
                        {slot.isShiny && <span className="ml-1 text-[9px] text-[#f8d85a]">✦</span>}
                      </span>
                    </div>
                  );
                })}
                {missingInBox.length > 16 && (
                  <p className="col-span-2 font-mono text-[9px] text-[#2d3348]">
                    +{missingInBox.length - 16} more
                  </p>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* ─── Footer: box tiles + overall + recent ─── */}
      <footer className="flex h-[64px] shrink-0 items-stretch border-t border-[#131620]">

        {/* Box tiles */}
        <div className="flex min-w-0 flex-1 items-center gap-0.5 overflow-hidden px-3">
          {boxes.map((_, i) => {
            const s = boxStats[i];
            const pct = s.total > 0 ? s.owned / s.total : 0;
            const isComplete = pct === 1 && s.total > 0;
            const isCurrent = i === safeIndex;
            const hasMatch = searchNorm ? boxHasMatch[i] : false;
            return (
              <button
                key={i}
                ref={isCurrent ? activeItemRef : undefined}
                type="button"
                onClick={() => setBoxIndex(i)}
                title={`Box ${i + 1} — ${s.owned}/${s.total}`}
                className={`flex shrink-0 flex-col items-center gap-0.5 rounded px-1.5 py-1.5 transition-colors ${
                  isCurrent ? 'bg-[#1a1e2e]' : 'hover:bg-[#0f1016]'
                }`}
              >
                <span
                  className={`font-mono text-[10px] font-black tabular-nums leading-none ${
                    isCurrent
                      ? 'text-[#e0ddf5]'
                      : hasMatch
                      ? 'text-[#f8d85a]'
                      : isComplete
                      ? 'text-[#b9ec86]'
                      : 'text-[#3a3f52]'
                  }`}
                >
                  {i + 1}
                </span>
                <div className="h-0.5 w-5 overflow-hidden rounded-full bg-[#131620]">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      hasMatch
                        ? 'bg-[#f8d85a]'
                        : isComplete
                        ? 'bg-[#b9ec86]'
                        : pct >= 0.5
                        ? 'bg-[#67e8f9]'
                        : 'bg-[#2d3348]'
                    }`}
                    style={{ width: `${pct * 100}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>

        {/* Overall */}
        <div className="flex w-28 shrink-0 flex-col items-center justify-center border-l border-[#131620] px-3">
          <p className="font-mono text-[9px] font-black uppercase tracking-widest text-[#3a3f52]">
            Dex
          </p>
          <p className={`mt-0.5 font-mono text-sm font-black ${isShinyMode ? 'text-[#f8d85a]' : 'text-[#b9ec86]'}`}>
            {overallPct.toFixed(1)}<span className="text-xs font-normal text-[#3a3f52]">%</span>
          </p>
          <div className="mt-1 h-0.5 w-full overflow-hidden rounded-full bg-[#131620]">
            <div
              className={`h-full rounded-full ${isShinyMode ? 'bg-[#f8d85a]' : 'bg-[#b9ec86]'}`}
              style={{ width: `${overallPct}%` }}
            />
          </div>
        </div>

        {/* Recent — aligned with right panel */}
        <div className="flex w-[380px] shrink-0 items-center gap-3 border-l border-[#131620] px-4">
          <p className="shrink-0 font-mono text-[9px] font-black uppercase tracking-widest text-[#3a3f52]">
            Recent
          </p>
          <div className="flex items-center gap-2 overflow-hidden">
            {recentlyOwned.length === 0 ? (
              <span className="font-mono text-[10px] text-[#2d3348]">—</span>
            ) : (
              recentlyOwned.map(({ entry, isShiny }, i) => {
                const spriteUrl = isShiny
                  ? (entry.shinySpriteUrl ?? entry.spriteUrl)
                  : entry.spriteUrl;
                return (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={spriteUrl}
                    alt={entry.displayName}
                    title={entry.displayName}
                    className={`h-9 w-9 shrink-0 object-contain ${
                      isShiny ? 'drop-shadow-[0_0_4px_rgba(248,216,90,0.5)]' : ''
                    }`}
                    loading="lazy"
                  />
                );
              })
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}

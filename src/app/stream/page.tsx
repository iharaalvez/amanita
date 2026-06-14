'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { usePokedexStore, ownedKey } from '@/store/pokedexStore';
import { useLivingDexEntries } from '@/hooks/usePokemon';
import { compareLivingDexEntries, isHomeTrackedEntry } from '@/lib/livingDex';
import type { LivingDexEntry } from '@/types/pokemon';

// ─────────────────────────────────────────────────
// Constants + helpers
// ─────────────────────────────────────────────────

const BOX_SIZE = 30;
const COLS = 6;
const ROWS = BOX_SIZE / COLS; // 5

function buildBoxes(entries: LivingDexEntry[]): (LivingDexEntry | null)[][] {
  const total = Math.ceil(entries.length / BOX_SIZE);
  return Array.from({ length: total }, (_, i) => {
    const chunk: (LivingDexEntry | null)[] = entries.slice(
      i * BOX_SIZE,
      (i + 1) * BOX_SIZE,
    );
    while (chunk.length < BOX_SIZE) chunk.push(null);
    return chunk;
  });
}

// ─────────────────────────────────────────────────
// Compact slot — right-panel box template
// ─────────────────────────────────────────────────

function TemplateSlot({ entry }: { entry: LivingDexEntry | null }) {
  const key = entry ? ownedKey(entry.speciesId, entry.formName) : '';
  const isOwned = usePokedexStore((s) => (entry ? !!s.owned[key]?.owned : false));
  const markOwned = usePokedexStore((s) => s.markOwned);
  const clearOwnership = usePokedexStore((s) => s.clearOwnership);

  if (!entry) {
    return <div className="rounded bg-[#0b0c10]" />;
  }

  const toggle = () => {
    if (isOwned) clearOwnership(entry.speciesId, entry.formName);
    else markOwned(entry.speciesId, entry.formName);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      title={`${entry.displayName} — ${isOwned ? 'owned' : 'missing'}`}
      className={`relative flex items-center justify-center rounded transition-all duration-100 ${
        isOwned ? 'bg-[#091410]' : 'bg-[#0b0c10] hover:bg-[#10101a]'
      }`}
    >
      {isOwned && (
        <span className="absolute right-0.5 top-0.5 text-[7px] leading-none text-[#b9ec86]">
          ✓
        </span>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={entry.spriteUrl}
        alt={entry.displayName}
        className={`h-8 w-8 object-contain transition-all ${
          isOwned ? '' : 'grayscale opacity-20'
        }`}
        loading="lazy"
      />
    </button>
  );
}

// ─────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────

export default function StreamPage() {
  const [boxIndex, setBoxIndex] = useState(0);
  const [, forceUpdate] = useState(0);

  const storeOwned = usePokedexStore((s) => s.owned);
  const recentCatches = usePokedexStore((s) => s.recentCatches);
  const showCosmeticForms = usePokedexStore((s) => s.showCosmeticForms);
  const showGenderForms = usePokedexStore((s) => s.showGenderForms);
  const showGigantamaxForms = usePokedexStore((s) => s.showGigantamaxForms);

  const { data: allEntries, isLoading } = useLivingDexEntries();

  useEffect(() => {
    const id = setInterval(() => forceUpdate((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Entries matching the user's active HOME box layout settings
  const filteredEntries = useMemo(() => {
    if (!allEntries) return [];
    return [...allEntries]
      .filter((e) =>
        isHomeTrackedEntry(e, showCosmeticForms, showGenderForms, showGigantamaxForms),
      )
      .sort(compareLivingDexEntries);
  }, [allEntries, showCosmeticForms, showGenderForms, showGigantamaxForms]);

  const boxes = useMemo(() => buildBoxes(filteredEntries), [filteredEntries]);
  const totalBoxes = boxes.length;
  const safeIndex = Math.min(boxIndex, Math.max(0, totalBoxes - 1));

  const currentBox = boxes[safeIndex] ?? [];
  const currentEntries = currentBox.filter((e): e is LivingDexEntry => e !== null);

  // Per-box stats — used in footer overview
  const boxStats = useMemo(
    () =>
      boxes.map((box) => {
        const entries = box.filter((e): e is LivingDexEntry => e !== null);
        const owned = entries.filter(
          (e) => storeOwned[ownedKey(e.speciesId, e.formName)]?.owned,
        ).length;
        return { total: entries.length, owned };
      }),
    [boxes, storeOwned],
  );

  // Current box derived
  const ownedInBox = currentEntries.filter(
    (e) => storeOwned[ownedKey(e.speciesId, e.formName)]?.owned,
  ).length;
  const missingInBox = currentEntries.filter(
    (e) => !storeOwned[ownedKey(e.speciesId, e.formName)]?.owned,
  );

  // Overall
  const totalOwned = useMemo(
    () =>
      filteredEntries.filter(
        (e) => storeOwned[ownedKey(e.speciesId, e.formName)]?.owned,
      ).length,
    [filteredEntries, storeOwned],
  );
  const totalSpecies = filteredEntries.length;
  const boxPct = currentEntries.length > 0 ? (ownedInBox / currentEntries.length) * 100 : 0;
  const overallPct = totalSpecies > 0 ? (totalOwned / totalSpecies) * 100 : 0;

  // Recent catches sprite lookup
  const entryByKey = useMemo(() => {
    const map = new Map<string, LivingDexEntry>();
    for (const e of allEntries ?? []) {
      map.set(ownedKey(e.speciesId, e.formName), e);
    }
    return map;
  }, [allEntries]);

  const recentWithEntries = useMemo(
    () =>
      recentCatches.slice(0, 8).map((event) => ({
        event,
        entry:
          entryByKey.get(ownedKey(event.speciesId, event.formName)) ??
          entryByKey.get(ownedKey(event.speciesId, null)),
      })),
    [recentCatches, entryByKey],
  );

  const timeStr = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const activeItemRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    activeItemRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [safeIndex]);

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
        {/* Left: LIVE + logo */}
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

        {/* Center: box navigation */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={prev}
            disabled={safeIndex === 0}
            className="grid h-7 w-7 place-items-center rounded-lg bg-[#131620] text-[#3a3f52] transition-colors hover:bg-[#1a1e2e] hover:text-[#e0ddf5] disabled:opacity-25"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="font-mono text-sm font-black text-[#e0ddf5]">
            BOX {safeIndex + 1}
          </span>
          <span className="font-mono text-sm text-[#2d3348]">/ {totalBoxes}</span>
          <button
            type="button"
            onClick={next}
            disabled={safeIndex === totalBoxes - 1}
            className="grid h-7 w-7 place-items-center rounded-lg bg-[#131620] text-[#3a3f52] transition-colors hover:bg-[#1a1e2e] hover:text-[#e0ddf5] disabled:opacity-25"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Right: overall + time */}
        <div className="flex w-52 items-center justify-end gap-3">
          <span className="font-mono text-[10px] text-[#b9ec86]">
            {totalOwned.toLocaleString()}{' '}
            <span className="text-[#2d3348]">/ {totalSpecies}</span>
          </span>
          <div className="h-3.5 w-px bg-[#131620]" />
          <time className="font-mono text-[10px] text-[#3a3f52]">{timeStr}</time>
        </div>
      </header>

      {/* ─── Body ─── */}
      <div className="flex min-h-0 flex-1 overflow-hidden">

        {/* ─── Left panel: box list ─── */}
        <aside className="flex w-[152px] shrink-0 flex-col overflow-hidden border-r border-[#131620]">
          <p className="shrink-0 px-3 py-2 font-mono text-[9px] font-black uppercase tracking-widest text-[#3a3f52]">
            Boxes
          </p>
          <div className="flex-1 overflow-y-auto">
            {boxes.map((_, i) => {
              const s = boxStats[i];
              const pct = s.total > 0 ? s.owned / s.total : 0;
              const isComplete = pct === 1 && s.total > 0;
              const isCurrent = i === safeIndex;
              return (
                <button
                  key={i}
                  ref={isCurrent ? activeItemRef : undefined}
                  type="button"
                  onClick={() => setBoxIndex(i)}
                  className={`flex w-full flex-col gap-1 px-3 py-2 text-left transition-colors ${
                    isCurrent ? 'bg-[#1a1e2e]' : 'hover:bg-[#0f1016]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`font-mono text-[11px] font-black ${
                        isCurrent
                          ? 'text-[#e0ddf5]'
                          : isComplete
                          ? 'text-[#b9ec86]'
                          : 'text-[#525870]'
                      }`}
                    >
                      BOX {String(i + 1).padStart(2, '0')}
                    </span>
                    {isComplete && (
                      <span className="text-[8px] text-[#b9ec86]">✓</span>
                    )}
                  </div>
                  <div className="h-0.5 w-full overflow-hidden rounded-full bg-[#0b0c10]">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isComplete
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
        </aside>

        {/* ─── Center: empty — Switch capture goes here in OBS ─── */}
        <div className="flex min-h-0 flex-1 items-center justify-center">
          {/* Faint guide frame. Invisible once the Switch source covers it. */}
          <div className="h-full w-full rounded border border-dashed border-[#131620]/60" />
        </div>

        {/* ─── Right panel ─── */}
        <aside className="flex w-[300px] shrink-0 flex-col overflow-hidden border-l border-[#131620]">

          {/* Box header */}
          <div className="border-b border-[#131620] px-4 py-3">
            <p className="font-mono text-[9px] font-black uppercase tracking-widest text-[#3a3f52]">
              Current Box
            </p>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="font-mono text-2xl font-black leading-none text-[#e0ddf5]">
                BOX {safeIndex + 1}
              </span>
              <span className="font-mono text-lg font-black leading-none text-[#e0ddf5]">
                {ownedInBox}
                <span className="text-sm font-normal text-[#2d3348]"> / {currentEntries.length}</span>
              </span>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#131620]">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  boxPct === 100
                    ? 'bg-[#b9ec86]'
                    : boxPct >= 50
                    ? 'bg-[#67e8f9]'
                    : 'bg-[#a78bfa]'
                }`}
                style={{ width: `${boxPct}%` }}
              />
            </div>
          </div>

          {/* Box template — 30-slot compact grid */}
          <div className="border-b border-[#131620] px-4 py-3">
            <p className="mb-2 font-mono text-[9px] font-black uppercase tracking-widest text-[#3a3f52]">
              Box Template
            </p>
            <div
              className="grid gap-1"
              style={{
                gridTemplateColumns: `repeat(${COLS}, 1fr)`,
                gridTemplateRows: `repeat(${ROWS}, 1fr)`,
                height: '160px',
              }}
            >
              {currentBox.map((entry, i) => (
                <TemplateSlot
                  key={entry ? ownedKey(entry.speciesId, entry.formName) : `empty-${i}`}
                  entry={entry}
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
                <span className="text-[10px] text-[#b9ec86]">✓</span>
                <p className="font-mono text-xs text-[#b9ec86]">Box complete!</p>
              </div>
            ) : (
              <div className="space-y-1.5 overflow-hidden">
                {missingInBox.slice(0, 11).map((entry) => (
                  <div
                    key={ownedKey(entry.speciesId, entry.formName)}
                    className="flex items-center gap-2"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={entry.spriteUrl}
                      alt=""
                      className="h-6 w-6 shrink-0 object-contain grayscale opacity-35"
                      loading="lazy"
                    />
                    <span className="min-w-0 flex-1 truncate text-[11px] text-[#525870]">
                      {entry.displayName}
                    </span>
                    <span className="shrink-0 font-mono text-[9px] text-[#2d3348]">
                      #{String(entry.speciesId).padStart(4, '0')}
                    </span>
                  </div>
                ))}
                {missingInBox.length > 11 && (
                  <p className="font-mono text-[9px] text-[#2d3348]">
                    +{missingInBox.length - 11} more
                  </p>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* ─── Footer ─── */}
      <footer className="flex h-[60px] shrink-0 items-stretch border-t border-[#131620]">
        {/* Overall dex progress */}
        <div className="flex w-[152px] shrink-0 flex-col items-start justify-center border-r border-[#131620] px-4">
          <p className="font-mono text-[9px] font-black uppercase tracking-widest text-[#3a3f52]">
            Living Dex
          </p>
          <p className="mt-0.5 font-mono text-sm font-black text-[#b9ec86]">
            {overallPct.toFixed(1)}
            <span className="text-xs font-normal text-[#3a3f52]">%</span>
          </p>
          <div className="mt-1 h-0.5 w-full overflow-hidden rounded-full bg-[#131620]">
            <div
              className="h-full rounded-full bg-[#b9ec86] transition-all"
              style={{ width: `${overallPct}%` }}
            />
          </div>
        </div>

        {/* Recently placed */}
        <div className="flex min-w-0 flex-1 items-center gap-3 px-4">
          <p className="shrink-0 font-mono text-[9px] font-black uppercase tracking-widest text-[#3a3f52]">
            Recent
          </p>
          <div className="flex items-center gap-1.5 overflow-hidden">
            {recentWithEntries.length === 0 ? (
              <span className="font-mono text-[10px] text-[#2d3348]">—</span>
            ) : (
              recentWithEntries.map(({ event, entry }, i) => {
                const spriteUrl = event.isShiny
                  ? (entry?.shinySpriteUrl ?? entry?.spriteUrl)
                  : entry?.spriteUrl;
                return spriteUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={spriteUrl}
                    alt={entry?.displayName ?? ''}
                    title={entry?.displayName ?? `#${event.speciesId}`}
                    className={`h-9 w-9 shrink-0 object-contain ${
                      event.isShiny
                        ? 'drop-shadow-[0_0_4px_rgba(248,216,90,0.5)]'
                        : ''
                    }`}
                    loading="lazy"
                  />
                ) : (
                  <div key={i} className="h-9 w-9 shrink-0 rounded bg-[#131620]" />
                );
              })
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}

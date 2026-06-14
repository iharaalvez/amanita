'use client';

import { useEffect, useMemo, useState } from 'react';
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
// Slot — clickable, toggles owned state
// ─────────────────────────────────────────────────

function StreamSlot({ entry }: { entry: LivingDexEntry | null }) {
  const key = entry ? ownedKey(entry.speciesId, entry.formName) : '';
  const isOwned = usePokedexStore((s) =>
    entry ? !!s.owned[key]?.owned : false,
  );
  const markOwned = usePokedexStore((s) => s.markOwned);
  const clearOwnership = usePokedexStore((s) => s.clearOwnership);

  if (!entry) {
    return (
      <div className="aspect-square rounded-lg bg-[#0c0d12]" />
    );
  }

  const toggle = () => {
    if (isOwned) {
      clearOwnership(entry.speciesId, entry.formName);
    } else {
      markOwned(entry.speciesId, entry.formName);
    }
  };

  const firstName = entry.displayName.split(' ')[0];

  return (
    <button
      type="button"
      onClick={toggle}
      title={`${isOwned ? 'Unmark' : 'Mark'} ${entry.displayName} as owned`}
      className={`group relative flex flex-col items-center justify-between rounded-lg px-1 pb-1.5 pt-2 transition-all duration-150 ${
        isOwned
          ? 'bg-[#0a1510] ring-1 ring-[#b9ec86]/20 hover:ring-[#b9ec86]/40'
          : 'bg-[#0c0d12] hover:bg-[#101118]'
      }`}
    >
      {/* owned check */}
      {isOwned && (
        <span className="absolute right-1.5 top-1.5 text-[8px] leading-none text-[#b9ec86]">
          ✓
        </span>
      )}

      {/* sprite */}
      <div className="flex flex-1 items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={entry.spriteUrl}
          alt={entry.displayName}
          className={`h-14 w-14 object-contain transition-all duration-150 ${
            isOwned ? '' : 'opacity-25 grayscale'
          }`}
          loading="lazy"
        />
      </div>

      {/* name */}
      <p
        className={`w-full truncate text-center font-mono text-[9px] leading-none transition-colors ${
          isOwned ? 'text-[#b9ec86]/60' : 'text-[#2a2e3e]'
        }`}
      >
        {firstName}
      </p>
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
  const showCosmeticForms = usePokedexStore((s) => s.showCosmeticForms);
  const showGenderForms = usePokedexStore((s) => s.showGenderForms);
  const showGigantamaxForms = usePokedexStore((s) => s.showGigantamaxForms);

  const { data: allEntries, isLoading } = useLivingDexEntries();

  useEffect(() => {
    const id = setInterval(() => forceUpdate((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Derive filtered + sorted entries matching the home box view
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

  // Clamp boxIndex when entries load
  const safeIndex = Math.min(boxIndex, Math.max(0, totalBoxes - 1));
  const currentBox = boxes[safeIndex] ?? [];
  const currentEntries = currentBox.filter((e): e is LivingDexEntry => e !== null);

  // Per-box stats
  const ownedInBox = useMemo(
    () =>
      currentEntries.filter(
        (e) => storeOwned[ownedKey(e.speciesId, e.formName)]?.owned,
      ).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentEntries, storeOwned],
  );

  const missingInBox = useMemo(
    () =>
      currentEntries.filter(
        (e) => !storeOwned[ownedKey(e.speciesId, e.formName)]?.owned,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentEntries, storeOwned],
  );

  // Overall stats
  const totalOwned = useMemo(
    () =>
      filteredEntries.filter(
        (e) => storeOwned[ownedKey(e.speciesId, e.formName)]?.owned,
      ).length,
    [filteredEntries, storeOwned],
  );

  const totalSpecies = filteredEntries.length;
  const boxPct =
    currentEntries.length > 0 ? (ownedInBox / currentEntries.length) * 100 : 0;
  const overallPct = totalSpecies > 0 ? (totalOwned / totalSpecies) * 100 : 0;

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
        <div className="flex items-center gap-2 font-mono text-xs text-[#2d3348]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#2d3348]" />
          Loading…
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* ─── Header ─── */}
      <header className="flex h-10 shrink-0 items-center justify-between border-b border-[#131620] px-4">
        {/* left: live + logo */}
        <div className="flex w-[200px] items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#f87171]" />
            <span className="font-mono text-[9px] font-black uppercase tracking-widest text-[#3a3f52]">
              LIVE
            </span>
          </div>
          <span className="h-3.5 w-px bg-[#131620]" />
          <Image
            src="/brand/brand.svg"
            alt="Amanita"
            width={64}
            height={14}
            className="h-3 w-auto opacity-30"
          />
        </div>

        {/* center: box navigation */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={prev}
            disabled={safeIndex === 0}
            className="grid h-7 w-7 place-items-center rounded-lg bg-[#131620] text-[#3a3f52] transition-colors hover:bg-[#1a1e2e] hover:text-[#e0ddf5] disabled:opacity-30"
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
            className="grid h-7 w-7 place-items-center rounded-lg bg-[#131620] text-[#3a3f52] transition-colors hover:bg-[#1a1e2e] hover:text-[#e0ddf5] disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* right: time */}
        <div className="flex w-[200px] justify-end">
          <time className="font-mono text-[10px] text-[#3a3f52]">{timeStr}</time>
        </div>
      </header>

      {/* ─── Body ─── */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* ─── Box grid ─── */}
        <main className="flex min-w-0 flex-1 items-stretch overflow-hidden border-r border-[#131620] p-4">
          <div
            className="grid h-full w-full gap-2"
            style={{
              gridTemplateColumns: `repeat(${COLS}, 1fr)`,
              gridTemplateRows: `repeat(${ROWS}, 1fr)`,
            }}
          >
            {currentBox.map((entry, i) => (
              <StreamSlot key={entry ? ownedKey(entry.speciesId, entry.formName) : `empty-${i}`} entry={entry} />
            ))}
          </div>
        </main>

        {/* ─── Guide panel ─── */}
        <aside className="flex w-[272px] shrink-0 flex-col gap-5 overflow-hidden p-5">
          {/* Box progress */}
          <section>
            <p className="mb-1 font-mono text-[9px] font-black uppercase tracking-widest text-[#3a3f52]">
              Current Box
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-4xl font-black leading-none text-[#e0ddf5]">
                {ownedInBox}
              </span>
              <span className="font-mono text-base text-[#2d3348]">
                / {currentEntries.length}
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#131620]">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  boxPct === 100 ? 'bg-[#b9ec86]' : boxPct >= 50 ? 'bg-[#67e8f9]' : 'bg-[#a78bfa]'
                }`}
                style={{ width: `${boxPct}%` }}
              />
            </div>
            <p className="mt-1 font-mono text-[10px] text-[#3a3f52]">
              {boxPct.toFixed(0)}% of this box
            </p>
          </section>

          {/* Missing list */}
          <section className="min-h-0 flex-1 overflow-hidden">
            <p className="mb-2.5 font-mono text-[9px] font-black uppercase tracking-widest text-[#3a3f52]">
              Missing{missingInBox.length > 0 && (
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
                {missingInBox.slice(0, 14).map((entry) => (
                  <div key={ownedKey(entry.speciesId, entry.formName)} className="flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={entry.spriteUrl}
                      alt=""
                      className="h-7 w-7 shrink-0 object-contain grayscale opacity-40"
                      loading="lazy"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-xs text-[#8892a4]">
                        {entry.displayName}
                      </p>
                      <p className="font-mono text-[9px] text-[#2d3348]">
                        #{String(entry.speciesId).padStart(4, '0')}
                      </p>
                    </div>
                  </div>
                ))}
                {missingInBox.length > 14 && (
                  <p className="font-mono text-[10px] text-[#2d3348]">
                    +{missingInBox.length - 14} more
                  </p>
                )}
              </div>
            )}
          </section>

          {/* Overall progress */}
          <section className="border-t border-[#131620] pt-4">
            <p className="mb-1.5 font-mono text-[9px] font-black uppercase tracking-widest text-[#3a3f52]">
              Living Dex
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-lg font-black text-[#b9ec86]">
                {totalOwned.toLocaleString()}
              </span>
              <span className="font-mono text-sm text-[#2d3348]">/ {totalSpecies}</span>
            </div>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[#131620]">
              <div
                className="h-full rounded-full bg-[#b9ec86] transition-all duration-700"
                style={{ width: `${overallPct}%` }}
              />
            </div>
            <p className="mt-1 font-mono text-[10px] text-[#3a3f52]">
              {overallPct.toFixed(1)}%
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { usePokedexStore, ownedKey } from '@/store/pokedexStore';
import { useLivingDexEntries } from '@/hooks/usePokemon';
import { isLivingDexSpecies } from '@/lib/livingDex';
import type { LivingDexEntry } from '@/types/pokemon';

// ─────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────

const GEN_ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'] as const;
const MILESTONES = [50, 100, 250, 500, 750, 1025] as const;

function nextMilestone(count: number): { target: number; remaining: number } | null {
  for (const m of MILESTONES) {
    if (count < m) return { target: m, remaining: m - count };
  }
  return null;
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return 'now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

// ─────────────────────────────────────────────────
// Derived data hook
// ─────────────────────────────────────────────────

function useStreamData() {
  const storeOwned = usePokedexStore((s) => s.owned);
  const recentCatches = usePokedexStore((s) => s.recentCatches);
  const shinyHunts = usePokedexStore((s) => s.shinyHunts);
  const { data: allEntries, isLoading } = useLivingDexEntries();

  const entryByKey = useMemo(() => {
    const map = new Map<string, LivingDexEntry>();
    for (const entry of allEntries ?? []) {
      map.set(ownedKey(entry.speciesId, entry.formName), entry);
    }
    return map;
  }, [allEntries]);

  const baseEntries = useMemo(
    () => (allEntries ?? []).filter(isLivingDexSpecies),
    [allEntries],
  );

  const totalOwned = useMemo(
    () =>
      baseEntries.filter((e) => storeOwned[ownedKey(e.speciesId, e.formName)]?.owned)
        .length,
    [baseEntries, storeOwned],
  );

  const shinyOwned = useMemo(
    () =>
      baseEntries.filter((e) => storeOwned[ownedKey(e.speciesId, e.formName)]?.shiny_owned)
        .length,
    [baseEntries, storeOwned],
  );

  const totalSpecies = baseEntries.length;

  const genGroups = useMemo(() => {
    const groups = new Map<number, { total: number; ownedCount: number }>();
    for (const entry of baseEntries) {
      const gen = entry.generation;
      if (!groups.has(gen)) groups.set(gen, { total: 0, ownedCount: 0 });
      const g = groups.get(gen)!;
      g.total += 1;
      if (storeOwned[ownedKey(entry.speciesId, entry.formName)]?.owned) g.ownedCount += 1;
    }
    return Array.from(groups.entries())
      .sort(([a], [b]) => a - b)
      .map(([gen, { total, ownedCount }]) => ({ gen, total, ownedCount }));
  }, [baseEntries, storeOwned]);

  const nearestGen = useMemo(
    () =>
      genGroups
        .filter(({ ownedCount, total }) => ownedCount < total)
        .sort((a, b) => b.ownedCount / b.total - a.ownedCount / a.total)[0] ?? null,
    [genGroups],
  );

  const activeHunts = useMemo(
    () => shinyHunts.filter((h) => !h.completedAt),
    [shinyHunts],
  );

  const recentWithEntries = useMemo(
    () =>
      recentCatches.slice(0, 24).map((event) => ({
        event,
        entry:
          entryByKey.get(ownedKey(event.speciesId, event.formName)) ??
          entryByKey.get(ownedKey(event.speciesId, null)),
      })),
    [recentCatches, entryByKey],
  );

  return {
    isLoading,
    totalOwned,
    shinyOwned,
    totalSpecies,
    genGroups,
    nearestGen,
    activeHunts,
    recentWithEntries,
    entryByKey,
  };
}

// ─────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────

export default function StreamPage() {
  const [, forceUpdate] = useState(0);
  const {
    isLoading,
    totalOwned,
    shinyOwned,
    totalSpecies,
    genGroups,
    nearestGen,
    activeHunts,
    recentWithEntries,
    entryByKey,
  } = useStreamData();

  useEffect(() => {
    const id = setInterval(() => forceUpdate((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const pct = totalSpecies > 0 ? (totalOwned / totalSpecies) * 100 : 0;
  const milestone = nextMilestone(totalOwned);
  const timeStr = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex items-center gap-2 font-mono text-xs text-[#2d3348]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#2d3348]" />
          Loading dex data…
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* ─── Header ─── */}
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-[#131620] px-4">
        <div className="flex items-center gap-3">
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
        <time className="font-mono text-[10px] text-[#3a3f52]">{timeStr}</time>
      </div>

      {/* ─── Body ─── */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* ─── Left: Progress ─── */}
        <aside className="flex w-[256px] shrink-0 flex-col gap-6 overflow-hidden border-r border-[#131620] p-5">
          {/* Overall count */}
          <section>
            <p className="mb-1 font-mono text-[9px] font-black uppercase tracking-widest text-[#3a3f52]">
              Living Dex
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-[42px] font-black leading-none tracking-tight text-[#b9ec86]">
                {totalOwned.toLocaleString()}
              </span>
              <span className="font-mono text-base text-[#222638]">
                /{totalSpecies}
              </span>
            </div>
            {/* Main progress bar */}
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#131620]">
              <div
                className="h-full rounded-full bg-[#b9ec86] transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="font-mono text-[10px] text-[#3a3f52]">
                {pct.toFixed(1)}%
              </span>
              {shinyOwned > 0 && (
                <span className="font-mono text-[10px] text-[#f8d85a]">
                  ✦ {shinyOwned.toLocaleString()}
                </span>
              )}
            </div>
          </section>

          {/* Gen breakdown */}
          <section className="min-h-0 flex-1 overflow-hidden">
            <p className="mb-2.5 font-mono text-[9px] font-black uppercase tracking-widest text-[#3a3f52]">
              Generation
            </p>
            <div className="space-y-2">
              {genGroups.map(({ gen, total, ownedCount }) => {
                const genPct = total > 0 ? (ownedCount / total) * 100 : 0;
                const isComplete = ownedCount === total && total > 0;
                const barColor = isComplete
                  ? 'bg-[#b9ec86]'
                  : genPct >= 75
                  ? 'bg-[#67e8f9]'
                  : genPct >= 50
                  ? 'bg-[#a78bfa]'
                  : 'bg-[#222638]';
                return (
                  <div key={gen}>
                    <div className="mb-0.5 flex items-center justify-between">
                      <span className="font-mono text-[10px] text-[#525870]">
                        Gen {GEN_ROMAN[gen - 1]}
                      </span>
                      <span
                        className={`font-mono text-[10px] tabular-nums ${
                          isComplete ? 'text-[#b9ec86]' : 'text-[#3a3f52]'
                        }`}
                      >
                        {ownedCount}/{total}
                      </span>
                    </div>
                    <div className="h-1 overflow-hidden rounded-full bg-[#131620]">
                      <div
                        className={`h-full rounded-full ${barColor} transition-all duration-700`}
                        style={{ width: `${genPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Goals / next targets */}
          <section className="border-t border-[#131620] pt-4">
            <p className="mb-2 font-mono text-[9px] font-black uppercase tracking-widest text-[#3a3f52]">
              Goals
            </p>
            <div className="space-y-1.5">
              {milestone && (
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#525870]">Next milestone</span>
                  <span className="font-mono text-[10px] text-[#b9ec86]">
                    {milestone.remaining} until {milestone.target}
                  </span>
                </div>
              )}
              {nearestGen && (
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#525870]">
                    Closest gen
                  </span>
                  <span className="font-mono text-[10px] text-[#67e8f9]">
                    Gen {GEN_ROMAN[nearestGen.gen - 1]} —{' '}
                    {nearestGen.total - nearestGen.ownedCount} left
                  </span>
                </div>
              )}
              {!milestone && (
                <p className="font-mono text-[10px] text-[#b9ec86]">
                  Living Dex complete!
                </p>
              )}
            </div>
          </section>
        </aside>

        {/* ─── Center: Sprite parade ─── */}
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden border-r border-[#131620] p-5">
          <p className="mb-3 font-mono text-[9px] font-black uppercase tracking-widest text-[#3a3f52]">
            Recent Catches
          </p>

          {recentWithEntries.length === 0 ? (
            <div className="flex flex-1 items-center justify-center">
              <p className="font-mono text-xs text-[#222638]">
                No catches logged yet
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-6 gap-2 overflow-hidden" style={{ gridAutoRows: '5.5rem' }}>
              {recentWithEntries.map(({ event, entry }, i) => {
                const isNewest = i === 0;
                const spriteUrl = event.isShiny
                  ? (entry?.shinySpriteUrl ?? entry?.spriteUrl)
                  : entry?.spriteUrl;

                return (
                  <div
                    key={`${event.speciesId}-${event.formName ?? 'base'}-${event.date}-${i}`}
                    className={`relative flex flex-col items-center justify-center rounded-lg px-1 pb-1.5 pt-2 ${
                      isNewest
                        ? 'bg-[#0c1220] ring-1 ring-[#b9ec86]/30'
                        : event.isShiny
                        ? 'bg-[#130f05]'
                        : event.isAlpha
                        ? 'bg-[#0d0818]'
                        : 'bg-[#0d0e14]'
                    }`}
                  >
                    {(event.isShiny || event.isAlpha) && (
                      <span
                        className={`absolute right-1 top-1 text-[8px] leading-none ${
                          event.isShiny ? 'text-[#f8d85a]' : 'text-[#c084fc]'
                        }`}
                      >
                        {event.isShiny ? '✦' : 'α'}
                      </span>
                    )}

                    {spriteUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={spriteUrl}
                        alt={entry?.displayName ?? ''}
                        className={`h-10 w-10 object-contain${
                          event.isShiny
                            ? ' drop-shadow-[0_0_6px_rgba(248,216,90,0.5)]'
                            : event.isAlpha
                            ? ' drop-shadow-[0_0_6px_rgba(192,132,252,0.45)]'
                            : ''
                        }`}
                        loading="lazy"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-md bg-[#131620]" />
                    )}

                    <p className="mt-1 w-full truncate text-center font-mono text-[8px] leading-none text-[#3a3f52]">
                      {entry?.displayName?.split(' ')[0] ?? `#${event.speciesId}`}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        {/* ─── Right: Hunts + Activity ─── */}
        <aside className="flex w-[256px] shrink-0 flex-col gap-6 overflow-hidden p-5">
          {/* Active shiny hunts */}
          <section>
            <p className="mb-2.5 font-mono text-[9px] font-black uppercase tracking-widest text-[#3a3f52]">
              Now Hunting
            </p>
            {activeHunts.length === 0 ? (
              <p className="font-mono text-[10px] text-[#222638]">—</p>
            ) : (
              <div className="space-y-2">
                {activeHunts.slice(0, 4).map((hunt) => {
                  const entry =
                    entryByKey.get(ownedKey(hunt.speciesId, hunt.formName)) ??
                    entryByKey.get(ownedKey(hunt.speciesId, null));
                  return (
                    <div
                      key={hunt.id}
                      className="flex items-center gap-2.5 rounded-lg bg-[#0d0e14] px-2.5 py-2"
                    >
                      {entry?.spriteUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={entry.spriteUrl}
                          alt=""
                          className="h-9 w-9 shrink-0 object-contain opacity-60"
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-9 w-9 shrink-0 rounded bg-[#131620]" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-[#c8c0d8]">
                          {entry?.displayName ?? `#${hunt.speciesId}`}
                        </p>
                        <p className="mt-0.5 font-mono text-[10px] text-[#f8d85a]">
                          ✦ {hunt.count.toLocaleString()}{' '}
                          <span className="text-[#3a3f52]">{hunt.counterMode}</span>
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Activity log */}
          <section className="min-h-0 flex-1 overflow-hidden">
            <p className="mb-2.5 font-mono text-[9px] font-black uppercase tracking-widest text-[#3a3f52]">
              Activity
            </p>
            {recentWithEntries.length === 0 ? (
              <p className="font-mono text-[10px] text-[#222638]">—</p>
            ) : (
              <div className="space-y-2">
                {recentWithEntries.slice(0, 10).map(({ event, entry }, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span
                      className={`w-2.5 shrink-0 text-center font-mono text-[9px] leading-none ${
                        event.isShiny
                          ? 'text-[#f8d85a]'
                          : event.isAlpha
                          ? 'text-[#c084fc]'
                          : 'text-[#222638]'
                      }`}
                    >
                      {event.isShiny ? '✦' : event.isAlpha ? 'α' : '·'}
                    </span>
                    <span
                      className={`min-w-0 flex-1 truncate text-xs ${
                        event.isShiny
                          ? 'text-[#f8d85a]'
                          : event.isAlpha
                          ? 'text-[#c084fc]'
                          : 'text-[#8892a4]'
                      }`}
                    >
                      {entry?.displayName ?? `#${event.speciesId}`}
                    </span>
                    <span className="shrink-0 font-mono text-[9px] text-[#2d3348]">
                      {formatRelativeTime(event.date)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

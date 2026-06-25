'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Printer, Search, Timer, Trophy } from 'lucide-react';
import {
  useItemPrinterBrowse,
  useItemPrinterSearch,
  useItemPrinterPrimaryItems,
} from '@/hooks/useItemPrinterSeeds';
import type { ItemPrinterSeed, PrinterCategory, PrinterMode } from '@/lib/itemPrinter/types';
import {
  CATEGORY_LABELS,
  MODE_LABELS,
  CATEGORY_MODES,
  MODE_ORDER,
} from '@/lib/itemPrinter/types';

// ─────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────

type PageMode = 'browse' | 'search';

const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS) as PrinterCategory[];

// ─────────────────────────────────────────────────
// Micro-components
// ─────────────────────────────────────────────────

function ModeBadge({ mode }: { mode: PrinterMode }) {
  const colors: Record<PrinterMode, string> = {
    regular: 'bg-[#1e2a1a] text-[#86efac] ring-1 ring-[#86efac]/20',
    'item-bonus': 'bg-[#1e1a2e] text-[#c4b5fd] ring-1 ring-[#c4b5fd]/20',
    'ball-lotto': 'bg-[#1a1e2e] text-[#93c5fd] ring-1 ring-[#93c5fd]/20',
    combo: 'bg-[#2e1a1a] text-[#fca5a5] ring-1 ring-[#fca5a5]/20',
  };
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${colors[mode]}`}>
      {MODE_LABELS[mode]}
    </span>
  );
}

function PrintJobLine({ item, count }: { item: string; count: number }) {
  return (
    <div className="flex items-center justify-between gap-2 py-0.5">
      <span className="text-sm text-[#c8c0d8]">{item}</span>
      <span className="shrink-0 rounded bg-[#2f2b40] px-1.5 py-0.5 text-xs font-black tabular-nums text-[#e8e4f0]">
        ×{count}
      </span>
    </div>
  );
}

function SeedCard({ seed }: { seed: ItemPrinterSeed }) {
  const dt = seed.seed_datetime.replace('T', ' ');
  const withoutSeconds = dt.slice(0, -2);
  const seconds = dt.slice(-2);

  return (
    <div className="rounded-xl border border-[#2f2b40] bg-[#1a1a27] p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-base font-black tabular-nums text-[#e8e4f0]">
            {withoutSeconds}
            <span className="text-[#f8d85a]">{seconds}</span>
          </p>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="rounded bg-[#2a1e08] px-1.5 py-0.5 text-[10px] font-black tabular-nums text-[#f8d85a]">
              :{seconds}s
            </span>
<span className="text-[11px] tabular-nums text-[#6b6480]">seed: {seed.seed}</span>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          {seed.source === 'game8' && (
            <span className="rounded bg-[#1e2a1a] px-1.5 py-0.5 text-[10px] font-black text-[#86efac] ring-1 ring-[#86efac]/20">
              Game8
            </span>
          )}
          <span className="rounded bg-[#1e2240] px-1.5 py-0.5 text-[10px] font-black text-[#93c5fd]">
            {seed.print_count}-print
          </span>
          <ModeBadge mode={seed.mode} />
        </div>
      </div>

      {seed.summary && (
        <p className="mb-3 text-sm font-bold text-[#e8e4f0]">{seed.summary}</p>
      )}

      {seed.trigger_print && (
        <>
          <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-[#fca5a5]">
            Trigger print (×1 regular)
          </p>
          <div className="mb-2 rounded-lg bg-[#2e1a1a] p-2">
            <PrintJobLine item={seed.trigger_print.item} count={seed.trigger_print.count} />
          </div>
          <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-[#6b6480]">
            Main prints (×{seed.print_count})
          </p>
        </>
      )}

      {seed.source === 'game8' && (
        <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-[#6b6480]">
          Total ({seed.print_count} prints)
        </p>
      )}
      <div className="divide-y divide-[#252232]">
        {seed.prints.map((p, i) => (
          <PrintJobLine key={i} item={p.item} count={p.count} />
        ))}
      </div>

      {seed.bonus_print && (
        <div className="mt-3 border-t border-[#2f2b40] pt-2">
          <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-[#f8d85a]">
            Immediate bonus print
          </p>
          <div className="rounded-lg bg-[#1e1a10] p-2">
            <PrintJobLine item={seed.bonus_print.item} count={seed.bonus_print.count} />
          </div>
        </div>
      )}

      {seed.note && (
        <p className="mt-3 border-t border-[#2f2b40] pt-2 text-[11px] text-[#6b6480]">
          {seed.note}
        </p>
      )}
    </div>
  );
}

function SeedList({ seeds, loading }: { seeds: ItemPrinterSeed[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl bg-[#1a1a27]" />
        ))}
      </div>
    );
  }
  if (seeds.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[#2f2b40] p-10 text-center">
        <p className="text-sm font-semibold text-[#6b6480]">No seeds found.</p>
        <p className="mt-1 text-xs text-[#3d3456]">Try a different seconds value or clear the filter.</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {seeds.map((s) => <SeedCard key={s.id} seed={s} />)}
    </div>
  );
}

// ─────────────────────────────────────────────────
// Pinned activation cards (how to trigger each mode)
// ─────────────────────────────────────────────────

const PINNED_MODES: PrinterMode[] = ['item-bonus', 'ball-lotto'];

interface PinnedModeInfo {
  mode: PrinterMode;
  triggerTime: string;
  instruction: string;
  border: string;
  bg: string;
  label: string;
}

const PINNED_INFO: Record<'item-bonus' | 'ball-lotto', PinnedModeInfo> = {
  'item-bonus': {
    mode: 'item-bonus',
    triggerTime: '2024-01-05 20:08:18',
    instruction: 'Set clock to this time and print once to activate 2× Item Bonus, then keep printing.',
    border: 'border-[#c4b5fd]/30',
    bg: 'bg-[#1e1a2e]',
    label: 'text-[#c4b5fd]',
  },
  'ball-lotto': {
    mode: 'ball-lotto',
    triggerTime: '2024-01-07 23:03:20',
    instruction: 'Set clock to this time and print once to trigger Ball Lotto, then use a ball seed.',
    border: 'border-[#93c5fd]/30',
    bg: 'bg-[#1a1e2e]',
    label: 'text-[#93c5fd]',
  },
};

function PinnedModeCard({
  info,
  activeMode,
  onActivate,
}: {
  info: PinnedModeInfo;
  activeMode: PrinterMode;
  onActivate: () => void;
}) {
  const isActive = activeMode === info.mode;

  return (
    <button
      type="button"
      onClick={onActivate}
      className={`flex-1 rounded-xl border p-3 text-left transition-all ${info.border} ${info.bg} ${
        isActive ? 'ring-2 ring-violet-500/50' : 'hover:brightness-110'
      }`}
    >
      <p className={`mb-2 text-[10px] font-black uppercase tracking-widest ${info.label}`}>
        {MODE_LABELS[info.mode]}
      </p>
      <p className="mb-1 font-mono text-sm font-black tabular-nums text-[#e8e4f0]">
        {info.triggerTime}
      </p>
      <p className="text-[11px] leading-4 text-[#6b6480]">
        {info.instruction}
      </p>
    </button>
  );
}

// ─────────────────────────────────────────────────
// Browse view
// ─────────────────────────────────────────────────

const LS_MACRO_SECONDS = 'item-printer:macro-seconds';

function BrowseView() {
  const [category, setCategory] = useState<PrinterCategory | 'all'>('all');
  const [mode, setMode] = useState<PrinterMode>('regular');
  const [primaryItem, setPrimaryItem] = useState<string>('');
  const [limit, setLimit] = useState(20);
  const [minSeconds, setMinSeconds] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    return parseInt(localStorage.getItem(LS_MACRO_SECONDS) ?? '0', 10);
  });
  useEffect(() => {
    localStorage.setItem(LS_MACRO_SECONDS, String(minSeconds));
  }, [minSeconds]);

  const availableModes = category === 'all' ? MODE_ORDER : CATEGORY_MODES[category];
  const visiblePins = category === 'all'
    ? []
    : (PINNED_MODES.filter((m) => availableModes.includes(m)) as ('item-bonus' | 'ball-lotto')[]);

  const { data: primaryItems = [], isLoading: itemsLoading } =
    useItemPrinterPrimaryItems(category === 'all' ? 'tera-shard' : category);

  const { data: seeds = [], isLoading: seedsLoading } = useItemPrinterBrowse({
    category,
    mode,
    primaryItem: primaryItem || undefined,
    minSeconds: minSeconds > 0 ? minSeconds : undefined,
    limit,
  });

  const handleCategoryChange = (next: PrinterCategory | 'all') => {
    setCategory(next);
    setPrimaryItem('');
    setLimit(20);
    const nextModes = next === 'all' ? MODE_ORDER : CATEGORY_MODES[next];
    if (!nextModes.includes(mode)) setMode(nextModes[0]);
  };

  const showItemFilter = category !== 'all' && primaryItems.length > 1;

  return (
    <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
      {/* Sidebar */}
      <aside className="lg:sticky lg:top-4 lg:self-start">
        <div className="space-y-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:pb-4">
        {/* Macro settings — top so it's always visible */}
        <section className="rounded-xl border border-[#2f2b40] bg-[#1a1a27] p-4">
          <div className="mb-3 flex items-center gap-2">
            <Timer className="h-3.5 w-3.5 text-[#f8d85a]" />
            <p className="text-[10px] font-black uppercase tracking-widest text-[#6b6480]">
              Macro Settings
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-[#a09ab5]">
                Macro duration (exact seconds)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={58}
                  value={minSeconds === 0 ? '' : minSeconds}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    setMinSeconds(isNaN(v) ? 0 : Math.min(58, Math.max(0, v)));
                  }}
                  placeholder="Any"
                  className="h-9 w-20 rounded-lg border border-[#2f2b40] bg-[#13131e] px-3 text-sm font-black tabular-nums text-[#f8d85a] outline-none placeholder:font-normal placeholder:text-[#3d3456] focus:border-yellow-500/60"
                />
                {minSeconds > 0 && (
                  <span className="text-xs text-[#6b6480]">
                    seeds at exactly <span className="font-black text-[#f8d85a]">:{String(minSeconds).padStart(2, '0')}s</span>
                  </span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {[0, 10, 15, 16, 20, 30, 45].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setMinSeconds(s)}
                    className={`rounded px-2 py-1 text-[10px] font-black transition-colors ${
                      minSeconds === s
                        ? 'bg-yellow-500/20 text-[#f8d85a]'
                        : 'bg-[#2f2b40] text-[#6b6480] hover:text-[#a09ab5]'
                    }`}
                  >
                    {s === 0 ? 'Any' : `${s}s`}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </section>

        <section className="rounded-xl border border-[#2f2b40] bg-[#1a1a27] p-4">
          <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-[#6b6480]">
            Category
          </p>
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => handleCategoryChange('all')}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm font-bold transition-colors ${
                category === 'all'
                  ? 'bg-violet-700 text-white'
                  : 'text-[#a09ab5] hover:bg-[#2f2b40] hover:text-[#e8e4f0]'
              }`}
            >
              All Categories
            </button>
            {ALL_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => handleCategoryChange(cat)}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm font-bold transition-colors ${
                  category === cat
                    ? 'bg-violet-700 text-white'
                    : 'text-[#a09ab5] hover:bg-[#2f2b40] hover:text-[#e8e4f0]'
                }`}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
        </section>

        {showItemFilter && (
          <section className="rounded-xl border border-[#2f2b40] bg-[#1a1a27] p-4">
            <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-[#6b6480]">
              Item
            </p>
            {itemsLoading ? (
              <div className="h-20 animate-pulse rounded-lg bg-[#2f2b40]" />
            ) : (
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => { setPrimaryItem(''); setLimit(20); }}
                  className={`rounded-full px-2.5 py-1 text-xs font-bold transition-colors ${
                    !primaryItem
                      ? 'bg-violet-700 text-white'
                      : 'bg-[#2f2b40] text-[#a09ab5] hover:text-[#e8e4f0]'
                  }`}
                >
                  All
                </button>
                {primaryItems.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => { setPrimaryItem(item); setLimit(20); }}
                    className={`rounded-full px-2.5 py-1 text-xs font-bold transition-colors ${
                      primaryItem === item
                        ? 'bg-violet-700 text-white'
                        : 'bg-[#2f2b40] text-[#a09ab5] hover:text-[#e8e4f0]'
                    }`}
                  >
                    {item.replace(' Tera Shard', '').replace(' Ball', '')}
                  </button>
                ))}
              </div>
            )}
          </section>
        )}
        </div>
      </aside>

      {/* Results */}
      <main>
        {visiblePins.length > 0 && mode !== 'combo' && (
          <div className="mb-4">
            <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-[#6b6480]">
              How to activate
            </p>
            <div className="flex gap-2">
              {visiblePins.map((pm) => (
                <PinnedModeCard
                  key={pm}
                  info={PINNED_INFO[pm]}
                  activeMode={mode}
                  onActivate={() => { setMode(pm); setLimit(20); }}
                />
              ))}
            </div>
          </div>
        )}
        {mode === 'combo' && (
          <div className="mb-4 rounded-xl border border-[#2f2b40] bg-[#1a1a27] p-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#6b6480]">Combo</p>
            <p className="mt-1 text-xs text-[#a09ab5]">
              No pre-activation needed. Set the clock to the seed&apos;s time — print 1 triggers the bonus, remaining prints give the items.
            </p>
          </div>
        )}

        <div className="mb-4 flex gap-1 rounded-xl border border-[#2f2b40] bg-[#13131e] p-1">
          {MODE_ORDER.filter((m) => availableModes.includes(m)).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setLimit(20); }}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold transition-colors ${
                mode === m
                  ? 'bg-[#1a1a27] text-[#e8e4f0] shadow-sm'
                  : 'text-[#6b6480] hover:text-[#a09ab5]'
              }`}
            >
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>

        {seeds.length > 0 && (
          <div className="mb-3 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-[#f8d85a]" />
            <span className="text-sm font-bold text-[#e8e4f0]">
              Best: {seeds[0].primary_item_count}× {seeds[0].primary_item}
            </span>
            <span className="text-xs text-[#6b6480]">({seeds.length} seeds)</span>
          </div>
        )}

        <SeedList seeds={seeds} loading={seedsLoading} />
        {!seedsLoading && seeds.length === limit && (
          <button
            type="button"
            onClick={() => setLimit((l) => l + 20)}
            className="mt-4 w-full rounded-xl border border-[#2f2b40] bg-[#1a1a27] py-3 text-sm font-bold text-[#a09ab5] transition-colors hover:bg-[#2f2b40] hover:text-[#e8e4f0]"
          >
            Load more
          </button>
        )}
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────
// Search view
// ─────────────────────────────────────────────────

function SearchView() {
  const [query, setQuery] = useState('');
  const [modeFilter, setModeFilter] = useState<PrinterMode | ''>('');

  const { data: seeds = [], isLoading } = useItemPrinterSearch({
    query,
    mode: modeFilter || undefined,
  });

  const modeOptions: [PrinterMode | '', string][] = [
    ['', 'All modes'],
    ...MODE_ORDER.map((m): [PrinterMode, string] => [m, MODE_LABELS[m]]),
  ];

  const grouped = useMemo(() => {
    const map = new Map<string, ItemPrinterSeed[]>();
    for (const s of seeds) {
      const list = map.get(s.primary_item) ?? [];
      list.push(s);
      map.set(s.primary_item, list);
    }
    return [...map.entries()].sort((a, b) =>
      (b[1][0]?.primary_item_count ?? 0) - (a[1][0]?.primary_item_count ?? 0),
    );
  }, [seeds]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b6480]" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search items… e.g. Ability Patch, Normal Tera Shard, Fast Ball"
            className="h-10 w-full rounded-lg border border-[#2f2b40] bg-[#13131e] pl-9 pr-3 text-sm text-[#e8e4f0] outline-none placeholder:text-[#6b6480] focus:border-violet-600 focus:ring-1 focus:ring-violet-600/40"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {modeOptions.map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => setModeFilter(val)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                modeFilter === val
                  ? 'bg-violet-700 text-white'
                  : 'bg-[#2f2b40] text-[#a09ab5] hover:text-[#e8e4f0]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {query.trim().length >= 2 && (
        <>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-32 animate-pulse rounded-xl bg-[#1a1a27]" />
              ))}
            </div>
          ) : grouped.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#2f2b40] p-10 text-center">
              <p className="text-sm font-semibold text-[#6b6480]">
                No seeds found for &quot;{query}&quot;.
              </p>
            </div>
          ) : (
            grouped.map(([item, itemSeeds]) => (
              <section key={item}>
                <div className="mb-2 flex items-center gap-2">
                  <h2 className="text-sm font-black text-[#e8e4f0]">{item}</h2>
                  <span className="text-xs text-[#6b6480]">{itemSeeds.length} seeds</span>
                </div>
                <div className="space-y-3">
                  {itemSeeds.map((s) => <SeedCard key={s.id} seed={s} />)}
                </div>
              </section>
            ))
          )}
        </>
      )}

      {query.trim().length < 2 && (
        <div className="rounded-xl border border-dashed border-[#2f2b40] p-12 text-center">
          <Search className="mx-auto mb-3 h-10 w-10 text-[#2f2b40]" />
          <p className="text-sm font-semibold text-[#6b6480]">
            Type at least 2 characters to search seeds.
          </p>
          <p className="mt-1 text-xs text-[#3d3456]">
            Try &quot;Ability Patch&quot;, &quot;Normal Tera&quot;, &quot;Fast Ball&quot;, &quot;Gold Bottle Cap&quot;
          </p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────
// Page root
// ─────────────────────────────────────────────────

const MODE_TABS: [PageMode, string][] = [
  ['browse', 'Best Seeds'],
  ['search', 'Search'],
];

export default function ItemPrinterPage() {
  const [pageMode, setPageMode] = useState<PageMode>('browse');

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 pb-10">
      {/* Header */}
      <div className="mb-5">
        <Link
          href="/tools"
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#6b6480] hover:text-[#e8e4f0]"
        >
          <ArrowLeft className="h-4 w-4" />
          Tools
        </Link>
        <div className="mb-2 grid h-11 w-11 place-items-center rounded-xl bg-violet-900/40 text-violet-400">
          <Printer className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-[#e8e4f0]">
          Item Printer Seeds
        </h1>
        <p className="mt-1 max-w-xl text-sm text-[#6b6480]">
          RNG seeds for the Scarlet/Violet Item Printer. Set your Switch clock to the
          listed time to guarantee specific items. Requires Master Ball upgrade.
        </p>
        <a
          href="https://gist.github.com/Lusamine/112d4230919fadd254f0e6dfca850471"
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-xs text-[#6b6480] hover:text-[#a09ab5]"
        >
          Data: Lusamine (gist.github.com)
        </a>
      </div>

      {/* Mode tabs */}
      <div className="mb-5 flex gap-1 rounded-xl border border-[#2f2b40] bg-[#13131e] p-1">
        {MODE_TABS.map(([mode, label]) => (
          <button
            key={mode}
            type="button"
            onClick={() => setPageMode(mode)}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
              pageMode === mode
                ? 'bg-[#1a1a27] text-[#e8e4f0] shadow-sm'
                : 'text-[#6b6480] hover:text-[#a09ab5]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {pageMode === 'browse' ? <BrowseView /> : <SearchView />}
    </div>
  );
}

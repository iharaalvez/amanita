"use client";

import { useMemo, useState } from "react";
import { Donut, Minus, Plus, RotateCcw, Search } from "lucide-react";
import Link from "next/link";
import {
  calculateDonutTotals,
  DONUT_BERRIES,
  DONUT_FLAVORS,
  DONUT_RECIPE_SOURCE_URL,
  DONUT_SOURCE_URL,
  FLAVOR_BUDGET_THRESHOLDS,
  getBudgetForPoints,
  getDominantFlavors,
  RECOMMENDED_DONUT_RECIPES,
  TOTAL_FLAVOR_BUDGET_THRESHOLDS,
  type DonutBerry,
  type DonutFlavor,
  type RecommendedDonutRecipe,
  type DonutSelection,
} from "@/lib/donuts/data";

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_BERRIES = 8;
const MIN_DONUT_BERRIES = 3;
const BAR_SCALE = 800; // points at 100% width

const CATEGORY_ORDER: RecommendedDonutRecipe["category"][] = [
  "Flavor Budget",
  "Rainbow",
  "Shiny Hunting",
  "Item Farming",
  "Berry Farming",
  "Story",
];

const CATEGORY_META: Record<
  RecommendedDonutRecipe["category"],
  { label: string; color: string; bg: string }
> = {
  "Flavor Budget": {
    label: "Lv. Budget",
    color: "#fb923c",
    bg: "bg-[#2a1710]",
  },
  Rainbow: { label: "Rainbow", color: "#38bdf8", bg: "bg-[#0c1f2a]" },
  "Shiny Hunting": { label: "✦ Shiny", color: "#f8d85a", bg: "bg-[#2a2010]" },
  "Item Farming": { label: "◈ Items", color: "#a3e635", bg: "bg-[#1a2210]" },
  "Berry Farming": { label: "✿ Berries", color: "#67e8f9", bg: "bg-[#0e1e22]" },
  Story: { label: "◎ Story", color: "#c084fc", bg: "bg-[#1a1030]" },
};

// Location tier display order for the berry table.
const TIER_ORDER = [
  "Vendor",
  "★1",
  "★1-2",
  "★2",
  "★3",
  "★4",
  undefined,
] as const;
const TIER_LABELS: Record<string, string> = {
  Vendor: "Vendor",
  "★1": "Rank ★1",
  "★1-2": "Rank ★1–2",
  "★2": "Rank ★2",
  "★3": "Rank ★3",
  "★4": "Rank ★4",
};

type FlavorFilter = DonutFlavor | "all";

// ─── Page ────────────────────────────────────────────────────────────────────

export default function DonutToolPage() {
  const [selection, setSelection] = useState<DonutSelection>({});
  const [query, setQuery] = useState("");
  const [flavorFilter, setFlavorFilter] = useState<FlavorFilter>("all");

  const totals = useMemo(() => calculateDonutTotals(selection), [selection]);
  const dominantFlavors = useMemo(() => getDominantFlavors(totals), [totals]);

  const totalFlavorPoints = DONUT_FLAVORS.reduce(
    (sum, f) => sum + totals[f.id],
    0,
  );
  const totalBudget = getBudgetForPoints(
    totalFlavorPoints,
    TOTAL_FLAVOR_BUDGET_THRESHOLDS,
  );

  const filteredBerries = useMemo(() => {
    const q = query.trim().toLowerCase();
    return DONUT_BERRIES.filter((berry) => {
      const matchesQuery = !q || berry.name.toLowerCase().includes(q);
      const matchesFlavor = flavorFilter === "all" || berry[flavorFilter] > 0;
      return matchesQuery && matchesFlavor;
    });
  }, [query, flavorFilter]);

  // Group filtered berries by location tier.
  const tieredBerries = useMemo(() => {
    const groups = new Map<string | undefined, DonutBerry[]>();
    for (const t of TIER_ORDER) groups.set(t, []);
    for (const berry of filteredBerries) {
      groups.get(berry.location)!.push(berry);
    }
    return groups;
  }, [filteredBerries]);

  const selectedBerries = DONUT_BERRIES.filter(
    (b) => (selection[b.id] ?? 0) > 0,
  );

  // Slot colors: each of the 8 slots gets the color of the berry filling it.
  const slotColors = useMemo<(string | null)[]>(() => {
    const colors: (string | null)[] = [];
    for (const berry of selectedBerries) {
      const count = selection[berry.id] ?? 0;
      const maxVal = Math.max(
        berry.sweet,
        berry.spicy,
        berry.sour,
        berry.bitter,
        berry.fresh,
      );
      const dominant = DONUT_FLAVORS.find((f) => berry[f.id] === maxVal);
      const c = dominant?.color ?? "#4e367f";
      for (let i = 0; i < count; i++) colors.push(c);
    }
    while (colors.length < MAX_BERRIES) colors.push(null);
    return colors.slice(0, MAX_BERRIES);
  }, [selectedBerries, selection]);

  const updateBerry = (berryId: string, delta: number) => {
    setSelection((cur) => {
      const current = cur[berryId] ?? 0;
      if (delta > 0 && totals.berryCount >= MAX_BERRIES) return cur;
      const next = Math.max(0, current + delta);
      const updated = { ...cur };
      if (next === 0) delete updated[berryId];
      else updated[berryId] = next;
      return updated;
    });
  };

  const loadRecipe = (recipe: RecommendedDonutRecipe) => {
    setSelection(
      Object.fromEntries(recipe.ingredients.map((i) => [i.berryId, i.count])),
    );
  };

  return (
    <div className="min-h-full bg-[#11111b] px-4 py-6 text-[#f8f0df] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* ── Header ── */}
        <header className="mb-6">
          <Link
            href="/tools"
            className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#554a70] hover:text-[#f8f0df] transition-colors"
          >
            ← Tools
          </Link>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2 text-[#f472b6]">
                <Donut className="h-4 w-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">
                  Legends: Z-A Tool
                </span>
              </div>
              <h1 className="text-3xl font-black tracking-tight">
                Ansha&apos;s Donuts
              </h1>
              <p className="mt-1 text-sm text-[#8f8799]">
                Build your perfect donut from berry flavor stats. Select up to 8
                berries to see your flavor budget and power rolls.
              </p>
            </div>
            <div className="flex gap-2">
              {[
                { label: "Serebii", href: DONUT_SOURCE_URL },
                { label: "Game8", href: DONUT_RECIPE_SOURCE_URL },
              ].map(({ label, href }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-8 items-center rounded-lg border border-[#2f2b40] bg-[#1a1a27] px-3 text-xs font-bold text-[#8f8799] transition-colors hover:border-[#f472b6]/40 hover:text-[#f8f0df]"
                >
                  {label} ↗
                </a>
              ))}
            </div>
          </div>
        </header>

        {/* ── Two-column layout ── */}
        <div className="grid items-start gap-5 xl:grid-cols-[1fr_380px]">
          {/* ── Main content ── */}
          <div className="space-y-6">
            {/* ── Recipes ── */}
            <section>
              <h2 className="mb-3 text-[10px] font-black uppercase tracking-widest text-[#554a70]">
                Best Recipes
              </h2>
              <div className="space-y-5">
                {CATEGORY_ORDER.map((category) => {
                  const recipes = RECOMMENDED_DONUT_RECIPES.filter(
                    (r) => r.category === category,
                  );
                  const meta = CATEGORY_META[category];
                  return (
                    <div key={category}>
                      <div className="mb-2 flex items-center gap-2">
                        <span
                          className="text-xs font-black"
                          style={{ color: meta.color }}
                        >
                          {meta.label}
                        </span>
                        <div className="h-px flex-1 bg-[#2f2b40]/60" />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {recipes.map((recipe) => (
                          <RecipeCard
                            key={recipe.id}
                            recipe={recipe}
                            onLoad={() => loadRecipe(recipe)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ── Berry reference table ── */}
            <section>
              <h2 className="mb-3 text-[10px] font-black uppercase tracking-widest text-[#554a70]">
                Berry Reference
              </h2>

              {/* Search + filter */}
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <div className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border border-[#2f2b40] bg-[#151520] px-3">
                  <Search className="h-3.5 w-3.5 shrink-0 text-[#554a70]" />
                  <label htmlFor="berry-search" className="sr-only">
                    Search berries
                  </label>
                  <input
                    id="berry-search"
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search berries…"
                    className="min-w-0 flex-1 bg-transparent text-[11px] font-medium text-[#f8f0df] outline-none placeholder:text-[#554a70]"
                  />
                </div>
                <div className="flex flex-wrap gap-1">
                  <FilterPill
                    label="All"
                    active={flavorFilter === "all"}
                    onClick={() => setFlavorFilter("all")}
                  />
                  {DONUT_FLAVORS.map((f) => (
                    <FilterPill
                      key={f.id}
                      label={f.label}
                      active={flavorFilter === f.id}
                      color={flavorFilter === f.id ? f.color : undefined}
                      onClick={() => setFlavorFilter(f.id)}
                    />
                  ))}
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-[#2f2b40] bg-[#1a1a27]/80">
                {/* Table header */}
                <div className="hidden grid-cols-[minmax(160px,1fr)_48px_48px_48px_48px_48px_40px_52px_84px] gap-1 border-b border-[#2f2b40] bg-[#151520] px-4 py-2 lg:grid">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#554a70]">
                    Berry
                  </span>
                  {DONUT_FLAVORS.map((f) => (
                    <span
                      key={f.id}
                      className="text-center text-[10px] font-black uppercase tracking-widest"
                      style={{ color: f.color }}
                    >
                      {f.label.slice(0, 3)}
                    </span>
                  ))}
                  <span className="text-center text-[10px] font-black uppercase tracking-widest text-[#554a70]">
                    Lv
                  </span>
                  <span className="text-center text-[10px] font-black uppercase tracking-widest text-[#554a70]">
                    Cal
                  </span>
                  <span className="text-center text-[10px] font-black uppercase tracking-widest text-[#554a70]">
                    Qty
                  </span>
                </div>

                {/* Tier groups */}
                {TIER_ORDER.map((tier) => {
                  const berries = tieredBerries.get(tier) ?? [];
                  if (berries.length === 0) return null;
                  const tierLabel =
                    tier === undefined
                      ? "Basic Berries"
                      : (TIER_LABELS[tier] ?? tier);
                  return (
                    <div key={tier ?? "__basic"}>
                      <div className="flex items-center gap-3 border-b border-[#2f2b40]/50 bg-[#151520]/60 px-4 py-1.5">
                        <span className="text-[9px] font-black uppercase tracking-widest text-[#554a70]">
                          {tierLabel}
                        </span>
                        <div className="h-px flex-1 bg-[#2f2b40]/40" />
                      </div>
                      <div className="divide-y divide-[#2f2b40]/30">
                        {berries.map((berry) => (
                          <BerryRow
                            key={berry.id}
                            berry={berry}
                            count={selection[berry.id] ?? 0}
                            canAdd={totals.berryCount < MAX_BERRIES}
                            onAdd={() => updateBerry(berry.id, 1)}
                            onRemove={() => updateBerry(berry.id, -1)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}

                {filteredBerries.length === 0 && (
                  <p className="m-5 rounded-xl border border-dashed border-[#2f2b40] py-10 text-center text-xs font-semibold text-[#554a70]">
                    No berries match.
                  </p>
                )}
              </div>
            </section>
          </div>

          {/* ── Sticky sidebar ── */}
          <aside className="space-y-4 xl:sticky xl:top-4">
            {/* Builder */}
            <div className="overflow-hidden rounded-xl border border-[#2f2b40] bg-[#1a1a27]/80">
              <div className="flex items-center justify-between border-b border-[#2f2b40] px-4 py-3.5">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#f472b6]">
                    Current Donut
                  </p>
                  <h2 className="mt-0.5 text-lg font-black">
                    {totals.berryCount}
                    <span className="text-[#554a70]">/{MAX_BERRIES}</span>
                    <span className="ml-2 text-sm font-semibold text-[#8f8799]">
                      berries
                    </span>
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSelection({})}
                  disabled={totals.berryCount === 0}
                  aria-label="Clear donut"
                  className="grid h-8 w-8 place-items-center rounded-lg text-[#554a70] transition-colors hover:bg-white/5 hover:text-[#f8f0df] disabled:opacity-30"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {/* 8 slot indicator */}
                <div className="flex gap-1.5">
                  {slotColors.map((color, i) => (
                    <div
                      key={i}
                      className="h-3 flex-1 rounded-full transition-all duration-200"
                      style={{
                        backgroundColor: color ?? "#2f2b40",
                        opacity: color ? 1 : 0.5,
                      }}
                    />
                  ))}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2">
                  <BuilderStat label="Level" value={`+${totals.level}`} />
                  <BuilderStat
                    label="Calories"
                    value={totals.calories.toLocaleString()}
                  />
                  <BuilderStat
                    label="Budget"
                    value={String(totalBudget)}
                    highlight={totalBudget >= 7}
                  />
                </div>

                {totals.berryCount > 0 &&
                  totals.berryCount < MIN_DONUT_BERRIES && (
                    <p className="rounded-lg border border-[#f8d85a]/20 bg-[#2a2010] px-3 py-2 text-[11px] font-semibold text-[#f8d85a]/80">
                      Ansha requires at least 3 berries to make a donut.
                    </p>
                  )}

                {/* Selected berry list */}
                {selectedBerries.length > 0 && (
                  <div className="space-y-1.5">
                    {selectedBerries.map((berry) => (
                      <SelectedBerryPill
                        key={berry.id}
                        berry={berry}
                        count={selection[berry.id] ?? 0}
                        canIncrease={totals.berryCount < MAX_BERRIES}
                        onDecrease={() => updateBerry(berry.id, -1)}
                        onIncrease={() => updateBerry(berry.id, 1)}
                      />
                    ))}
                  </div>
                )}

                {totals.berryCount === 0 && (
                  <p className="py-4 text-center text-xs font-semibold text-[#3d3456]">
                    Add berries from the table below.
                  </p>
                )}
              </div>
            </div>

            {/* Flavor profile */}
            <div className="overflow-hidden rounded-xl border border-[#2f2b40] bg-[#1a1a27]/80 p-4">
              <h2 className="mb-4 text-[10px] font-black uppercase tracking-widest text-[#554a70]">
                Flavor Profile
              </h2>
              <div className="space-y-3.5">
                {DONUT_FLAVORS.map((flavor) => {
                  const points = totals[flavor.id];
                  const budget = getBudgetForPoints(
                    points,
                    FLAVOR_BUDGET_THRESHOLDS,
                  );
                  return (
                    <FlavorBar
                      key={flavor.id}
                      label={flavor.label}
                      color={flavor.color}
                      points={points}
                      budget={budget}
                    />
                  );
                })}
              </div>
            </div>

            {/* Power guide */}
            <div className="overflow-hidden rounded-xl border border-[#2f2b40] bg-[#1a1a27]/80 p-4">
              <h2 className="mb-3 text-[10px] font-black uppercase tracking-widest text-[#554a70]">
                Power Guide
              </h2>
              {dominantFlavors.length === 0 ? (
                <p className="text-xs text-[#3d3456]">
                  Add berries to see possible power rolls.
                </p>
              ) : (
                <div className="space-y-3">
                  {DONUT_FLAVORS.map((flavor) => {
                    const points = totals[flavor.id];
                    const budget = getBudgetForPoints(
                      points,
                      FLAVOR_BUDGET_THRESHOLDS,
                    );
                    if (budget === 0) return null;
                    return (
                      <div key={flavor.id}>
                        <div className="mb-1.5 flex items-center gap-2">
                          <span
                            className="text-[10px] font-black"
                            style={{ color: flavor.color }}
                          >
                            {flavor.label}
                          </span>
                          <span className="text-[9px] font-bold text-[#3d3456]">
                            Lv.{budget}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {flavor.powers.map((power) => (
                            <span
                              key={power}
                              className="rounded-full px-2 py-0.5 text-[10px] font-bold text-[#8f8799]"
                              style={{
                                backgroundColor: `${flavor.color}18`,
                                border: `1px solid ${flavor.color}30`,
                              }}
                            >
                              {power}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <p className="mt-3 text-[10px] leading-5 text-[#3d3456]">
                Powers roll randomly from the dominant flavor&apos;s pool. Tied
                flavors expand the eligible pool.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function BuilderStat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-lg bg-[#151520] px-3 py-2">
      <p
        className={`text-lg font-black tabular-nums ${highlight ? "text-[#b9ec86]" : "text-[#f8f0df]"}`}
      >
        {value}
      </p>
      <p className="text-[9px] font-black uppercase tracking-widest text-[#554a70]">
        {label}
      </p>
    </div>
  );
}

function FlavorBar({
  label,
  color,
  points,
  budget,
}: {
  label: string;
  color: string;
  points: number;
  budget: number;
}) {
  const pct = Math.min(100, (points / BAR_SCALE) * 100);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px] font-black" style={{ color }}>
          {label}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] tabular-nums text-[#554a70]">
            {points} pts
          </span>
          {budget > 0 && (
            <span
              className="rounded-full px-1.5 py-0.5 text-[9px] font-black"
              style={{ backgroundColor: `${color}25`, color }}
            >
              Lv.{budget}
            </span>
          )}
        </div>
      </div>
      <div className="relative h-2 overflow-hidden rounded-full bg-[#151520]">
        {/* Threshold tick marks */}
        {FLAVOR_BUDGET_THRESHOLDS.map((t) => (
          <div
            key={t.budget}
            className="absolute top-0 h-full w-px bg-white/10"
            style={{ left: `${(t.points / BAR_SCALE) * 100}%` }}
          />
        ))}
        {/* Fill */}
        <div
          className="h-full rounded-full transition-all duration-200"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function SelectedBerryPill({
  berry,
  count,
  canIncrease,
  onDecrease,
  onIncrease,
}: {
  berry: DonutBerry;
  count: number;
  canIncrease: boolean;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-[#151520] px-2.5 py-1.5">
      <span className="min-w-0 flex-1 truncate text-xs font-bold text-[#f8f0df]">
        {berry.name}
      </span>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={onDecrease}
          className="grid h-6 w-6 place-items-center rounded-md text-[#554a70] transition-colors hover:bg-white/5 hover:text-[#f8f0df]"
          aria-label={`Remove ${berry.name}`}
        >
          <Minus className="h-3 w-3" />
        </button>
        <span className="w-5 text-center text-xs font-black tabular-nums text-[#f8f0df]">
          {count}
        </span>
        <button
          type="button"
          onClick={onIncrease}
          disabled={!canIncrease}
          className="grid h-6 w-6 place-items-center rounded-md text-[#f472b6] transition-colors hover:bg-white/5 disabled:opacity-30"
          aria-label={`Add ${berry.name}`}
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

function FilterPill({
  label,
  active,
  color,
  onClick,
}: {
  label: string;
  active: boolean;
  color?: string;
  onClick: () => void;
}) {
  const useColorStyle = active && !!color;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors ${
        useColorStyle
          ? ""
          : active
            ? "bg-[#4e367f] text-[#f8f0df]"
            : "border border-[#2f2b40] bg-[#1a1a27] text-[#8f8799] hover:text-[#f8f0df]"
      }`}
      style={
        useColorStyle
          ? {
              backgroundColor: `${color}20`,
              color,
              border: `1px solid ${color}40`,
            }
          : undefined
      }
    >
      {label}
    </button>
  );
}

function RecipeCard({
  recipe,
  onLoad,
}: {
  recipe: RecommendedDonutRecipe;
  onLoad: () => void;
}) {
  const recipeSelection = Object.fromEntries(
    recipe.ingredients.map((i) => [i.berryId, i.count]),
  );
  const totals = calculateDonutTotals(recipeSelection);
  const totalFlavors = DONUT_FLAVORS.reduce((s, f) => s + totals[f.id], 0);
  const meta = CATEGORY_META[recipe.category];

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-[#2f2b40] bg-[#1a1a27]/80 transition-colors hover:border-[#3f3860]">
      {/* Mini flavor composition bar */}
      <div className="flex h-1.5">
        {DONUT_FLAVORS.map((f) => {
          const pct =
            totalFlavors > 0 ? (totals[f.id] / totalFlavors) * 100 : 0;
          if (pct === 0) return null;
          return (
            <div
              key={f.id}
              style={{ width: `${pct}%`, backgroundColor: f.color }}
            />
          );
        })}
      </div>

      <div className="flex flex-1 flex-col p-3.5">
        <div className="mb-2 flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <span
              className="text-[9px] font-black uppercase tracking-widest"
              style={{ color: meta.color }}
            >
              {meta.label}
            </span>
            <h3 className="mt-0.5 text-sm font-black leading-tight text-[#f8f0df]">
              {recipe.title}
            </h3>
          </div>
        </div>

        <p className="mb-3 text-[11px] leading-5 text-[#8f8799]">
          {recipe.description}
        </p>

        {/* Ingredients */}
        <div className="mb-3 flex flex-wrap gap-1">
          {recipe.ingredients.map((ing) => {
            const berry = DONUT_BERRIES.find((b) => b.id === ing.berryId);
            if (!berry) return null;
            return (
              <span
                key={ing.berryId}
                className="rounded-full bg-[#151520] px-2 py-0.5 text-[10px] font-bold text-[#8f8799]"
              >
                {berry.name.replace(" Berry", "")} ×{ing.count}
              </span>
            );
          })}
        </div>

        {/* Stats */}
        <div className="mb-3 grid grid-cols-3 gap-1.5">
          <RecipeStat label="Level" value={`+${totals.level}`} />
          <RecipeStat label="Cal" value={totals.calories.toLocaleString()} />
          <RecipeStat label="Berries" value={String(totals.berryCount)} />
        </div>

        <button
          type="button"
          onClick={onLoad}
          className="mt-auto h-8 w-full rounded-lg bg-[#4e367f] text-xs font-bold text-[#f8f0df] transition-colors hover:bg-[#5e4490]"
        >
          Load Recipe
        </button>
      </div>
    </article>
  );
}

function RecipeStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[#151520] px-2 py-1.5">
      <p className="text-sm font-black tabular-nums text-[#f8f0df]">{value}</p>
      <p className="text-[9px] font-black uppercase tracking-widest text-[#554a70]">
        {label}
      </p>
    </div>
  );
}

function BerryRow({
  berry,
  count,
  canAdd,
  onAdd,
  onRemove,
}: {
  berry: DonutBerry;
  count: number;
  canAdd: boolean;
  onAdd: () => void;
  onRemove: () => void;
}) {
  const isSelected = count > 0;
  return (
    <div
      className={`group grid gap-1 px-4 py-2 transition-colors lg:grid-cols-[minmax(160px,1fr)_48px_48px_48px_48px_48px_40px_52px_84px] lg:items-center ${
        isSelected ? "bg-[#1e1630]" : "hover:bg-white/[0.02]"
      }`}
    >
      {/* Name + mobile flavor dots */}
      <div className="flex min-w-0 items-center gap-2">
        <FlavorDots berry={berry} />
        <div className="min-w-0 flex-1">
          <h3
            className={`truncate text-sm font-bold ${isSelected ? "text-[#f8f0df]" : "text-[#d4cedb]"}`}
          >
            {berry.name}
          </h3>
          <p className="text-[10px] text-[#554a70] lg:hidden">
            +{berry.level} lv · {berry.calories} cal
            {berry.location && ` · ${berry.location}`}
          </p>
        </div>
      </div>

      {/* Flavor values */}
      <div className="grid grid-cols-5 gap-1 lg:contents">
        {DONUT_FLAVORS.map((flavor) => {
          const val = berry[flavor.id];
          return (
            <div
              key={flavor.id}
              className="rounded bg-[#151520]/60 px-1 py-1 text-center lg:bg-transparent lg:p-0"
            >
              <p className="text-[9px] font-bold text-[#554a70] lg:hidden">
                {flavor.label.slice(0, 3)}
              </p>
              <p
                className="text-xs font-black tabular-nums lg:text-center"
                style={val > 0 ? { color: flavor.color } : undefined}
              >
                {val > 0 ? val : <span className="text-[#3d3456]">—</span>}
              </p>
            </div>
          );
        })}
      </div>

      {/* Level */}
      <p className="hidden text-center text-xs font-bold tabular-nums text-[#8f8799] lg:block">
        +{berry.level}
      </p>
      {/* Calories */}
      <p className="hidden text-center text-xs font-bold tabular-nums text-[#8f8799] lg:block">
        {berry.calories}
      </p>

      {/* Qty controls */}
      <div className="flex items-center justify-center gap-1">
        <button
          type="button"
          onClick={onRemove}
          disabled={count === 0}
          aria-label={`Remove ${berry.name}`}
          className="grid h-7 w-7 place-items-center rounded-md text-[#554a70] transition-colors hover:bg-white/5 hover:text-[#f8f0df] disabled:opacity-20 lg:h-6 lg:w-6"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span
          className={`w-5 text-center text-sm font-black tabular-nums ${
            count > 0 ? "text-[#f8f0df]" : "text-[#3d3456]"
          }`}
        >
          {count}
        </span>
        <button
          type="button"
          onClick={onAdd}
          disabled={!canAdd}
          aria-label={`Add ${berry.name}`}
          className="grid h-7 w-7 place-items-center rounded-md bg-[#f472b6]/10 text-[#f472b6] transition-colors hover:bg-[#f472b6]/20 disabled:opacity-20 lg:h-6 lg:w-6"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function FlavorDots({ berry }: { berry: DonutBerry }) {
  const activeFlavors = DONUT_FLAVORS.filter((f) => berry[f.id] > 0);
  return (
    <span className="flex w-6 shrink-0 flex-wrap gap-0.5">
      {activeFlavors.slice(0, 4).map((f) => (
        <span
          key={f.id}
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: f.color }}
          title={f.label}
        />
      ))}
      {activeFlavors.length > 4 && (
        <span className="h-2.5 w-2.5 rounded-full bg-[#554a70]" />
      )}
    </span>
  );
}

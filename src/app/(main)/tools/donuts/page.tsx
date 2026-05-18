"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Donut,
  Minus,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
} from "lucide-react";
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

const MAX_BERRIES = 8;
const MIN_DONUT_BERRIES = 3;

type FlavorFilter = DonutFlavor | "all";

export default function DonutToolPage() {
  const [selection, setSelection] = useState<DonutSelection>({});
  const [query, setQuery] = useState("");
  const [flavorFilter, setFlavorFilter] = useState<FlavorFilter>("all");

  const totals = useMemo(() => calculateDonutTotals(selection), [selection]);
  const dominantFlavors = useMemo(() => getDominantFlavors(totals), [totals]);
  const totalFlavorPoints = DONUT_FLAVORS.reduce(
    (sum, flavor) => sum + totals[flavor.id],
    0,
  );
  const totalBudget = getBudgetForPoints(
    totalFlavorPoints,
    TOTAL_FLAVOR_BUDGET_THRESHOLDS,
  );
  const maxFlavorPoints = Math.max(
    1,
    ...DONUT_FLAVORS.map((flavor) => totals[flavor.id]),
  );

  const selectedBerries = DONUT_BERRIES.filter(
    (berry) => (selection[berry.id] ?? 0) > 0,
  );

  const filteredBerries = DONUT_BERRIES.filter((berry) => {
    const normalizedQuery = query.trim().toLowerCase();
    const matchesQuery =
      !normalizedQuery || berry.name.toLowerCase().includes(normalizedQuery);
    const matchesFlavor = flavorFilter === "all" || berry[flavorFilter] > 0;
    return matchesQuery && matchesFlavor;
  });

  const updateBerry = (berryId: string, delta: number) => {
    setSelection((current) => {
      const currentCount = current[berryId] ?? 0;
      if (delta > 0 && totals.berryCount >= MAX_BERRIES) return current;
      const nextCount = Math.max(0, currentCount + delta);
      const next = { ...current };
      if (nextCount === 0) {
        delete next[berryId];
      } else {
        next[berryId] = nextCount;
      }
      return next;
    });
  };

  const loadRecipe = (recipe: RecommendedDonutRecipe) => {
    setSelection(
      Object.fromEntries(
        recipe.ingredients.map((ingredient) => [
          ingredient.berryId,
          ingredient.count,
        ]),
      ),
    );
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 pb-10">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link
            href="/tools"
            className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Tools
          </Link>
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-lg bg-pink-50 text-pink-500 dark:bg-pink-950/40 dark:text-pink-300">
            <Donut className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-gray-950 dark:text-white">
            Ansha&apos;s Donuts
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
            Build a Legends: Z-A donut from berry flavor stats, calories, and
            level boosts.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <a
            href={DONUT_SOURCE_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-200 bg-white px-3 text-sm font-bold text-gray-600 shadow-sm hover:border-pink-300 hover:text-pink-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-pink-700 dark:hover:text-pink-300"
          >
            Data: Serebii
          </a>
          <a
            href={DONUT_RECIPE_SOURCE_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-200 bg-white px-3 text-sm font-bold text-gray-600 shadow-sm hover:border-pink-300 hover:text-pink-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-pink-700 dark:hover:text-pink-300"
          >
            Recipes: Game8
          </a>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <aside className="space-y-4">
          <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-pink-500">
                  Current Donut
                </p>
                <h2 className="mt-1 text-lg font-black text-gray-950 dark:text-white">
                  {totals.berryCount}/{MAX_BERRIES} berries
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelection({})}
                className="grid h-9 w-9 place-items-center rounded-lg bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-800 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
                aria-label="Clear donut"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Stat label="Level" value={`+${totals.level}`} />
              <Stat label="Calories" value={totals.calories.toString()} />
              <Stat label="Budget" value={totalBudget.toString()} />
            </div>

            {totals.berryCount > 0 && totals.berryCount < MIN_DONUT_BERRIES && (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
                Ansha starts at 3 berries; later upgrades allow up to 8.
              </p>
            )}

            {selectedBerries.length > 0 && (
              <div className="mt-4 space-y-2">
                {selectedBerries.map((berry) => (
                  <SelectedBerryRow
                    key={berry.id}
                    berry={berry}
                    count={selection[berry.id] ?? 0}
                    onDecrease={() => updateBerry(berry.id, -1)}
                    onIncrease={() => updateBerry(berry.id, 1)}
                    canIncrease={totals.berryCount < MAX_BERRIES}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-3 text-sm font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
              Flavor Profile
            </h2>
            <div className="space-y-3">
              {DONUT_FLAVORS.map((flavor) => {
                const points = totals[flavor.id];
                const budget = getBudgetForPoints(
                  points,
                  FLAVOR_BUDGET_THRESHOLDS,
                );
                return (
                  <div key={flavor.id}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-bold text-gray-600 dark:text-gray-300">
                        {flavor.label}
                      </span>
                      <span className="font-semibold tabular-nums text-gray-400">
                        {points} pts · budget {budget}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                      <div
                        className={`h-full rounded-full ${flavor.className}`}
                        style={{
                          width: `${Math.min(100, (points / maxFlavorPoints) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-3 text-sm font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
              Power Families
            </h2>
            {dominantFlavors.length === 0 ? (
              <p className="text-sm text-gray-400">No dominant flavor yet.</p>
            ) : (
              <div className="space-y-3">
                {dominantFlavors.map((flavorId) => {
                  const flavor = DONUT_FLAVORS.find(
                    (item) => item.id === flavorId,
                  );
                  if (!flavor) return null;
                  return (
                    <div key={flavor.id}>
                      <p className="mb-1.5 text-xs font-bold text-gray-500 dark:text-gray-400">
                        {flavor.label}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {flavor.powers.map((power) => (
                          <span
                            key={power}
                            className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300"
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
            <p className="mt-3 text-xs leading-5 text-gray-400">
              Power rolls are random among eligible flavor powers; tied flavors
              can pull from more than one family.
            </p>
          </section>

          <section className="rounded-xl border border-pink-200 bg-pink-50/60 p-4 shadow-sm dark:border-pink-900/50 dark:bg-pink-950/20">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-pink-500">
                  Suggested Donuts
                </p>
                <h2 className="mt-1 text-lg font-black text-gray-950 dark:text-white">
                  Best Recipes
                </h2>
              </div>
              <Sparkles className="h-5 w-5 text-pink-500" />
            </div>
            <div className="space-y-2">
              {RECOMMENDED_DONUT_RECIPES.map((recipe) => (
                <RecommendedRecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  onLoad={() => loadRecipe(recipe)}
                />
              ))}
            </div>
          </section>
        </aside>

        <main>
          <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative min-w-0 flex-1">
              <label htmlFor="donut-search" className="sr-only">
                Search berries
              </label>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                id="donut-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search berries"
                className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-pink-300 focus:ring-2 focus:ring-pink-100 dark:border-gray-800 dark:bg-gray-900 dark:text-white dark:focus:border-pink-700 dark:focus:ring-pink-950"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              <FlavorFilterButton
                label="All"
                active={flavorFilter === "all"}
                onClick={() => setFlavorFilter("all")}
              />
              {DONUT_FLAVORS.map((flavor) => (
                <FlavorFilterButton
                  key={flavor.id}
                  label={flavor.label}
                  active={flavorFilter === flavor.id}
                  onClick={() => setFlavorFilter(flavor.id)}
                />
              ))}
            </div>
          </div>

          <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="grid grid-cols-[minmax(150px,1fr)_48px_48px_48px_48px_48px_56px_72px_84px] gap-2 border-b border-gray-100 bg-gray-50 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:border-gray-800 dark:bg-gray-900/80 max-lg:hidden">
              <span>Berry</span>
              {DONUT_FLAVORS.map((flavor) => (
                <span key={flavor.id} className="text-center">
                  {flavor.label.slice(0, 3)}
                </span>
              ))}
              <span className="text-center">Lvl</span>
              <span className="text-center">Cal</span>
              <span className="text-center">Qty</span>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredBerries.map((berry) => (
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
          </section>
        </main>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800/70">
      <p className="text-lg font-black tabular-nums text-gray-950 dark:text-white">
        {value}
      </p>
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
        {label}
      </p>
    </div>
  );
}

function RecommendedRecipeCard({
  recipe,
  onLoad,
}: {
  recipe: RecommendedDonutRecipe;
  onLoad: () => void;
}) {
  const selection = Object.fromEntries(
    recipe.ingredients.map((ingredient) => [
      ingredient.berryId,
      ingredient.count,
    ]),
  );
  const totals = calculateDonutTotals(selection);
  const dominantFlavors = getDominantFlavors(totals);
  const firstFlavor = DONUT_FLAVORS.find(
    (flavor) => flavor.id === dominantFlavors[0],
  );

  return (
    <article className="rounded-lg border border-white/80 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-pink-500">
            {recipe.category}
          </p>
          <h3 className="mt-0.5 text-sm font-black leading-tight text-gray-950 dark:text-white">
            {recipe.title}
          </h3>
        </div>
        {firstFlavor && (
          <span
            className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wide text-white ${firstFlavor.className}`}
          >
            {firstFlavor.label}
          </span>
        )}
      </div>
      <p className="mb-2 text-xs leading-5 text-gray-500 dark:text-gray-400">
        {recipe.description}
      </p>
      <div className="mb-3 flex flex-wrap gap-1">
        {recipe.ingredients.map((ingredient) => {
          const berry = DONUT_BERRIES.find(
            (item) => item.id === ingredient.berryId,
          );
          if (!berry) return null;
          return (
            <span
              key={ingredient.berryId}
              className="rounded-full bg-gray-100 px-2 py-1 text-[10px] font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-300"
            >
              {berry.name.replace(" Berry", "")} x{ingredient.count}
            </span>
          );
        })}
      </div>
      <div className="mb-3 grid grid-cols-3 gap-1.5">
        <Stat label="Level" value={`+${totals.level}`} />
        <Stat label="Calories" value={totals.calories.toString()} />
        <Stat label="Berries" value={totals.berryCount.toString()} />
      </div>
      <button
        type="button"
        onClick={onLoad}
        className="h-9 w-full rounded-lg bg-pink-500 text-sm font-bold text-white transition-colors hover:bg-pink-600"
      >
        Load Recipe
      </button>
    </article>
  );
}

function SelectedBerryRow({
  berry,
  count,
  onDecrease,
  onIncrease,
  canIncrease,
}: {
  berry: DonutBerry;
  count: number;
  onDecrease: () => void;
  onIncrease: () => void;
  canIncrease: boolean;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-gray-50 p-2 dark:bg-gray-800/70">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-pink-100 text-xs font-black text-pink-600 dark:bg-pink-950/50 dark:text-pink-300">
        {count}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-bold text-gray-700 dark:text-gray-200">
        {berry.name}
      </span>
      <button
        type="button"
        onClick={onDecrease}
        className="grid h-8 w-8 place-items-center rounded-lg bg-white text-gray-500 shadow-sm hover:text-gray-900 dark:bg-gray-900 dark:text-gray-300 dark:hover:text-white"
        aria-label={`Remove ${berry.name}`}
      >
        <Minus className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onIncrease}
        disabled={!canIncrease}
        className="grid h-8 w-8 place-items-center rounded-lg bg-white text-pink-500 shadow-sm hover:text-pink-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-gray-900 dark:text-pink-300 dark:hover:text-pink-200"
        aria-label={`Add ${berry.name}`}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

function FlavorFilterButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
        active
          ? "bg-pink-500 text-white"
          : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
      }`}
    >
      {label}
    </button>
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
  return (
    <div
      className={`grid gap-2 px-3 py-2.5 transition-colors lg:grid-cols-[minmax(150px,1fr)_48px_48px_48px_48px_48px_56px_72px_84px] lg:items-center ${
        count > 0
          ? "bg-pink-50/70 dark:bg-pink-950/20"
          : "hover:bg-gray-50 dark:hover:bg-gray-800/40"
      }`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <FlavorDots berry={berry} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-bold text-gray-950 dark:text-white">
            {berry.name}
          </h3>
          <p className="text-xs font-semibold text-gray-400 lg:hidden">
            +{berry.level} level · {berry.calories} calories
          </p>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-1 lg:contents">
        {DONUT_FLAVORS.map((flavor) => (
          <div
            key={flavor.id}
            className="rounded-md bg-gray-50 px-1.5 py-1 text-center dark:bg-gray-800/70 lg:bg-transparent lg:p-0 lg:dark:bg-transparent"
          >
            <p className="text-[9px] font-black uppercase tracking-wide text-gray-400 lg:hidden">
              {flavor.label.slice(0, 3)}
            </p>
            <p className="text-xs font-black tabular-nums text-gray-700 dark:text-gray-200 lg:text-sm">
              {berry[flavor.id]}
            </p>
          </div>
        ))}
      </div>

      <p className="hidden text-center text-sm font-black tabular-nums text-gray-700 dark:text-gray-200 lg:block">
        +{berry.level}
      </p>
      <p className="hidden text-center text-sm font-black tabular-nums text-gray-700 dark:text-gray-200 lg:block">
        {berry.calories}
      </p>

      <div className="grid grid-cols-[36px_1fr_36px] items-center gap-1 lg:grid-cols-[24px_28px_24px]">
        <button
          type="button"
          onClick={onRemove}
          disabled={count === 0}
          className="grid h-9 w-9 place-items-center rounded-lg bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white lg:h-7 lg:w-7"
          aria-label={`Remove ${berry.name}`}
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="text-center text-sm font-black tabular-nums text-gray-900 dark:text-white">
          {count}
        </span>
        <button
          type="button"
          onClick={onAdd}
          disabled={!canAdd}
          className="grid h-9 w-9 place-items-center rounded-lg bg-pink-500 text-white transition-colors hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-40 lg:h-7 lg:w-7"
          aria-label={`Add ${berry.name}`}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function FlavorDots({ berry }: { berry: DonutBerry }) {
  const activeFlavors = DONUT_FLAVORS.filter((flavor) => berry[flavor.id] > 0);
  return (
    <span className="flex w-8 shrink-0 flex-wrap gap-0.5">
      {activeFlavors.slice(0, 4).map((flavor) => (
        <span
          key={flavor.id}
          className={`h-3 w-3 rounded-full ${flavor.className}`}
          title={flavor.label}
          aria-label={flavor.label}
        />
      ))}
      {activeFlavors.length > 4 && (
        <span
          className="h-3 w-3 rounded-full bg-gray-300 dark:bg-gray-600"
          title="Multiple flavors"
        />
      )}
    </span>
  );
}
